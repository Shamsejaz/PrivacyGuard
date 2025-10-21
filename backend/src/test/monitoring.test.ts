import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { monitoringService } from '../services/MonitoringService';
import { backupService } from '../services/BackupService';
import monitoringRoutes from '../routes/monitoring';
import { errorHandler } from '../middleware/errorHandler';

// Mock database functions
vi.mock('../config/database', () => ({
  checkPostgreSQLHealth: vi.fn(),
  checkMongoDBHealth: vi.fn(),
  checkRedisHealth: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/monitoring', monitoringRoutes);
app.use(errorHandler);

describe('Monitoring System Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Health Check Endpoints', () => {
    it('should return healthy status when all systems are operational', async () => {
      const { checkPostgreSQLHealth, checkMongoDBHealth, checkRedisHealth } = await import('../config/database');
      
      vi.mocked(checkPostgreSQLHealth).mockResolvedValue(true);
      vi.mocked(checkMongoDBHealth).mockResolvedValue(true);
      vi.mocked(checkRedisHealth).mockResolvedValue(true);

      const response = await request(app)
        .get('/monitoring/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should return unhealthy status when databases are down', async () => {
      const { checkPostgreSQLHealth, checkMongoDBHealth, checkRedisHealth } = await import('../config/database');
      
      vi.mocked(checkPostgreSQLHealth).mockResolvedValue(false);
      vi.mocked(checkMongoDBHealth).mockResolvedValue(false);
      vi.mocked(checkRedisHealth).mockResolvedValue(false);

      const response = await request(app)
        .get('/monitoring/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });

    it('should return detailed health information', async () => {
      const { checkPostgreSQLHealth, checkMongoDBHealth, checkRedisHealth } = await import('../config/database');
      
      vi.mocked(checkPostgreSQLHealth).mockResolvedValue(true);
      vi.mocked(checkMongoDBHealth).mockResolvedValue(true);
      vi.mocked(checkRedisHealth).mockResolvedValue(true);

      const response = await request(app)
        .get('/monitoring/health/detailed')
        .expect(200);

      expect(response.body).toHaveProperty('databases');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body.databases.postgresql.status).toBe('connected');
      expect(response.body.databases.mongodb.status).toBe('connected');
      expect(response.body.databases.redis.status).toBe('connected');
    });
  });

  describe('Metrics Endpoints', () => {
    it('should return system metrics', async () => {
      const response = await request(app)
        .get('/monitoring/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('database');
      expect(response.body).toHaveProperty('api');
    });

    it('should return performance data for specific metrics', async () => {
      // Record some test data
      monitoringService.recordPerformanceMetric('test_metric', 100);
      monitoringService.recordPerformanceMetric('test_metric', 200);
      monitoringService.recordPerformanceMetric('test_metric', 150);

      const response = await request(app)
        .get('/monitoring/performance/test_metric')
        .expect(200);

      expect(response.body.metric).toBe('test_metric');
      expect(response.body.data).toHaveLength(3);
      expect(response.body.average).toBe(150);
      expect(response.body.min).toBe(100);
      expect(response.body.max).toBe(200);
    });
  });

  describe('Alerts Management', () => {
    it('should return active alerts', async () => {
      const response = await request(app)
        .get('/monitoring/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });

    it('should filter alerts by severity', async () => {
      const response = await request(app)
        .get('/monitoring/alerts?severity=critical')
        .expect(200);

      expect(response.body.alerts.every((alert: any) => alert.severity === 'critical')).toBe(true);
    });

    it('should resolve alerts', async () => {
      // First create an alert by triggering an error condition
      monitoringService.recordError();
      
      // Get alerts to find one to resolve
      const alertsResponse = await request(app)
        .get('/monitoring/alerts?resolved=false')
        .expect(200);

      if (alertsResponse.body.alerts.length > 0) {
        const alertId = alertsResponse.body.alerts[0].id;
        
        const response = await request(app)
          .patch(`/monitoring/alerts/${alertId}/resolve`)
          .expect(200);

        expect(response.body.message).toBe('Alert resolved successfully');
        expect(response.body.alertId).toBe(alertId);
      }
    });
  });

  describe('Threshold Management', () => {
    it('should update monitoring thresholds', async () => {
      const newThresholds = {
        maxResponseTime: 3000,
        maxMemoryUsage: 2048 * 1024 * 1024,
        maxErrorRate: 10,
      };

      const response = await request(app)
        .put('/monitoring/thresholds')
        .send(newThresholds)
        .expect(200);

      expect(response.body.message).toBe('Thresholds updated successfully');
      expect(response.body.thresholds).toEqual(newThresholds);
    });
  });

  describe('Kubernetes Probes', () => {
    it('should respond to readiness probe', async () => {
      const { checkPostgreSQLHealth, checkMongoDBHealth, checkRedisHealth } = await import('../config/database');
      
      vi.mocked(checkPostgreSQLHealth).mockResolvedValue(true);
      vi.mocked(checkMongoDBHealth).mockResolvedValue(true);
      vi.mocked(checkRedisHealth).mockResolvedValue(true);

      const response = await request(app)
        .get('/monitoring/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
    });

    it('should respond to liveness probe', async () => {
      const response = await request(app)
        .get('/monitoring/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return not ready when databases are down', async () => {
      const { checkPostgreSQLHealth, checkMongoDBHealth, checkRedisHealth } = await import('../config/database');
      
      vi.mocked(checkPostgreSQLHealth).mockResolvedValue(false);
      vi.mocked(checkMongoDBHealth).mockResolvedValue(true);
      vi.mocked(checkRedisHealth).mockResolvedValue(true);

      const response = await request(app)
        .get('/monitoring/ready')
        .expect(503);

      expect(response.body.status).toBe('not ready');
    });
  });
});

describe('Error Handling Tests', () => {
  const testApp = express();
  testApp.use(express.json());
  
  // Test route that throws errors
  testApp.get('/test/error/:type', (req, res, next) => {
    const { type } = req.params;
    
    switch (type) {
      case 'validation':
        const error = new Error('Validation failed');
        error.name = 'ValidationError';
        throw error;
      case 'auth':
        const authError = new Error('Authentication required');
        authError.name = 'AuthenticationError';
        throw authError;
      case 'notfound':
        const notFoundError = new Error('Resource not found');
        notFoundError.name = 'NotFoundError';
        throw notFoundError;
      case 'database':
        const dbError = new Error('Database connection failed');
        dbError.name = 'DatabaseError';
        throw dbError;
      default:
        throw new Error('Generic error');
    }
  });
  
  testApp.use(errorHandler);

  it('should handle validation errors correctly', async () => {
    const response = await request(testApp)
      .get('/test/error/validation')
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Validation failed');
    expect(response.body.error).toHaveProperty('timestamp');
    expect(response.body.error).toHaveProperty('requestId');
  });

  it('should handle authentication errors correctly', async () => {
    const response = await request(testApp)
      .get('/test/error/auth')
      .expect(401);

    expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(response.body.error.message).toBe('Authentication required');
  });

  it('should handle not found errors correctly', async () => {
    const response = await request(testApp)
      .get('/test/error/notfound')
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND_ERROR');
    expect(response.body.error.message).toBe('Resource not found');
  });

  it('should handle database errors correctly', async () => {
    const response = await request(testApp)
      .get('/test/error/database')
      .expect(500);

    expect(response.body.error.code).toBe('DATABASE_ERROR');
    expect(response.body.error.message).toBe('Database connection failed');
  });

  it('should handle generic errors correctly', async () => {
    const response = await request(testApp)
      .get('/test/error/generic')
      .expect(500);

    expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(response.body.error.message).toBe('Generic error');
  });

  it('should include request ID in error responses', async () => {
    const response = await request(testApp)
      .get('/test/error/generic')
      .set('X-Request-ID', 'test-request-123')
      .expect(500);

    expect(response.body.error.requestId).toBe('test-request-123');
  });

  it('should not expose sensitive information in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const response = await request(testApp)
      .get('/test/error/generic')
      .expect(500);

    expect(response.body.error).not.toHaveProperty('stack');
    
    process.env.NODE_ENV = originalEnv;
  });
});

describe('Performance Monitoring Tests', () => {
  it('should track request performance metrics', async () => {
    const startTime = Date.now();
    
    // Simulate multiple requests
    await Promise.all([
      request(app).get('/monitoring/status'),
      request(app).get('/monitoring/status'),
      request(app).get('/monitoring/status'),
    ]);

    const metrics = monitoringService.getMetrics();
    expect(metrics.api.requestCount).toBeGreaterThan(0);
  });

  it('should detect high error rates', async () => {
    const initialErrorCount = monitoringService.getMetrics().api.errorCount;
    
    // Generate some errors
    for (let i = 0; i < 10; i++) {
      monitoringService.recordError();
    }

    const metrics = monitoringService.getMetrics();
    expect(metrics.api.errorCount).toBe(initialErrorCount + 10);
  });

  it('should track database performance', async () => {
    // Record some database operations
    monitoringService.recordPerformanceMetric('postgresql_query', 50);
    monitoringService.recordPerformanceMetric('postgresql_query', 75);
    monitoringService.recordPerformanceMetric('postgresql_query', 100);

    const performanceData = monitoringService.getPerformanceData('postgresql_query');
    expect(performanceData).toHaveLength(3);
    expect(performanceData).toContain(50);
    expect(performanceData).toContain(75);
    expect(performanceData).toContain(100);
  });
});

describe('Backup System Tests', () => {
  it('should return backup status', async () => {
    const status = backupService.getBackupStatus();
    
    expect(status).toHaveProperty('inProgress');
    expect(typeof status.inProgress).toBe('boolean');
  });

  it('should return backup history', async () => {
    const history = backupService.getBackupHistory();
    
    expect(Array.isArray(history)).toBe(true);
  });

  it('should handle backup configuration updates', async () => {
    const newConfig = {
      enabled: true,
      retention: {
        daily: 10,
        weekly: 6,
        monthly: 24,
      },
    };

    expect(() => {
      backupService.updateConfig(newConfig);
    }).not.toThrow();
  });
});

describe('Load Testing Simulation', () => {
  it('should handle concurrent requests without errors', async () => {
    const concurrentRequests = 50;
    const requests = Array.from({ length: concurrentRequests }, () =>
      request(app).get('/monitoring/status')
    );

    const responses = await Promise.allSettled(requests);
    const successfulResponses = responses.filter(
      (result) => result.status === 'fulfilled' && result.value.status === 200
    );

    expect(successfulResponses.length).toBe(concurrentRequests);
  });

  it('should maintain performance under load', async () => {
    const startTime = Date.now();
    const requests = Array.from({ length: 20 }, () =>
      request(app).get('/monitoring/metrics')
    );

    await Promise.all(requests);
    const duration = Date.now() - startTime;

    // Should complete 20 requests in under 5 seconds
    expect(duration).toBeLessThan(5000);
  });
});

describe('Recovery Scenarios', () => {
  it('should handle database reconnection', async () => {
    const { checkPostgreSQLHealth } = await import('../config/database');
    
    // Simulate database failure
    vi.mocked(checkPostgreSQLHealth).mockResolvedValue(false);
    
    let response = await request(app).get('/monitoring/health');
    expect(response.status).toBe(503);

    // Simulate database recovery
    vi.mocked(checkPostgreSQLHealth).mockResolvedValue(true);
    
    response = await request(app).get('/monitoring/health');
    expect(response.status).toBe(200);
  });

  it('should gracefully handle monitoring service errors', async () => {
    // Mock a monitoring service error
    const originalGetMetrics = monitoringService.getMetrics;
    monitoringService.getMetrics = vi.fn().mockImplementation(() => {
      throw new Error('Monitoring service error');
    });

    const response = await request(app)
      .get('/monitoring/metrics')
      .expect(500);

    expect(response.body.error.message).toBe('Monitoring service error');

    // Restore original method
    monitoringService.getMetrics = originalGetMetrics;
  });
});