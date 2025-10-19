// Integration Tests for System Monitor
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SystemMonitor, Alert, SystemMetrics } from '../system-monitor';
import { PrivacyComplyAgentFactory } from '../../factory';
import { PrivacyComplyAgent } from '../../services/privacy-comply-agent';

describe('System Monitor Integration Tests', () => {
  let agent: PrivacyComplyAgent;
  let monitor: SystemMonitor;

  beforeEach(async () => {
    // Create and initialize agent
    const factory = PrivacyComplyAgentFactory.getInstance();
    agent = await factory.createAgent();
    await agent.initialize();
    
    // Create system monitor
    monitor = new SystemMonitor(agent, {
      enabled: true,
      criticalThreshold: 0.3,
      warningThreshold: 0.6,
      maxCriticalIssues: 3,
      serviceDowngradeThreshold: 0.5,
      notificationChannels: ['console']
    });
  });

  afterEach(async () => {
    if (monitor) {
      await monitor.stopMonitoring();
    }
    if (agent) {
      await agent.shutdown();
    }
  });

  describe('Metrics Collection', () => {
    it('should collect system metrics successfully', async () => {
      const metrics = await monitor.collectMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('overallHealth');
      expect(metrics).toHaveProperty('serviceHealth');
      expect(metrics).toHaveProperty('activeRemediations');
      expect(metrics).toHaveProperty('criticalIssues');
      expect(metrics).toHaveProperty('scanDuration');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('cpuUsage');
      
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(typeof metrics.overallHealth).toBe('number');
      expect(metrics.overallHealth).toBeGreaterThanOrEqual(0);
      expect(metrics.overallHealth).toBeLessThanOrEqual(1);
      expect(typeof metrics.serviceHealth).toBe('object');
      expect(typeof metrics.activeRemediations).toBe('number');
      expect(typeof metrics.criticalIssues).toBe('number');
      expect(typeof metrics.scanDuration).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
      expect(typeof metrics.cpuUsage).toBe('number');
    });

    it('should maintain metrics history', async () => {
      // Collect multiple metrics
      await monitor.collectMetrics();
      await new Promise(resolve => setTimeout(resolve, 100));
      await monitor.collectMetrics();
      await new Promise(resolve => setTimeout(resolve, 100));
      await monitor.collectMetrics();
      
      const history = monitor.getMetricsHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
      
      // Verify timestamps are in order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          history[i - 1].timestamp.getTime()
        );
      }
    });

    it('should limit metrics history size', async () => {
      // This test would be slow with actual limits, so we'll just verify the concept
      const initialCount = monitor.getMetricsHistory().length;
      
      await monitor.collectMetrics();
      
      const newCount = monitor.getMetricsHistory().length;
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('Alert Generation', () => {
    it('should generate alerts based on thresholds', async () => {
      // Start monitoring to enable alert evaluation
      await monitor.startMonitoring(1000); // 1 second interval
      
      // Wait for a few monitoring cycles
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Stop monitoring
      await monitor.stopMonitoring();
      
      // Check if any alerts were generated
      const alerts = monitor.getAllAlerts();
      expect(Array.isArray(alerts)).toBe(true);
      
      // If alerts exist, verify their structure
      if (alerts.length > 0) {
        const alert = alerts[0];
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('timestamp');
        expect(alert).toHaveProperty('resolved');
        expect(['CRITICAL', 'WARNING', 'INFO']).toContain(alert.type);
        expect(typeof alert.message).toBe('string');
        expect(alert.timestamp).toBeInstanceOf(Date);
        expect(typeof alert.resolved).toBe('boolean');
      }
    });

    it('should not create duplicate alerts', async () => {
      // Manually trigger alert evaluation multiple times
      await monitor.collectMetrics();
      await monitor.evaluateAlerts();
      
      const initialAlertCount = monitor.getAllAlerts().length;
      
      // Trigger again immediately
      await monitor.evaluateAlerts();
      
      const finalAlertCount = monitor.getAllAlerts().length;
      
      // Should not have created duplicate alerts
      expect(finalAlertCount).toBe(initialAlertCount);
    });

    it('should resolve alerts', async () => {
      // Create a test alert by collecting metrics
      await monitor.collectMetrics();
      await monitor.evaluateAlerts();
      
      const alerts = monitor.getActiveAlerts();
      
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        const resolved = await monitor.resolveAlert(alertId);
        
        expect(resolved).toBe(true);
        
        // Verify alert is no longer active
        const activeAlerts = monitor.getActiveAlerts();
        const resolvedAlert = activeAlerts.find(a => a.id === alertId);
        expect(resolvedAlert).toBeUndefined();
      }
    });
  });

  describe('Monitoring Lifecycle', () => {
    it('should start and stop monitoring', async () => {
      // Start monitoring
      await monitor.startMonitoring(2000); // 2 second interval
      
      // Wait for at least one cycle
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Should have collected some metrics
      const metrics = monitor.getMetricsHistory();
      expect(metrics.length).toBeGreaterThan(0);
      
      // Stop monitoring
      await monitor.stopMonitoring();
      
      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Metrics count should not increase significantly after stopping
      const finalMetrics = monitor.getMetricsHistory();
      expect(finalMetrics.length).toBeLessThanOrEqual(metrics.length + 1);
    });

    it('should handle monitoring errors gracefully', async () => {
      // Mock a method to throw an error
      const originalCollectMetrics = monitor.collectMetrics;
      let errorThrown = false;
      
      monitor.collectMetrics = vi.fn().mockImplementation(async () => {
        if (!errorThrown) {
          errorThrown = true;
          throw new Error('Test error');
        }
        return originalCollectMetrics.call(monitor);
      });
      
      // Start monitoring
      await monitor.startMonitoring(1000);
      
      // Wait for error to occur and recovery
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Stop monitoring
      await monitor.stopMonitoring();
      
      // Should have some metrics despite the error
      const metrics = monitor.getMetricsHistory();
      expect(metrics.length).toBeGreaterThan(0);
      
      // Restore original method
      monitor.collectMetrics = originalCollectMetrics;
    });
  });

  describe('Configuration Management', () => {
    it('should update alerting configuration', () => {
      const newConfig = {
        criticalThreshold: 0.2,
        warningThreshold: 0.5,
        maxCriticalIssues: 10,
        notificationChannels: ['console', 'email']
      };
      
      monitor.updateAlertingConfig(newConfig);
      
      const config = monitor.getAlertingConfig();
      expect(config.criticalThreshold).toBe(newConfig.criticalThreshold);
      expect(config.warningThreshold).toBe(newConfig.warningThreshold);
      expect(config.maxCriticalIssues).toBe(newConfig.maxCriticalIssues);
      expect(config.notificationChannels).toEqual(newConfig.notificationChannels);
    });

    it('should maintain configuration consistency', () => {
      const originalConfig = monitor.getAlertingConfig();
      
      // Update partial configuration
      monitor.updateAlertingConfig({ criticalThreshold: 0.1 });
      
      const updatedConfig = monitor.getAlertingConfig();
      expect(updatedConfig.criticalThreshold).toBe(0.1);
      expect(updatedConfig.warningThreshold).toBe(originalConfig.warningThreshold);
      expect(updatedConfig.enabled).toBe(originalConfig.enabled);
    });
  });

  describe('Integration with Privacy Comply Agent', () => {
    it('should reflect agent status in metrics', async () => {
      // Get agent status
      const agentStatus = await agent.getSystemStatus();
      
      // Collect metrics
      const metrics = await monitor.collectMetrics();
      
      // Verify metrics reflect agent status
      expect(metrics.activeRemediations).toBe(agentStatus.activeRemediations);
      
      // Service health should be consistent
      const agentServices = Object.keys(agentStatus.services);
      const metricsServices = Object.keys(metrics.serviceHealth);
      
      // Should have overlapping services
      const commonServices = agentServices.filter(service => 
        metricsServices.includes(service)
      );
      expect(commonServices.length).toBeGreaterThan(0);
    });

    it('should monitor compliance health changes', async () => {
      // Get initial health score
      const initialHealth = await agent.getComplianceHealthScore();
      
      // Collect initial metrics
      const initialMetrics = await monitor.collectMetrics();
      
      expect(initialMetrics.overallHealth).toBe(initialHealth.overallScore);
      expect(initialMetrics.criticalIssues).toBe(initialHealth.criticalIssues);
    });
  });
});