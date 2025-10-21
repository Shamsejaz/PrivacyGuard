import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import * as mysql from 'mysql2/promise';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export interface DatabaseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'mongodb' | 'mysql';
  config: DatabaseConfig;
  status: 'connected' | 'disconnected' | 'error' | 'connecting';
  lastConnected?: Date;
  lastError?: string;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  maxConnections?: number;
  // MongoDB specific
  authSource?: string;
  replicaSet?: string;
  // MySQL specific
  charset?: string;
  timezone?: string;
}

export interface DataSyncConfig {
  sourceConnectionId: string;
  targetConnectionId: string;
  syncType: 'full' | 'incremental' | 'real-time';
  schedule?: string; // cron expression
  conflictResolution: 'source-wins' | 'target-wins' | 'manual' | 'timestamp';
  transformations?: DataTransformation[];
  filters?: DataFilter[];
}

export interface DataTransformation {
  field: string;
  operation: 'map' | 'format' | 'calculate' | 'combine';
  config: Record<string, any>;
}

export interface DataFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface SyncResult {
  syncId: string;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  conflicts: ConflictRecord[];
  errors: string[];
  startTime: Date;
  endTime: Date;
}

export interface ConflictRecord {
  id: string;
  table: string;
  sourceData: Record<string, any>;
  targetData: Record<string, any>;
  conflictType: 'update' | 'delete' | 'duplicate';
  resolution?: 'source' | 'target' | 'manual';
}

export class ExternalSystemService extends EventEmitter {
  private connections: Map<string, any> = new Map();
  private connectionConfigs: Map<string, DatabaseConnection> = new Map();
  private syncJobs: Map<string, DataSyncConfig> = new Map();

  constructor() {
    super();
  }

  // Database Connection Management
  async createConnection(connection: DatabaseConnection): Promise<void> {
    try {
      this.connectionConfigs.set(connection.id, {
        ...connection,
        status: 'connecting'
      });

      let client: any;
      
      switch (connection.type) {
        case 'postgresql':
          client = await this.createPostgreSQLConnection(connection.config);
          break;
        case 'mongodb':
          client = await this.createMongoDBConnection(connection.config);
          break;
        case 'mysql':
          client = await this.createMySQLConnection(connection.config);
          break;
        default:
          throw new Error(`Unsupported database type: ${connection.type}`);
      }

      this.connections.set(connection.id, client);
      
      const updatedConnection = {
        ...connection,
        status: 'connected' as const,
        lastConnected: new Date()
      };
      
      this.connectionConfigs.set(connection.id, updatedConnection);
      
      this.emit('connection:created', updatedConnection);
      logger.info(`External database connection created: ${connection.name}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const failedConnection = {
        ...connection,
        status: 'error' as const,
        lastError: errorMessage
      };
      
      this.connectionConfigs.set(connection.id, failedConnection);
      this.emit('connection:error', failedConnection);
      
      logger.error(`Failed to create external database connection: ${connection.name}`, error);
      throw error;
    }
  }

  private async createPostgreSQLConnection(config: DatabaseConfig): Promise<Pool> {
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      max: config.maxConnections || 10,
      connectionTimeoutMillis: config.connectionTimeout || 5000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    return pool;
  }

  private async createMongoDBConnection(config: DatabaseConfig): Promise<MongoClient> {
    const uri = `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
    
    const client = new MongoClient(uri, {
      maxPoolSize: config.maxConnections || 10,
      serverSelectionTimeoutMS: config.connectionTimeout || 5000,
      authSource: config.authSource || config.database,
      replicaSet: config.replicaSet,
    });

    await client.connect();
    await client.db().admin().ping();

    return client;
  }

  private async createMySQLConnection(config: DatabaseConfig): Promise<mysql.Pool> {
    const pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? (typeof config.ssl === 'boolean' ? (config.ssl ? {} : undefined) : config.ssl) : undefined,
      connectionLimit: config.maxConnections || 10,
      // timeout: config.connectionTimeout || 5000, // Not supported in mysql2
      charset: config.charset || 'utf8mb4',
      timezone: config.timezone || 'Z',
    });

    // Test connection
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();

    return pool;
  }

  async testConnection(connectionId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId);
      const config = this.connectionConfigs.get(connectionId);
      
      if (!connection || !config) {
        throw new Error('Connection not found');
      }

      switch (config.type) {
        case 'postgresql':
          const pgClient = await connection.connect();
          await pgClient.query('SELECT 1');
          pgClient.release();
          break;
        case 'mongodb':
          await connection.db().admin().ping();
          break;
        case 'mysql':
          const mysqlConnection = await connection.getConnection();
          await mysqlConnection.execute('SELECT 1');
          mysqlConnection.release();
          break;
      }

      // Update connection status
      const updatedConfig = {
        ...config,
        status: 'connected' as const,
        lastConnected: new Date(),
        lastError: undefined
      };
      
      this.connectionConfigs.set(connectionId, updatedConfig);
      this.emit('connection:tested', updatedConfig);
      
      return true;
    } catch (error) {
      const config = this.connectionConfigs.get(connectionId);
      if (config) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const updatedConfig = {
          ...config,
          status: 'error' as const,
          lastError: errorMessage
        };
        
        this.connectionConfigs.set(connectionId, updatedConfig);
        this.emit('connection:error', updatedConfig);
      }
      
      logger.error(`Connection test failed for ${connectionId}:`, error);
      return false;
    }
  }

  async removeConnection(connectionId: string): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      const config = this.connectionConfigs.get(connectionId);
      
      if (connection && config) {
        // Close connection based on type
        switch (config.type) {
          case 'postgresql':
            await connection.end();
            break;
          case 'mongodb':
            await connection.close();
            break;
          case 'mysql':
            await connection.end();
            break;
        }
      }

      this.connections.delete(connectionId);
      this.connectionConfigs.delete(connectionId);
      
      this.emit('connection:removed', connectionId);
      logger.info(`External database connection removed: ${connectionId}`);
      
    } catch (error) {
      logger.error(`Failed to remove connection ${connectionId}:`, error);
      throw error;
    }
  }

  getConnections(): DatabaseConnection[] {
    return Array.from(this.connectionConfigs.values());
  }

  getConnection(connectionId: string): DatabaseConnection | undefined {
    return this.connectionConfigs.get(connectionId);
  }

  // Data Synchronization
  async createSyncJob(config: DataSyncConfig): Promise<string> {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.syncJobs.set(syncId, config);
    
    this.emit('sync:job_created', { syncId, config });
    logger.info(`Data sync job created: ${syncId}`);
    
    return syncId;
  }

  async executeSyncJob(syncId: string): Promise<SyncResult> {
    const config = this.syncJobs.get(syncId);
    if (!config) {
      throw new Error(`Sync job not found: ${syncId}`);
    }

    const startTime = new Date();
    
    try {
      this.emit('sync:started', { syncId, config });
      
      const sourceConnection = this.connections.get(config.sourceConnectionId);
      const targetConnection = this.connections.get(config.targetConnectionId);
      
      if (!sourceConnection || !targetConnection) {
        throw new Error('Source or target connection not available');
      }

      // Execute synchronization based on type
      let result: SyncResult;
      
      switch (config.syncType) {
        case 'full':
          result = await this.executeFullSync(syncId, config, sourceConnection, targetConnection);
          break;
        case 'incremental':
          result = await this.executeIncrementalSync(syncId, config, sourceConnection, targetConnection);
          break;
        case 'real-time':
          result = await this.executeRealTimeSync(syncId, config, sourceConnection, targetConnection);
          break;
        default:
          throw new Error(`Unsupported sync type: ${config.syncType}`);
      }

      result.startTime = startTime;
      result.endTime = new Date();
      
      this.emit('sync:completed', result);
      logger.info(`Data sync completed: ${syncId}`, result);
      
      return result;
      
    } catch (error) {
      const result: SyncResult = {
        syncId,
        status: 'failed',
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        conflicts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        startTime,
        endTime: new Date()
      };
      
      this.emit('sync:failed', result);
      logger.error(`Data sync failed: ${syncId}`, error);
      
      return result;
    }
  }

  private async executeFullSync(
    syncId: string,
    config: DataSyncConfig,
    sourceConnection: any,
    targetConnection: any
  ): Promise<SyncResult> {
    // Implementation for full synchronization
    // This is a simplified version - real implementation would be more complex
    
    const result: SyncResult = {
      syncId,
      status: 'success',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      conflicts: [],
      errors: [],
      startTime: new Date(),
      endTime: new Date()
    };

    // TODO: Implement actual sync logic based on database types
    logger.info(`Executing full sync for job: ${syncId}`);
    
    return result;
  }

  private async executeIncrementalSync(
    syncId: string,
    config: DataSyncConfig,
    sourceConnection: any,
    targetConnection: any
  ): Promise<SyncResult> {
    // Implementation for incremental synchronization
    
    const result: SyncResult = {
      syncId,
      status: 'success',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      conflicts: [],
      errors: [],
      startTime: new Date(),
      endTime: new Date()
    };

    // TODO: Implement actual incremental sync logic
    logger.info(`Executing incremental sync for job: ${syncId}`);
    
    return result;
  }

  private async executeRealTimeSync(
    syncId: string,
    config: DataSyncConfig,
    sourceConnection: any,
    targetConnection: any
  ): Promise<SyncResult> {
    // Implementation for real-time synchronization
    
    const result: SyncResult = {
      syncId,
      status: 'success',
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      conflicts: [],
      errors: [],
      startTime: new Date(),
      endTime: new Date()
    };

    // TODO: Implement actual real-time sync logic
    logger.info(`Executing real-time sync for job: ${syncId}`);
    
    return result;
  }

  getSyncJobs(): Array<{ id: string; config: DataSyncConfig }> {
    return Array.from(this.syncJobs.entries()).map(([id, config]) => ({ id, config }));
  }

  async removeSyncJob(syncId: string): Promise<void> {
    this.syncJobs.delete(syncId);
    this.emit('sync:job_removed', syncId);
    logger.info(`Sync job removed: ${syncId}`);
  }

  // Health monitoring
  async getConnectionHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [id, config] of this.connectionConfigs.entries()) {
      try {
        health[id] = await this.testConnection(id);
      } catch (error) {
        health[id] = false;
      }
    }
    
    return health;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    const connectionIds = Array.from(this.connections.keys());
    
    for (const connectionId of connectionIds) {
      try {
        await this.removeConnection(connectionId);
      } catch (error) {
        logger.error(`Error cleaning up connection ${connectionId}:`, error);
      }
    }
    
    this.syncJobs.clear();
    logger.info('External system service cleanup completed');
  }
}

export const externalSystemService = new ExternalSystemService();