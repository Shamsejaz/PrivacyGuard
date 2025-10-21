import winston from 'winston';
import type { Request, Response } from 'express';
import { cacheService, CacheKeys, CacheTTL } from './CacheService';
import { logger } from '../utils/logger';

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit_exceeded' | 'suspicious_activity' | 'data_breach_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  endpoint?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}

export class ProductionLoggingService {
  private securityLogger: winston.Logger;
  private performanceLogger: winston.Logger;
  private auditLogger: winston.Logger;
  private errorLogger: winston.Logger;

  constructor() {
    this.initializeLoggers();
  }

  private initializeLoggers(): void {
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Security events logger
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({ 
          filename: 'logs/security.log',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 10
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });

    // Performance metrics logger
    this.performanceLogger = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({ 
          filename: 'logs/performance.log',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5
        })
      ]
    });

    // Audit trail logger
    this.auditLogger = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({ 
          filename: 'logs/audit.log',
          maxsize: 100 * 1024 * 1024, // 100MB
          maxFiles: 20
        })
      ]
    });

    // Error logger with enhanced details
    this.errorLogger = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            stack,
            ...meta
          }, null, 2);
        })
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/errors.log',
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  /**
   * Log security events
   */
  logSecurityEvent(event: SecurityEvent): void {
    this.securityLogger.warn('Security Event', event);
    
    // Cache security events for real-time monitoring
    this.cacheSecurityEvent(event);
    
    // Trigger alerts for critical events
    if (event.severity === 'critical') {
      this.triggerSecurityAlert(event);
    }
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceLogger.info('Performance Metrics', metrics);
    
    // Cache performance data for dashboard
    this.cachePerformanceMetrics(metrics);
    
    // Alert on slow responses
    if (metrics.responseTime > 5000) { // 5 seconds
      this.logSlowResponse(metrics);
    }
  }

  /**
   * Log audit trail for data operations
   */
  logAuditTrail(
    action: string,
    resource: string,
    userId: string,
    details: Record<string, any> = {},
    req?: Request
  ): void {
    const auditEntry = {
      action,
      resource,
      userId,
      timestamp: new Date(),
      ip: req?.ip,
      userAgent: req?.get('User-Agent'),
      requestId: (req as any)?.requestId,
      details
    };

    this.auditLogger.info('Audit Trail', auditEntry);
    
    // Cache recent audit entries for compliance reporting
    this.cacheAuditEntry(auditEntry);
  }

  /**
   * Enhanced error logging with context
   */
  logError(
    error: Error,
    context: {
      requestId?: string;
      userId?: string;
      endpoint?: string;
      method?: string;
      ip?: string;
      userAgent?: string;
      additionalData?: Record<string, any>;
    } = {}
  ): void {
    const errorEntry = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date(),
      ...context
    };

    this.errorLogger.error('Application Error', errorEntry);
    
    // Cache error for monitoring dashboard
    this.cacheError(errorEntry);
    
    // Increment error counters
    this.incrementErrorCounters(context.endpoint, error.name);
  }

  /**
   * Log database operations for monitoring
   */
  logDatabaseOperation(
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    table: string,
    executionTime: number,
    rowsAffected?: number,
    userId?: string
  ): void {
    const dbEntry = {
      operation,
      table,
      executionTime,
      rowsAffected,
      userId,
      timestamp: new Date()
    };

    logger.debug('Database Operation', dbEntry);
    
    // Cache slow queries for optimization
    if (executionTime > 1000) { // 1 second
      this.cacheSlowQuery(dbEntry);
    }
  }

  /**
   * Create request logging middleware
   */
  createRequestLogger() {
    return (req: Request, res: Response, next: Function) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      // Add request ID to request object
      (req as any).requestId = requestId;
      
      // Log request start
      logger.info('Request Start', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk?: any, encoding?: any): Response {
        const responseTime = Date.now() - startTime;
        
        // Log request completion
        logger.info('Request Complete', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });
        
        return originalEnd.call(this, chunk, encoding);

        // Log performance metrics
        productionLoggingService.logPerformanceMetrics({
          endpoint: req.route?.path || req.path,
          method: req.method,
          responseTime,
          statusCode: res.statusCode,
          timestamp: new Date(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        });

        originalEnd.call(this, chunk, encoding);
      };

      next();
    };
  }

  /**
   * Get logging statistics
   */
  async getLoggingStatistics(): Promise<{
    errorCount: number;
    securityEventCount: number;
    averageResponseTime: number;
    slowQueryCount: number;
    topErrors: Array<{ error: string; count: number }>;
    topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
  }> {
    try {
      const [
        errorCount,
        securityEventCount,
        performanceData,
        slowQueryCount
      ] = await Promise.all([
        this.getErrorCount(),
        this.getSecurityEventCount(),
        this.getPerformanceData(),
        this.getSlowQueryCount()
      ]);

      return {
        errorCount,
        securityEventCount,
        averageResponseTime: performanceData.averageResponseTime,
        slowQueryCount,
        topErrors: performanceData.topErrors,
        topEndpoints: performanceData.topEndpoints
      };
    } catch (error) {
      logger.error('Error getting logging statistics:', error);
      return {
        errorCount: 0,
        securityEventCount: 0,
        averageResponseTime: 0,
        slowQueryCount: 0,
        topErrors: [],
        topEndpoints: []
      };
    }
  }

  private async cacheSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const key = `security_events:${new Date().toISOString().split('T')[0]}`;
      const events = await cacheService.get<SecurityEvent[]>(key) || [];
      events.push(event);
      
      // Keep only last 1000 events per day
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }
      
      await cacheService.set(key, events, { ttl: CacheTTL.VERY_LONG });
    } catch (error) {
      logger.error('Error caching security event:', error);
    }
  }

  private async cachePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const key = `performance_metrics:${metrics.endpoint}:${new Date().toISOString().split('T')[0]}`;
      const metricsList = await cacheService.get<PerformanceMetrics[]>(key) || [];
      metricsList.push(metrics);
      
      // Keep only last 1000 metrics per endpoint per day
      if (metricsList.length > 1000) {
        metricsList.splice(0, metricsList.length - 1000);
      }
      
      await cacheService.set(key, metricsList, { ttl: CacheTTL.VERY_LONG });
    } catch (error) {
      logger.error('Error caching performance metrics:', error);
    }
  }

  private async cacheAuditEntry(entry: any): Promise<void> {
    try {
      const key = `audit_entries:${new Date().toISOString().split('T')[0]}`;
      const entries = await cacheService.get<any[]>(key) || [];
      entries.push(entry);
      
      // Keep only last 10000 audit entries per day
      if (entries.length > 10000) {
        entries.splice(0, entries.length - 10000);
      }
      
      await cacheService.set(key, entries, { ttl: CacheTTL.VERY_LONG });
    } catch (error) {
      logger.error('Error caching audit entry:', error);
    }
  }

  private async cacheError(errorEntry: any): Promise<void> {
    try {
      const key = `errors:${new Date().toISOString().split('T')[0]}`;
      const errors = await cacheService.get<any[]>(key) || [];
      errors.push(errorEntry);
      
      // Keep only last 1000 errors per day
      if (errors.length > 1000) {
        errors.splice(0, errors.length - 1000);
      }
      
      await cacheService.set(key, errors, { ttl: CacheTTL.VERY_LONG });
    } catch (error) {
      logger.error('Error caching error:', error);
    }
  }

  private async cacheSlowQuery(queryEntry: any): Promise<void> {
    try {
      const key = 'slow_queries';
      const queries = await cacheService.get<any[]>(key) || [];
      queries.push(queryEntry);
      
      // Keep only last 100 slow queries
      if (queries.length > 100) {
        queries.splice(0, queries.length - 100);
      }
      
      await cacheService.set(key, queries, { ttl: CacheTTL.VERY_LONG });
    } catch (error) {
      logger.error('Error caching slow query:', error);
    }
  }

  private async incrementErrorCounters(endpoint?: string, errorType?: string): Promise<void> {
    try {
      if (endpoint) {
        await cacheService.increment(`error_count:endpoint:${endpoint}`, 1, { ttl: CacheTTL.VERY_LONG });
      }
      if (errorType) {
        await cacheService.increment(`error_count:type:${errorType}`, 1, { ttl: CacheTTL.VERY_LONG });
      }
      await cacheService.increment('error_count:total', 1, { ttl: CacheTTL.VERY_LONG });
    } catch (error) {
      logger.error('Error incrementing error counters:', error);
    }
  }

  private logSlowResponse(metrics: PerformanceMetrics): void {
    logger.warn('Slow Response Detected', {
      endpoint: metrics.endpoint,
      method: metrics.method,
      responseTime: metrics.responseTime,
      statusCode: metrics.statusCode,
      timestamp: metrics.timestamp
    });
  }

  private triggerSecurityAlert(event: SecurityEvent): void {
    // In production, this would integrate with alerting systems
    logger.error('CRITICAL SECURITY EVENT', event);
    
    // Could integrate with:
    // - Email notifications
    // - Slack/Teams webhooks
    // - PagerDuty
    // - SMS alerts
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getErrorCount(): Promise<number> {
    try {
      const count = await cacheService.get<number>('error_count:total');
      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getSecurityEventCount(): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const events = await cacheService.get<SecurityEvent[]>(`security_events:${today}`);
      return events ? events.length : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getPerformanceData(): Promise<{
    averageResponseTime: number;
    topErrors: Array<{ error: string; count: number }>;
    topEndpoints: Array<{ endpoint: string; count: number; avgResponseTime: number }>;
  }> {
    try {
      // This would require more sophisticated aggregation
      // For now, return mock data structure
      return {
        averageResponseTime: 0,
        topErrors: [],
        topEndpoints: []
      };
    } catch (error) {
      return {
        averageResponseTime: 0,
        topErrors: [],
        topEndpoints: []
      };
    }
  }

  private async getSlowQueryCount(): Promise<number> {
    try {
      const queries = await cacheService.get<any[]>('slow_queries');
      return queries ? queries.length : 0;
    } catch (error) {
      return 0;
    }
  }
}

// Export singleton instance
export const productionLoggingService = new ProductionLoggingService();