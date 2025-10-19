/**
 * Remediation Workflow Manager
 * Orchestrates the execution of remediation workflows with approval and scheduling
 */

import { RemediationRecommendation, RemediationResult, RemediationStatus } from '../types';
import { getLambdaRegistry } from '../lambda-functions/lambda-registry';
import { LambdaEvent } from '../types/lambda';

export interface WorkflowStep {
  id: string;
  type: 'VALIDATION' | 'APPROVAL' | 'EXECUTION' | 'VERIFICATION' | 'ROLLBACK';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
}

export interface RemediationWorkflow {
  id: string;
  remediationId: string;
  recommendation: RemediationRecommendation;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'ROLLED_BACK';
  steps: WorkflowStep[];
  createdAt: Date;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  approvals: WorkflowApproval[];
  rollbackData?: any;
  auditLog: WorkflowAuditEntry[];
}

export interface WorkflowApproval {
  id: string;
  approverRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Date;
  comments?: string;
  requiredFor: string[]; // Risk levels or specific actions that require this approval
}

export interface WorkflowAuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: any;
  result?: 'SUCCESS' | 'FAILURE';
}

/**
 * Remediation Workflow Manager Implementation
 */
export class RemediationWorkflowManager {
  private workflows: Map<string, RemediationWorkflow> = new Map();
  private lambdaRegistry = getLambdaRegistry();

  /**
   * Create a new remediation workflow
   */
  async createWorkflow(recommendation: RemediationRecommendation, scheduledFor?: Date): Promise<string> {
    const workflowId = `workflow-${recommendation.id}-${Date.now()}`;
    
    const workflow: RemediationWorkflow = {
      id: workflowId,
      remediationId: recommendation.id,
      recommendation,
      status: 'PENDING',
      steps: this.generateWorkflowSteps(recommendation),
      createdAt: new Date(),
      scheduledFor,
      approvals: this.generateRequiredApprovals(recommendation),
      auditLog: [{
        timestamp: new Date(),
        action: 'WORKFLOW_CREATED',
        actor: 'system',
        details: { recommendation, scheduledFor }
      }]
    };

    this.workflows.set(workflowId, workflow);
    
    // Start workflow if not scheduled
    if (!scheduledFor || scheduledFor <= new Date()) {
      await this.startWorkflow(workflowId);
    }

    return workflowId;
  }

  /**
   * Start a workflow execution
   */
  async startWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'PENDING') {
      throw new Error(`Workflow ${workflowId} is not in PENDING status`);
    }

    workflow.status = 'IN_PROGRESS';
    workflow.startedAt = new Date();
    
    this.addAuditEntry(workflow, 'WORKFLOW_STARTED', 'system', {});

    // Execute workflow steps
    await this.executeWorkflowSteps(workflow);
  }

  /**
   * Execute workflow steps in sequence
   */
  private async executeWorkflowSteps(workflow: RemediationWorkflow): Promise<void> {
    for (const step of workflow.steps) {
      if (step.status !== 'PENDING') continue;

      step.status = 'IN_PROGRESS';
      step.startTime = new Date();

      try {
        await this.executeWorkflowStep(workflow, step);
        step.status = 'COMPLETED';
      } catch (error) {
        step.status = 'FAILED';
        step.error = error instanceof Error ? error.message : 'Unknown error';
        workflow.status = 'FAILED';
        
        this.addAuditEntry(workflow, 'STEP_FAILED', 'system', { 
          stepId: step.id, 
          error: step.error 
        }, 'FAILURE');
        
        break;
      } finally {
        step.endTime = new Date();
      }

      // Check if workflow should be cancelled
      if (workflow.status === 'CANCELLED') {
        break;
      }
    }

    // Update final workflow status
    if (workflow.status === 'IN_PROGRESS') {
      const allCompleted = workflow.steps.every(step => step.status === 'COMPLETED' || step.status === 'SKIPPED');
      workflow.status = allCompleted ? 'COMPLETED' : 'FAILED';
      workflow.completedAt = new Date();
      
      this.addAuditEntry(workflow, 'WORKFLOW_COMPLETED', 'system', { 
        finalStatus: workflow.status 
      }, workflow.status === 'COMPLETED' ? 'SUCCESS' : 'FAILURE');
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(workflow: RemediationWorkflow, step: WorkflowStep): Promise<void> {
    switch (step.type) {
      case 'VALIDATION':
        await this.executeValidationStep(workflow, step);
        break;
      case 'APPROVAL':
        await this.executeApprovalStep(workflow, step);
        break;
      case 'EXECUTION':
        await this.executeRemediationStep(workflow, step);
        break;
      case 'VERIFICATION':
        await this.executeVerificationStep(workflow, step);
        break;
      case 'ROLLBACK':
        await this.executeRollbackStep(workflow, step);
        break;
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute validation step
   */
  private async executeValidationStep(workflow: RemediationWorkflow, step: WorkflowStep): Promise<void> {
    const lambdaFunction = this.lambdaRegistry.getFunction(workflow.recommendation.lambdaFunction);
    if (!lambdaFunction) {
      throw new Error(`Lambda function ${workflow.recommendation.lambdaFunction} not found`);
    }

    const paramValidation = this.lambdaRegistry.validateParameters(
      workflow.recommendation.lambdaFunction, 
      workflow.recommendation.parameters
    );

    if (!paramValidation.valid) {
      throw new Error(`Parameter validation failed: ${paramValidation.missingRequired.concat(paramValidation.invalidParameters).join(', ')}`);
    }

    step.result = { validation: 'passed', function: lambdaFunction.metadata };
    this.addAuditEntry(workflow, 'VALIDATION_COMPLETED', 'system', step.result, 'SUCCESS');
  }

  /**
   * Execute approval step
   */
  private async executeApprovalStep(workflow: RemediationWorkflow, step: WorkflowStep): Promise<void> {
    const pendingApprovals = workflow.approvals.filter(approval => approval.status === 'PENDING');
    
    if (pendingApprovals.length === 0) {
      step.result = { message: 'No approvals required' };
      step.status = 'SKIPPED';
      return;
    }

    // Check if all required approvals are obtained
    const allApproved = workflow.approvals.every(approval => approval.status === 'APPROVED');
    const anyRejected = workflow.approvals.some(approval => approval.status === 'REJECTED');

    if (anyRejected) {
      workflow.status = 'CANCELLED';
      throw new Error('Remediation rejected by approver');
    }

    if (!allApproved) {
      // Wait for approvals - in a real implementation, this would be handled asynchronously
      step.result = { message: 'Waiting for approvals', pendingApprovals: pendingApprovals.length };
      throw new Error('Pending approvals required');
    }

    step.result = { message: 'All approvals obtained', approvals: workflow.approvals };
    this.addAuditEntry(workflow, 'APPROVALS_OBTAINED', 'system', step.result, 'SUCCESS');
  }

  /**
   * Execute remediation step
   */
  private async executeRemediationStep(workflow: RemediationWorkflow, step: WorkflowStep): Promise<void> {
    const lambdaFunction = this.lambdaRegistry.getFunction(workflow.recommendation.lambdaFunction);
    if (!lambdaFunction) {
      throw new Error(`Lambda function ${workflow.recommendation.lambdaFunction} not found`);
    }

    const lambdaEvent: LambdaEvent = {
      parameters: workflow.recommendation.parameters,
      context: {
        requestId: workflow.id,
        functionName: workflow.recommendation.lambdaFunction,
        functionVersion: '$LATEST',
        invokedFunctionArn: `arn:aws:lambda:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:function:${workflow.recommendation.lambdaFunction}`,
        memoryLimitInMB: '512',
        awsRequestId: workflow.id,
        logGroupName: `/aws/lambda/${workflow.recommendation.lambdaFunction}`,
        logStreamName: `${new Date().toISOString().split('T')[0]}/[$LATEST]${workflow.id}`
      }
    };

    const result = await lambdaFunction.handler(lambdaEvent);
    
    if (!result.success) {
      throw new Error(`Remediation execution failed: ${result.message}`);
    }

    // Store rollback data if available
    if (result.rollbackData) {
      workflow.rollbackData = result.rollbackData;
    }

    step.result = result;
    this.addAuditEntry(workflow, 'REMEDIATION_EXECUTED', 'system', result, 'SUCCESS');
  }

  /**
   * Execute verification step
   */
  private async executeVerificationStep(workflow: RemediationWorkflow, step: WorkflowStep): Promise<void> {
    // In a real implementation, this would verify that the remediation was successful
    // For now, we'll just mark it as completed
    step.result = { message: 'Verification completed', verified: true };
    this.addAuditEntry(workflow, 'VERIFICATION_COMPLETED', 'system', step.result, 'SUCCESS');
  }

  /**
   * Execute rollback step
   */
  private async executeRollbackStep(workflow: RemediationWorkflow, step: WorkflowStep): Promise<void> {
    if (!workflow.rollbackData) {
      throw new Error('No rollback data available');
    }

    const lambdaFunction = this.lambdaRegistry.getFunction(workflow.recommendation.lambdaFunction);
    if (!lambdaFunction || !lambdaFunction.rollbackHandler) {
      throw new Error(`Rollback handler not available for ${workflow.recommendation.lambdaFunction}`);
    }

    const lambdaEvent: LambdaEvent = {
      parameters: {
        ...workflow.recommendation.parameters,
        rollbackData: workflow.rollbackData
      }
    };

    const result = await lambdaFunction.rollbackHandler(lambdaEvent);
    
    if (!result.success) {
      throw new Error(`Rollback failed: ${result.message}`);
    }

    step.result = result;
    workflow.status = 'ROLLED_BACK';
    this.addAuditEntry(workflow, 'ROLLBACK_EXECUTED', 'system', result, 'SUCCESS');
  }

  /**
   * Generate workflow steps based on recommendation
   */
  private generateWorkflowSteps(recommendation: RemediationRecommendation): WorkflowStep[] {
    const steps: WorkflowStep[] = [
      {
        id: `${recommendation.id}-validation`,
        type: 'VALIDATION',
        status: 'PENDING'
      }
    ];

    // Add approval step for high-risk operations
    const lambdaFunction = this.lambdaRegistry.getFunction(recommendation.lambdaFunction);
    if (lambdaFunction && (lambdaFunction.metadata.riskLevel === 'HIGH' || recommendation.priority === 'CRITICAL')) {
      steps.push({
        id: `${recommendation.id}-approval`,
        type: 'APPROVAL',
        status: 'PENDING'
      });
    }

    steps.push(
      {
        id: `${recommendation.id}-execution`,
        type: 'EXECUTION',
        status: 'PENDING'
      },
      {
        id: `${recommendation.id}-verification`,
        type: 'VERIFICATION',
        status: 'PENDING'
      }
    );

    return steps;
  }

  /**
   * Generate required approvals based on recommendation
   */
  private generateRequiredApprovals(recommendation: RemediationRecommendation): WorkflowApproval[] {
    const approvals: WorkflowApproval[] = [];
    const lambdaFunction = this.lambdaRegistry.getFunction(recommendation.lambdaFunction);

    if (lambdaFunction?.metadata.riskLevel === 'HIGH' || recommendation.priority === 'CRITICAL') {
      approvals.push({
        id: `${recommendation.id}-security-approval`,
        approverRole: 'SECURITY_OFFICER',
        status: 'PENDING',
        requiredFor: ['HIGH_RISK', 'CRITICAL_PRIORITY']
      });
    }

    if (recommendation.action === 'UPDATE_POLICY') {
      approvals.push({
        id: `${recommendation.id}-compliance-approval`,
        approverRole: 'COMPLIANCE_OFFICER',
        status: 'PENDING',
        requiredFor: ['POLICY_CHANGES']
      });
    }

    return approvals;
  }

  /**
   * Add audit log entry
   */
  private addAuditEntry(
    workflow: RemediationWorkflow, 
    action: string, 
    actor: string, 
    details: any, 
    result?: 'SUCCESS' | 'FAILURE'
  ): void {
    workflow.auditLog.push({
      timestamp: new Date(),
      action,
      actor,
      details,
      result
    });
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): RemediationWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): RemediationWorkflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflows by status
   */
  getWorkflowsByStatus(status: RemediationWorkflow['status']): RemediationWorkflow[] {
    return Array.from(this.workflows.values()).filter(workflow => workflow.status === status);
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(workflowId: string, reason: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    if (workflow.status === 'COMPLETED' || workflow.status === 'CANCELLED') {
      return false;
    }

    workflow.status = 'CANCELLED';
    this.addAuditEntry(workflow, 'WORKFLOW_CANCELLED', 'user', { reason });
    
    return true;
  }

  /**
   * Approve a workflow
   */
  async approveWorkflow(workflowId: string, approverRole: string, approvedBy: string, comments?: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    const approval = workflow.approvals.find(a => a.approverRole === approverRole && a.status === 'PENDING');
    if (!approval) {
      return false;
    }

    approval.status = 'APPROVED';
    approval.approvedBy = approvedBy;
    approval.approvedAt = new Date();
    approval.comments = comments;

    this.addAuditEntry(workflow, 'APPROVAL_GRANTED', approvedBy, { 
      approverRole, 
      comments 
    }, 'SUCCESS');

    // Continue workflow if all approvals are obtained
    const allApproved = workflow.approvals.every(a => a.status === 'APPROVED');
    if (allApproved && workflow.status === 'IN_PROGRESS') {
      await this.executeWorkflowSteps(workflow);
    }

    return true;
  }

  /**
   * Reject a workflow
   */
  async rejectWorkflow(workflowId: string, approverRole: string, rejectedBy: string, reason: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    const approval = workflow.approvals.find(a => a.approverRole === approverRole && a.status === 'PENDING');
    if (!approval) {
      return false;
    }

    approval.status = 'REJECTED';
    approval.approvedBy = rejectedBy;
    approval.approvedAt = new Date();
    approval.comments = reason;

    workflow.status = 'CANCELLED';

    this.addAuditEntry(workflow, 'APPROVAL_REJECTED', rejectedBy, { 
      approverRole, 
      reason 
    }, 'FAILURE');

    return true;
  }

  /**
   * Rollback a completed workflow
   */
  async rollbackWorkflow(workflowId: string): Promise<RemediationResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'COMPLETED') {
      throw new Error(`Cannot rollback workflow in status ${workflow.status}`);
    }

    if (!workflow.rollbackData) {
      throw new Error('No rollback data available for this workflow');
    }

    // Add rollback step
    const rollbackStep: WorkflowStep = {
      id: `${workflow.remediationId}-rollback`,
      type: 'ROLLBACK',
      status: 'PENDING'
    };

    workflow.steps.push(rollbackStep);
    
    try {
      await this.executeRollbackStep(workflow, rollbackStep);
      rollbackStep.status = 'COMPLETED';
      
      return {
        remediationId: workflow.remediationId,
        success: true,
        message: 'Workflow successfully rolled back',
        executedAt: new Date(),
        rollbackAvailable: false
      };
    } catch (error) {
      rollbackStep.status = 'FAILED';
      rollbackStep.error = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        remediationId: workflow.remediationId,
        success: false,
        message: `Rollback failed: ${rollbackStep.error}`,
        executedAt: new Date(),
        rollbackAvailable: false
      };
    }
  }
}