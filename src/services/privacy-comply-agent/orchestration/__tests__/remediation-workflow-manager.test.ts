/**
 * Unit tests for Remediation Workflow Manager
 * Tests workflow orchestration, approval mechanisms, and audit logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemediationWorkflowManager } from '../remediation-workflow-manager';
import { RemediationRecommendation } from '../../types';

// Mock the Lambda registry
vi.mock('../../lambda-functions/lambda-registry', () => ({
  getLambdaRegistry: () => ({
    getFunction: vi.fn((functionName: string) => {
      if (functionName === 'privacy-comply-s3-access-restriction') {
        return {
          metadata: {
            functionName: 'privacy-comply-s3-access-restriction',
            riskLevel: 'MEDIUM',
            supportedActions: ['RESTRICT_ACCESS']
          },
          handler: vi.fn().mockResolvedValue({
            success: true,
            message: 'S3 access restricted successfully',
            rollbackData: { previousConfig: 'test' }
          }),
          rollbackHandler: vi.fn().mockResolvedValue({
            success: true,
            message: 'S3 access rollback successful'
          })
        };
      }
      if (functionName === 'privacy-comply-iam-policy-adjustment') {
        return {
          metadata: {
            functionName: 'privacy-comply-iam-policy-adjustment',
            riskLevel: 'HIGH',
            supportedActions: ['UPDATE_POLICY']
          },
          handler: vi.fn().mockResolvedValue({
            success: true,
            message: 'IAM policy adjusted successfully',
            rollbackData: { previousPolicies: [] }
          }),
          rollbackHandler: vi.fn().mockResolvedValue({
            success: true,
            message: 'IAM policy rollback successful'
          })
        };
      }
      return null;
    }),
    validateParameters: vi.fn().mockReturnValue({
      valid: true,
      missingRequired: [],
      invalidParameters: []
    })
  })
}));

describe('RemediationWorkflowManager', () => {
  let workflowManager: RemediationWorkflowManager;

  beforeEach(() => {
    workflowManager = new RemediationWorkflowManager();
  });

  describe('Workflow Creation and Execution', () => {
    it('should create and execute a basic workflow', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-rec-1',
        findingId: 'finding-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-bucket'
        },
        estimatedImpact: 'Test workflow creation'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      expect(workflowId).toBeDefined();
      expect(workflowId).toContain('workflow-');

      const workflow = workflowManager.getWorkflow(workflowId);
      expect(workflow).toBeDefined();
      expect(workflow?.remediationId).toBe('test-rec-1');
      expect(workflow?.status).toBe('COMPLETED');
      expect(workflow?.steps.length).toBeGreaterThan(0);
    });

    it('should create workflow with scheduled execution', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const recommendation: RemediationRecommendation = {
        id: 'test-rec-2',
        findingId: 'finding-2',
        action: 'RESTRICT_ACCESS',
        priority: 'LOW',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-scheduled-bucket'
        },
        estimatedImpact: 'Test scheduled workflow'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation, futureDate);
      const workflow = workflowManager.getWorkflow(workflowId);
      
      expect(workflow?.scheduledFor).toEqual(futureDate);
      expect(workflow?.status).toBe('PENDING'); // Should not start immediately
    });

    it('should generate appropriate workflow steps', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-rec-3',
        findingId: 'finding-3',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: {
          bucketName: 'test-steps-bucket'
        },
        estimatedImpact: 'Test step generation'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      const workflow = workflowManager.getWorkflow(workflowId);
      
      expect(workflow?.steps.length).toBe(3); // Validation, Execution, Verification
      expect(workflow?.steps[0].type).toBe('VALIDATION');
      expect(workflow?.steps[1].type).toBe('EXECUTION');
      expect(workflow?.steps[2].type).toBe('VERIFICATION');
    });

    it('should add approval step for high-risk operations', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-rec-4',
        findingId: 'finding-4',
        action: 'UPDATE_POLICY',
        priority: 'CRITICAL',
        automatable: true,
        lambdaFunction: 'privacy-comply-iam-policy-adjustment',
        parameters: {
          principalType: 'role',
          principalName: 'test-role'
        },
        estimatedImpact: 'Test high-risk workflow'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      const workflow = workflowManager.getWorkflow(workflowId);
      
      expect(workflow?.steps.length).toBe(4); // Validation, Approval, Execution, Verification
      expect(workflow?.steps[1].type).toBe('APPROVAL');
      expect(workflow?.approvals.length).toBeGreaterThan(0);
    });
  });

  describe('Approval Management', () => {
    it('should generate required approvals for high-risk operations', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-approval-1',
        findingId: 'finding-approval-1',
        action: 'UPDATE_POLICY',
        priority: 'CRITICAL',
        automatable: true,
        lambdaFunction: 'privacy-comply-iam-policy-adjustment',
        parameters: {
          principalType: 'role',
          principalName: 'critical-role'
        },
        estimatedImpact: 'Test approval generation'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      const workflow = workflowManager.getWorkflow(workflowId);
      
      expect(workflow?.approvals.length).toBe(2); // Security and Compliance approvals
      expect(workflow?.approvals.some(a => a.approverRole === 'SECURITY_OFFICER')).toBe(true);
      expect(workflow?.approvals.some(a => a.approverRole === 'COMPLIANCE_OFFICER')).toBe(true);
    });

    it('should approve workflow and continue execution', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-approval-2',
        findingId: 'finding-approval-2',
        action: 'UPDATE_POLICY',
        priority: 'HIGH',
        automatable: true,
        lambdaFunction: 'privacy-comply-iam-policy-adjustment',
        parameters: {
          principalType: 'role',
          principalName: 'test-role'
        },
        estimatedImpact: 'Test approval workflow'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      
      // Approve the workflow
      const approved = await workflowManager.approveWorkflow(
        workflowId, 
        'SECURITY_OFFICER', 
        'test-approver', 
        'Approved for testing'
      );
      
      expect(approved).toBe(true);
      
      const workflow = workflowManager.getWorkflow(workflowId);
      const securityApproval = workflow?.approvals.find(a => a.approverRole === 'SECURITY_OFFICER');
      
      expect(securityApproval?.status).toBe('APPROVED');
      expect(securityApproval?.approvedBy).toBe('test-approver');
      expect(securityApproval?.comments).toBe('Approved for testing');
    });

    it('should reject workflow and cancel execution', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-rejection-1',
        findingId: 'finding-rejection-1',
        action: 'UPDATE_POLICY',
        priority: 'HIGH',
        automatable: true,
        lambdaFunction: 'privacy-comply-iam-policy-adjustment',
        parameters: {
          principalType: 'role',
          principalName: 'test-role'
        },
        estimatedImpact: 'Test rejection workflow'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      
      // Reject the workflow
      const rejected = await workflowManager.rejectWorkflow(
        workflowId, 
        'SECURITY_OFFICER', 
        'test-rejector', 
        'Security concerns'
      );
      
      expect(rejected).toBe(true);
      
      const workflow = workflowManager.getWorkflow(workflowId);
      expect(workflow?.status).toBe('CANCELLED');
      
      const securityApproval = workflow?.approvals.find(a => a.approverRole === 'SECURITY_OFFICER');
      expect(securityApproval?.status).toBe('REJECTED');
      expect(securityApproval?.comments).toBe('Security concerns');
    });
  });

  describe('Rollback Functionality', () => {
    it('should successfully rollback a completed workflow', async () => {
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

      const workflowId = await workflowManager.createWorkflow(recommendation);
      let workflow = workflowManager.getWorkflow(workflowId);
      expect(workflow?.status).toBe('COMPLETED');

      // Perform rollback
      const rollbackResult = await workflowManager.rollbackWorkflow(workflowId);
      
      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.message).toContain('rolled back');
      
      workflow = workflowManager.getWorkflow(workflowId);
      expect(workflow?.status).toBe('ROLLED_BACK');
      
      // Check that rollback step was added
      const rollbackStep = workflow?.steps.find(s => s.type === 'ROLLBACK');
      expect(rollbackStep).toBeDefined();
      expect(rollbackStep?.status).toBe('COMPLETED');
    });

    it('should handle rollback failures', async () => {
      // Mock rollback failure
      const { getLambdaRegistry } = await import('../../lambda-functions/lambda-registry');
      const mockRegistry = getLambdaRegistry();
      const mockFunction = mockRegistry.getFunction('privacy-comply-s3-access-restriction');
      if (mockFunction) {
        mockFunction.rollbackHandler = vi.fn().mockRejectedValue(new Error('Rollback failed'));
      }

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
        estimatedImpact: 'Test rollback failure'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      
      // Attempt rollback (should fail)
      const rollbackResult = await workflowManager.rollbackWorkflow(workflowId);
      
      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.message).toContain('Rollback failed');
    });
  });

  describe('Workflow Management', () => {
    it('should get workflows by status', async () => {
      const recommendation1: RemediationRecommendation = {
        id: 'test-status-1',
        findingId: 'finding-status-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-bucket-1' },
        estimatedImpact: 'Test status filtering'
      };

      const recommendation2: RemediationRecommendation = {
        id: 'test-status-2',
        findingId: 'finding-status-2',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-bucket-2' },
        estimatedImpact: 'Test status filtering'
      };

      // Create one immediate and one scheduled workflow
      await workflowManager.createWorkflow(recommendation1);
      const futureDate = new Date(Date.now() + 3600000);
      await workflowManager.createWorkflow(recommendation2, futureDate);

      const completedWorkflows = workflowManager.getWorkflowsByStatus('COMPLETED');
      const pendingWorkflows = workflowManager.getWorkflowsByStatus('PENDING');

      expect(completedWorkflows.length).toBe(1);
      expect(pendingWorkflows.length).toBe(1);
    });

    it('should cancel workflow', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-cancel-1',
        findingId: 'finding-cancel-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-cancel-bucket' },
        estimatedImpact: 'Test cancellation'
      };

      const futureDate = new Date(Date.now() + 3600000);
      const workflowId = await workflowManager.createWorkflow(recommendation, futureDate);
      
      const cancelled = await workflowManager.cancelWorkflow(workflowId, 'User requested cancellation');
      expect(cancelled).toBe(true);

      const workflow = workflowManager.getWorkflow(workflowId);
      expect(workflow?.status).toBe('CANCELLED');
      
      // Check audit log
      const cancelEntry = workflow?.auditLog.find(entry => entry.action === 'WORKFLOW_CANCELLED');
      expect(cancelEntry).toBeDefined();
      expect(cancelEntry?.details.reason).toBe('User requested cancellation');
    });

    it('should get all workflows', async () => {
      const initialCount = workflowManager.getAllWorkflows().length;

      const recommendation: RemediationRecommendation = {
        id: 'test-all-1',
        findingId: 'finding-all-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-all-bucket' },
        estimatedImpact: 'Test get all workflows'
      };

      await workflowManager.createWorkflow(recommendation);
      
      const allWorkflows = workflowManager.getAllWorkflows();
      expect(allWorkflows.length).toBe(initialCount + 1);
    });
  });

  describe('Audit Logging', () => {
    it('should maintain comprehensive audit log', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-audit-1',
        findingId: 'finding-audit-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-audit-bucket' },
        estimatedImpact: 'Test audit logging'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      const workflow = workflowManager.getWorkflow(workflowId);
      
      expect(workflow?.auditLog.length).toBeGreaterThan(0);
      
      // Check for key audit events
      const createdEntry = workflow?.auditLog.find(entry => entry.action === 'WORKFLOW_CREATED');
      const startedEntry = workflow?.auditLog.find(entry => entry.action === 'WORKFLOW_STARTED');
      const completedEntry = workflow?.auditLog.find(entry => entry.action === 'WORKFLOW_COMPLETED');
      
      expect(createdEntry).toBeDefined();
      expect(startedEntry).toBeDefined();
      expect(completedEntry).toBeDefined();
      
      // Verify audit entry structure
      expect(createdEntry?.timestamp).toBeInstanceOf(Date);
      expect(createdEntry?.actor).toBe('system');
      expect(createdEntry?.details).toBeDefined();
    });

    it('should log step execution details', async () => {
      const recommendation: RemediationRecommendation = {
        id: 'test-step-audit-1',
        findingId: 'finding-step-audit-1',
        action: 'RESTRICT_ACCESS',
        priority: 'MEDIUM',
        automatable: true,
        lambdaFunction: 'privacy-comply-s3-access-restriction',
        parameters: { bucketName: 'test-step-audit-bucket' },
        estimatedImpact: 'Test step audit logging'
      };

      const workflowId = await workflowManager.createWorkflow(recommendation);
      const workflow = workflowManager.getWorkflow(workflowId);
      
      // Check for step-specific audit entries
      const validationEntry = workflow?.auditLog.find(entry => entry.action === 'VALIDATION_COMPLETED');
      const executionEntry = workflow?.auditLog.find(entry => entry.action === 'REMEDIATION_EXECUTED');
      
      expect(validationEntry).toBeDefined();
      expect(executionEntry).toBeDefined();
      expect(validationEntry?.result).toBe('SUCCESS');
      expect(executionEntry?.result).toBe('SUCCESS');
    });
  });
});