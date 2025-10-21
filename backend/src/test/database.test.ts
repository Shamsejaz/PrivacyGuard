import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import {
  initializePostgreSQL,
  initializeMongoDB,
  initializeRedis,
  checkPostgreSQLHealth,
  checkMongoDBHealth,
  checkRedisHealth,
  closeDatabaseConnections,
  pgPool,
  mongoClient,
  redisClient
} from '../config/database';
import { DatabaseMigrator } from '../database/migrator';
import { MongoDBSetup } from '../database/mongodb-setup';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Initialize all database connections for testing
    await initializePostgreSQL();
    await initializeMongoDB();
    await initializeRedis();
  });

  afterAll(async () => {
    // Clean up database connections
    await closeDatabaseConnections();
  });

  describe('PostgreSQL Connection', () => {
    it('should connect to PostgreSQL successfully', async () => {
      expect(pgPool).toBeInstanceOf(Pool);
      
      const client = await pgPool.connect();
      expect(client).toBeDefined();
      
      const result = await client.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
      
      client.release();
    });

    it('should pass PostgreSQL health check', async () => {
      const isHealthy = await checkPostgreSQLHealth();
      expect(isHealthy).toBe(true);
    });

    it('should handle PostgreSQL connection pooling', async () => {
      const promises = Array.from({ length: 10 }, async () => {
        const client = await pgPool.connect();
        const result = await client.query('SELECT NOW() as timestamp');
        client.release();
        return result.rows[0].timestamp;
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(timestamp => {
        expect(timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle PostgreSQL query errors gracefully', async () => {
      const client = await pgPool.connect();
      
      try {
        await client.query('SELECT * FROM non_existent_table');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('relation "non_existent_table" does not exist');
      } finally {
        client.release();
      }
    });
  });

  describe('MongoDB Connection', () => {
    it('should connect to MongoDB successfully', async () => {
      expect(mongoClient).toBeInstanceOf(MongoClient);
      
      const db = mongoClient.db();
      const collections = await db.listCollections().toArray();
      expect(Array.isArray(collections)).toBe(true);
    });

    it('should pass MongoDB health check', async () => {
      const isHealthy = await checkMongoDBHealth();
      expect(isHealthy).toBe(true);
    });

    it('should perform basic MongoDB operations', async () => {
      const db = mongoClient.db();
      const testCollection = db.collection('test_collection');
      
      // Insert test document
      const insertResult = await testCollection.insertOne({
        test: true,
        timestamp: new Date(),
        data: { key: 'value' }
      });
      
      expect(insertResult.insertedId).toBeDefined();
      
      // Find test document
      const document = await testCollection.findOne({ _id: insertResult.insertedId });
      expect(document).toBeDefined();
      expect(document?.test).toBe(true);
      
      // Update test document
      const updateResult = await testCollection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { updated: true } }
      );
      expect(updateResult.modifiedCount).toBe(1);
      
      // Delete test document
      const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
      expect(deleteResult.deletedCount).toBe(1);
    });

    it('should handle MongoDB connection errors gracefully', async () => {
      const db = mongoClient.db();
      const testCollection = db.collection('test_collection');
      
      try {
        // Try to perform an invalid operation
        await testCollection.findOne({ $invalid: 'operator' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('unknown operator');
      }
    });
  });

  describe('Redis Connection', () => {
    it('should connect to Redis successfully', async () => {
      expect(redisClient.isOpen).toBe(true);
      
      const pong = await redisClient.ping();
      expect(pong).toBe('PONG');
    });

    it('should pass Redis health check', async () => {
      const isHealthy = await checkRedisHealth();
      expect(isHealthy).toBe(true);
    });

    it('should perform basic Redis operations', async () => {
      const testKey = 'test:key';
      const testValue = 'test_value';
      
      // Set value
      await redisClient.set(testKey, testValue);
      
      // Get value
      const retrievedValue = await redisClient.get(testKey);
      expect(retrievedValue).toBe(testValue);
      
      // Set with expiration
      await redisClient.setEx(`${testKey}:expiring`, 1, testValue);
      
      // Check if key exists
      const exists = await redisClient.exists(`${testKey}:expiring`);
      expect(exists).toBe(1);
      
      // Delete key
      await redisClient.del(testKey);
      
      const deletedValue = await redisClient.get(testKey);
      expect(deletedValue).toBeNull();
    });

    it('should handle Redis pub/sub operations', async () => {
      const channel = 'test_channel';
      const message = 'test_message';
      
      let receivedMessage: string | null = null;
      
      // Create subscriber
      const subscriber = redisClient.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe(channel, (receivedMsg) => {
        receivedMessage = receivedMsg;
      });
      
      // Publish message
      await redisClient.publish(channel, message);
      
      // Wait a bit for message to be received
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(receivedMessage).toBe(message);
      
      // Cleanup
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
    });
  });

  describe('Database Migration System', () => {
    it('should initialize migrations table', async () => {
      const migrator = new DatabaseMigrator(pgPool);
      
      // This will create the migrations table if it doesn't exist
      await migrator.status();
      
      // Check if migrations table exists
      const result = await pgPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'schema_migrations'
        );
      `);
      
      expect(result.rows[0].exists).toBe(true);
    });

    it('should track migration status', async () => {
      const migrator = new DatabaseMigrator(pgPool);
      
      // Get migration status (this should not throw)
      await expect(migrator.status()).resolves.not.toThrow();
    });
  });

  describe('MongoDB Setup System', () => {
    it('should initialize MongoDB collections and indexes', async () => {
      const mongoSetup = new MongoDBSetup(mongoClient, 'privacyguard_test');
      
      // Initialize collections and indexes
      await mongoSetup.initialize();
      
      // Validate setup
      const isValid = await mongoSetup.validateSetup();
      expect(isValid).toBe(true);
    });

    it('should create sample documents', async () => {
      const mongoSetup = new MongoDBSetup(mongoClient, 'privacyguard_test');
      
      // Create sample documents
      await mongoSetup.createSampleDocuments();
      
      const db = mongoClient.db('privacyguard_test');
      
      // Check if sample policy document exists
      const policyCount = await db.collection('policy_documents').countDocuments();
      expect(policyCount).toBeGreaterThan(0);
      
      // Check if sample analytics document exists
      const analyticsCount = await db.collection('analytics').countDocuments();
      expect(analyticsCount).toBeGreaterThan(0);
    });
  });

  describe('Connection Error Handling', () => {
    it('should handle PostgreSQL connection timeout', async () => {
      // Create a pool with very short timeout for testing
      const testPool = new Pool({
        host: 'localhost',
        port: 5432,
        database: 'privacyguard_test',
        user: 'privacyguard_user',
        password: 'test_password',
        connectionTimeoutMillis: 1, // Very short timeout
        max: 1
      });

      try {
        // This should timeout quickly
        await testPool.connect();
      } catch (error: any) {
        expect(error.message).toContain('timeout');
      } finally {
        await testPool.end();
      }
    });

    it('should handle MongoDB connection errors', async () => {
      // Try to connect to non-existent MongoDB instance
      const testClient = new MongoClient('mongodb://localhost:99999/test', {
        serverSelectionTimeoutMS: 1000
      });

      try {
        await testClient.connect();
        expect.fail('Should have thrown a connection error');
      } catch (error: any) {
        expect(error.message).toContain('ECONNREFUSED');
      } finally {
        await testClient.close();
      }
    });

    it('should handle Redis connection errors', async () => {
      // Try to connect to non-existent Redis instance
      const testClient = createClient({
        socket: {
          host: 'localhost',
          port: 99999,
          connectTimeout: 1000
        }
      });

      try {
        await testClient.connect();
        expect.fail('Should have thrown a connection error');
      } catch (error: any) {
        expect(error.message).toContain('ECONNREFUSED');
      } finally {
        await testClient.quit().catch(() => {});
      }
    });
  });
});
