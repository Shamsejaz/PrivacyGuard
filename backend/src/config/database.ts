import { Pool, type PoolConfig } from 'pg';
import { MongoClient, type MongoClientOptions } from 'mongodb';
import { createClient, type RedisClientType } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

// PostgreSQL Configuration
const postgresConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'privacyguard',
  user: process.env.POSTGRES_USER || 'privacyguard_user',
  password: process.env.POSTGRES_PASSWORD || '',
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS || '20'),
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '2000'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// MongoDB Configuration
const mongoConfig: MongoClientOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10'),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5'),
  maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '30000'),
  serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000'),
  retryWrites: true,
  w: 'majority',
};

// Database connection instances
export let pgPool: Pool;
export let mongoClient: MongoClient;
export let redisClient: RedisClientType;

// Initialize PostgreSQL connection
export async function initializePostgreSQL(): Promise<Pool> {
  try {
    pgPool = new Pool(postgresConfig);
    
    // Test connection
    const client = await pgPool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
    
    return pgPool;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }
}

// Initialize MongoDB connection
export async function initializeMongoDB(): Promise<MongoClient> {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/privacyguard';
    mongoClient = new MongoClient(uri, mongoConfig);
    
    await mongoClient.connect();
    
    // Test connection
    await mongoClient.db().admin().ping();
    console.log('✅ MongoDB connected successfully');
    
    return mongoClient;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Initialize Redis connection
export async function initializeRedis(): Promise<RedisClientType> {
  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0'),
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
}

// Initialize all database connections
export async function initializeDatabases(): Promise<void> {
  try {
    await Promise.all([
      initializePostgreSQL(),
      initializeMongoDB(),
      initializeRedis(),
    ]);
    
    // Setup MongoDB collections and indexes
    const { setupMongoDBIndexes } = await import('./mongodb-setup');
    await setupMongoDBIndexes(mongoClient);
    
    console.log('🚀 All database connections initialized successfully');
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    throw error;
  }
}

// Health check functions
export async function checkPostgreSQLHealth(): Promise<boolean> {
  try {
    const client = await pgPool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
    return false;
  }
}

export async function checkMongoDBHealth(): Promise<boolean> {
  try {
    await mongoClient.db().admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    return false;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnections(): Promise<void> {
  try {
    await Promise.all([
      pgPool?.end(),
      mongoClient?.close(),
      redisClient?.quit(),
    ]);
    console.log('🔌 All database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}
