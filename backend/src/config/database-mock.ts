// Mock database configuration for development
import { logger } from '../utils/logger';

// Mock database connections for development
export let pgPool: any = null;
export let mongoClient: any = null;
export let redisClient: any = null;

// Initialize mock databases
export async function initializeDatabases(): Promise<void> {
  try {
    logger.info('🔧 Initializing mock databases for development...');
    
    // Mock PostgreSQL
    pgPool = {
      query: async (text: string, params?: any[]) => {
        logger.debug('Mock PostgreSQL query:', { text, params });
        return { rows: [], rowCount: 0 };
      },
      connect: async () => ({
        query: async (text: string, params?: any[]) => ({ rows: [], rowCount: 0 }),
        release: () => {}
      })
    };
    
    // Mock MongoDB
    mongoClient = {
      db: () => ({
        collection: () => ({
          find: () => ({ toArray: async () => [] }),
          findOne: async () => null,
          insertOne: async (doc: any) => ({ insertedId: 'mock-id' }),
          updateOne: async () => ({ modifiedCount: 1 }),
          deleteOne: async () => ({ deletedCount: 1 })
        })
      })
    };
    
    // Mock Redis
    redisClient = {
      isOpen: false,
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1,
      multi: () => ({
        exec: async () => []
      })
    };
    
    logger.info('✅ Mock databases initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize mock databases:', error);
    throw error;
  }
}

export async function closeDatabaseConnections(): Promise<void> {
  logger.info('🔌 Closing mock database connections...');
  pgPool = null;
  mongoClient = null;
  redisClient = null;
  logger.info('✅ Mock database connections closed');
}

// Health check functions
export async function checkPostgreSQLHealth(): Promise<boolean> {
  return true; // Always healthy in mock mode
}

export async function checkMongoDBHealth(): Promise<boolean> {
  return true; // Always healthy in mock mode
}

export async function checkRedisHealth(): Promise<boolean> {
  return true; // Always healthy in mock mode
}
