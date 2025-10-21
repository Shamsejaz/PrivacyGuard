import { logger, performanceLog, auditLog } from '../utils/logger';
import { checkPostgreSQLHealth, checkMongoDBHealth, checkRedisHealth } from '../config/database';

export interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  database: {
    postgresql: DatabaseMetrics;
    mongodb: DatabaseMetrics;
    redis: DatabaseMetrics;
  };
  api: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
  };
  alerts: Alert[];
}

export interface DatabaseMetrics {
  connected: boolean;
  responseTime: number;
  connectionCount?: number;
  queryCount?: number;
  errorCount: number;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: any;
}

export interface PerformanceThresholds {
  maxResponseTime: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  maxErrorRate: number;
  maxDatabaseResponseTime: number;
}

class MonitoringService {
  private metrics: SystemMetrics;
  private alerts: Alert[] = [];
  private performanceData: Map<string, number[]> = new Map();
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private thresholds: PerformanceThresholds;

  constructor() {
    this.thresholds = {
      maxResponseTime: 5000, // 5 seconds
      maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      maxCpuUsage: 80, // 80%
      maxErrorRate: 5, // 5%
      maxDatabaseResponseTime: 1000, // 1 second
    };

    this.metrics = this.initializeMetrics();
    this.startMonitoring();
  }

  private initializeMetrics(): SystemMetrics {
    return {
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: {
        usage: 0,
        loadAverage: [],
      },
      database: {
        postgresql: { connected: false, responseTime: 0, errorCount: 0 },
        mongodb: { connected: false, responseTime: 0, errorCount: 0 },
        redis: { connected: false, responseTime: 0, errorCount: 0 },
      },
      api: {
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
      },
      alerts: [],
    };
  }

  private startMonitoring(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Check thresholds every minute
    setInterval(() => {
      this.checkThresholds();
    }, 60000);

    // Clean up old performance data every 5 minutes
    setInterval(() => {
      this.cleanupPerformanceData();
    }, 300000);
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Update basic metrics
      this.metrics.timestamp = new Date();
      this.metrics.uptime = process.uptime();
      this.metrics.memory = process.memoryUsage();
      this.metrics.cpu.loadAverage = require('os').loadavg();

      // Collect database metrics
      await this.collectDatabaseMetrics();

      // Update API metrics
      this.metrics.api.requestCount = this.requestCount;
      this.metrics.api.errorCount = this.errorCount;
      this.metrics.api.averageResponseTime = this.calculateAverageResponseTime();

      // Update alerts
      this.metrics.alerts = this.alerts.filter(alert => !alert.resolved);

      performanceLog('metrics_collected', Date.now(), {
        memoryUsage: this.metrics.memory.heapUsed,
        requestCount: this.requestCount,
        errorCount: this.errorCount,
      });
    } catch (error) {
      logger.error('Failed to collect metrics:', error);
    }
  }

  private async collectDatabaseMetrics(): Promise<void> {
    const startTime = Date.now();

    try {
      // PostgreSQL metrics
      const pgStart = Date.now();
      const pgHealthy = await checkPostgreSQLHealth();
      this.metrics.database.postgresql = {
        connected: pgHealthy,
        responseTime: Date.now() - pgStart,
        errorCount: this.metrics.database.postgresql.errorCount,
      };
    } catch (error) {
      this.metrics.database.postgresql.errorCount++;
      this.createAlert('error', 'high', 'PostgreSQL health check failed', { error: error.message });
    }

    try {
      // MongoDB metrics
      const mongoStart = Date.now();
      const mongoHealthy = await checkMongoDBHealth();
      this.metrics.database.mongodb = {
        connected: mongoHealthy,
        responseTime: Date.now() - mongoStart,
        errorCount: this.metrics.database.mongodb.errorCount,
      };
    } catch (error) {
      this.metrics.database.mongodb.errorCount++;
      this.createAlert('error', 'high', 'MongoDB health check failed', { error: error.message });
    }

    try {
      // Redis metrics
      const redisStart = Date.now();
      const redisHealthy = await checkRedisHealth();
      this.metrics.database.redis = {
        connected: redisHealthy,
        responseTime: Date.now() - redisStart,
        errorCount: this.metrics.database.redis.errorCount,
      };
    } catch (error) {
      this.metrics.database.redis.errorCount++;
      this.createAlert('error', 'medium', 'Redis health check failed', { error: error.message });
    }
  }

  private calculateAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }

  private checkThresholds(): void {
    // Check memory usage
    const memoryUsage = this.metrics.memory.heapUsed;
    if (memoryUsage > this.thresholds.maxMemoryUsage) {
      this.createAlert('warning', 'medium', `High memory usage: ${Math.round(memoryUsage / 1024 / 1024)}MB`, {
        current: memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
      });
    }

    // Check error rate
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    if (errorRate > this.thresholds.maxErrorRate) {
      this.createAlert('error', 'high', `High error rate: ${errorRate.toFixed(2)}%`, {
        errorCount: this.errorCount,
        requestCount: this.requestCount,
        errorRate,
      });
    }

    // Check average response time
    const avgResponseTime = this.calculateAverageResponseTime();
    if (avgResponseTime > this.thresholds.maxResponseTime) {
      this.createAlert('warning', 'medium', `High response time: ${avgResponseTime.toFixed(2)}ms`, {
        current: avgResponseTime,
        threshold: this.thresholds.maxResponseTime,
      });
    }

    // Check database response times
    Object.entries(this.metrics.database).forEach(([dbName, metrics]) => {
      if (metrics.responseTime > this.thresholds.maxDatabaseResponseTime) {
        this.createAlert('warning', 'medium', `High ${dbName} response time: ${metrics.responseTime}ms`, {
          database: dbName,
          responseTime: metrics.responseTime,
          threshold: this.thresholds.maxDatabaseResponseTime,
        });
      }
    });
  }

  private createAlert(type: Alert['type'], severity: Alert['severity'], message: string, metadata?: any): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata,
    };

    this.alerts.push(alert);
    logger.warn(`ALERT [${severity.toUpperCase()}]: ${message}`, metadata);

    // Auto-resolve info alerts after 5 minutes
    if (type === 'info') {
      setTimeout(() => {
        this.resolveAlert(alert.id);
      }, 300000);
    }
  }

  private cleanupPerformanceData(): void {
    // Keep only last 100 data points for each metric
    this.performanceData.forEach((values, key) => {
      if (values.length > 100) {
        this.performanceData.set(key, values.slice(-100));
      }
    });

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  // Public methods
  public getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      auditLog('alert_resolved', undefined, 'alert', alertId);
      return true;
    }
    return false;
  }

  public recordRequest(): void {
    this.requestCount++;
  }

  public recordError(): void {
    this.errorCount++;
  }

  public recordResponseTime(time: number): void {
    this.responseTimes.push(time);
  }

  public recordDatabaseError(database: 'postgresql' | 'mongodb' | 'redis'): void {
    this.metrics.database[database].errorCount++;
  }

  public getPerformanceData(metric: string): number[] {
    return this.performanceData.get(metric) || [];
  }

  public recordPerformanceMetric(metric: string, value: number): void {
    if (!this.performanceData.has(metric)) {
      this.performanceData.set(metric, []);
    }
    this.performanceData.get(metric)!.push(value);
  }

  public updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    auditLog('thresholds_updated', undefined, 'monitoring', undefined, newThresholds);
  }

  public getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: any } {
    const criticalAlerts = this.alerts.filter(a => !a.resolved && a.severity === 'critical');
    const highAlerts = this.alerts.filter(a => !a.resolved && a.severity === 'high');
    
    const dbConnected = Object.values(this.metrics.database).every(db => db.connected);
    
    if (criticalAlerts.length > 0 || !dbConnected) {
      return {
        status: 'unhealthy',
        details: {
          criticalAlerts: criticalAlerts.length,
          databasesConnected: dbConnected,
          uptime: this.metrics.uptime,
        }
      };
    }
    
    if (highAlerts.length > 0) {
      return {
        status: 'degraded',
        details: {
          highAlerts: highAlerts.length,
          uptime: this.metrics.uptime,
        }
      };
    }
    
    return {
      status: 'healthy',
      details: {
        uptime: this.metrics.uptime,
        requestCount: this.requestCount,
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      }
    };
  }
}

export const monitoringService = new MonitoringService();