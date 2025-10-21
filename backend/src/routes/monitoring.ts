import { Router } from 'express';
import { monitoringService } from '../services/MonitoringService';
import { checkPostgreSQLHealth, checkMongoDBHealth, checkRedisHealth } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import errorReportingRoutes from './errorReporting';

const router = Router();

// Health check endpoint
router.get('/health', asyncHandler(async (req, res) => {
  const healthStatus = monitoringService.getHealthStatus();
  
  return res.status(healthStatus.status === 'healthy' ? 200 : 
            healthStatus.status === 'degraded' ? 200 : 503)
     .json({
       status: healthStatus.status,
       timestamp: new Date().toISOString(),
       ...healthStatus.details
     });
}));

// Detailed health check
router.get('/health/detailed', asyncHandler(async (req, res) => {
  const [postgresql, mongodb, redis] = await Promise.allSettled([
    checkPostgreSQLHealth(),
    checkMongoDBHealth(),
    checkRedisHealth()
  ]);

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    databases: {
      postgresql: {
        status: postgresql.status === 'fulfilled' && postgresql.value ? 'connected' : 'disconnected',
        error: postgresql.status === 'rejected' ? postgresql.reason?.message : undefined
      },
      mongodb: {
        status: mongodb.status === 'fulfilled' && mongodb.value ? 'connected' : 'disconnected',
        error: mongodb.status === 'rejected' ? mongodb.reason?.message : undefined
      },
      redis: {
        status: redis.status === 'fulfilled' && redis.value ? 'connected' : 'disconnected',
        error: redis.status === 'rejected' ? redis.reason?.message : undefined
      }
    },
    memory: process.memoryUsage(),
    cpu: {
      loadAverage: require('os').loadavg(),
      uptime: process.uptime()
    }
  };

  const allHealthy = postgresql.status === 'fulfilled' && postgresql.value &&
                    mongodb.status === 'fulfilled' && mongodb.value &&
                    redis.status === 'fulfilled' && redis.value;

  return res.status(allHealthy ? 200 : 503).json(health);
}));

// System metrics endpoint
router.get('/metrics', asyncHandler(async (req, res) => {
  const metrics = monitoringService.getMetrics();
  res.json(metrics);
}));

// Alerts endpoint
router.get('/alerts', asyncHandler(async (req, res) => {
  const alerts = monitoringService.getAlerts();
  const { resolved, severity, type } = req.query;

  let filteredAlerts = alerts;

  if (resolved !== undefined) {
    const isResolved = resolved === 'true';
    filteredAlerts = filteredAlerts.filter(alert => alert.resolved === isResolved);
  }

  if (severity) {
    filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
  }

  if (type) {
    filteredAlerts = filteredAlerts.filter(alert => alert.type === type);
  }

  res.json({
    alerts: filteredAlerts,
    total: filteredAlerts.length,
    summary: {
      critical: alerts.filter(a => !a.resolved && a.severity === 'critical').length,
      high: alerts.filter(a => !a.resolved && a.severity === 'high').length,
      medium: alerts.filter(a => !a.resolved && a.severity === 'medium').length,
      low: alerts.filter(a => !a.resolved && a.severity === 'low').length,
    }
  });
}));

// Resolve alert endpoint
router.patch('/alerts/:alertId/resolve', asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const resolved = monitoringService.resolveAlert(alertId);

  if (!resolved) {
    return res.status(404).json({
      error: 'Alert not found',
      alertId
    });
  }

  res.json({
    message: 'Alert resolved successfully',
    alertId
  });
}));

// Performance data endpoint
router.get('/performance/:metric', asyncHandler(async (req, res) => {
  const { metric } = req.params;
  const data = monitoringService.getPerformanceData(metric);

  res.json({
    metric,
    data,
    count: data.length,
    average: data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0,
    min: data.length > 0 ? Math.min(...data) : 0,
    max: data.length > 0 ? Math.max(...data) : 0
  });
}));

// System status endpoint (simple)
router.get('/status', asyncHandler(async (req, res) => {
  const healthStatus = monitoringService.getHealthStatus();
  
  res.json({
    status: healthStatus.status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}));

// Readiness probe (for Kubernetes)
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    const [postgresql, mongodb, redis] = await Promise.all([
      checkPostgreSQLHealth(),
      checkMongoDBHealth(),
      checkRedisHealth()
    ]);

    if (postgresql && mongodb && redis) {
      return res.status(200).json({ status: 'ready' });
    } else {
      return res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);
    return res.status(503).json({ status: 'not ready', error: error.message });
  }
}));

// Liveness probe (for Kubernetes)
router.get('/live', asyncHandler(async (req, res) => {
  return res.status(200).json({ 
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}));

// Update monitoring thresholds
router.put('/thresholds', asyncHandler(async (req, res) => {
  const { maxResponseTime, maxMemoryUsage, maxCpuUsage, maxErrorRate, maxDatabaseResponseTime } = req.body;

  const thresholds: any = {};
  if (maxResponseTime !== undefined) thresholds.maxResponseTime = maxResponseTime;
  if (maxMemoryUsage !== undefined) thresholds.maxMemoryUsage = maxMemoryUsage;
  if (maxCpuUsage !== undefined) thresholds.maxCpuUsage = maxCpuUsage;
  if (maxErrorRate !== undefined) thresholds.maxErrorRate = maxErrorRate;
  if (maxDatabaseResponseTime !== undefined) thresholds.maxDatabaseResponseTime = maxDatabaseResponseTime;

  monitoringService.updateThresholds(thresholds);

  res.json({
    message: 'Thresholds updated successfully',
    thresholds
  });
}));

// Include error reporting routes
router.use('/', errorReportingRoutes);

export default router;
