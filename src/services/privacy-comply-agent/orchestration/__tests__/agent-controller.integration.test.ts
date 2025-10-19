/**
 * Integration Tests for Agent Controller
 * Tests the complete orchestration workflow with real service integrations
 */

import { AgentController } from '../agent-controller';
import { createAgentController } from '../../factory';
import { AgentConfiguration } from '../../types';

describe('AgentController Integration Tests', () => {
  let controller: AgentController;

  beforeEach(() => {
    // Reset any global state
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (controller) {
      try {
        await controller.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
  });

  describe('Factory Integration', () => {
    test('should create agent controller through factory', async () => {
      const config: Partial<AgentConfiguration> = {
        scanInterval: 300000,
        autoRemediation: false,
        enableContinuousMonitoring: false,
        maxConcurrentRemediations: 2,
        riskThreshold: 0.8
      };

      controller = await createAgentController(config);
      
      expect(controller).toBeDefined();
      expect(controller.getConfiguration()).toMatchObject(config);
    });

    test('should create controller with default configuration', async () => {
      controller = await createAgentController();
      
      const config = controller.getConfiguration();
      expect(config.scanInterval).toBeGreaterThan(0);
      expect(config.maxConcurrentRemediations).toBeGreaterThan(0);
      expect(config.riskThreshold).toBeGreaterThanOrEqual(0);
      expect(config.riskThreshold).toBeLessThanOrEqual(1);
    });
  });

  describe('Configuration Management Integration', () => {
    beforeEach(async () => {
      controller = await createAgentController({
        enableContinuousMonitoring: false
      });
    });

    test('should validate configuration during initialization', async () => {
      // Mock AWS services to avoid actual calls
      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      
      await expect(controller.initialize()).resolves.not.toThrow();
    });

    test('should handle configuration updates', async () => {
      const newConfig: Partial<AgentConfiguration> = {
        scanInterval: 600000,
        riskThreshold: 0.9,
        maxConcurrentRemediations: 5
      };

      await controller.updateConfiguration(newConfig);
      
      const updatedConfig = controller.getConfiguration();
      expect(updatedConfig.scanInterval).toBe(600000);
      expect(updatedConfig.riskThreshold).toBe(0.9);
      expect(updatedConfig.maxConcurrentRemediations).toBe(5);
    });
  });

  describe('Service Orchestration Integration', () => {
    beforeEach(async () => {
      controller = await createAgentController({
        enableContinuousMonitoring: false,
        autoRemediation: false, // Disable for controlled testing
        retryAttempts: 1 // Reduce retries for faster tests
      });

      // Mock AWS services to avoid actual calls
      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      jest.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();
    });

    test('should orchestrate complete workflow', async () => {
      // Mock the individual orchestration methods to return test data
      jest.spyOn(controller as any, 'orchestrateRiskDetection').mockResolvedValue([
        {
          id: 'test-finding-1',
          resourceArn: 'arn:aws:s3:::test-bucket',
          findingType: 'ENCRYPTION',
          severity: 'HIGH',
          description: 'Test finding',
          detectedAt: new Date(),
          rawData: {}
        }
      ]);

      jest.spyOn(controller as any, 'orchestrateComplianceAnalysis').mockResolvedValue([
        {
          findingId: 'test-finding-1',
          legalMappings: [],
          riskScore: 0.8,
          confidenceScore: 0.9,
          recommendations: [],
          reasoning: 'Test assessment',
          assessedAt: new Date()
        }
      ]);

      jest.spyOn(controller as any, 'orchestrateRecommendationGeneration').mockResolvedValue([
        {
          id: 'test-rec-1',
          findingId: 'test-finding-1',
          action: 'ENABLE_ENCRYPTION',
          priority: 'HIGH',
          automatable: true,
          lambdaFunction: 'test-function',
          parameters: {},
          estimatedImpact: 'Test impact'
        }
      ]);

      const result = await controller.executeComplianceWorkflow({
        skipRemediation: true
      });

      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(1);
      expect(result.assessments).toHaveLength(1);
      expect(result.recommendations).toHaveLength(1);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should handle partial workflow failures gracefully', async () => {
      // Mock risk detection to fail
      jest.spyOn(controller as any, 'orchestrateRiskDetection').mockRejectedValue(new Error('Risk detection failed'));

      const result = await controller.executeComplianceWorkflow();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Risk detection failed');
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics Integration', () => {
    beforeEach(async () => {
      controller = await createAgentController({
        enableContinuousMonitoring: false
      });

      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      jest.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();
    });

    test('should record performance metrics during workflow execution', async () => {
      // Mock workflow methods
      jest.spyOn(controller as any, 'orchestrateRiskDetection').mockResolvedValue([]);
      jest.spyOn(controller as any, 'orchestrateComplianceAnalysis').mockResolvedValue([]);
      jest.spyOn(controller as any, 'orchestrateRecommendationGeneration').mockResolvedValue([]);

      const metrics = controller.getPerformanceMetrics();
      const initialSummary = metrics.getPerformanceSummary();
      const initialOperations = initialSummary.totalOperations;

      await controller.executeComplianceWorkflow();

      const finalSummary = metrics.getPerformanceSummary();
      expect(finalSummary.totalOperations).toBeGreaterThan(initialOperations);
    });

    test('should track operation success and failure rates', async () => {
      const metrics = controller.getPerformanceMetrics();

      // Mock a successful operation
      jest.spyOn(controller as any, 'orchestrateRiskDetection').mockResolvedValue([]);
      jest.spyOn(controller as any, 'orchestrateComplianceAnalysis').mockResolvedValue([]);
      jest.spyOn(controller as any, 'orchestrateRecommendationGeneration').mockResolvedValue([]);

      await controller.executeComplianceWorkflow();

      const summary = metrics.getPerformanceSummary();
      expect(summary.successfulOperations).toBeGreaterThan(0);
    });
  });

  describe('System Health Integration', () => {
    beforeEach(async () => {
      controller = await createAgentController({
        enableContinuousMonitoring: false
      });
    });

    test('should report system status accurately', async () => {
      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      jest.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();

      const status = await controller.getSystemStatus();

      expect(status.status).toBe('HEALTHY');
      expect(status.services).toBeDefined();
      expect(status.activeWorkflows).toBe(0);
      expect(status.configuration).toBeDefined();
    });

    test('should detect degraded system health', async () => {
      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      jest.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();

      // Mock some services as unhealthy
      jest.spyOn(controller as any, 'performHealthChecks').mockResolvedValue({
        riskDetector: true,
        reasoningEngine: false, // Unhealthy
        remediationService: true,
        reportingService: false, // Unhealthy
        nlInterface: true,
        systemMonitor: true,
        workflowManager: true,
        awsConnectivity: true
      });

      const status = await controller.getSystemStatus();

      expect(status.status).toBe('DEGRADED');
    });
  });

  describe('Workflow Manager Integration', () => {
    beforeEach(async () => {
      controller = await createAgentController({
        enableContinuousMonitoring: false
      });

      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      jest.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();
    });

    test('should provide access to workflow manager', () => {
      const workflowManager = controller.getWorkflowManager();
      
      expect(workflowManager).toBeDefined();
      expect(typeof workflowManager.createWorkflow).toBe('function');
    });

    test('should integrate with workflow manager for remediation', async () => {
      const workflowManager = controller.getWorkflowManager();
      
      // Mock workflow creation
      jest.spyOn(workflowManager, 'createWorkflow').mockResolvedValue('test-workflow-id');

      // Mock orchestration methods
      jest.spyOn(controller as any, 'orchestrateRiskDetection').mockResolvedValue([]);
      jest.spyOn(controller as any, 'orchestrateComplianceAnalysis').mockResolvedValue([]);
      jest.spyOn(controller as any, 'orchestrateRecommendationGeneration').mockResolvedValue([
        {
          id: 'test-rec-1',
          findingId: 'test-finding-1',
          action: 'ENABLE_ENCRYPTION',
          priority: 'HIGH',
          automatable: true,
          lambdaFunction: 'test-function',
          parameters: {},
          estimatedImpact: 'Test impact'
        }
      ]);

      jest.spyOn(controller as any, 'remediationService').mockReturnValue({
        executeRemediation: jest.fn().mockResolvedValue({
          remediationId: 'test-rem-1',
          success: true,
          message: 'Success',
          executedAt: new Date(),
          findingId: 'test-finding-1'
        })
      });

      const result = await controller.executeComplianceWorkflow({
        skipRemediation: false
      });

      expect(workflowManager.createWorkflow).toHaveBeenCalled();
    });
  });

  describe('Error Recovery Integration', () => {
    beforeEach(async () => {
      controller = await createAgentController({
        enableContinuousMonitoring: false,
        retryAttempts: 2,
        retryDelay: 100 // Fast retries for testing
      });
    });

    test('should recover from initialization failures', async () => {
      // Mock initial failure then success
      let callCount = 0;
      jest.spyOn(controller as any, 'validateConfiguration').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Initial validation failure');
        }
        return undefined;
      });

      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);

      // First initialization should fail
      await expect(controller.initialize()).rejects.toThrow('Initial validation failure');

      // Second initialization should succeed
      await expect(controller.initialize()).resolves.not.toThrow();
    });

    test('should handle service failures during workflow execution', async () => {
      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      jest.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();

      // Mock service failure with recovery
      let riskDetectionCalls = 0;
      jest.spyOn(controller as any, 'orchestrateRiskDetection').mockImplementation(async () => {
        riskDetectionCalls++;
        if (riskDetectionCalls === 1) {
          throw new Error('Service temporarily unavailable');
        }
        return [];
      });

      jest.spyOn(controller as any, 'orchestrateComplianceAnalysis').mockResolvedValue([]);
      jest.spyOn(controller as any, 'orchestrateRecommendationGeneration').mockResolvedValue([]);

      const result = await controller.executeComplianceWorkflow();

      expect(riskDetectionCalls).toBe(2); // Initial call + 1 retry
      expect(result.success).toBe(true);
    });
  });

  describe('State Management Integration', () => {
    beforeEach(async () => {
      controller = await createAgentController({
        enableContinuousMonitoring: false
      });
    });

    test('should maintain consistent state throughout lifecycle', async () => {
      // Initial state
      let state = controller.getState();
      expect(state.initialized).toBe(false);
      expect(state.monitoring).toBe(false);
      expect(state.systemHealth).toBe('UNHEALTHY');

      // After initialization
      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      jest.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();
      
      state = controller.getState();
      expect(state.initialized).toBe(true);
      expect(state.systemHealth).toBe('HEALTHY');

      // After shutdown
      await controller.shutdown();
      
      state = controller.getState();
      expect(state.initialized).toBe(false);
      expect(state.monitoring).toBe(false);
    });

    test('should track active workflows', async () => {
      jest.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      jest.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();

      // Mock slow workflow execution to check active workflow tracking
      jest.spyOn(controller as any, 'orchestrateRiskDetection').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return [];
      });
      jest.spyOn(controller as any, 'orchestrateComplianceAnalysis').mockResolvedValue([]);
      jest.spyOn(controller as any, 'orchestrateRecommendationGeneration').mockResolvedValue([]);

      const workflowPromise = controller.executeComplianceWorkflow();

      // Check that workflow is tracked as active
      setTimeout(() => {
        const state = controller.getState();
        expect(state.activeWorkflows.size).toBeGreaterThan(0);
      }, 50);

      await workflowPromise;

      // Check that workflow is no longer active
      const finalState = controller.getState();
      expect(finalState.activeWorkflows.size).toBe(0);
    });
  });
});