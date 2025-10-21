#!/usr/bin/env tsx

import { initializePostgreSQL, initializeMongoDB } from '../config/database';
import { setupMongoDBIndexes } from '../config/mongodb-setup';
import bcrypt from 'bcryptjs';

// PostgreSQL seed data
async function seedPostgreSQL() {
  try {
    console.log('🌱 Seeding PostgreSQL database...');
    const pool = await initializePostgreSQL();
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const adminUser = {
      email: 'admin@privacyguard.com',
      password_hash: hashedPassword,
      name: 'System Administrator',
      role: 'admin',
      department: 'IT Security',
      permissions: JSON.stringify(['*'])
    };
    
    // Insert admin user (if not exists)
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminUser.email]
    );
    
    let adminUserId: string;
    
    if (existingUser.rows.length === 0) {
      const result = await pool.query(`
        INSERT INTO users (email, password_hash, name, role, department, permissions)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        adminUser.email,
        adminUser.password_hash,
        adminUser.name,
        adminUser.role,
        adminUser.department,
        adminUser.permissions
      ]);
      adminUserId = result.rows[0].id;
      console.log('✅ Admin user created');
    } else {
      adminUserId = existingUser.rows[0].id;
      console.log('ℹ️  Admin user already exists');
    }
    
    // Create sample DPO user
    const dpoPassword = await bcrypt.hash('dpo123', 12);
    const dpoUser = {
      email: 'dpo@privacyguard.com',
      password_hash: dpoPassword,
      name: 'Data Protection Officer',
      role: 'dpo',
      department: 'Legal & Compliance',
      permissions: JSON.stringify(['dsar:*', 'gdpr:*', 'risk:read', 'policy:*'])
    };
    
    const existingDPO = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [dpoUser.email]
    );
    
    let dpoUserId: string;
    
    if (existingDPO.rows.length === 0) {
      const result = await pool.query(`
        INSERT INTO users (email, password_hash, name, role, department, permissions)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        dpoUser.email,
        dpoUser.password_hash,
        dpoUser.name,
        dpoUser.role,
        dpoUser.department,
        dpoUser.permissions
      ]);
      dpoUserId = result.rows[0].id;
      console.log('✅ DPO user created');
    } else {
      dpoUserId = existingDPO.rows[0].id;
      console.log('ℹ️  DPO user already exists');
    }
    
    // Create sample DSAR requests
    const dsarRequests = [
      {
        request_id: 'DSAR-2024-001',
        subject_name: 'John Doe',
        subject_email: 'john.doe@example.com',
        request_type: 'access',
        status: 'submitted',
        priority: 'medium',
        description: 'Request for access to all personal data processed by the organization',
        data_categories: JSON.stringify(['contact_info', 'transaction_history', 'preferences']),
        processing_purposes: JSON.stringify(['service_provision', 'marketing', 'analytics']),
        assigned_to: dpoUserId,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      {
        request_id: 'DSAR-2024-002',
        subject_name: 'Jane Smith',
        subject_email: 'jane.smith@example.com',
        request_type: 'erasure',
        status: 'in_progress',
        priority: 'high',
        description: 'Request for deletion of all personal data following account closure',
        data_categories: JSON.stringify(['contact_info', 'account_data', 'usage_data']),
        processing_purposes: JSON.stringify(['service_provision', 'support']),
        assigned_to: dpoUserId,
        due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) // 25 days from now
      }
    ];
    
    for (const dsar of dsarRequests) {
      const existing = await pool.query(
        'SELECT id FROM dsar_requests WHERE request_id = $1',
        [dsar.request_id]
      );
      
      if (existing.rows.length === 0) {
        const result = await pool.query(`
          INSERT INTO dsar_requests (
            request_id, subject_name, subject_email, request_type, status, priority,
            description, data_categories, processing_purposes, assigned_to, due_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [
          dsar.request_id, dsar.subject_name, dsar.subject_email, dsar.request_type,
          dsar.status, dsar.priority, dsar.description, dsar.data_categories,
          dsar.processing_purposes, dsar.assigned_to, dsar.due_date
        ]);
        
        // Add status history
        await pool.query(`
          INSERT INTO dsar_status_history (dsar_id, status, comment, changed_by)
          VALUES ($1, $2, $3, $4)
        `, [result.rows[0].id, dsar.status, 'Initial request submission', adminUserId]);
        
        console.log(`✅ DSAR request ${dsar.request_id} created`);
      }
    }
    
    // Create sample risk assessments
    const riskAssessments = [
      {
        name: 'Customer Data Processing Risk Assessment',
        description: 'Assessment of risks related to customer personal data processing',
        risk_level: 'medium',
        impact_score: 3,
        likelihood_score: 2,
        overall_score: 2.5,
        status: 'active',
        category: 'Data Processing',
        data_types: JSON.stringify(['PII', 'Financial Data', 'Contact Information']),
        mitigation_measures: JSON.stringify([
          'Implement data encryption',
          'Regular access reviews',
          'Staff training on data handling'
        ]),
        owner_id: dpoUserId,
        review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      },
      {
        name: 'Third-Party Data Sharing Risk',
        description: 'Risk assessment for sharing data with external service providers',
        risk_level: 'high',
        impact_score: 4,
        likelihood_score: 3,
        overall_score: 3.5,
        status: 'active',
        category: 'Data Sharing',
        data_types: JSON.stringify(['PII', 'Behavioral Data']),
        mitigation_measures: JSON.stringify([
          'Data Processing Agreements',
          'Regular vendor assessments',
          'Data minimization practices'
        ]),
        owner_id: dpoUserId,
        review_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
      }
    ];
    
    for (const risk of riskAssessments) {
      const existing = await pool.query(
        'SELECT id FROM risk_assessments WHERE name = $1',
        [risk.name]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO risk_assessments (
            name, description, risk_level, impact_score, likelihood_score, overall_score,
            status, category, data_types, mitigation_measures, owner_id, review_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          risk.name, risk.description, risk.risk_level, risk.impact_score,
          risk.likelihood_score, risk.overall_score, risk.status, risk.category,
          risk.data_types, risk.mitigation_measures, risk.owner_id, risk.review_date
        ]);
        
        console.log(`✅ Risk assessment "${risk.name}" created`);
      }
    }
    
    // Create sample lawful basis records
    const lawfulBasisRecords = [
      {
        processing_activity: 'Customer Account Management',
        lawful_basis: 'contract',
        data_categories: JSON.stringify(['Name', 'Email', 'Phone', 'Address']),
        purposes: JSON.stringify(['Account creation', 'Service delivery', 'Customer support']),
        data_subjects: JSON.stringify(['Customers', 'Prospects']),
        retention_period: '7 years after contract termination',
        status: 'active',
        review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      {
        processing_activity: 'Marketing Communications',
        lawful_basis: 'consent',
        data_categories: JSON.stringify(['Email', 'Name', 'Preferences']),
        purposes: JSON.stringify(['Direct marketing', 'Newsletter', 'Product updates']),
        data_subjects: JSON.stringify(['Customers', 'Newsletter subscribers']),
        retention_period: 'Until consent is withdrawn',
        status: 'active',
        review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      }
    ];
    
    for (const record of lawfulBasisRecords) {
      const existing = await pool.query(
        'SELECT id FROM lawful_basis_records WHERE processing_activity = $1',
        [record.processing_activity]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO lawful_basis_records (
            processing_activity, lawful_basis, data_categories, purposes,
            data_subjects, retention_period, status, review_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          record.processing_activity, record.lawful_basis, record.data_categories,
          record.purposes, record.data_subjects, record.retention_period,
          record.status, record.review_date
        ]);
        
        console.log(`✅ Lawful basis record "${record.processing_activity}" created`);
      }
    }
    
    await pool.end();
    console.log('✅ PostgreSQL seeding completed');
    
  } catch (error) {
    console.error('❌ PostgreSQL seeding failed:', error);
    throw error;
  }
}

// MongoDB seed data
async function seedMongoDB() {
  try {
    console.log('🌱 Seeding MongoDB database...');
    const client = await initializeMongoDB();
    
    // Initialize collections and indexes
    await setupMongoDBIndexes(client);
    
    // Add additional sample policy documents
    const db = client.db('privacyguard');
    const policyCollection = db.collection('policy_documents');
    
    const samplePolicies = [
      {
        title: 'GDPR Privacy Policy',
        type: 'privacy_policy',
        content: `# Privacy Policy

## 1. Introduction
This privacy policy explains how we collect, use, and protect your personal data in accordance with the General Data Protection Regulation (GDPR).

## 2. Data Controller
[Company Name] is the data controller for the personal data we process.

## 3. Legal Basis for Processing
We process your personal data based on the following legal bases:
- Contract performance
- Legitimate interests
- Legal compliance
- Consent (where applicable)

## 4. Data We Collect
We may collect the following types of personal data:
- Contact information (name, email, phone)
- Account information
- Usage data
- Technical data

## 5. How We Use Your Data
We use your personal data for:
- Providing our services
- Customer support
- Legal compliance
- Improving our services

## 6. Your Rights
Under GDPR, you have the following rights:
- Right of access
- Right to rectification
- Right to erasure
- Right to restrict processing
- Right to data portability
- Right to object

## 7. Contact Us
If you have any questions about this privacy policy, please contact our Data Protection Officer at dpo@company.com.`,
        version: '2.1.0',
        status: 'active',
        language: 'en',
        jurisdiction: 'EU',
        effective_date: new Date('2024-01-01'),
        expiry_date: null,
        created_by: 'admin@privacyguard.com',
        approved_by: 'dpo@privacyguard.com',
        approval_date: new Date('2024-01-01'),
        tags: ['gdpr', 'privacy', 'eu', 'active'],
        metadata: {
          word_count: 250,
          last_review_date: new Date('2024-01-01'),
          next_review_date: new Date('2025-01-01'),
          compliance_frameworks: ['GDPR']
        },
        version_history: [
          {
            version: '2.0.0',
            changes: 'Updated for GDPR compliance',
            changed_by: 'dpo@privacyguard.com',
            changed_at: new Date('2023-12-01')
          }
        ],
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2024-01-01')
      },
      {
        title: 'Cookie Policy',
        type: 'cookie_policy',
        content: `# Cookie Policy

## What are cookies?
Cookies are small text files that are stored on your device when you visit our website.

## Types of cookies we use:
- Essential cookies: Required for the website to function
- Analytics cookies: Help us understand how visitors use our site
- Marketing cookies: Used to deliver relevant advertisements

## Managing cookies:
You can control cookies through your browser settings.

## Contact:
For questions about our cookie policy, contact us at privacy@company.com.`,
        version: '1.2.0',
        status: 'active',
        language: 'en',
        jurisdiction: 'EU',
        effective_date: new Date('2024-01-01'),
        expiry_date: null,
        created_by: 'admin@privacyguard.com',
        approved_by: 'dpo@privacyguard.com',
        approval_date: new Date('2024-01-01'),
        tags: ['cookies', 'tracking', 'gdpr'],
        metadata: {
          word_count: 120,
          last_review_date: new Date('2024-01-01'),
          next_review_date: new Date('2024-07-01'),
          compliance_frameworks: ['GDPR', 'ePrivacy']
        },
        version_history: [],
        created_at: new Date('2023-06-01'),
        updated_at: new Date('2024-01-01')
      }
    ];
    
    for (const policy of samplePolicies) {
      const existing = await policyCollection.findOne({ title: policy.title });
      if (!existing) {
        await policyCollection.insertOne(policy);
        console.log(`✅ Policy document "${policy.title}" created`);
      }
    }
    
    await client.close();
    console.log('✅ MongoDB seeding completed');
    
  } catch (error) {
    console.error('❌ MongoDB seeding failed:', error);
    throw error;
  }
}

// Main seeding function
async function runSeeding() {
  try {
    console.log('🚀 Starting database seeding...');
    
    await Promise.all([
      seedPostgreSQL(),
      seedMongoDB()
    ]);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Default credentials:');
    console.log('Admin: admin@privacyguard.com / admin123');
    console.log('DPO: dpo@privacyguard.com / dpo123');
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

runSeeding();
