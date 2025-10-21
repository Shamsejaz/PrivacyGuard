import { MongoClient, Db } from 'mongodb';

export class MongoDBSetup {
  private client: MongoClient;
  private db: Db;

  constructor(client: MongoClient, dbName: string = 'privacyguard') {
    this.client = client;
    this.db = client.db(dbName);
  }

  // Initialize all collections and indexes
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Setting up MongoDB collections and indexes...');
      
      await Promise.all([
        this.setupPolicyDocuments(),
        this.setupAnalytics(),
        this.setupAuditLogs(),
        this.setupNotifications(),
        this.setupTemplates(),
      ]);
      
      console.log('✅ MongoDB setup completed successfully');
    } catch (error) {
      console.error('❌ MongoDB setup failed:', error);
      throw error;
    }
  }

  // Setup policy documents collection
  private async setupPolicyDocuments(): Promise<void> {
    const collection = this.db.collection('policy_documents');
    
    // Create indexes
    await Promise.all([
      collection.createIndex({ title: 1 }),
      collection.createIndex({ type: 1 }),
      collection.createIndex({ status: 1 }),
      collection.createIndex({ language: 1 }),
      collection.createIndex({ jurisdiction: 1 }),
      collection.createIndex({ effective_date: 1 }),
      collection.createIndex({ expiry_date: 1 }),
      collection.createIndex({ created_by: 1 }),
      collection.createIndex({ tags: 1 }),
      collection.createIndex({ 'metadata.compliance_frameworks': 1 }),
      collection.createIndex({ 'metadata.next_review_date': 1 }),
      collection.createIndex({ created_at: -1 }),
      collection.createIndex({ updated_at: -1 }),
      // Compound indexes for common queries
      collection.createIndex({ type: 1, status: 1 }),
      collection.createIndex({ language: 1, jurisdiction: 1 }),
      collection.createIndex({ status: 1, effective_date: 1 }),
      // Text index for full-text search
      collection.createIndex({ 
        title: 'text', 
        content: 'text', 
        tags: 'text' 
      }, { 
        name: 'policy_text_search',
        weights: { title: 10, tags: 5, content: 1 }
      }),
    ]);
    
    console.log('✅ Policy documents collection setup complete');
  }

  // Setup analytics collection
  private async setupAnalytics(): Promise<void> {
    const collection = this.db.collection('analytics');
    
    // Create indexes
    await Promise.all([
      collection.createIndex({ metric_type: 1 }),
      collection.createIndex({ period: 1 }),
      collection.createIndex({ 'date_range.start': 1 }),
      collection.createIndex({ 'date_range.end': 1 }),
      collection.createIndex({ generated_by: 1 }),
      collection.createIndex({ generated_at: -1 }),
      // Compound indexes for analytics queries
      collection.createIndex({ metric_type: 1, period: 1 }),
      collection.createIndex({ metric_type: 1, 'date_range.start': 1, 'date_range.end': 1 }),
      collection.createIndex({ period: 1, generated_at: -1 }),
    ]);
    
    console.log('✅ Analytics collection setup complete');
  }

  // Setup audit logs collection (MongoDB version for document changes)
  private async setupAuditLogs(): Promise<void> {
    const collection = this.db.collection('document_audit_logs');
    
    // Create indexes
    await Promise.all([
      collection.createIndex({ user_id: 1 }),
      collection.createIndex({ action: 1 }),
      collection.createIndex({ resource_type: 1 }),
      collection.createIndex({ resource_id: 1 }),
      collection.createIndex({ created_at: -1 }),
      // Compound indexes
      collection.createIndex({ resource_type: 1, resource_id: 1 }),
      collection.createIndex({ user_id: 1, created_at: -1 }),
      collection.createIndex({ action: 1, created_at: -1 }),
    ]);
    
    // Set TTL for audit logs (optional - keep for 2 years)
    await collection.createIndex(
      { created_at: 1 }, 
      { expireAfterSeconds: 63072000 } // 2 years in seconds
    );
    
    console.log('✅ Document audit logs collection setup complete');
  }

  // Setup notifications collection
  private async setupNotifications(): Promise<void> {
    const collection = this.db.collection('notifications');
    
    // Create indexes
    await Promise.all([
      collection.createIndex({ user_id: 1 }),
      collection.createIndex({ type: 1 }),
      collection.createIndex({ status: 1 }),
      collection.createIndex({ priority: 1 }),
      collection.createIndex({ created_at: -1 }),
      collection.createIndex({ read_at: 1 }),
      // Compound indexes
      collection.createIndex({ user_id: 1, status: 1 }),
      collection.createIndex({ user_id: 1, created_at: -1 }),
      collection.createIndex({ type: 1, status: 1 }),
    ]);
    
    // Set TTL for read notifications (optional - keep for 90 days)
    await collection.createIndex(
      { read_at: 1 }, 
      { 
        expireAfterSeconds: 7776000, // 90 days in seconds
        partialFilterExpression: { read_at: { $exists: true } }
      }
    );
    
    console.log('✅ Notifications collection setup complete');
  }

  // Setup templates collection
  private async setupTemplates(): Promise<void> {
    const collection = this.db.collection('policy_templates');
    
    // Create indexes
    await Promise.all([
      collection.createIndex({ name: 1 }),
      collection.createIndex({ category: 1 }),
      collection.createIndex({ regulation: 1 }),
      collection.createIndex({ language: 1 }),
      collection.createIndex({ jurisdiction: 1 }),
      collection.createIndex({ is_active: 1 }),
      collection.createIndex({ created_by: 1 }),
      collection.createIndex({ created_at: -1 }),
      // Compound indexes
      collection.createIndex({ category: 1, regulation: 1 }),
      collection.createIndex({ language: 1, jurisdiction: 1 }),
      collection.createIndex({ is_active: 1, category: 1 }),
      // Text index for template search
      collection.createIndex({ 
        name: 'text', 
        description: 'text', 
        content: 'text' 
      }, { 
        name: 'template_text_search',
        weights: { name: 10, description: 5, content: 1 }
      }),
    ]);
    
    console.log('✅ Policy templates collection setup complete');
  }

  // Create sample collections structure (for reference)
  async createSampleDocuments(): Promise<void> {
    try {
      console.log('📝 Creating sample document structures...');
      
      // Sample policy document structure
      const samplePolicy = {
        title: 'Privacy Policy Template',
        type: 'privacy_policy',
        content: 'This is a sample privacy policy content...',
        version: '1.0.0',
        status: 'draft',
        language: 'en',
        jurisdiction: 'EU',
        effective_date: new Date(),
        expiry_date: null,
        created_by: 'system',
        approved_by: null,
        approval_date: null,
        tags: ['gdpr', 'privacy', 'template'],
        metadata: {
          word_count: 150,
          last_review_date: new Date(),
          next_review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          compliance_frameworks: ['GDPR', 'CCPA']
        },
        version_history: [],
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Sample analytics document structure
      const sampleAnalytics = {
        metric_type: 'dsar_volume',
        period: 'monthly',
        date_range: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        data: {
          total_count: 25,
          breakdown: {
            access: 15,
            erasure: 8,
            rectification: 2
          },
          trends: [
            { date: '2024-01-01', count: 2 },
            { date: '2024-01-02', count: 1 }
          ],
          comparisons: {
            previous_period: 20,
            change_percentage: 25
          }
        },
        filters: {
          department: 'all',
          status: 'completed'
        },
        generated_by: 'system',
        generated_at: new Date()
      };
      
      // Insert sample documents (only if collections are empty)
      const policyCount = await this.db.collection('policy_documents').countDocuments();
      if (policyCount === 0) {
        await this.db.collection('policy_documents').insertOne(samplePolicy);
        console.log('✅ Sample policy document created');
      }
      
      const analyticsCount = await this.db.collection('analytics').countDocuments();
      if (analyticsCount === 0) {
        await this.db.collection('analytics').insertOne(sampleAnalytics);
        console.log('✅ Sample analytics document created');
      }
      
    } catch (error) {
      console.error('❌ Failed to create sample documents:', error);
      throw error;
    }
  }

  // Validate collections and indexes
  async validateSetup(): Promise<boolean> {
    try {
      const collections = ['policy_documents', 'analytics', 'document_audit_logs', 'notifications', 'policy_templates'];
      
      for (const collectionName of collections) {
        const collection = this.db.collection(collectionName);
        const indexes = await collection.indexes();
        
        console.log(`📋 Collection '${collectionName}' has ${indexes.length} indexes`);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return false;
    }
  }
}
