// MongoDB setup configuration
import { MongoClient } from 'mongodb';
import { logger } from '../utils/logger';

export async function setupMongoDBIndexes(client: MongoClient): Promise<void> {
  try {
    const db = client.db();
    
    // Create indexes for DSAR collection
    await db.collection('dsar_requests').createIndex({ request_id: 1 }, { unique: true });
    await db.collection('dsar_requests').createIndex({ subject_email: 1 });
    await db.collection('dsar_requests').createIndex({ status: 1 });
    await db.collection('dsar_requests').createIndex({ created_at: 1 });
    
    // Create indexes for users collection
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    
    // Create indexes for risk assessments
    await db.collection('risk_assessments').createIndex({ id: 1 }, { unique: true });
    await db.collection('risk_assessments').createIndex({ category: 1 });
    await db.collection('risk_assessments').createIndex({ risk_level: 1 });
    
    logger.info('✅ MongoDB indexes created successfully');
  } catch (error) {
    logger.error('❌ Error creating MongoDB indexes:', error);
    throw error;
  }
}