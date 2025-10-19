/**
 * Unit Tests for Agent Controller
 * Tests the central orchestration logic and service coordination
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentController } from '../agent-controller';
import { AgentConfiguration } from '../../types';
import {
  PrivacyRiskDetector,
  ComplianceReasoningEngine,
  RemediationAutomationService,
  ComplianceReportingService,
  NaturalLanguageInterface
} from '../../services';

// Mock implementations for testing
class MockPrivacyRiskDetector implements PrivacyRiskDetector {
  async scanS3Buckets() {
    return [
      {
        id: 'finding-1',
        resourceArn: 'arn:aws:s3:::test-bucket',
        findingType: 'ENCRYPTION' as const,
        severity: 'HIGH' as const,
        description: 'S3 bucket not encrypted',
        detectedAt: new Date(),
        rawData: {}
      }
    ];
  }

  async analyzeIAMPolicies() {
    return [
      {
        id: 'finding-2',
        resourceArn: 'arn:aws:iam::123456789012:role/test-role',
        findingType: 'ACCESS_CONTROL' as const,
        severity: 'MEDIUM' as const,
        description: 'IAM role has excessive permissions',
        detectedAt: new Date(),
        rawData: {}
      }
    ];
  }

  async processCloudTrailLogs() { return []; }
  async getMacieFindings() { return []; }
  async getSecurityHubFindings() { return []; }
}

class MockComplianceReasoningEngine implements ComplianceReasoningEngine {
  async analyzeFinding(finding: any) {
    return {
      findingId: finding.id,
      legalMappings: [
        {
          regulation: 'GDPR' as const,
          article: 'Article 32',
          description: 'Security of processing',
          applicability: 0.9
        }
      ],
      riskScore: 0.8,
      confidenceScore: 0.9,
      recommendations: [],
      reasoning: 'High risk due to unencrypted data storage',
      assessedAt: new Date()
    };
  }

  async mapToLegalArticles() {
    return [
      {
        regulation: 'GDPR' as const,
        article: 'Article 32',
        description: 'Security of processing',
        applicability: 0.9
      }
    ];
  }

  async calculateRiskScore() { return 0.8; }

  async generateRecommendations(assessment: any) {
    if (assessment.findingId === 'finding-1') {
      return [
        {
          id: 'rec-1',
          findingId: 'finding-1',
          action: 'ENABLE_ENCRYPTION' as const,
          priority: 'HIGH' as const,
          automatable: true,
          lambdaFunction: 'encryption-enablement',
          parameters: {},
          estimatedImpact: 'Low impact, high security benefit'
        }
      ];
    } else {
      return [
        {
          id: 'rec-2',
          findingId: 'finding-2',
          action: 'UPDATE_POLICY' as const,
          priority: 'MEDIUM' as const, // Not high priority, so won't be auto-remediated
          automatable: true,
          lambdaFunction: 'policy-adjustment',
          parameters: {},
          estimatedImpact: 'Medium impact, improved security'
        }
      ];
    }
  }
}

class MockRemediationAutomationService implements RemediationAutomationService {
  async executeRemediation(recommendation: any) {
    return {
      remediationId: `rem-${recommendation.id}`,
      success: true,
      message: 'Remediation completed successfully',
      executedAt: new Date(),
      findingId: recommendation.findingId
    };
  }

  async scheduleRemediation() { return 'scheduled-id'; }
  async getRemediationStatus() {
    return {
      id: 'status-id',
      status: 'COMPLETED' as const,
      startTime: new Date(),
      endTime: new Date(),
      success: true
    };
  }
  async rollbackRemediation() {
    return {
      remediationId: 'rollback-id',
      success: true,
      message: 'Rollback completed',
      executedAt: new Date(),
      findingId: 'finding-1'
    };
  }
}

class MockComplianceReportingService implements ComplianceReportingService {
  async generateDPIA() {
    return {
      id: 'dpia-1',
      type: 'DPIA' as const,
      generatedAt: new Date(),
      scope: {},
      findings: [],
      assessments: [],
      recommendations: [],
      executiveSummary: 'Mock DPIA report'
    };
  }

  async generateRoPA() {
    return {
      id: 'ropa-1',
      type: 'ROPA' as const,
      generatedAt: new Date(),
      scope: {},
      findings: [],
      assessments: [],
      recommendations: [],
      executiveSummary: 'Mock RoPA report'
    };
  }

  async generateAuditReport() {
    return {
      id: 'audit-1',
      type: 'AUDIT' as const,
      generatedAt: new Date(),
      scope: {},
      findings: [],
      assessments: [],
      recommendations: [],
      executiveSummary: 'Mock audit report'
    };
  }

  async generateComplianceSummary() {
    return {
      id: 'summary-1',
      type: 'SUMMARY' as const,
      generatedAt: new Date(),
      scope: {},
      findings: [],
      assessments: [],
      recommendations: [],
      executiveSummary: 'Mock compliance summary'
    };
  }

  async storeReport() { return 'stored-report-id'; }
}

class MockNaturalLanguageInterface implements NaturalLanguageInterface {
  async processQuery() {
    return {
      answer: 'Mock response',
      confidence: 0.9,
      sources: ['mock-source'],
      relatedFindings: [],
      suggestedActions: ['mock-action'],
      conversationId: 'conv-1'
    };
  }

  async generateNaturalLanguageReport() { return 'Mock natural language report'; }
  async explainFinding() { return 'Mock finding explanation'; }
  async suggestQueries() { return ['What is my compliance status?']; }
}

describe('AgentController', () => {
  let controller: AgentController;
  let mockRiskDetector: MockPrivacyRiskDetector;
  let mockReasoningEngine: MockComplianceReasoningEngine;
  let mockRemediationService: MockRemediationAutomationService;
  let mockReportingService: MockComplianceReportingService;
  let mockNLInterface: MockNaturalLanguageInterface;

  beforeEach(() => {
    mockRiskDetector = new MockPrivacyRiskDetector();
    mockReasoningEngine = new MockComplianceReasoningEngine();
    mockRemediationService = new MockRemediationAutomationService();
    mockReportingService = new MockComplianceReportingService();
    mockNLInterface = new MockNaturalLanguageInterface();

    const config: Partial<AgentConfiguration> = {
      scanInterval: 60000,
      autoRemediation: true,
      maxConcurrentRemediations: 3,
      riskThreshold: 0.7,
      enableContinuousMonitoring: false, // Disabled for tests
      retryAttempts: 2,
      retryDelay: 1000
    };

    controller = new AgentController(
      mockRiskDetector,
      mockReasoningEngine,
      mockRemediationService,
      mockReportingService,
      mockNLInterface,
      config
    );
  });

  afterEach(async () => {
    if (controller) {
      await controller.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully with valid configuration', async () => {
      // Mock the AWS connectivity test to avoid actual AWS calls
      vi.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      vi.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await expect(controller.initialize()).resolves.not.toThrow();
      
      const state = controller.getState();
      expect(state.initialized).toBe(true);
      expect(state.systemHealth).toBe('HEALTHY');
    });

    test('should fail initialization with invalid configuration', async () => {
      const invalidController = new AgentController(
        mockRiskDetector,
        mockReasoningEngine,
        mockRemediationService,
        mockReportingService,
        mockNLInterface,
        {
          scanInterval: -1, // Invalid
          autoRemediation: true,
          maxConcurrentRemediations: 3,
          riskThreshold: 0.7,
          enableContinuousMonitoring: false,
          retryAttempts: 3,
          retryDelay: 5000
        }
      );

      await expect(invalidController.initialize()).rejects.toThrow();
    });

    test('should not initialize twice', async () => {
      vi.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      vi.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();
      
      // Second initialization should not throw but should not reinitialize
      await expect(controller.initialize()).resolves.not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    test('should return current configuration', () => {
      const config = controller.getConfiguration();
      
      expect(config).toHaveProperty('scanInterval');
      expect(config).toHaveProperty('autoRemediation');
      expect(config).toHaveProperty('maxConcurrentRemediations');
      expect(config).toHaveProperty('riskThreshold');
    });

    test('should update configuration successfully', async () => {
      const newConfig: Partial<AgentConfiguration> = {
        scanInterval: 120000,
        riskThreshold: 0.8
      };

      await controller.updateConfiguration(newConfig);
      
      const updatedConfig = controller.getConfiguration();
      expect(updatedConfig.scanInterval).toBe(120000);
      expect(updatedConfig.riskThreshold).toBe(0.8);
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(async () => {
      vi.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      vi.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      await controller.initialize();
    });

    test('should execute complete compliance workflow successfully', async () => {
      const result = await controller.executeComplianceWorkflow();

      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(2); // S3 + IAM findings
      expect(result.assessments).toHaveLength(2);
      expect(result.recommendations).toHaveLength(2);
      expect(result.remediationResults).toHaveLength(1); // Only automatable high-priority
      expect(result.errors).toHaveLength(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should execute workflow with skip remediation option', async () => {
      const result = await controller.executeComplianceWorkflow({
        skipRemediation: true
      });

      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(2);
      expect(result.assessments).toHaveLength(2);
      expect(result.recommendations).toHaveLength(2);
      expect(result.remediationResults).toHaveLength(0); // Skipped
    });

    test('should execute workflow with target findings', async () => {
      const result = await controller.executeComplianceWorkflow({
        targetFindings: ['finding-1']
      });

      expect(result.success).toBe(true);
      expect(result.remediationResults).toHaveLength(1);
      expect(result.remediationResults[0].findingId).toBe('finding-1');
    });

    test('should handle workflow errors gracefully', async () => {
      // Mock a service to throw an error
      vi.spyOn(mockRiskDetector, 'scanS3Buckets').mockRejectedValue(new Error('S3 scan failed'));

      const result = await controller.executeComplianceWorkflow();

      // Workflow should still complete but with partial results
      expect(result.success).toBe(true); // Other services still work
      expect(result.findings).toHaveLength(1); // Only IAM findings
    });
  });

  describe('System Status and Health', () => {
    beforeEach(async () => {
      vi.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      vi.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      await controller.initialize();
    });

    test('should return system status', async () => {
      const status = await controller.getSystemStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('lastScan');
      expect(status).toHaveProperty('nextScan');
      expect(status).toHaveProperty('activeWorkflows');
      expect(status).toHaveProperty('configuration');
    });

    test('should report healthy status when all services are available', async () => {
      const status = await controller.getSystemStatus();

      expect(status.status).toBe('HEALTHY');
      expect(status.services.riskDetector).toBe(true);
      expect(status.services.reasoningEngine).toBe(true);
      expect(status.services.remediationService).toBe(true);
      expect(status.services.reportingService).toBe(true);
      expect(status.services.nlInterface).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    test('should provide performance metrics', () => {
      const metrics = controller.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.recordMetric).toBe('function');
      expect(typeof metrics.getPerformanceSummary).toBe('function');
    });
  });

  describe('Orchestration Components', () => {
    test('should provide workflow manager', () => {
      const workflowManager = controller.getWorkflowManager();
      
      expect(workflowManager).toBeDefined();
      expect(typeof workflowManager.createWorkflow).toBe('function');
    });

    test('should provide system monitor after initialization', async () => {
      vi.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      vi.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();
      
      const systemMonitor = controller.getSystemMonitor();
      expect(systemMonitor).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      vi.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      vi.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();
      await expect(controller.shutdown()).resolves.not.toThrow();
      
      const state = controller.getState();
      expect(state.initialized).toBe(false);
      expect(state.monitoring).toBe(false);
    });

    test('should wait for active workflows during shutdown', async () => {
      vi.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      vi.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      
      await controller.initialize();
      
      // Simulate active workflow
      const state = controller.getState();
      state.activeWorkflows.add('test-workflow');
      
      const shutdownPromise = controller.shutdown();
      
      // Remove workflow after a short delay to simulate completion
      setTimeout(() => {
        state.activeWorkflows.delete('test-workflow');
      }, 100);
      
      await expect(shutdownPromise).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    beforeEach(async () => {
      vi.spyOn(controller as any, 'initializeAWSServices').mockResolvedValue(undefined);
      vi.spyOn(controller as any, 'validateConfiguration').mockResolvedValue(undefined);
      await controller.initialize();
    });

    test('should retry failed operations', async () => {
      let callCount = 0;
      vi.spyOn(mockRiskDetector, 'scanS3Buckets').mockImplementation(async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Temporary failure');
        }
        return [
          {
            id: 'finding-1',
            resourceArn: 'arn:aws:s3:::test-bucket',
            findingType: 'ENCRYPTION' as const,
            severity: 'HIGH' as const,
            description: 'S3 bucket not encrypted',
            detectedAt: new Date(),
            rawData: {}
          }
        ];
      });

      const result = await controller.executeComplianceWorkflow();
      
      expect(callCount).toBe(2); // Initial call + 1 retry
      expect(result.success).toBe(true);
    });

    test('should fail after max retry attempts', async () => {
      vi.spyOn(mockRiskDetector, 'scanS3Buckets').mockRejectedValue(new Error('Persistent failure'));

      const result = await controller.executeComplianceWorkflow();
      
      // Should still complete with partial results
      expect(result.success).toBe(true);
      expect(result.findings).toHaveLength(1); // Only IAM findings
    });
  });
});