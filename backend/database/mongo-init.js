// MongoDB initialization script for PrivacyGuard local development

// Switch to the privacyguard_local database
db = db.getSiblingDB('privacyguard_local');

// Create collections with validation schemas

// Users collection
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'passwordHash', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        passwordHash: { bsonType: 'string' },
        firstName: { bsonType: 'string' },
        lastName: { bsonType: 'string' },
        role: {
          bsonType: 'string',
          enum: ['admin', 'user', 'viewer', 'dpo']
        },
        isActive: { bsonType: 'bool' },
        emailVerified: { bsonType: 'bool' },
        lastLogin: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Compliance findings collection
db.createCollection('complianceFindings', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['resourceArn', 'findingType', 'severity', 'title'],
      properties: {
        resourceArn: { bsonType: 'string' },
        findingType: {
          bsonType: 'string',
          enum: ['ENCRYPTION', 'ACCESS_CONTROL', 'PII_EXPOSURE', 'LOGGING', 'CONFIGURATION']
        },
        severity: {
          bsonType: 'string',
          enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        },
        title: { bsonType: 'string' },
        description: { bsonType: 'string' },
        status: {
          bsonType: 'string',
          enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']
        },
        riskScore: {
          bsonType: 'int',
          minimum: 0,
          maximum: 100
        },
        region: { bsonType: 'string' },
        service: { bsonType: 'string' },
        resourceTags: { bsonType: 'object' },
        rawData: { bsonType: 'object' },
        detectedAt: { bsonType: 'date' },
        resolvedAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// GDPR data collection
db.createCollection('gdprData', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      properties: {
        dataSubject: { bsonType: 'string' },
        dataCategory: { bsonType: 'string' },
        processingPurpose: { bsonType: 'string' },
        legalBasis: { bsonType: 'string' },
        dataSource: { bsonType: 'string' },
        recipients: { bsonType: 'array' },
        retentionPeriod: { bsonType: 'string' },
        crossBorderTransfers: { bsonType: 'bool' },
        safeguards: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// PII detection results collection
db.createCollection('piiDetectionResults', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['scanId', 'source', 'detectedPII'],
      properties: {
        scanId: { bsonType: 'string' },
        source: { bsonType: 'string' },
        sourceType: {
          bsonType: 'string',
          enum: ['DATABASE', 'FILE', 'S3_BUCKET', 'API_ENDPOINT']
        },
        detectedPII: { bsonType: 'array' },
        confidence: {
          bsonType: 'double',
          minimum: 0,
          maximum: 1
        },
        scanDate: { bsonType: 'date' },
        engine: { bsonType: 'string' },
        metadata: { bsonType: 'object' }
      }
    }
  }
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });

db.complianceFindings.createIndex({ resourceArn: 1 });
db.complianceFindings.createIndex({ severity: 1 });
db.complianceFindings.createIndex({ status: 1 });
db.complianceFindings.createIndex({ detectedAt: -1 });
db.complianceFindings.createIndex({ service: 1, region: 1 });

db.gdprData.createIndex({ dataSubject: 1 });
db.gdprData.createIndex({ dataCategory: 1 });
db.gdprData.createIndex({ legalBasis: 1 });

db.piiDetectionResults.createIndex({ scanId: 1 });
db.piiDetectionResults.createIndex({ source: 1 });
db.piiDetectionResults.createIndex({ scanDate: -1 });

// Insert sample data for testing

// Sample admin user
db.users.insertOne({
  email: 'admin@privacyguard.local',
  passwordHash: '$2b$10$rQZ8kHWKQYXHOGGVQExOHOKmKvKzpQXQXQXQXQXQXQXQXQXQXQXQXQ', // admin123
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Sample DPO user
db.users.insertOne({
  email: 'dpo@privacyguard.local',
  passwordHash: '$2b$10$rQZ8kHWKQYXHOGGVQExOHOKmKvKzpQXQXQXQXQXQXQXQXQXQXQXQXQ', // admin123
  firstName: 'Data Protection',
  lastName: 'Officer',
  role: 'dpo',
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Sample compliance findings
db.complianceFindings.insertMany([
  {
    resourceArn: 'arn:aws:s3:::customer-data-bucket',
    findingType: 'ENCRYPTION',
    severity: 'HIGH',
    title: 'Customer Data Bucket Not Encrypted',
    description: 'S3 bucket containing customer data lacks server-side encryption',
    status: 'OPEN',
    riskScore: 90,
    region: 'us-east-1',
    service: 's3',
    resourceTags: { Environment: 'production', DataClassification: 'sensitive' },
    detectedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    resourceArn: 'arn:aws:rds:us-east-1:123456789012:db:user-profiles',
    findingType: 'ACCESS_CONTROL',
    severity: 'MEDIUM',
    title: 'Database Publicly Accessible',
    description: 'RDS database containing user profiles is publicly accessible',
    status: 'IN_PROGRESS',
    riskScore: 75,
    region: 'us-east-1',
    service: 'rds',
    resourceTags: { Environment: 'production', DataType: 'personal' },
    detectedAt: new Date(Date.now() - 86400000), // 1 day ago
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date()
  }
]);

// Sample GDPR data
db.gdprData.insertMany([
  {
    dataSubject: 'Customer',
    dataCategory: 'Personal Identifiers',
    processingPurpose: 'Service Delivery',
    legalBasis: 'Contract',
    dataSource: 'Customer Registration',
    recipients: ['Internal Teams', 'Payment Processor'],
    retentionPeriod: '7 years',
    crossBorderTransfers: false,
    safeguards: ['Encryption', 'Access Controls'],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    dataSubject: 'Employee',
    dataCategory: 'HR Data',
    processingPurpose: 'Employment Management',
    legalBasis: 'Legal Obligation',
    dataSource: 'HR System',
    recipients: ['HR Department', 'Payroll Provider'],
    retentionPeriod: '10 years',
    crossBorderTransfers: true,
    safeguards: ['Standard Contractual Clauses', 'Encryption'],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Sample PII detection results
db.piiDetectionResults.insertMany([
  {
    scanId: 'scan-001',
    source: 'customer_database.users',
    sourceType: 'DATABASE',
    detectedPII: [
      { type: 'EMAIL', count: 1250, confidence: 0.98 },
      { type: 'PHONE_NUMBER', count: 980, confidence: 0.95 },
      { type: 'SSN', count: 45, confidence: 0.92 }
    ],
    confidence: 0.95,
    scanDate: new Date(),
    engine: 'presidio',
    metadata: {
      tableScanned: 'users',
      recordsScanned: 1250,
      scanDuration: 45.2
    }
  },
  {
    scanId: 'scan-002',
    source: 's3://documents-bucket/contracts/',
    sourceType: 'S3_BUCKET',
    detectedPII: [
      { type: 'PERSON', count: 156, confidence: 0.89 },
      { type: 'DATE_TIME', count: 234, confidence: 0.94 },
      { type: 'LOCATION', count: 78, confidence: 0.87 }
    ],
    confidence: 0.90,
    scanDate: new Date(Date.now() - 3600000), // 1 hour ago
    engine: 'spacy',
    metadata: {
      filesScanned: 156,
      totalSize: '2.3GB',
      scanDuration: 120.5
    }
  }
]);

print('MongoDB initialization completed successfully!');
print('Created collections: users, complianceFindings, gdprData, piiDetectionResults');
print('Inserted sample data for testing');
print('Default users created:');
print('  - admin@privacyguard.local (password: admin123)');
print('  - dpo@privacyguard.local (password: admin123)');