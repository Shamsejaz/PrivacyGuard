import { Router } from 'express';
import type { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { hasPermission, requireAnyPermission } from '../middleware/permissions';

// Create a simple permission check middleware
const checkPermission = (resource: string, action: string) => {
  return requireAnyPermission([`${resource}:${action}`]);
};
import { externalSystemService } from '../services/ExternalSystemService';
import { dataImportExportService } from '../services/DataImportExportService';
import { externalApiService } from '../services/ExternalApiService';
import { configurationService } from '../services/ConfigurationService';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Database Connections
router.post('/connections/database',
  checkPermission('external_systems', 'create'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('type').isIn(['postgresql', 'mongodb', 'mysql']).withMessage('Invalid database type'),
    body('config').isObject().withMessage('Config must be an object'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const connection = req.body;
      await externalSystemService.createConnection(connection);
      
      res.status(201).json({ 
        message: 'Database connection created successfully',
        connectionId: connection.id 
      });
    } catch (error) {
      logger.error('Failed to create database connection:', error);
      res.status(500).json({ 
        error: 'Failed to create database connection',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.get('/connections/database',
  checkPermission('external_systems', 'read'),
  async (req: Request, res: Response) => {
    try {
      const connections = externalSystemService.getConnections();
      res.json(connections);
    } catch (error) {
      logger.error('Failed to get database connections:', error);
      res.status(500).json({ error: 'Failed to get database connections' });
    }
  }
);

router.get('/connections/database/:id',
  checkPermission('external_systems', 'read'),
  [param('id').notEmpty().withMessage('Connection ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const connection = externalSystemService.getConnection(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      res.json(connection);
    } catch (error) {
      logger.error('Failed to get database connection:', error);
      res.status(500).json({ error: 'Failed to get database connection' });
    }
  }
);

router.post('/connections/database/:id/test',
  checkPermission('external_systems', 'update'),
  [param('id').notEmpty().withMessage('Connection ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const isHealthy = await externalSystemService.testConnection(req.params.id);
      res.json({ 
        connectionId: req.params.id,
        healthy: isHealthy,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to test database connection:', error);
      res.status(500).json({ error: 'Failed to test database connection' });
    }
  }
);

router.delete('/connections/database/:id',
  checkPermission('external_systems', 'delete'),
  [param('id').notEmpty().withMessage('Connection ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await externalSystemService.removeConnection(req.params.id);
      res.json({ message: 'Connection removed successfully' });
    } catch (error) {
      logger.error('Failed to remove database connection:', error);
      res.status(500).json({ error: 'Failed to remove database connection' });
    }
  }
);

// Data Synchronization
router.post('/sync/jobs',
  checkPermission('external_systems', 'create'),
  [
    body('sourceConnectionId').notEmpty().withMessage('Source connection ID is required'),
    body('targetConnectionId').notEmpty().withMessage('Target connection ID is required'),
    body('syncType').isIn(['full', 'incremental', 'real-time']).withMessage('Invalid sync type'),
    body('conflictResolution').isIn(['source-wins', 'target-wins', 'manual', 'timestamp']).withMessage('Invalid conflict resolution'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const syncId = await externalSystemService.createSyncJob(req.body);
      res.status(201).json({ 
        message: 'Sync job created successfully',
        syncId 
      });
    } catch (error) {
      logger.error('Failed to create sync job:', error);
      res.status(500).json({ error: 'Failed to create sync job' });
    }
  }
);

router.post('/sync/jobs/:id/execute',
  checkPermission('external_systems', 'update'),
  [param('id').notEmpty().withMessage('Sync job ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await externalSystemService.executeSyncJob(req.params.id);
      res.json(result);
    } catch (error) {
      logger.error('Failed to execute sync job:', error);
      res.status(500).json({ error: 'Failed to execute sync job' });
    }
  }
);

router.get('/sync/jobs',
  checkPermission('external_systems', 'read'),
  async (req: Request, res: Response) => {
    try {
      const jobs = externalSystemService.getSyncJobs();
      res.json(jobs);
    } catch (error) {
      logger.error('Failed to get sync jobs:', error);
      res.status(500).json({ error: 'Failed to get sync jobs' });
    }
  }
);

// Data Import/Export
router.post('/import/jobs',
  checkPermission('external_systems', 'create'),
  [
    body('name').notEmpty().withMessage('Job name is required'),
    body('sourceType').isIn(['file', 'database', 'api']).withMessage('Invalid source type'),
    body('targetTable').notEmpty().withMessage('Target table is required'),
    body('mapping').isArray().withMessage('Mapping must be an array'),
    body('validation').isArray().withMessage('Validation must be an array'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const jobId = await dataImportExportService.createImportJob(req.body);
      res.status(201).json({ 
        message: 'Import job created successfully',
        jobId 
      });
    } catch (error) {
      logger.error('Failed to create import job:', error);
      res.status(500).json({ error: 'Failed to create import job' });
    }
  }
);

router.post('/import/jobs/:id/execute',
  checkPermission('external_systems', 'update'),
  [param('id').notEmpty().withMessage('Job ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Execute import job asynchronously
      dataImportExportService.executeImportJob(req.params.id).catch(error => {
        logger.error(`Import job ${req.params.id} failed:`, error);
      });

      res.json({ 
        message: 'Import job started',
        jobId: req.params.id 
      });
    } catch (error) {
      logger.error('Failed to start import job:', error);
      res.status(500).json({ error: 'Failed to start import job' });
    }
  }
);

router.post('/export/jobs',
  checkPermission('external_systems', 'create'),
  [
    body('name').notEmpty().withMessage('Job name is required'),
    body('sourceTable').notEmpty().withMessage('Source table is required'),
    body('targetType').isIn(['file', 'database', 'api']).withMessage('Invalid target type'),
    body('format').isIn(['csv', 'json', 'xml', 'excel']).withMessage('Invalid format'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const jobId = await dataImportExportService.createExportJob(req.body);
      res.status(201).json({ 
        message: 'Export job created successfully',
        jobId 
      });
    } catch (error) {
      logger.error('Failed to create export job:', error);
      res.status(500).json({ error: 'Failed to create export job' });
    }
  }
);

router.post('/export/jobs/:id/execute',
  checkPermission('external_systems', 'update'),
  [param('id').notEmpty().withMessage('Job ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Execute export job asynchronously
      dataImportExportService.executeExportJob(req.params.id).catch(error => {
        logger.error(`Export job ${req.params.id} failed:`, error);
      });

      res.json({ 
        message: 'Export job started',
        jobId: req.params.id 
      });
    } catch (error) {
      logger.error('Failed to start export job:', error);
      res.status(500).json({ error: 'Failed to start export job' });
    }
  }
);

router.get('/import/jobs',
  checkPermission('external_systems', 'read'),
  async (req: Request, res: Response) => {
    try {
      const jobs = dataImportExportService.getImportJobs();
      res.json(jobs);
    } catch (error) {
      logger.error('Failed to get import jobs:', error);
      res.status(500).json({ error: 'Failed to get import jobs' });
    }
  }
);

router.get('/export/jobs',
  checkPermission('external_systems', 'read'),
  async (req: Request, res: Response) => {
    try {
      const jobs = dataImportExportService.getExportJobs();
      res.json(jobs);
    } catch (error) {
      logger.error('Failed to get export jobs:', error);
      res.status(500).json({ error: 'Failed to get export jobs' });
    }
  }
);

router.get('/import/jobs/:id',
  checkPermission('external_systems', 'read'),
  [param('id').notEmpty().withMessage('Job ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const job = dataImportExportService.getImportJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Import job not found' });
      }

      res.json(job);
    } catch (error) {
      logger.error('Failed to get import job:', error);
      res.status(500).json({ error: 'Failed to get import job' });
    }
  }
);

router.get('/export/jobs/:id',
  checkPermission('external_systems', 'read'),
  [param('id').notEmpty().withMessage('Job ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const job = dataImportExportService.getExportJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Export job not found' });
      }

      res.json(job);
    } catch (error) {
      logger.error('Failed to get export job:', error);
      res.status(500).json({ error: 'Failed to get export job' });
    }
  }
);

// External API Connections
router.post('/connections/api',
  checkPermission('external_systems', 'create'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('baseUrl').isURL().withMessage('Valid base URL is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await externalApiService.createConnection(req.body);
      res.status(201).json({ 
        message: 'API connection created successfully',
        connectionId: req.body.id 
      });
    } catch (error) {
      logger.error('Failed to create API connection:', error);
      res.status(500).json({ error: 'Failed to create API connection' });
    }
  }
);

router.get('/connections/api',
  checkPermission('external_systems', 'read'),
  async (req: Request, res: Response) => {
    try {
      const connections = externalApiService.getConnections();
      res.json(connections);
    } catch (error) {
      logger.error('Failed to get API connections:', error);
      res.status(500).json({ error: 'Failed to get API connections' });
    }
  }
);

router.post('/connections/api/:id/test',
  checkPermission('external_systems', 'update'),
  [param('id').notEmpty().withMessage('Connection ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const isHealthy = await externalApiService.testConnectionHealth(req.params.id);
      res.json({ 
        connectionId: req.params.id,
        healthy: isHealthy,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to test API connection:', error);
      res.status(500).json({ error: 'Failed to test API connection' });
    }
  }
);

router.post('/api/request',
  checkPermission('external_systems', 'update'),
  [
    body('connectionId').notEmpty().withMessage('Connection ID is required'),
    body('method').isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).withMessage('Invalid HTTP method'),
    body('endpoint').notEmpty().withMessage('Endpoint is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const result = await externalApiService.executeRequest(req.body);
      res.json(result);
    } catch (error) {
      logger.error('Failed to execute API request:', error);
      res.status(500).json({ error: 'Failed to execute API request' });
    }
  }
);

// Configuration Management
router.post('/config',
  checkPermission('external_systems', 'create'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('type').isIn(['database', 'api', 'file_system', 'cloud_storage']).withMessage('Invalid type'),
    body('category').isIn(['source', 'target', 'both']).withMessage('Invalid category'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const configId = await configurationService.createConfig(req.body);
      res.status(201).json({ 
        message: 'Configuration created successfully',
        configId 
      });
    } catch (error) {
      logger.error('Failed to create configuration:', error);
      res.status(500).json({ error: 'Failed to create configuration' });
    }
  }
);

router.get('/config',
  checkPermission('external_systems', 'read'),
  async (req: Request, res: Response) => {
    try {
      const { type, category } = req.query;
      
      let configs;
      if (type) {
        configs = await configurationService.getConfigsByType(type as 'database' | 'api' | 'file_system' | 'cloud_storage');
      } else if (category) {
        configs = await configurationService.getConfigsByCategory(category as any);
      } else {
        configs = await configurationService.getAllConfigs();
      }
      
      res.json(configs);
    } catch (error) {
      logger.error('Failed to get configurations:', error);
      res.status(500).json({ error: 'Failed to get configurations' });
    }
  }
);

router.get('/config/templates',
  checkPermission('external_systems', 'read'),
  async (req: Request, res: Response) => {
    try {
      const templates = configurationService.getTemplates();
      res.json(templates);
    } catch (error) {
      logger.error('Failed to get configuration templates:', error);
      res.status(500).json({ error: 'Failed to get configuration templates' });
    }
  }
);

router.get('/config/:id',
  checkPermission('external_systems', 'read'),
  [param('id').notEmpty().withMessage('Configuration ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const config = await configurationService.getConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      res.json(config);
    } catch (error) {
      logger.error('Failed to get configuration:', error);
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  }
);

router.put('/config/:id',
  checkPermission('external_systems', 'update'),
  [param('id').notEmpty().withMessage('Configuration ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await configurationService.updateConfig(req.params.id, req.body);
      res.json({ message: 'Configuration updated successfully' });
    } catch (error) {
      logger.error('Failed to update configuration:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  }
);

router.delete('/config/:id',
  checkPermission('external_systems', 'delete'),
  [param('id').notEmpty().withMessage('Configuration ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      await configurationService.deleteConfig(req.params.id);
      res.json({ message: 'Configuration deleted successfully' });
    } catch (error) {
      logger.error('Failed to delete configuration:', error);
      res.status(500).json({ error: 'Failed to delete configuration' });
    }
  }
);

// Health and Monitoring
router.get('/health',
  checkPermission('external_systems', 'read'),
  async (req: Request, res: Response) => {
    try {
      const dbHealth = await externalSystemService.getConnectionHealth();
      const apiConnections = externalApiService.getConnections();
      
      const apiHealth: Record<string, boolean> = {};
      for (const connection of apiConnections) {
        apiHealth[connection.id] = await externalApiService.testConnectionHealth(connection.id);
      }

      res.json({
        database: dbHealth,
        api: apiHealth,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to get system health:', error);
      res.status(500).json({ error: 'Failed to get system health' });
    }
  }
);

router.get('/metrics/:connectionId',
  checkPermission('external_systems', 'read'),
  [param('connectionId').notEmpty().withMessage('Connection ID is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const metrics = externalApiService.getConnectionMetrics(req.params.connectionId);
      const history = externalApiService.getRequestHistory(req.params.connectionId);
      const circuitBreakerState = externalApiService.getCircuitBreakerState(req.params.connectionId);

      res.json({
        metrics,
        history: history.slice(-50), // Last 50 requests
        circuitBreaker: circuitBreakerState
      });
    } catch (error) {
      logger.error('Failed to get connection metrics:', error);
      res.status(500).json({ error: 'Failed to get connection metrics' });
    }
  }
);

export default router;