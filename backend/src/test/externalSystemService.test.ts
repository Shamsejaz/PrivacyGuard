import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExternalSystemService } from '../services/ExternalSystemService';
import type { DatabaseConnection, DataSyncConfig } from '../services/ExternalSystemService';

// Mock dependencies
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn()
    }),
    end: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue({
      admin: vi.fn().mockReturnValue({
        ping: vi.fn().mockResolvedValue(undefined)
      })
    }),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('mysql2/promise', () => ({
  default: {
    createPool: vi.fn().mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        execute: vi.fn().mockResolvedValue([]),
        release: vi.fn()
      }),
      end: vi.fn().mockResolvedValue(undefined)
    }))
  }
}));

describe('ExternalSystemService', () => {
  let service: ExternalSystemService;

  beforeEach(() => {
    service = new ExternalSystemService();
  });

  afterEach(async () => {
    await service.cleanup();
  });

  describe('Database Connection Management', () => {
    it('should create a PostgreSQL connection successfully', async () => {
      const connection: DatabaseConnection = {
        id: 'test-pg-1',
        name: 'Test PostgreSQL',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass',
          ssl: false,
          maxConnections: 10,
          connectionTimeout: 5000
        },
        status: 'disconnected'
      };

      await expect(service.createConnection(connection)).resolves.not.toThrow();
      
      const connections = service.getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].id).toBe('test-pg-1');
      expect(connections[0].status).toBe('connected');
    });

    it('should create a MongoDB connection successfully', async () => {
      const connection: DatabaseConnection = {
        id: 'test-mongo-1',
        name: 'Test MongoDB',
        type: 'mongodb',
        config: {
          host: 'localhost',
          port: 27017,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass',
          authSource: 'admin',
          maxConnections: 10
        },
        status: 'disconnected'
      };

      await expect(service.createConnection(connection)).resolves.not.toThrow();
      
      const connections = service.getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].type).toBe('mongodb');
    });

    it('should create a MySQL connection successfully', async () => {
      const connection: DatabaseConnection = {
        id: 'test-mysql-1',
        name: 'Test MySQL',
        type: 'mysql',
        config: {
          host: 'localhost',
          port: 3306,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass',
          charset: 'utf8mb4',
          maxConnections: 10
        },
        status: 'disconnected'
      };

      await expect(service.createConnection(connection)).resolves.not.toThrow();
      
      const connections = service.getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].type).toBe('mysql');
    });

    it('should handle connection creation errors', async () => {
      const connection: DatabaseConnection = {
        id: 'test-invalid',
        name: 'Invalid Connection',
        type: 'postgresql',
        config: {
          host: 'invalid-host',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      // Mock connection failure
      const mockPool = {
        connect: vi.fn().mockRejectedValue(new Error('Connection failed'))
      };
      vi.mocked(require('pg').Pool).mockImplementationOnce(() => mockPool);

      await expect(service.createConnection(connection)).rejects.toThrow('Connection failed');
      
      const connections = service.getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0].status).toBe('error');
    });

    it('should test connection health', async () => {
      const connection: DatabaseConnection = {
        id: 'test-health',
        name: 'Health Test',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      await service.createConnection(connection);
      
      const isHealthy = await service.testConnection('test-health');
      expect(isHealthy).toBe(true);
    });

    it('should remove connections', async () => {
      const connection: DatabaseConnection = {
        id: 'test-remove',
        name: 'Remove Test',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      await service.createConnection(connection);
      expect(service.getConnections()).toHaveLength(1);
      
      await service.removeConnection('test-remove');
      expect(service.getConnections()).toHaveLength(0);
    });

    it('should get connection health for all connections', async () => {
      const connection1: DatabaseConnection = {
        id: 'test-health-1',
        name: 'Health Test 1',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      const connection2: DatabaseConnection = {
        id: 'test-health-2',
        name: 'Health Test 2',
        type: 'mongodb',
        config: {
          host: 'localhost',
          port: 27017,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      await service.createConnection(connection1);
      await service.createConnection(connection2);
      
      const health = await service.getConnectionHealth();
      expect(health).toHaveProperty('test-health-1');
      expect(health).toHaveProperty('test-health-2');
      expect(health['test-health-1']).toBe(true);
      expect(health['test-health-2']).toBe(true);
    });
  });

  describe('Data Synchronization', () => {
    beforeEach(async () => {
      // Create test connections
      const sourceConnection: DatabaseConnection = {
        id: 'source-db',
        name: 'Source Database',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'sourcedb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      const targetConnection: DatabaseConnection = {
        id: 'target-db',
        name: 'Target Database',
        type: 'mongodb',
        config: {
          host: 'localhost',
          port: 27017,
          database: 'targetdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      await service.createConnection(sourceConnection);
      await service.createConnection(targetConnection);
    });

    it('should create a sync job', async () => {
      const syncConfig: DataSyncConfig = {
        sourceConnectionId: 'source-db',
        targetConnectionId: 'target-db',
        syncType: 'full',
        conflictResolution: 'source-wins',
        transformations: [],
        filters: []
      };

      const syncId = await service.createSyncJob(syncConfig);
      expect(syncId).toBeDefined();
      expect(syncId).toMatch(/^sync_/);
      
      const jobs = service.getSyncJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe(syncId);
    });

    it('should execute a full sync job', async () => {
      const syncConfig: DataSyncConfig = {
        sourceConnectionId: 'source-db',
        targetConnectionId: 'target-db',
        syncType: 'full',
        conflictResolution: 'source-wins'
      };

      const syncId = await service.createSyncJob(syncConfig);
      const result = await service.executeSyncJob(syncId);
      
      expect(result.syncId).toBe(syncId);
      expect(result.status).toBe('success');
      expect(result.startTime).toBeDefined();
      expect(result.endTime).toBeDefined();
    });

    it('should execute an incremental sync job', async () => {
      const syncConfig: DataSyncConfig = {
        sourceConnectionId: 'source-db',
        targetConnectionId: 'target-db',
        syncType: 'incremental',
        conflictResolution: 'timestamp'
      };

      const syncId = await service.createSyncJob(syncConfig);
      const result = await service.executeSyncJob(syncId);
      
      expect(result.syncId).toBe(syncId);
      expect(result.status).toBe('success');
    });

    it('should execute a real-time sync job', async () => {
      const syncConfig: DataSyncConfig = {
        sourceConnectionId: 'source-db',
        targetConnectionId: 'target-db',
        syncType: 'real-time',
        conflictResolution: 'manual'
      };

      const syncId = await service.createSyncJob(syncConfig);
      const result = await service.executeSyncJob(syncId);
      
      expect(result.syncId).toBe(syncId);
      expect(result.status).toBe('success');
    });

    it('should handle sync job execution errors', async () => {
      const syncConfig: DataSyncConfig = {
        sourceConnectionId: 'invalid-source',
        targetConnectionId: 'target-db',
        syncType: 'full',
        conflictResolution: 'source-wins'
      };

      const syncId = await service.createSyncJob(syncConfig);
      const result = await service.executeSyncJob(syncId);
      
      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Source or target connection not available');
    });

    it('should remove sync jobs', async () => {
      const syncConfig: DataSyncConfig = {
        sourceConnectionId: 'source-db',
        targetConnectionId: 'target-db',
        syncType: 'full',
        conflictResolution: 'source-wins'
      };

      const syncId = await service.createSyncJob(syncConfig);
      expect(service.getSyncJobs()).toHaveLength(1);
      
      await service.removeSyncJob(syncId);
      expect(service.getSyncJobs()).toHaveLength(0);
    });
  });

  describe('Event Handling', () => {
    it('should emit connection events', async () => {
      const connectionCreatedSpy = vi.fn();
      const connectionErrorSpy = vi.fn();
      
      service.on('connection:created', connectionCreatedSpy);
      service.on('connection:error', connectionErrorSpy);

      const connection: DatabaseConnection = {
        id: 'test-events',
        name: 'Event Test',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      await service.createConnection(connection);
      
      expect(connectionCreatedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-events',
          status: 'connected'
        })
      );
    });

    it('should emit sync events', async () => {
      const syncJobCreatedSpy = vi.fn();
      const syncStartedSpy = vi.fn();
      const syncCompletedSpy = vi.fn();
      
      service.on('sync:job_created', syncJobCreatedSpy);
      service.on('sync:started', syncStartedSpy);
      service.on('sync:completed', syncCompletedSpy);

      // Create connections first
      const sourceConnection: DatabaseConnection = {
        id: 'source-events',
        name: 'Source Events',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'sourcedb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      const targetConnection: DatabaseConnection = {
        id: 'target-events',
        name: 'Target Events',
        type: 'mongodb',
        config: {
          host: 'localhost',
          port: 27017,
          database: 'targetdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      await service.createConnection(sourceConnection);
      await service.createConnection(targetConnection);

      const syncConfig: DataSyncConfig = {
        sourceConnectionId: 'source-events',
        targetConnectionId: 'target-events',
        syncType: 'full',
        conflictResolution: 'source-wins'
      };

      const syncId = await service.createSyncJob(syncConfig);
      expect(syncJobCreatedSpy).toHaveBeenCalled();

      await service.executeSyncJob(syncId);
      expect(syncStartedSpy).toHaveBeenCalled();
      expect(syncCompletedSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported database types', async () => {
      const connection = {
        id: 'test-unsupported',
        name: 'Unsupported DB',
        type: 'unsupported' as any,
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected' as const
      };

      await expect(service.createConnection(connection)).rejects.toThrow('Unsupported database type: unsupported');
    });

    it('should handle missing connections in sync jobs', async () => {
      const syncConfig: DataSyncConfig = {
        sourceConnectionId: 'non-existent-source',
        targetConnectionId: 'non-existent-target',
        syncType: 'full',
        conflictResolution: 'source-wins'
      };

      const syncId = await service.createSyncJob(syncConfig);
      const result = await service.executeSyncJob(syncId);
      
      expect(result.status).toBe('failed');
      expect(result.errors[0]).toContain('Source or target connection not available');
    });

    it('should handle non-existent sync jobs', async () => {
      await expect(service.executeSyncJob('non-existent-sync')).rejects.toThrow('Sync job not found: non-existent-sync');
    });

    it('should handle connection test failures', async () => {
      const connection: DatabaseConnection = {
        id: 'test-fail',
        name: 'Fail Test',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        },
        status: 'disconnected'
      };

      await service.createConnection(connection);

      // Mock connection test failure
      const mockPool = {
        connect: vi.fn().mockRejectedValue(new Error('Connection test failed'))
      };
      
      // Replace the connection with a failing one
      service['connections'].set('test-fail', mockPool);

      const isHealthy = await service.testConnection('test-fail');
      expect(isHealthy).toBe(false);
      
      const updatedConnection = service.getConnection('test-fail');
      expect(updatedConnection?.status).toBe('error');
    });
  });
});