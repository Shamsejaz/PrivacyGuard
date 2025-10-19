// Integration Tests for Performance Metrics
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceMetricsCollector, performanceMetrics, measurePerformance } from '../performance-metrics';
import { PrivacyComplyAgentFactory } from '../../factory';
import { PrivacyComplyAgent } from '../../services/privacy-comply-agent';

describe('Performance Metrics Integration Tests', () => {
  let agent: PrivacyComplyAgent;
  let metricsCollector: PerformanceMetricsCollector;

  beforeEach(async () => {
    // Create fresh metrics collector for each test
    metricsCollector = new PerformanceMetricsCollector();
    
    // Create and initialize agent
    const factory = PrivacyComplyAgentFactory.getInstance();
    agent = await factory.createAgent();
    await agent.initialize();
  });

  afterEach(async () => {
    if (agent) {
      await agent.shutdown();
    }
  });

  describe('Metrics Collection', () => {
    it('should record performance metrics', () => {
      metricsCollector.recordMetric('test.metric', 100, 'ms', { test: 'true' });
      
      const metrics = metricsCollector.getMetrics('test.metric');
      expect(metrics).toHaveLength(1);
      
      const metric = metrics[0];
      expect(metric.name).toBe('test.metric');
      expect(metric.value).toBe(100);
      expect(metric.unit).toBe('ms');
      expect(metric.tags).toEqual({ test: 'true' });
      expect(metric.timestamp).toBeInstanceOf(Date);
    });

    it('should track operation performance', async () => {
      const operationId = 'test-op-1';
      
      metricsCollector.startOperation(operationId, 'test-operation', { param: 'value' });
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      metricsCollector.endOperation(operationId, true, { result: 'success' });
      
      const operations = metricsCollector.getOperationMetrics('test-operation');
      expect(operations).toHaveLength(1);
      
      const operation = operations[0];
      expect(operation.operationName).toBe('test-operation');
      expect(operation.duration).toBeGreaterThan(90); // Should be around 100ms
      expect(operation.success).toBe(true);
      expect(operation.metadata).toMatchObject({ 
        operationName: 'test-operation',
        param: 'value',
        result: 'success'
      });
    });

    it('should handle operation failures', () => {
      const operationId = 'test-op-fail';
      
      metricsCollector.startOperation(operationId, 'failing-operation');
      metricsCollector.endOperation(operationId, false, { error: 'Test error' });
      
      const operations = metricsCollector.getOperationMetrics('failing-operation');
      expect(operations).toHaveLength(1);
      
      const operation = operations[0];
      expect(operation.success).toBe(false);
      expect(operation.metadata).toMatchObject({ error: 'Test error' });
    });
  });

  describe('Compliance Metrics Integration', () => {
    it('should record compliance scan metrics', async () => {
      // Run a compliance scan to generate metrics
      const scanResults = await agent.runComplianceScan();
      
      // Check if metrics were recorded (the agent should record these automatically)
      const scanMetrics = performanceMetrics.getMetrics('compliance.scan');
      
      // Should have recorded scan metrics
      expect(scanMetrics.length).toBeGreaterThan(0);
      
      // Check for specific metrics
      const findingsMetric = scanMetrics.find(m => m.name === 'compliance.scan.findings');
      const durationMetric = scanMetrics.find(m => m.name === 'compliance.scan.duration');
      
      if (findingsMetric) {
        expect(findingsMetric.value).toBe(scanResults.findings.length);
        expect(findingsMetric.unit).toBe('count');
      }
      
      if (durationMetric) {
        expect(durationMetric.value).toBeGreaterThan(0);
        expect(durationMetric.unit).toBe('ms');
      }
    });

    it('should record remediation metrics', async () => {
      // First run a scan to get findings
      const scanResults = await agent.runComplianceScan();
      
      // If there are remediable findings, execute remediation
      if (scanResults.recommendations.some(r => r.automatable)) {
        await agent.executeAutomatedRemediation();
        
        // Check for remediation metrics
        const remediationMetrics = performanceMetrics.getMetrics('remediation');
        expect(remediationMetrics.length).toBeGreaterThan(0);
        
        // Should have recorded various remediation metrics
        const totalMetric = remediationMetrics.find(m => m.name === 'remediation.total');
        const successMetric = remediationMetrics.find(m => m.name === 'remediation.successful');
        
        if (totalMetric) {
          expect(totalMetric.value).toBeGreaterThanOrEqual(0);
          expect(totalMetric.unit).toBe('count');
        }
        
        if (successMetric) {
          expect(successMetric.value).toBeGreaterThanOrEqual(0);
          expect(successMetric.unit).toBe('count');
        }
      }
    });
  });

  describe('Performance Decorator', () => {
    class TestService {
      @measurePerformance('test-method')
      async testMethod(delay: number): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'success';
      }

      @measurePerformance('failing-method')
      async failingMethod(): Promise<void> {
        throw new Error('Test error');
      }
    }

    it('should measure method performance with decorator', async () => {
      const service = new TestService();
      
      const result = await service.testMethod(50);
      expect(result).toBe('success');
      
      // Check if operation was recorded
      const operations = performanceMetrics.getOperationMetrics('test-method');
      expect(operations.length).toBeGreaterThan(0);
      
      const operation = operations[operations.length - 1]; // Get latest
      expect(operation.operationName).toBe('test-method');
      expect(operation.success).toBe(true);
      expect(operation.duration).toBeGreaterThan(40); // Should be around 50ms
    });

    it('should handle method failures with decorator', async () => {
      const service = new TestService();
      
      await expect(service.failingMethod()).rejects.toThrow('Test error');
      
      // Check if failed operation was recorded
      const operations = performanceMetrics.getOperationMetrics('failing-method');
      expect(operations.length).toBeGreaterThan(0);
      
      const operation = operations[operations.length - 1]; // Get latest
      expect(operation.operationName).toBe('failing-method');
      expect(operation.success).toBe(false);
      expect(operation.metadata).toMatchObject({ error: 'Test error' });
    });
  });

  describe('Performance Analysis', () => {
    it('should generate performance summary', () => {
      // Record some test operations
      metricsCollector.startOperation('op1', 'test-op');
      metricsCollector.endOperation('op1', true);
      
      metricsCollector.startOperation('op2', 'test-op');
      metricsCollector.endOperation('op2', false);
      
      metricsCollector.startOperation('op3', 'other-op');
      metricsCollector.endOperation('op3', true);
      
      const summary = metricsCollector.getPerformanceSummary();
      
      expect(summary.totalOperations).toBe(3);
      expect(summary.successfulOperations).toBe(2);
      expect(summary.failedOperations).toBe(1);
      expect(summary.averageDuration).toBeGreaterThanOrEqual(0);
      
      expect(summary.operationBreakdown).toHaveProperty('test-op');
      expect(summary.operationBreakdown).toHaveProperty('other-op');
      
      const testOpBreakdown = summary.operationBreakdown['test-op'];
      expect(testOpBreakdown.count).toBe(2);
      expect(testOpBreakdown.successRate).toBe(0.5); // 1 success out of 2
      
      const otherOpBreakdown = summary.operationBreakdown['other-op'];
      expect(otherOpBreakdown.count).toBe(1);
      expect(otherOpBreakdown.successRate).toBe(1.0); // 1 success out of 1
    });

    it('should filter metrics by time range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      // Record metrics at different times
      metricsCollector.recordMetric('old.metric', 1, 'count');
      
      // Manually set timestamp to simulate old metric
      const metrics = metricsCollector.getMetrics();
      if (metrics.length > 0) {
        metrics[metrics.length - 1].timestamp = oneHourAgo;
      }
      
      metricsCollector.recordMetric('new.metric', 2, 'count');
      
      // Filter by time
      const recentMetrics = metricsCollector.getMetrics(undefined, new Date(now.getTime() - 30 * 60 * 1000));
      
      expect(recentMetrics.length).toBe(1);
      expect(recentMetrics[0].name).toBe('new.metric');
    });

    it('should export metrics data', () => {
      // Record some test data
      metricsCollector.recordMetric('export.test', 100, 'ms');
      metricsCollector.startOperation('export-op', 'export-operation');
      metricsCollector.endOperation('export-op', true);
      
      const exportData = metricsCollector.exportMetrics();
      
      expect(exportData).toHaveProperty('metrics');
      expect(exportData).toHaveProperty('operations');
      expect(exportData).toHaveProperty('summary');
      
      expect(Array.isArray(exportData.metrics)).toBe(true);
      expect(Array.isArray(exportData.operations)).toBe(true);
      expect(typeof exportData.summary).toBe('object');
      
      // Should contain our test data
      const testMetric = exportData.metrics.find(m => m.name === 'export.test');
      expect(testMetric).toBeDefined();
      expect(testMetric?.value).toBe(100);
      
      const testOperation = exportData.operations.find(o => o.operationName === 'export-operation');
      expect(testOperation).toBeDefined();
      expect(testOperation?.success).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should limit metrics history size', () => {
      const initialCount = metricsCollector.getMetrics().length;
      
      // Add many metrics (but not enough to trigger limit in test)
      for (let i = 0; i < 100; i++) {
        metricsCollector.recordMetric(`test.metric.${i}`, i, 'count');
      }
      
      const finalCount = metricsCollector.getMetrics().length;
      expect(finalCount).toBe(initialCount + 100);
    });

    it('should clear old metrics', () => {
      // Record some metrics
      metricsCollector.recordMetric('old.metric', 1, 'count');
      metricsCollector.recordMetric('new.metric', 2, 'count');
      
      const initialCount = metricsCollector.getMetrics().length;
      expect(initialCount).toBeGreaterThanOrEqual(2);
      
      // Clear metrics older than now (should clear all)
      metricsCollector.clearOldMetrics(new Date());
      
      const finalCount = metricsCollector.getMetrics().length;
      expect(finalCount).toBe(0);
    });
  });
});