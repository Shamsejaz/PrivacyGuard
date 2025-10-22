import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthMonitor } from '../../services/dark-web-intelligence/utils/HealthMonitor';
import { SourceHealthStatus } from '../../services/dark-web-intelligence/types';

describe('HealthMonitor', () => {
  let healthMonitor: HealthMonitor;
  let mockHealthStatus: SourceHealthStatus;

  beforeEach(() => {
    healthMonitor = new HealthMonitor({
      errorRateThreshold: 0.2,
      responseTimeThreshold: 3000,
      consecutiveFailuresThreshold: 2,
      healthCheckIntervalMs: 60000
    });

    mockHealthStatus = {
      sourceId: 'test-source',
      isHealthy: true,
      lastCheck: new Date(),
      responseTime: 500,
      errorCount: 0
    };
  });

  describe('health status recording', () => {
    it('should record health status successfully', () => {
      healthMonitor.recordHealthStatus(mockHealthStatus);
      
      const currentHealth = healthMonitor.getCurrentHealth('test-source');
      expect(currentHealth).toEqual(mockHealthStatus);
    });

    it('should maintain health history', () => {
      const status1 = { ...mockHealthStatus, responseTime: 100 };
      const status2 = { ...mockHealthStatus, responseTime: 200 };
      
      healthMonitor.recordHealthStatus(status1);
      healthMonitor.recordHealthStatus(status2);
      
      const history = healthMonitor.getHealthHistory('test-source');
      expect(history).toHaveLength(2);
    });
  });

  describe('health metrics calculation', () => {
    it('should calculate correct health metrics', () => {
      const healthyStatus = { ...mockHealthStatus, isHealthy: true };
      const unhealthyStatus = { ...mockHealthStatus, isHealthy: false };
      
      healthMonitor.recordHealthStatus(healthyStatus);
      healthMonitor.recordHealthStatus(unhealthyStatus);
      
      const metrics = healthMonitor.getHealthMetrics('test-source');
      
      expect(metrics.totalChecks).toBe(2);
      expect(metrics.successfulChecks).toBe(1);
      expect(metrics.failedChecks).toBe(1);
      expect(metrics.errorRate).toBe(0.5);
    });
  });
});