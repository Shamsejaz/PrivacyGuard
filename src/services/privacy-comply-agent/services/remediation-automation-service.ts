// Remediation Automation Service Interface
import {
  RemediationRecommendation,
  RemediationResult,
  RemediationStatus
} from '../types';

/**
 * Remediation Automation Service
 * Executes automated remediation actions for compliance violations
 */
export interface RemediationAutomationService {
  /**
   * Execute a remediation recommendation
   * Runs the appropriate Lambda function to fix the compliance issue
   */
  executeRemediation(recommendation: RemediationRecommendation): Promise<RemediationResult>;

  /**
   * Schedule a remediation for future execution
   * Allows for planned maintenance windows and approvals
   */
  scheduleRemediation(recommendation: RemediationRecommendation, schedule: Date): Promise<string>;

  /**
   * Get the current status of a remediation
   * Tracks progress and provides real-time updates
   */
  getRemediationStatus(remediationId: string): Promise<RemediationStatus>;

  /**
   * Rollback a previously executed remediation
   * Reverts changes if issues arise after remediation
   */
  rollbackRemediation(remediationId: string): Promise<RemediationResult>;

  /**
   * Get all active remediations
   */
  getActiveRemediations(): Promise<RemediationStatus[]>;

  /**
   * Cancel a scheduled remediation
   */
  cancelScheduledRemediation(remediationId: string): Promise<boolean>;

  /**
   * Get remediation history for a resource
   */
  getRemediationHistory(resourceArn: string): Promise<RemediationResult[]>;

  /**
   * Validate if a remediation can be safely executed
   */
  validateRemediation(recommendation: RemediationRecommendation): Promise<{
    canExecute: boolean;
    risks: string[];
    prerequisites: string[];
  }>;

  /**
   * Get available Lambda functions for remediation
   */
  getAvailableLambdaFunctions(): Promise<{
    functionName: string;
    description: string;
    supportedActions: string[];
  }[]>;
}

import { getLambdaRegistry } from '../lambda-functions/lambda-registry';
import { LambdaEvent } from '../types/lambda';
import { RemediationWorkflowManager } from '../orchestration/remediation-workflow-manager';

/**
 * Implementation class for Remediation Automation Service
 */
export class RemediationAutomationServiceImpl implements RemediationAutomationService {
  private lambdaRegistry = getLambdaRegistry();
  private workflowManager = new RemediationWorkflowManager();
  private remediationStatuses: Map<string, RemediationStatus> = new Map();
  private remediationHistory: Map<string, RemediationResult[]> = new Map();

  async executeRemediation(recommendation: RemediationRecommendation): Promise<RemediationResult> {
    try {
      // Create and start workflow for immediate execution
      const workflowId = await this.workflowManager.createWorkflow(recommendation);
      
      // Initialize remediation status
      this.remediationStatuses.set(recommendation.id, {
        id: recommendation.id,
        status: 'IN_PROGRESS',
        progress: 0,
        lastUpdated: new Date(),
        logs: [`Workflow ${workflowId} created and started`]
      });

      // Wait for workflow completion (in a real implementation, this would be asynchronous)
      const workflow = this.workflowManager.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Simulate workflow execution monitoring
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (workflow.status === 'IN_PROGRESS' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        // Update progress
        const completedSteps = workflow.steps.filter(s => s.status === 'COMPLETED').length;
        const progress = Math.round((completedSteps / workflow.steps.length) * 100);
        
        this.updateRemediationStatus(recommendation.id, {
          progress,
          logs: [`Workflow progress: ${progress}%`]
        });
      }

      // Determine final result
      const success = workflow.status === 'COMPLETED';
      const executionStep = workflow.steps.find(s => s.type === 'EXECUTION');
      
      const result: RemediationResult = {
        remediationId: recommendation.id,
        success,
        message: success 
          ? `Remediation completed successfully via workflow ${workflowId}`
          : `Remediation failed: ${workflow.status}`,
        executedAt: new Date(),
        rollbackAvailable: !!workflow.rollbackData
      };

      // Update final status
      this.remediationStatuses.set(recommendation.id, {
        id: recommendation.id,
        status: success ? 'COMPLETED' : 'FAILED',
        progress: 100,
        lastUpdated: new Date(),
        logs: [
          ...this.remediationStatuses.get(recommendation.id)?.logs || [],
          `Workflow ${workflow.status.toLowerCase()}: ${result.message}`
        ]
      });

      // Store in history
      this.addToHistory(recommendation.id, result);

      return result;

    } catch (error) {
      console.error('Error executing remediation:', error);
      
      const result: RemediationResult = {
        remediationId: recommendation.id,
        success: false,
        message: `Remediation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executedAt: new Date(),
        rollbackAvailable: false
      };

      // Update status
      this.remediationStatuses.set(recommendation.id, {
        id: recommendation.id,
        status: 'FAILED',
        progress: 0,
        lastUpdated: new Date(),
        logs: [`Error: ${result.message}`]
      });

      this.addToHistory(recommendation.id, result);
      return result;
    }
  }

  async scheduleRemediation(recommendation: RemediationRecommendation, schedule: Date): Promise<string> {
    try {
      // Create workflow with scheduled execution
      const workflowId = await this.workflowManager.createWorkflow(recommendation, schedule);
      
      // Initialize remediation status
      this.remediationStatuses.set(recommendation.id, {
        id: recommendation.id,
        status: 'PENDING',
        progress: 0,
        lastUpdated: new Date(),
        logs: [`Remediation scheduled for ${schedule.toISOString()}, workflow: ${workflowId}`]
      });

      return workflowId;
    } catch (error) {
      console.error('Error scheduling remediation:', error);
      throw new Error(`Failed to schedule remediation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getRemediationStatus(remediationId: string): Promise<RemediationStatus> {
    const status = this.remediationStatuses.get(remediationId);
    if (!status) {
      throw new Error(`Remediation ${remediationId} not found`);
    }
    return status;
  }

  async rollbackRemediation(remediationId: string): Promise<RemediationResult> {
    try {
      // Find the workflow for this remediation
      const workflows = this.workflowManager.getAllWorkflows();
      const workflow = workflows.find(w => w.remediationId === remediationId);
      
      if (!workflow) {
        throw new Error(`No workflow found for remediation ${remediationId}`);
      }

      // Execute rollback
      const result = await this.workflowManager.rollbackWorkflow(workflow.id);
      
      // Update status
      this.remediationStatuses.set(remediationId, {
        id: remediationId,
        status: 'ROLLED_BACK',
        progress: 100,
        lastUpdated: new Date(),
        logs: [
          ...this.remediationStatuses.get(remediationId)?.logs || [],
          `Rollback ${result.success ? 'completed' : 'failed'}: ${result.message}`
        ]
      });

      this.addToHistory(remediationId, result);
      return result;

    } catch (error) {
      console.error('Error rolling back remediation:', error);
      
      const result: RemediationResult = {
        remediationId,
        success: false,
        message: `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executedAt: new Date(),
        rollbackAvailable: false
      };

      this.addToHistory(remediationId, result);
      return result;
    }
  }

  async getActiveRemediations(): Promise<RemediationStatus[]> {
    return Array.from(this.remediationStatuses.values()).filter(status => 
      status.status === 'PENDING' || status.status === 'IN_PROGRESS'
    );
  }

  async cancelScheduledRemediation(remediationId: string): Promise<boolean> {
    try {
      // Find the workflow for this remediation
      const workflows = this.workflowManager.getAllWorkflows();
      const workflow = workflows.find(w => w.remediationId === remediationId);
      
      if (!workflow) {
        return false;
      }

      // Cancel the workflow
      const cancelled = await this.workflowManager.cancelWorkflow(workflow.id, 'User requested cancellation');
      
      if (cancelled) {
        // Update status
        this.remediationStatuses.set(remediationId, {
          id: remediationId,
          status: 'FAILED', // Using FAILED as there's no CANCELLED status in RemediationStatus
          progress: 0,
          lastUpdated: new Date(),
          logs: [
            ...this.remediationStatuses.get(remediationId)?.logs || [],
            'Remediation cancelled by user request'
          ]
        });
      }

      return cancelled;
    } catch (error) {
      console.error('Error cancelling remediation:', error);
      return false;
    }
  }

  async getRemediationHistory(resourceArn: string): Promise<RemediationResult[]> {
    // In a real implementation, this would filter by resource ARN
    // For now, return all history entries
    const allHistory: RemediationResult[] = [];
    for (const history of this.remediationHistory.values()) {
      allHistory.push(...history);
    }
    return allHistory;
  }

  async validateRemediation(recommendation: RemediationRecommendation): Promise<{
    canExecute: boolean;
    risks: string[];
    prerequisites: string[];
  }> {
    const risks: string[] = [];
    const prerequisites: string[] = [];

    // Check if Lambda function exists
    const lambdaFunction = this.lambdaRegistry.getFunction(recommendation.lambdaFunction);
    if (!lambdaFunction) {
      risks.push(`Lambda function ${recommendation.lambdaFunction} not found`);
      return { canExecute: false, risks, prerequisites };
    }

    // Validate parameters
    const paramValidation = this.lambdaRegistry.validateParameters(recommendation.lambdaFunction, recommendation.parameters);
    if (!paramValidation.valid) {
      if (paramValidation.missingRequired.length > 0) {
        risks.push(`Missing required parameters: ${paramValidation.missingRequired.join(', ')}`);
      }
      if (paramValidation.invalidParameters.length > 0) {
        risks.push(`Invalid parameters: ${paramValidation.invalidParameters.join(', ')}`);
      }
    }

    // Check if action is supported
    if (!lambdaFunction.metadata.supportedActions.includes(recommendation.action)) {
      risks.push(`Action ${recommendation.action} not supported by function ${recommendation.lambdaFunction}`);
    }

    // Add risk-based warnings
    if (lambdaFunction.metadata.riskLevel === 'HIGH') {
      prerequisites.push('High-risk operation requires additional approval');
    }

    if (lambdaFunction.metadata.riskLevel === 'MEDIUM') {
      prerequisites.push('Medium-risk operation should be executed during maintenance window');
    }

    // Check if remediation is automatable
    if (!recommendation.automatable) {
      risks.push('Remediation is marked as non-automatable');
    }

    return {
      canExecute: risks.length === 0,
      risks,
      prerequisites
    };
  }

  async getAvailableLambdaFunctions(): Promise<{
    functionName: string;
    description: string;
    supportedActions: string[];
  }[]> {
    const metadata = this.lambdaRegistry.getFunctionMetadata();
    return metadata.map(meta => ({
      functionName: meta.functionName,
      description: meta.description,
      supportedActions: meta.supportedActions
    }));
  }

  /**
   * Update remediation status
   */
  private updateRemediationStatus(remediationId: string, updates: Partial<RemediationStatus>): void {
    const currentStatus = this.remediationStatuses.get(remediationId);
    if (currentStatus) {
      this.remediationStatuses.set(remediationId, {
        ...currentStatus,
        ...updates,
        lastUpdated: new Date(),
        logs: updates.logs ? [...currentStatus.logs, ...updates.logs] : currentStatus.logs
      });
    }
  }

  /**
   * Add result to remediation history
   */
  private addToHistory(remediationId: string, result: RemediationResult): void {
    const history = this.remediationHistory.get(remediationId) || [];
    history.push(result);
    this.remediationHistory.set(remediationId, history);
  }

  /**
   * Get workflow manager instance (for testing or advanced operations)
   */
  getWorkflowManager(): RemediationWorkflowManager {
    return this.workflowManager;
  }
}