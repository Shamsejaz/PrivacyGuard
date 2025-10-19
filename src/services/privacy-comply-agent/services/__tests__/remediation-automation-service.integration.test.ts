/**
 * Integration tests for Remediation Automation Service
 * Tests Lambda functions, workflow orchestration, and rollback mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RemediationAutomationServiceImpl } from '../remediation-automation-service';
import { RemediationRecommendation } from '../../types';
import { getLambdaRegistry } from '../../lambda-functions/lambda-registry';

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn()
  })),
  PutBucketPublicAccessBlockCommand: vi.fn(),
  GetBucketPublicAccessBlockCommand: vi.fn(),
  GetBucketPolicyCommand: vi.fn(),
  DeleteBucketPolicyCommand: vi.fn(),
  PutBucketEncryptionCommand: vi.fn(),
  GetBucketEncryptionCommand: vi.fn(),
  DeleteBucketEncryptionCommand: vi.fn(),
  PutBucketPolicyCommand: vi.fn()
}));

vi.mock('@aws-sdk/client-iam', () => ({
  IAMClient: vi.fn(() => ({
    send: vi.fn()
  })),
  GetRolePolicyCommand: vi.fn(),
  PutRolePolicyCommand: vi.fn(),
  DeleteRolePolicyCommand: vi.fn(),
  GetUserPolicyCommand: vi.fn(),
  PutUserPolicyCommand: vi.fn(),
  DeleteUserPolicyCommand: vi.fn(),
  ListAttachedRolePoliciesCommand: vi.fn(),
  ListAttachedUserPoliciesCommand: vi.fn(),
  DetachRolePolicyCommand: vi.fn(),
  DetachUserPolicyCommand: vi.fn(),
  AttachRolePolicyCommand: vi.fn(),
  AttachUserPolicyCommand: vi.fn()
}));

vi.mock('@aws-sdk/client-rds', () => ({
  RDSClient: vi.fn(() => ({
    send: vi.fn()
  })),
  ModifyDBInstanceCommand: vi.fn(),
  DescribeDBInstancesCommand: vi.fn()
}));

vi.mock('@aws-sdk/client-ebs', () => ({
  EBSClient: vi.fn(() => ({
    send: vi.fn()
  })),
  ModifyVolumeCommand: vi.fn(),
  DescribeVolumesCommand: vi.fn()
}));

describe('RemediationAutomationService Integration Tests', () => {
  let service: RemediationAutomationServiceImpl;
  let mockS3Client: any;
  let mockIAMClient: any;

  beforeEach(() => {
    service = new RemediationAutomationServiceImpl();
    
    // Setup AWS SDK mocks
    const { S3Client } = require('@aws-sdk/client-s3');
    const { IAMClient } = require('@aws-sdk/client-iam');
    
    mockS3Client = {
      send: vi.fn()
    };
    mockIAMClient = {
      send: vi.fn()
    };
    
    S3Client.mockImplementation(() => mockS3Client);
    IAMClient.mockImplementation(() => mockIAMClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('S3 Access Restriction Lambda Function', () => {
    it('should successfully restrict S3 bucket access', async () => {
      // Mock S3 responses
      mockS3Client.send
        .mockResolvedValueOnce({ PublicAccessBlockConfiguration: null }) // GetBucketPublicAccessBlockCommand
        .mockResolvedValueOnce({ Policy: null }) // GetBucketPolicyCommand
        .mockResolvedValueOnce({}) // PutBucketPublicAccessBlockCommand
        .mockResolvedValueOnce({}); // DeleteBucketPolicyCommand (if needed)

      const recommendation: RemediationRecommendation = {
        id: 'test-remediation-1',
        findingId: 'finding-1',
        action: 'RESTRICT_ACCESS',
        priority: 'HIGH',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-bucket',
          restrictPublicRead: true,
          restrictPublicWrite: true,
          blockPublicAcls: true,
          ignorePublicAcls: true,
          blockPublicPolicy: true,
          restrictPublicBuckets: true
        },
        estimatedImpact: 'Restricts public access to sensitive data bucket'
      };

      const result = await service.executeRemediation(recommendation);

      expect(result.success).toBe(true);
      expect(result.remediationId).toBe('test-remediation-1');
      expect(result.rollbackAvailable).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledTimes(3); // Get current config, get policy, put access block
    });

    it('should handle S3 access restriction failures gracefully', async () => {
      // Mock S3 error
      mockS3Client.send.mockRejectedValue(new Error('Access denied'));

      const recommendation: RemediationRecommendation = {
        id: 'test-remediation-2',
        findingId: 'finding-2',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-bucket-error'
        },
        estimatedImpact: 'Should fail gracefully'
      };

      const result = await service.executeRemediation(recommendation);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Access denied');
      expect(result.rollbackAvailable).toBe(false);
    });
  });

  describe('Encryption Enablement Lambda Function', () => {
    it('should successfully enable S3 bucket encryption', async () => {
      // Mock S3 responses for encryption
      mockS3Client.send
        .mockResolvedValueOnce({ ServerSideEncryptionConfiguration: null }) // GetBucketEncryptionCommand
        .mockResolvedValueOnce({}); // PutBucketEncryptionCommand

      const recommendation: RemediationRecommendation = {
        id: 'test-remediation-3',
        findingId: 'finding-3',
        action: 'ENABLE_ENCRYPTION',
        priority: 'HIGH',
        automatable: true,
        lambdaFunction: 'privacy-comply-encryption-enablement',
        parameters: {
          resourceType: 'S3',
          resourceIdentifier: 'test-bucket',
          encryptionType: 'aws:kms',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
        },
        estimatedImpact: 'Enables encryption for sensitive data bucket'
      };

      const result = await service.executeRemediation(recommendation);

      expect(result.success).toBe(true);
      expect(result.remediationId).toBe('test-remediation-3');
      expect(result.rollbackAvailable).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledTimes(2);
    });

    it('should handle RDS encryption limitation correctly', async () => {
      const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
      const mockRDSClient = {
        send: vi.fn().mockResolvedValue({
          DBInstances: [{
            DBInstanceIdentifier: 'test-db',
            StorageEncrypted: false
          }]
        })
      };
      RDSClient.mockImplementation(() => mockRDSClient);

      const recommendation: RemediationRecommendation = {
        id: 'test-remediation-4',
        findingId: 'finding-4',
        action: 'ENABLE_ENCRYPTION',
        priority: 'HIGH',
        automatable: false, // RDS encryption requires manual intervention
        lambdaFunction: 'privacy-comply-encryption-enablement',
        parameters: {
          resourceType: 'RDS',
          resourceIdentifier: 'test-db'
        },
        estimatedImpact: 'Requires manual intervention for RDS encryption'
      };

      const result = await service.executeRemediation(recommendation);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Manual intervention required');
    });
  });

  describe('IAM Policy Adjustment Lambda Function', () => {
    it('should successfully adjust IAM role policies', async () => {
      // Mock IAM responses
      mockIAMClient.send
        .mockResolvedValueOnce({ AttachedPolicies: [] }) // ListAttachedRolePoliciesCommand
        .mockResolvedValueOnce({}); // PutRolePolicyCommand

      const recommendation: RemediationRecommendation = {
        id: 'test-remediation-5',
        findingId: 'finding-5',
        action: 'UPDATE_POLICY',
        priority: 'CRITICAL',
        automatable: true,
        lambdaFunction: 'privacy-comply-iam-policy-adjustment',
        parameters: {
          principalType: 'role',
          principalName: 'test-role',
          adjustmentType: 'REMOVE_OVERPRIVILEGED',
          targetActions: ['s3:*'],
          targetResources: ['*']
        },
        estimatedImpact: 'Removes overprivileged S3 access from role'
      };

      const result = await service.executeRemediation(recommendation);

      expect(result.success).toBe(true);
      expect(result.remediationId).toBe('test-remediation-5');
      expect(result.rollbackAvailable).toBe(true);
      expect(mockIAMClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('Workflow Orchestration', () => {
    it('should execute complete workflow with validation and execution steps', async () => {
      // Mock successful S3 operation
      mockS3Client.send
        .mockResolvedValueOnce({ PublicAccessBlockConfiguration: null })
        .mockResolvedValueOnce({ Policy: null })
        .mockResolvedValueOnce({});

      const recommendation: RemediationRecommendation = {
        id: 'test-workflow-1',
        findingId: 'finding-workflow-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-workflow-bucket'
        },
        estimatedImpact: 'Test workflow execution'
      };

      const result = await service.executeRemediation(recommendation);
      
      // Check that workflow was created and executed
      const workflowManager = service.getWorkflowManager();
      const workflows = workflowManager.getAllWorkflows();
      
      expect(workflows.length).toBeGreaterThan(0);
      
      const workflow = workflows.find(w => w.remediationId === 'test-workflow-1');
      expect(workflow).toBeDefined();
      expect(workflow?.status).toBe('COMPLETED');
      expect(workflow?.steps.length).toBeGreaterThan(0);
      
      // Verify audit log
      expect(workflow?.auditLog.length).toBeGreaterThan(0);
      expect(workflow?.auditLog[0].action).toBe('WORKFLOW_CREATED');
    });

    it('should handle high-risk operations with approval requirements', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-workflow-2',
        findingId: 'finding-workflow-2',
        action: 'UPDATE_POLICY',
        priority: 'CRITICAL',
        automatable: true,
        lambdaFunction: 'privacy-comply-iam-policy-adjustment',
        parameters: {
          principalType: 'role',
          principalName: 'critical-role',
          adjustmentType: 'APPLY_LEAST_PRIVILEGE'
        },
        estimatedImpact: 'Critical policy change requiring approval'
      };

      // This should create a workflow but not complete due to pending approvals
      const result = await service.executeRemediation(recommendation);
      
      const workflowManager = service.getWorkflowManager();
      const workflows = workflowManager.getAllWorkflows();
      const workflow = workflows.find(w => w.remediationId === 'test-workflow-2');
      
      expect(workflow).toBeDefined();
      expect(workflow?.approvals.length).toBeGreaterThan(0);
      expect(workflow?.approvals[0].status).toBe('PENDING');
    });
  });

  describe('Rollback Mechanisms', () => {
    it('should successfully rollback S3 access restrictions', async () => {
      // Mock initial execution
      mockS3Client.send
        .mockResolvedValueOnce({ 
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: false,
            IgnorePublicAcls: false,
            BlockPublicPolicy: false,
            RestrictPublicBuckets: false
          }
        })
        .mockResolvedValueOnce({ Policy: '{"Version":"2012-10-17","Statement":[]}' })
        .mockResolvedValueOnce({}) // PutBucketPublicAccessBlockCommand
        .mockResolvedValueOnce({}) // Rollback: PutBucketPublicAccessBlockCommand
        .mockResolvedValueOnce({}); // Rollback: PutBucketPolicyCommand

      const recommendation: RemediationRecommendation = {
        id: 'test-rollback-1',
        findingId: 'finding-rollback-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-rollback-bucket'
        },
        estimatedImpact: 'Test rollback functionality'
      };

      // Execute remediation
      const executeResult = await service.executeRemediation(recommendation);
      expect(executeResult.success).toBe(true);
      expect(executeResult.rollbackAvailable).toBe(true);

      // Perform rollback
      const rollbackResult = await service.rollbackRemediation('test-rollback-1');
      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.message).toContain('rolled back');

      // Verify rollback was logged
      const status = await service.getRemediationStatus('test-rollback-1');
      expect(status.status).toBe('ROLLED_BACK');
      expect(status.logs.some(log => log.includes('Rollback completed'))).toBe(true);
    });

    it('should handle rollback failures gracefully', async () => {
      // Mock execution success but rollback failure
      mockS3Client.send
        .mockResolvedValueOnce({ PublicAccessBlockConfiguration: null })
        .mockResolvedValueOnce({ Policy: null })
        .mockResolvedValueOnce({}) // Successful execution
        .mockRejectedValueOnce(new Error('Rollback failed')); // Failed rollback

      const recommendation: RemediationRecommendation = {
        id: 'test-rollback-fail-1',
        findingId: 'finding-rollback-fail-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-rollback-fail-bucket'
        },
        estimatedImpact: 'Test rollback failure handling'
      };

      // Execute remediation
      const executeResult = await service.executeRemediation(recommendation);
      expect(executeResult.success).toBe(true);

      // Attempt rollback (should fail)
      const rollbackResult = await service.rollbackRemediation('test-rollback-fail-1');
      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.message).toContain('Rollback failed');
    });
  });

  describe('Scheduling and Status Management', () => {
    it('should successfully schedule remediation for future execution', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      
      const recommendation: RemediationRecommendation = {
        id: 'test-schedule-1',
        findingId: 'finding-schedule-1',
        action: 'RESTRICT_ACCESS',
        priority: 'LOW',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-schedule-bucket'
        },
        estimatedImpact: 'Test scheduling functionality'
      };

      const workflowId = await service.scheduleRemediation(recommendation, futureDate);
      expect(workflowId).toBeDefined();

      const status = await service.getRemediationStatus('test-schedule-1');
      expect(status.status).toBe('PENDING');
      expect(status.logs[0]).toContain('scheduled');
    });

    it('should track active remediations correctly', async () => {
      const recommendation1: RemediationRecommendation = {
        id: 'test-active-1',
        findingId: 'finding-active-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-active-bucket-1' },
        estimatedImpact: 'Test active tracking'
      };

      const recommendation2: RemediationRecommendation = {
        id: 'test-active-2',
        findingId: 'finding-active-2',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-active-bucket-2' },
        estimatedImpact: 'Test active tracking'
      };

      // Schedule both remediations
      const futureDate = new Date(Date.now() + 3600000);
      await service.scheduleRemediation(recommendation1, futureDate);
      await service.scheduleRemediation(recommendation2, futureDate);

      const activeRemediations = await service.getActiveRemediations();
      expect(activeRemediations.length).toBe(2);
      expect(activeRemediations.every(r => r.status === 'PENDING')).toBe(true);
    });

    it('should cancel scheduled remediations', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-cancel-1',
        findingId: 'finding-cancel-1',
        action: 'RESTRICT_ACCESS',
        priority: 'LOW',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-cancel-bucket' },
        estimatedImpact: 'Test cancellation'
      };

      const futureDate = new Date(Date.now() + 3600000);
      await service.scheduleRemediation(recommendation, futureDate);

      const cancelled = await service.cancelScheduledRemediation('test-cancel-1');
      expect(cancelled).toBe(true);

      const status = await service.getRemediationStatus('test-cancel-1');
      expect(status.status).toBe('FAILED'); // Cancelled remediations are marked as FAILED
      expect(status.logs.some(log => log.includes('cancelled'))).toBe(true);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate remediation parameters before execution', async () => {
      const invalidRecommendation: RemediationRecommendation = {
        id: 'test-validation-1',
        findingId: 'finding-validation-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          // Missing required bucketName parameter
        },
        estimatedImpact: 'Test validation'
      };

      const validation = await service.validateRemediation(invalidRecommendation);
      expect(validation.canExecute).toBe(false);
      expect(validation.risks.length).toBeGreaterThan(0);
      expect(validation.risks[0]).toContain('Missing required parameters');
    });

    it('should handle non-existent Lambda functions', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-nonexistent-1',
        findingId: 'finding-nonexistent-1',
        action: 'UNKNOWN_ACTION',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'non-existent-function',
        parameters: {},
        estimatedImpact: 'Test error handling'
      };

      const result = await service.executeRemediation(recommendation);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should get available Lambda functions', async () => {
      const functions = await service.getAvailableLambdaFunctions();
      expect(functions.length).toBeGreaterThan(0);
      
      const s3Function = functions.find(f => f.functionName === 'privacy-comply-s3-access-restriction');
      expect(s3Function).toBeDefined();
      expect(s3Function?.supportedActions).toContain('RESTRICT_ACCESS');
    });
  });
});