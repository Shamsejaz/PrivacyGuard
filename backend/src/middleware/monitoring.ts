import type { Request, Response, NextFunction } from 'express';
import { monitoringService } from '../services/MonitoringService';
import { performanceLog, auditLog } from '../utils/logger';

export interface MonitoringRequest extends Request {
  startTime?: number;
  requestId?: string;
}

// Request tracking middleware
export function requestTracking(req: MonitoringRequest, res: Response, next: NextFunction): void {
  // Generate unique request ID
  req.requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();

  // Set request ID in response headers
  res.setHeader('X-Request-ID', req.requestId);

  // Record request
  monitoringService.recordRequest();

  // Track response
  const originalSend = res.send;
  res.send = function(body: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Record response time
    monitoringService.recordResponseTime(responseTime);
    
    // Record error if status code indicates error
    if (res.statusCode >= 400) {
      monitoringService.recordError();
    }
    
    // Log performance data
    performanceLog('api_request', responseTime, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      requestId: req.requestId,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });
    
    return originalSend.call(this, body);
  };

  next();
}

// Database operation monitoring
export function trackDatabaseOperation(operation: string, database: 'postgresql' | 'mongodb' | 'redis') {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        
        // Record successful operation
        monitoringService.recordPerformanceMetric(`${database}_${operation}`, duration);
        
        performanceLog(`${database}_${operation}`, duration, {
          operation,
          database,
          success: true,
        });
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Record failed operation
        monitoringService.recordDatabaseError(database);
        monitoringService.recordPerformanceMetric(`${database}_${operation}_error`, duration);
        
        performanceLog(`${database}_${operation}`, duration, {
          operation,
          database,
          success: false,
          error: error.message,
        });
        
        throw error;
      }
    };

    return descriptor;
  };
}

// Audit logging middleware for sensitive operations
export function auditMiddleware(req: MonitoringRequest, res: Response, next: NextFunction): void {
  // Skip audit logging for health checks and non-sensitive endpoints
  const skipPaths = ['/health', '/metrics', '/status'];
  if (skipPaths.some(path => req.path.includes(path))) {
    return next();
  }

  // Skip GET requests unless they're for sensitive data
  const sensitiveGetPaths = ['/users', '/dsar', '/risk', '/gdpr', '/policy'];
  if (req.method === 'GET' && !sensitiveGetPaths.some(path => req.path.includes(path))) {
    return next();
  }

  // Extract user information from token (if available)
  const userId = (req as any).user?.id;
  const userRole = (req as any).user?.role;

  // Determine resource type and ID from URL
  const pathParts = req.path.split('/').filter(Boolean);
  const resourceType = pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];
  const resourceId = pathParts[pathParts.length - 1];

  // Log the audit event
  auditLog(
    `${req.method.toLowerCase()}_${resourceType}`,
    userId,
    resourceType,
    resourceId !== resourceType ? resourceId : undefined,
    {
      method: req.method,
      url: req.originalUrl,
      userRole,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.requestId,
      body: req.method !== 'GET' ? req.body : undefined,
    }
  );

  next();
}

// Rate limiting monitoring
export function rateLimitMonitoring(req: MonitoringRequest, res: Response, next: NextFunction): void {
  const rateLimitRemaining = res.getHeader('X-RateLimit-Remaining') as string;
  const rateLimitLimit = res.getHeader('X-RateLimit-Limit') as string;

  if (rateLimitRemaining && rateLimitLimit) {
    const remaining = parseInt(rateLimitRemaining);
    const limit = parseInt(rateLimitLimit);
    const usage = ((limit - remaining) / limit) * 100;

    // Record rate limit usage
    monitoringService.recordPerformanceMetric('rate_limit_usage', usage);

    // Alert if rate limit usage is high
    if (usage > 80) {
      performanceLog('high_rate_limit_usage', usage, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        remaining,
        limit,
        requestId: req.requestId,
      });
    }
  }

  next();
}

// Memory usage monitoring middleware
export function memoryMonitoring(req: MonitoringRequest, res: Response, next: NextFunction): void {
  const memoryBefore = process.memoryUsage();

  res.on('finish', () => {
    const memoryAfter = process.memoryUsage();
    const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;

    // Record memory usage delta
    monitoringService.recordPerformanceMetric('memory_delta', memoryDelta);

    // Log significant memory increases
    if (memoryDelta > 10 * 1024 * 1024) { // 10MB
      performanceLog('high_memory_usage', memoryDelta, {
        method: req.method,
        url: req.originalUrl,
        requestId: req.requestId,
        memoryBefore: memoryBefore.heapUsed,
        memoryAfter: memoryAfter.heapUsed,
      });
    }
  });

  next();
}

// Error tracking middleware
export function errorTracking(error: any, req: MonitoringRequest, res: Response, next: NextFunction): void {
  // Record error metrics
  monitoringService.recordError();

  // Track error by type
  const errorType = error.name || 'UnknownError';
  monitoringService.recordPerformanceMetric(`error_${errorType}`, 1);

  // Log error details
  performanceLog('error_occurred', Date.now(), {
    errorType,
    errorMessage: error.message,
    statusCode: error.statusCode || 500,
    method: req.method,
    url: req.originalUrl,
    requestId: req.requestId,
    stack: error.stack,
  });

  next(error);
}