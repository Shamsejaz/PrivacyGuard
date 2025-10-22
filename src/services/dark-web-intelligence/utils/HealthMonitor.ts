import { SourceHealthStatus } from '../types';

/**
 * Health monitoring utility for tracking API and system health
 * Provides metrics collection, alerting, and health status aggregation
 */
export class HealthMonitor {
  private healthHistory: Map<string, SourceHealthStatus[]> = new Map();
  private alertThresholds: HealthAlertThresholds;
  private alertCallbacks: Map<string, HealthAlertCallback[]> = new Map();
  private readonly maxHistorySize = 100;

  constructor(alertThresholds?: Partial<HealthAlertThresholds>) {
    this.alertThresholds = {
      errorRateThreshold: 0.1, // 10% error rate
      responseTimeThreshold: 5000, // 5 seconds
      consecutiveFailuresThreshold: 3,
      healthCheckIntervalMs: 300000, // 5 minutes
      ...alertThresholds
    };
  }

  /**
   * Record health status for a source
   */
  recordHealthStatus(status: SourceHealthStatus): void {
    const sourceId = status.sourceId;
    
    // Get or create history array for this source
    if (!this.healthHistory.has(sourceId)) {
      this.healthHistory.set(sourceId, []);
    }
    
    const history = this.healthHistory.get(sourceId)!;
    history.push({ ...status });
    
    // Limit history size to prevent memory leaks
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
    
    // Check for alert conditions
    this.checkAlertConditions(sourceId, status, history);
  }

  /**
   * Get current health status for a source
   */
  getCurrentHealth(sourceId: string): SourceHealthStatus | undefined {
    const history = this.healthHistory.get(sourceId);
    return history && history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * Get health history for a source
   */
  getHealthHistory(sourceId: string, limit?: number): SourceHealthStatus[] {
    const history = this.healthHistory.get(sourceId) || [];
    return limit ? history.slice(-limit) : [...history];
  }

  /**
   * Get aggregated health metrics for a source
   */
  getHealthMetrics(sourceId: string, timeWindowMs: number = 3600000): HealthMetrics {
    const history = this.healthHistory.get(sourceId) || [];
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    const recentHistory = history.filter(status => status.lastCheck >= cutoffTime);
    
    if (recentHistory.length === 0) {
      return {
        sourceId,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        errorRate: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        consecutiveFailures: 0,
        uptime: 0,
        lastCheck: new Date(0)
      };
    }

    const successfulChecks = recentHistory.filter(status => status.isHealthy).length;
    const failedChecks = recentHistory.length - successfulChecks;
    const responseTimes = recentHistory.map(status => status.responseTime);
    
    // Calculate consecutive failures from the end
    let consecutiveFailures = 0;
    for (let i = recentHistory.length - 1; i >= 0; i--) {
      if (!recentHistory[i].isHealthy) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    return {
      sourceId,
      totalChecks: recentHistory.length,
      successfulChecks,
      failedChecks,
      errorRate: failedChecks / recentHistory.length,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      maxResponseTime: Math.max(...responseTimes),
      minResponseTime: Math.min(...responseTimes),
      consecutiveFailures,
      uptime: successfulChecks / recentHistory.length,
      lastCheck: recentHistory[recentHistory.length - 1].lastCheck
    };
  }

  /**
   * Get overall system health across all sources
   */
  getSystemHealth(): SystemHealthSummary {
    const allSources = Array.from(this.healthHistory.keys());
    const sourceMetrics = allSources.map(sourceId => this.getHealthMetrics(sourceId));
    
    if (sourceMetrics.length === 0) {
      return {
        totalSources: 0,
        healthySources: 0,
        unhealthySources: 0,
        overallUptime: 0,
        averageResponseTime: 0,
        totalErrors: 0,
        lastUpdate: new Date()
      };
    }

    const healthySources = sourceMetrics.filter(metrics => 
      metrics.consecutiveFailures === 0 && metrics.errorRate < this.alertThresholds.errorRateThreshold
    ).length;

    const totalErrors = sourceMetrics.reduce((sum, metrics) => sum + metrics.failedChecks, 0);
    const totalChecks = sourceMetrics.reduce((sum, metrics) => sum + metrics.totalChecks, 0);
    const totalResponseTime = sourceMetrics.reduce((sum, metrics) => 
      sum + (metrics.averageResponseTime * metrics.totalChecks), 0
    );

    return {
      totalSources: allSources.length,
      healthySources,
      unhealthySources: allSources.length - healthySources,
      overallUptime: totalChecks > 0 ? (totalChecks - totalErrors) / totalChecks : 0,
      averageResponseTime: totalChecks > 0 ? totalResponseTime / totalChecks : 0,
      totalErrors,
      lastUpdate: new Date()
    };
  }

  /**
   * Register alert callback for health events
   */
  registerAlertCallback(alertType: HealthAlertType, callback: HealthAlertCallback): void {
    if (!this.alertCallbacks.has(alertType)) {
      this.alertCallbacks.set(alertType, []);
    }
    this.alertCallbacks.get(alertType)!.push(callback);
  }

  /**
   * Unregister alert callback
   */
  unregisterAlertCallback(alertType: HealthAlertType, callback: HealthAlertCallback): void {
    const callbacks = this.alertCallbacks.get(alertType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(newThresholds: Partial<HealthAlertThresholds>): void {
    Object.assign(this.alertThresholds, newThresholds);
  }

  /**
   * Clear health history for a source or all sources
   */
  clearHistory(sourceId?: string): void {
    if (sourceId) {
      this.healthHistory.delete(sourceId);
    } else {
      this.healthHistory.clear();
    }
  }

  /**
   * Check for alert conditions and trigger callbacks
   */
  private checkAlertConditions(
    sourceId: string, 
    currentStatus: SourceHealthStatus, 
    history: SourceHealthStatus[]
  ): void {
    // Check for high error rate
    const recentHistory = history.slice(-10); // Last 10 checks
    const errorRate = recentHistory.filter(status => !status.isHealthy).length / recentHistory.length;
    
    if (errorRate >= this.alertThresholds.errorRateThreshold) {
      this.triggerAlert('high_error_rate', {
        sourceId,
        currentStatus,
        errorRate,
        threshold: this.alertThresholds.errorRateThreshold
      });
    }

    // Check for high response time
    if (currentStatus.responseTime >= this.alertThresholds.responseTimeThreshold) {
      this.triggerAlert('high_response_time', {
        sourceId,
        currentStatus,
        responseTime: currentStatus.responseTime,
        threshold: this.alertThresholds.responseTimeThreshold
      });
    }

    // Check for consecutive failures
    let consecutiveFailures = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].isHealthy) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    if (consecutiveFailures >= this.alertThresholds.consecutiveFailuresThreshold) {
      this.triggerAlert('consecutive_failures', {
        sourceId,
        currentStatus,
        consecutiveFailures,
        threshold: this.alertThresholds.consecutiveFailuresThreshold
      });
    }

    // Check for source recovery
    if (currentStatus.isHealthy && history.length >= 2 && !history[history.length - 2].isHealthy) {
      this.triggerAlert('source_recovered', {
        sourceId,
        currentStatus,
        previousStatus: history[history.length - 2]
      });
    }
  }

  /**
   * Trigger alert callbacks
   */
  private triggerAlert(alertType: HealthAlertType, alertData: any): void {
    const callbacks = this.alertCallbacks.get(alertType) || [];
    callbacks.forEach(callback => {
      try {
        callback(alertType, alertData);
      } catch (error) {
        console.error(`Error in health alert callback for ${alertType}:`, error);
      }
    });
  }
}

// Type definitions for health monitoring
export interface HealthMetrics {
  sourceId: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  errorRate: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  consecutiveFailures: number;
  uptime: number;
  lastCheck: Date;
}

export interface SystemHealthSummary {
  totalSources: number;
  healthySources: number;
  unhealthySources: number;
  overallUptime: number;
  averageResponseTime: number;
  totalErrors: number;
  lastUpdate: Date;
}

export interface HealthAlertThresholds {
  errorRateThreshold: number;
  responseTimeThreshold: number;
  consecutiveFailuresThreshold: number;
  healthCheckIntervalMs: number;
}

export type HealthAlertType = 
  | 'high_error_rate'
  | 'high_response_time'
  | 'consecutive_failures'
  | 'source_recovered';

export type HealthAlertCallback = (alertType: HealthAlertType, alertData: any) => void;