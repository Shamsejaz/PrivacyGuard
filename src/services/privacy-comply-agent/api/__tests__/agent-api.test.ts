/**
 * Agent API Unit Tests
 * Tests for the Agent Control API endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentAPI } from '../agent-api';
import { AgentController } from '../../orchestration/agent-controller';

// Mock the agent controller
const mockAgentController = {
  getSystemStatus: vi.fn(),
  initialize: vi.fn(),
  startContinuousMonitoring: vi.fn(),
  stopContinuousMonitoring: vi.fn(),
  executeComplianceWorkflow: vi.fn(),
  updateConfiguration: vi.fn(),
  getConfiguration: vi.fn(),
  shutdown: vi.fn(),
  getPerformanceMetrics: vi.fn(),
  getState: vi.fn()
} as any;

describe('AgentAPI', () => {
  let agentAPI: AgentAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    agentAPI = new AgentAPI(mockAgentController);
  });

  describe('getStatus', () => {
    it('should return complete agent status', async () => {
      const mockSystemStatus = {
        status: 'HEALTHY' as const,
        services: {
          riskDetector: true,
          reasoningEngine: true,
          remediationService: false
        },
        lastScan: new Date('2024-01-01T10:00:00Z'),
        nextScan: new Date('2024-01-01T11:00:00Z'),
        activeWorkflows: 3,
        configuration: {
          scanInterval: 3600000,
          autoRemediation: true
        }
      };

      const mockState = {
        initialized: true,
        monitoring: true,
        activeWorkflows: new Set(['w1', 'w2'])
      };

      mockAgentController.getSystemStatus.mockResolvedValue(mockSystemStatus);
      mockAgentController.getState.mockReturnValue(mockState);

      const response = await agentAPI.getStatus();

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.status).toBe('HEALTHY');
      expect(response.data.initialized).toBe(true);
      expect(response.data.monitoring).toBe(true);
      expect(response.data.services).toEqual(mockSystemStatus.services);
      expect(response.data.lastScan).toBe('2024-01-01T10:00:00.000Z');
      expect(response.data.nextScan).toBe('2024-01-01T11:00:00.000Z');
      expect(response.data.activeWorkflows).toBe(3);
      expect(response.data.activeRemediations).toBe(2);
      expect(response.data.configuration).toEqual(mockSystemStatus.configuration);
      expect(response.data.systemHealth).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockAgentController.getSystemStatus.mockRejectedValue(new Error('Database connection failed'));

      const response = await agentAPI.getStatus();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Database connection failed');
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('controlAgent', () => {
    it('should initialize agent successfully', async () => {
      mockAgentController.initialize.mockResolvedValue(undefined);

      const response = await agentAPI.controlAgent({ action: 'initialize' });

      expect(response.success).toBe(true);
      expect(response.data.action).toBe('initialize');
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Agent initialized successfully');
      expect(response.data.executionTime).toBeDefined();
      expect(mockAgentController.initialize).toHaveBeenCalledOnce();
    });

    it('should start monitoring successfully', async () => {
      mockAgentController.startContinuousMonitoring.mockResolvedValue(undefined);

      const response = await agentAPI.controlAgent({ action: 'start' });

      expect(response.success).toBe(true);
      expect(response.data.action).toBe('start');
      expect(response.data.message).toBe('Continuous monitoring started');
      expect(mockAgentController.startContinuousMonitoring).toHaveBeenCalledOnce();
    });

    it('should stop monitoring successfully', async () => {
      mockAgentController.stopContinuousMonitoring.mockResolvedValue(undefined);

      const response = await agentAPI.controlAgent({ action: 'stop' });

      expect(response.success).toBe(true);
      expect(response.data.action).toBe('stop');
      expect(response.data.message).toBe('Continuous monitoring stopped');
      expect(mockAgentController.stopContinuousMonitoring).toHaveBeenCalledOnce();
    });

    it('should restart monitoring successfully', async () => {
      mockAgentController.stopContinuousMonitoring.mockResolvedValue(undefined);
      mockAgentController.startContinuousMonitoring.mockResolvedValue(undefined);

      const response = await agentAPI.controlAgent({ action: 'restart' });

      expect(response.success).toBe(true);
      expect(response.data.action).toBe('restart');
      expect(response.data.message).toBe('Agent restarted successfully');
      expect(mockAgentController.stopContinuousMonitoring).toHaveBeenCalledOnce();
      expect(mockAgentController.startContinuousMonitoring).toHaveBeenCalledOnce();
    });

    it('should execute compliance scan successfully', async () => {
      const mockWorkflowResult = {
        workflowId: 'workflow-123',
        success: true,
        findings: [{ id: 'f1' }, { id: 'f2' }],
        recommendations: [{ id: 'r1' }],
        executionTime: 5000
      };

      mockAgentController.executeComplianceWorkflow.mockResolvedValue(mockWorkflowResult);

      const response = await agentAPI.controlAgent({
        action: 'scan',
        options: { skipRemediation: true, generateReport: false }
      });

      expect(response.success).toBe(true);
      expect(response.data.action).toBe('scan');
      expect(response.data.workflowId).toBe('workflow-123');
      expect(response.data.message).toContain('2 findings');
      expect(response.data.message).toContain('1 recommendations');
      expect(mockAgentController.executeComplianceWorkflow).toHaveBeenCalledWith({
        skipRemediation: true,
        generateReport: false
      });
    });

    it('should handle unknown action', async () => {
      const response = await agentAPI.controlAgent({ action: 'unknown' as any });

      expect(response.success).toBe(false);
      expect(response.data.action).toBe('unknown');
      expect(response.data.success).toBe(false);
      expect(response.data.message).toContain('Unknown action');
    });

    it('should handle control action errors', async () => {
      mockAgentController.initialize.mockRejectedValue(new Error('Initialization failed'));

      const response = await agentAPI.controlAgent({ action: 'initialize' });

      expect(response.success).toBe(false);
      expect(response.data.action).toBe('initialize');
      expect(response.data.success).toBe(false);
      expect(response.data.message).toBe('Initialization failed');
      expect(response.error).toBe('Initialization failed');
    });
  });

  describe('getConfiguration', () => {
    it('should return current configuration', async () => {
      const mockConfig = {
        scanInterval: 3600000,
        autoRemediation: true,
        maxConcurrentRemediations: 5,
        riskThreshold: 0.7,
        enableContinuousMonitoring: true,
        retryAttempts: 3,
        retryDelay: 5000
      };

      mockAgentController.getConfiguration.mockReturnValue(mockConfig);

      const response = await agentAPI.getConfiguration();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockConfig);
      expect(mockAgentController.getConfiguration).toHaveBeenCalledOnce();
    });

    it('should handle configuration retrieval errors', async () => {
      mockAgentController.getConfiguration.mockImplementation(() => {
        throw new Error('Configuration not available');
      });

      const response = await agentAPI.getConfiguration();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Configuration not available');
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration successfully', async () => {
      const configUpdate = {
        scanInterval: 1800000,
        autoRemediation: false
      };

      const updatedConfig = {
        scanInterval: 1800000,
        autoRemediation: false,
        maxConcurrentRemediations: 5,
        riskThreshold: 0.7,
        enableContinuousMonitoring: true,
        retryAttempts: 3,
        retryDelay: 5000
      };

      mockAgentController.updateConfiguration.mockResolvedValue(undefined);
      mockAgentController.getConfiguration.mockReturnValue(updatedConfig);

      const response = await agentAPI.updateConfiguration(configUpdate);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(updatedConfig);
      expect(response.message).toBe('Configuration updated successfully');
      expect(mockAgentController.updateConfiguration).toHaveBeenCalledWith(configUpdate);
    });

    it('should validate configuration before updating', async () => {
      const invalidConfig = {
        scanInterval: 30000 // Too short (less than 60 seconds)
      };

      const response = await agentAPI.updateConfiguration(invalidConfig);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Configuration validation failed');
      expect(response.error).toContain('Scan interval must be at least 60 seconds');
      expect(mockAgentController.updateConfiguration).not.toHaveBeenCalled();
    });

    it('should handle configuration update errors', async () => {
      const configUpdate = {
        scanInterval: 1800000
      };

      mockAgentController.updateConfiguration.mockRejectedValue(new Error('Update failed'));

      const response = await agentAPI.updateConfiguration(configUpdate);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Update failed');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate valid configuration', async () => {
      const validConfig = {
        scanInterval: 3600000,
        maxConcurrentRemediations: 5,
        riskThreshold: 0.8,
        retryAttempts: 3,
        retryDelay: 5000
      };

      const validation = await agentAPI.validateConfiguration(validConfig);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid scan interval', async () => {
      const invalidConfig = {
        scanInterval: 30000 // Too short
      };

      const validation = await agentAPI.validateConfiguration(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Scan interval must be at least 60 seconds');
    });

    it('should warn about short scan interval', async () => {
      const config = {
        scanInterval: 120000 // 2 minutes - valid but short
      };

      const validation = await agentAPI.validateConfiguration(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Scan interval less than 5 minutes may impact performance');
    });

    it('should detect invalid max concurrent remediations', async () => {
      const invalidConfig = {
        maxConcurrentRemediations: 0
      };

      const validation = await agentAPI.validateConfiguration(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Max concurrent remediations must be at least 1');
    });

    it('should warn about high concurrency', async () => {
      const config = {
        maxConcurrentRemediations: 25
      };

      const validation = await agentAPI.validateConfiguration(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('High concurrency may overwhelm AWS services');
      expect(validation.recommendations).toContain('Consider using a lower value for maxConcurrentRemediations');
    });

    it('should detect invalid risk threshold', async () => {
      const invalidConfig = {
        riskThreshold: 1.5 // Must be between 0 and 1
      };

      const validation = await agentAPI.validateConfiguration(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Risk threshold must be between 0 and 1');
    });

    it('should warn about low risk threshold', async () => {
      const config = {
        riskThreshold: 0.3
      };

      const validation = await agentAPI.validateConfiguration(config);

      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Low risk threshold may result in excessive auto-remediation');
    });

    it('should handle validation errors', async () => {
      // Mock an error during validation
      const originalConsoleError = console.error;
      console.error = vi.fn();

      const validation = await agentAPI.validateConfiguration(null as any);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Validation error');

      console.error = originalConsoleError;
    });
  });

  describe('getHealthCheck', () => {
    it('should return comprehensive health check', async () => {
      const mockSystemStatus = {
        status: 'HEALTHY' as const,
        services: {
          riskDetector: true,
          reasoningEngine: true,
          remediationService: false
        }
      };

      const mockPerformanceMetrics = {
        getTotalOperations: vi.fn().mockReturnValue(1000),
        getErrorRate: vi.fn().mockReturnValue(0.05),
        getAverageResponseTime: vi.fn().mockReturnValue(250)
      };

      mockAgentController.getSystemStatus.mockResolvedValue(mockSystemStatus);
      mockAgentController.getPerformanceMetrics.mockReturnValue(mockPerformanceMetrics);

      const response = await agentAPI.getHealthCheck();

      expect(response.success).toBe(true);
      expect(response.data.status).toBe('healthy');
      expect(response.data.version).toBe('1.0.0');
      expect(response.data.uptime).toBeDefined();
      expect(response.data.services).toHaveLength(3);
      expect(response.data.metrics.totalRequests).toBe(1000);
      expect(response.data.metrics.errorRate).toBe(0.05);
      expect(response.data.metrics.averageResponseTime).toBe(250);
      expect(response.data.metrics.memoryUsage).toBeDefined();
      expect(response.data.metrics.cpuUsage).toBeDefined();
    });

    it('should handle health check errors', async () => {
      mockAgentController.getSystemStatus.mockRejectedValue(new Error('Health check failed'));

      const response = await agentAPI.getHealthCheck();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Health check failed');
    });
  });

  describe('shutdown', () => {
    it('should shutdown agent successfully', async () => {
      mockAgentController.shutdown.mockResolvedValue(undefined);

      const response = await agentAPI.shutdown();

      expect(response.success).toBe(true);
      expect(response.data.message).toBe('Agent shutdown completed successfully');
      expect(mockAgentController.shutdown).toHaveBeenCalledOnce();
    });

    it('should handle shutdown errors', async () => {
      mockAgentController.shutdown.mockRejectedValue(new Error('Shutdown failed'));

      const response = await agentAPI.shutdown();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Shutdown failed');
    });
  });
});