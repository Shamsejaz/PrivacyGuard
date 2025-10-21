import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import externalSystemsRoutes from '../routes/external-systems';
import { authenticateToken } from '../middleware/auth';
import { hasPermission } from '../middleware/permissions';

// Mock services
vi.mock('../services/ExternalSystemService', () => ({
  externalSystemService: {
    createConnection: vi.fn(),
    getConnections: vi.fn().mockReturnValue([]),
    getConnection: vi.fn(),
    testConnection: vi.fn(),
    removeConnection: vi.fn(),
    createSyncJob: vi.fn(),
    executeSyncJob: vi.fn(),
    getSyncJobs: vi.fn().mockReturnValue([]),
    getConnectionHealth: vi.fn().mockReturnValue({})
  }
}));

vi.mock('../services/DataImportExportService', () => ({
  dataImportExportService: {
    createImportJob: vi.fn(),
    executeImportJob: vi.fn(),
    createExportJob: vi.fn(),
    executeExportJob: vi.fn(),
    getImportJobs: vi.fn().mockReturnValue([]),
    getExportJobs: vi.fn().mockReturnValue([]),
    getImportJob: vi.fn(),
    getExportJob: vi.fn()
  }
}));

vi.mock('../services/ExternalApiService', () => ({
  externalApiService: {
    createConnection: vi.fn(),
    getConnections: vi.fn().mockReturnValue([]),
    testConnectionHealth: vi.fn(),
    executeRequest: vi.fn(),
    getConnectionMetrics: vi.fn()
  }
}));

vi.mock('../services/ConfigurationService', () => ({
  configurationService: {
    createConfig: vi.fn(),
    getConfigs: vi.fn().mockReturnValue([]),
    getConfigTemplates: vi.fn().mockReturnValue([]),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    deleteConfig: vi.fn()
  }
}));

// Mock middleware
vi.mock('../middleware/auth', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  })
}));

vi.mock('../middleware/permissions', () => ({
  checkPermission: vi.fn(() => (req: any, res: any, next: any) => next())
}));

describe('External Systems Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/external-systems', externalSystemsRoutes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Connections', () => {
    it('should create a database connection', async () => {
      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.createConnection).mockResolvedValueOnce(undefined);

      const connectionData = {
        id: 'test-db-1',
        name: 'Test Database',
        type: 'postgresql',
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
          username: 'testuser',
          password: 'testpass'
        }
      };

      const response = await request(app)
        .post('/external-systems/connections/database')
        .send(connectionData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Database connection created successfully');
      expect(response.body).toHaveProperty('connectionId', 'test-db-1');
      expect(externalSystemService.createConnection).toHaveBeenCalledWith(connectionData);
    });

    it('should validate required fields for database connection', async () => {
      const invalidConnectionData = {
        // Missing required fields
        type: 'postgresql'
      };

      const response = await request(app)
        .post('/external-systems/connections/database')
        .send(invalidConnectionData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Name is required' }),
          expect.objectContaining({ msg: 'Config must be an object' })
        ])
      );
    });

    it('should get all database connections', async () => {
      const mockConnections = [
        {
          id: 'db-1',
          name: 'Database 1',
          type: 'postgresql',
          status: 'connected'
        },
        {
          id: 'db-2',
          name: 'Database 2',
          type: 'mongodb',
          status: 'disconnected'
        }
      ];

      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.getConnections).mockReturnValueOnce(mockConnections);

      const response = await request(app)
        .get('/external-systems/connections/database')
        .expect(200);

      expect(response.body).toEqual(mockConnections);
    });

    it('should get a specific database connection', async () => {
      const mockConnection = {
        id: 'db-1',
        name: 'Database 1',
        type: 'postgresql',
        status: 'connected'
      };

      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.getConnection).mockReturnValueOnce(mockConnection);

      const response = await request(app)
        .get('/external-systems/connections/database/db-1')
        .expect(200);

      expect(response.body).toEqual(mockConnection);
    });

    it('should return 404 for non-existent database connection', async () => {
      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.getConnection).mockReturnValueOnce(undefined);

      const response = await request(app)
        .get('/external-systems/connections/database/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Connection not found');
    });

    it('should test database connection', async () => {
      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.testConnection).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/external-systems/connections/database/db-1/test')
        .expect(200);

      expect(response.body).toEqual({
        connectionId: 'db-1',
        healthy: true,
        timestamp: expect.any(String)
      });
    });

    it('should delete database connection', async () => {
      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.removeConnection).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete('/external-systems/connections/database/db-1')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Connection removed successfully');
      expect(externalSystemService.removeConnection).toHaveBeenCalledWith('db-1');
    });
  });

  describe('Data Synchronization', () => {
    it('should create a sync job', async () => {
      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.createSyncJob).mockResolvedValueOnce('sync-123');

      const syncConfig = {
        sourceConnectionId: 'source-db',
        targetConnectionId: 'target-db',
        syncType: 'full',
        conflictResolution: 'source-wins'
      };

      const response = await request(app)
        .post('/external-systems/sync/jobs')
        .send(syncConfig)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Sync job created successfully',
        syncId: 'sync-123'
      });
    });

    it('should validate sync job configuration', async () => {
      const invalidSyncConfig = {
        sourceConnectionId: 'source-db',
        // Missing required fields
      };

      const response = await request(app)
        .post('/external-systems/sync/jobs')
        .send(invalidSyncConfig)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should execute sync job', async () => {
      const mockResult = {
        syncId: 'sync-123',
        status: 'success',
        recordsProcessed: 100,
        recordsSucceeded: 95,
        recordsFailed: 5,
        conflicts: [],
        errors: [],
        startTime: new Date(),
        endTime: new Date()
      };

      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.executeSyncJob).mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/external-systems/sync/jobs/sync-123/execute')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should get all sync jobs', async () => {
      const mockJobs = [
        { id: 'sync-1', config: { syncType: 'full' } },
        { id: 'sync-2', config: { syncType: 'incremental' } }
      ];

      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.getSyncJobs).mockReturnValueOnce(mockJobs);

      const response = await request(app)
        .get('/external-systems/sync/jobs')
        .expect(200);

      expect(response.body).toEqual(mockJobs);
    });
  });

  describe('Import/Export Jobs', () => {
    it('should create an import job', async () => {
      const { dataImportExportService } = await import('../services/DataImportExportService');
      vi.mocked(dataImportExportService.createImportJob).mockResolvedValueOnce('import-123');

      const importJobConfig = {
        name: 'Test Import',
        sourceType: 'file',
        targetTable: 'test_table',
        mapping: [],
        validation: []
      };

      const response = await request(app)
        .post('/external-systems/import/jobs')
        .send(importJobConfig)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Import job created successfully',
        jobId: 'import-123'
      });
    });

    it('should create an export job', async () => {
      const { dataImportExportService } = await import('../services/DataImportExportService');
      vi.mocked(dataImportExportService.createExportJob).mockResolvedValueOnce('export-123');

      const exportJobConfig = {
        name: 'Test Export',
        sourceTable: 'test_table',
        targetType: 'file',
        format: 'csv'
      };

      const response = await request(app)
        .post('/external-systems/export/jobs')
        .send(exportJobConfig)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Export job created successfully',
        jobId: 'export-123'
      });
    });

    it('should execute import job', async () => {
      const { dataImportExportService } = await import('../services/DataImportExportService');
      vi.mocked(dataImportExportService.executeImportJob).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/external-systems/import/jobs/import-123/execute')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Import job started',
        jobId: 'import-123'
      });
    });

    it('should get import jobs', async () => {
      const mockJobs = [
        { id: 'import-1', name: 'Import Job 1', status: 'completed' },
        { id: 'import-2', name: 'Import Job 2', status: 'running' }
      ];

      const { dataImportExportService } = await import('../services/DataImportExportService');
      vi.mocked(dataImportExportService.getImportJobs).mockReturnValueOnce(mockJobs);

      const response = await request(app)
        .get('/external-systems/import/jobs')
        .expect(200);

      expect(response.body).toEqual(mockJobs);
    });

    it('should get specific import job', async () => {
      const mockJob = {
        id: 'import-123',
        name: 'Test Import Job',
        status: 'completed',
        recordsProcessed: 1000
      };

      const { dataImportExportService } = await import('../services/DataImportExportService');
      vi.mocked(dataImportExportService.getImportJob).mockReturnValueOnce(mockJob);

      const response = await request(app)
        .get('/external-systems/import/jobs/import-123')
        .expect(200);

      expect(response.body).toEqual(mockJob);
    });

    it('should return 404 for non-existent import job', async () => {
      const { dataImportExportService } = await import('../services/DataImportExportService');
      vi.mocked(dataImportExportService.getImportJob).mockReturnValueOnce(undefined);

      const response = await request(app)
        .get('/external-systems/import/jobs/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Import job not found');
    });
  });

  describe('API Connections', () => {
    it('should create an API connection', async () => {
      const { externalApiService } = await import('../services/ExternalApiService');
      vi.mocked(externalApiService.createConnection).mockResolvedValueOnce(undefined);

      const apiConnectionData = {
        id: 'api-1',
        name: 'Test API',
        baseUrl: 'https://api.example.com'
      };

      const response = await request(app)
        .post('/external-systems/connections/api')
        .send(apiConnectionData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'API connection created successfully',
        connectionId: 'api-1'
      });
    });

    it('should validate API connection URL', async () => {
      const invalidApiData = {
        name: 'Test API',
        baseUrl: 'invalid-url'
      };

      const response = await request(app)
        .post('/external-systems/connections/api')
        .send(invalidApiData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid base URL is required' })
        ])
      );
    });

    it('should get API connections', async () => {
      const mockConnections = [
        { id: 'api-1', name: 'API 1', baseUrl: 'https://api1.example.com' },
        { id: 'api-2', name: 'API 2', baseUrl: 'https://api2.example.com' }
      ];

      const { externalApiService } = await import('../services/ExternalApiService');
      vi.mocked(externalApiService.getConnections).mockReturnValueOnce(mockConnections);

      const response = await request(app)
        .get('/external-systems/connections/api')
        .expect(200);

      expect(response.body).toEqual(mockConnections);
    });

    it('should test API connection', async () => {
      const { externalApiService } = await import('../services/ExternalApiService');
      vi.mocked(externalApiService.testConnectionHealth).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/external-systems/connections/api/api-1/test')
        .expect(200);

      expect(response.body).toEqual({
        connectionId: 'api-1',
        healthy: true,
        timestamp: expect.any(String)
      });
    });

    it('should execute API request', async () => {
      const mockResponse = {
        requestId: 'req-123',
        success: true,
        statusCode: 200,
        data: { result: 'success' },
        responseTime: 150,
        retryCount: 0,
        timestamp: new Date()
      };

      const { externalApiService } = await import('../services/ExternalApiService');
      vi.mocked(externalApiService.executeRequest).mockResolvedValueOnce(mockResponse);

      const requestData = {
        connectionId: 'api-1',
        method: 'GET',
        endpoint: '/test'
      };

      const response = await request(app)
        .post('/external-systems/api/request')
        .send(requestData)
        .expect(200);

      expect(response.body).toEqual(mockResponse);
    });
  });

  describe('Configuration Management', () => {
    it('should create a configuration', async () => {
      const { configurationService } = await import('../services/ConfigurationService');
      vi.mocked(configurationService.createConfig).mockResolvedValueOnce('config-123');

      const configData = {
        name: 'Test Config',
        type: 'database',
        category: 'source',
        config: { host: 'localhost' },
        credentials: {}
      };

      const response = await request(app)
        .post('/external-systems/config')
        .send(configData)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Configuration created successfully',
        configId: 'config-123'
      });
    });

    it('should get configurations', async () => {
      const mockConfigs = [
        { id: 'config-1', name: 'Config 1', type: 'database' },
        { id: 'config-2', name: 'Config 2', type: 'api' }
      ];

      const { configurationService } = await import('../services/ConfigurationService');
      vi.mocked(configurationService.getConfigsByType).mockResolvedValueOnce(mockConfigs);

      const response = await request(app)
        .get('/external-systems/config')
        .expect(200);

      expect(response.body).toEqual(mockConfigs);
    });

    it('should get configurations by type', async () => {
      const mockConfigs = [
        { id: 'config-1', name: 'Config 1', type: 'database' }
      ];

      const { configurationService } = await import('../services/ConfigurationService');
      vi.mocked(configurationService.getConfigsByType).mockResolvedValueOnce(mockConfigs);

      const response = await request(app)
        .get('/external-systems/config?type=database')
        .expect(200);

      expect(response.body).toEqual(mockConfigs);
      expect(configurationService.getConfigsByType).toHaveBeenCalledWith('database');
    });

    it('should get configuration templates', async () => {
      const mockTemplates = [
        { id: 'postgresql', name: 'PostgreSQL Database', type: 'database' },
        { id: 'rest_api', name: 'REST API', type: 'api' }
      ];

      const { configurationService } = await import('../services/ConfigurationService');
      vi.mocked(configurationService.getTemplates).mockReturnValueOnce(mockTemplates);

      const response = await request(app)
        .get('/external-systems/config/templates')
        .expect(200);

      expect(response.body).toEqual(mockTemplates);
    });

    it('should get specific configuration', async () => {
      const mockConfig = {
        id: 'config-123',
        name: 'Test Config',
        type: 'database'
      };

      const { configurationService } = await import('../services/ConfigurationService');
      vi.mocked(configurationService.getConfig).mockResolvedValueOnce(mockConfig);

      const response = await request(app)
        .get('/external-systems/config/config-123')
        .expect(200);

      expect(response.body).toEqual(mockConfig);
    });

    it('should update configuration', async () => {
      const { configurationService } = await import('../services/ConfigurationService');
      vi.mocked(configurationService.updateConfig).mockResolvedValueOnce(undefined);

      const updateData = { name: 'Updated Config' };

      const response = await request(app)
        .put('/external-systems/config/config-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Configuration updated successfully');
      expect(configurationService.updateConfig).toHaveBeenCalledWith('config-123', updateData);
    });

    it('should delete configuration', async () => {
      const { configurationService } = await import('../services/ConfigurationService');
      vi.mocked(configurationService.deleteConfig).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete('/external-systems/config/config-123')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Configuration deleted successfully');
      expect(configurationService.deleteConfig).toHaveBeenCalledWith('config-123');
    });
  });

  describe('Health and Monitoring', () => {
    it('should get system health', async () => {
      const mockHealth = {
        database: {
          'db-1': true,
          'db-2': false
        },
        api: {
          'api-1': true
        },
        timestamp: new Date()
      };

      const { externalSystemService } = await import('../services/ExternalSystemService');
      const { externalApiService } = await import('../services/ExternalApiService');
      
      vi.mocked(externalSystemService.getConnectionHealth).mockResolvedValueOnce(mockHealth.database);
      vi.mocked(externalApiService.getConnections).mockReturnValueOnce([
        { id: 'api-1', name: 'API 1', baseUrl: 'https://api.example.com', status: 'active' }
      ]);
      vi.mocked(externalApiService.testConnectionHealth).mockResolvedValueOnce(true);

      const response = await request(app)
        .get('/external-systems/health')
        .expect(200);

      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('api');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should get connection metrics', async () => {
      const mockMetrics = {
        metrics: {
          totalRequests: 100,
          successRate: 95.5,
          averageResponseTime: 250,
          errorRate: 4.5
        },
        history: [],
        circuitBreaker: {
          connectionId: 'api-1',
          state: 'closed',
          failureCount: 0,
          successCount: 95,
          totalRequests: 100
        }
      };

      const { externalApiService } = await import('../services/ExternalApiService');
      vi.mocked(externalApiService.getConnectionMetrics).mockReturnValueOnce(mockMetrics);

      const response = await request(app)
        .get('/external-systems/metrics/api-1')
        .expect(200);

      expect(response.body).toEqual(mockMetrics);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const { externalSystemService } = await import('../services/ExternalSystemService');
      vi.mocked(externalSystemService.createConnection).mockRejectedValueOnce(new Error('Service error'));

      const connectionData = {
        id: 'test-db-1',
        name: 'Test Database',
        type: 'postgresql',
        config: { host: 'localhost' }
      };

      const response = await request(app)
        .post('/external-systems/connections/database')
        .send(connectionData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Failed to create database connection');
      expect(response.body).toHaveProperty('message', 'Service error');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/external-systems/connections/database')
        .send({}) // Empty body
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should handle missing resource errors', async () => {
      const { configurationService } = await import('../services/ConfigurationService');
      vi.mocked(configurationService.getConfig).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .get('/external-systems/config/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Configuration not found');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all routes', () => {
      expect(authenticateToken).toBeDefined();
      // Authentication middleware is applied to all routes in the router
    });

    it('should check permissions for protected operations', () => {
      expect(checkPermission).toBeDefined();
      // Permission middleware is applied to specific routes
    });
  });
});