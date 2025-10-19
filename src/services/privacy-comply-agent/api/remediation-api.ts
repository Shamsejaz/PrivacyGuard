/**
 * Remediation API
 * REST endpoints for managing automated remediation workflows
 */

import { AgentController } from '../orchestration/agent-controller';
import {
  APIResponse,
  PaginatedResponse,
  RemediationRequest,
  RemediationStatusResponse,
  RemediationHistoryParams
} from './types';
import {
  RemediationRecommendation,
  RemediationResult,
  RemediationStatus
} from '../types';

export class RemediationAPI {
  private agentController: AgentController;
  private remediationStatusCache: Map<string, RemediationStatus> = new Map();

  constructor(agentController: AgentController) {
    this.agentController = agentController;
  }

  /**
   * POST /api/remediation/execute
   * Execute remediation for specified findings
   */
  async executeRemediation(request: RemediationRequest): Promise<APIResponse<{
    remediationId: string;
    status: string;
    message: string;
    scheduledTime?: string;
    affectedFindings: string[];
  }>> {
    try {
      // Validate request
      if (!request.findingIds || request.findingIds.length === 0) {
        return {
          success: false,
          error: 'At least one finding ID must be provided',
          timestamp: new Date().toISOString()
        };
      }

      // Generate remediation ID
      const remediationId = `rem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Handle dry run
      if (request.dryRun) {
        const dryRunResult = await this.performDryRun(request.findingIds);
        return {
          success: true,
          data: {
            remediationId: `dryrun-${remediationId}`,
            status: 'DRY_RUN_COMPLETED',
            message: `Dry run completed. ${dryRunResult.automatable} of ${request.findingIds.length} findings can be auto-remediated`,
            affectedFindings: request.findingIds
          },
          timestamp: new Date().toISOString()
        };
      }

      // Handle scheduled remediation
      if (request.scheduledTime) {
        const scheduledTime = new Date(request.scheduledTime);
        if (scheduledTime <= new Date()) {
          return {
            success: false,
            error: 'Scheduled time must be in the future',
            timestamp: new Date().toISOString()
          };
        }

        // Schedule remediation (in a real implementation, this would use a job scheduler)
        await this.scheduleRemediation(remediationId, request.findingIds, scheduledTime);
        
        return {
          success: true,
          data: {
            remediationId,
            status: 'SCHEDULED',
            message: `Remediation scheduled for ${scheduledTime.toISOString()}`,
            scheduledTime: scheduledTime.toISOString(),
            affectedFindings: request.findingIds
          },
          timestamp: new Date().toISOString()
        };
      }

      // Execute immediate remediation
      const remediationResults = await this.agentController.executeAutomatedRemediation(request.findingIds);
      
      // Create status entry
      const status: RemediationStatus = {
        id: remediationId,
        status: remediationResults.every(r => r.success) ? 'COMPLETED' : 'FAILED',
        progress: 100,
        lastUpdated: new Date(),
        logs: remediationResults.map(r => `${r.success ? 'SUCCESS' : 'FAILED'}: ${r.message}`)
      };

      this.remediationStatusCache.set(remediationId, status);

      const successCount = remediationResults.filter(r => r.success).length;
      const message = `Remediation completed. ${successCount}/${remediationResults.length} findings remediated successfully`;

      return {
        success: true,
        data: {
          remediationId,
          status: status.status,
          message,
          affectedFindings: request.findingIds
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Remediation execution failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/remediation/status/:id
   * Get status of a specific remediation
   */
  async getRemediationStatus(remediationId: string): Promise<APIResponse<RemediationStatusResponse>> {
    try {
      const status = this.remediationStatusCache.get(remediationId);
      
      if (!status) {
        return {
          success: false,
          error: `Remediation with ID ${remediationId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      const response: RemediationStatusResponse = {
        remediationId,
        status: status.status,
        progress: status.progress,
        startTime: status.lastUpdated.toISOString(),
        endTime: status.status === 'COMPLETED' || status.status === 'FAILED' 
          ? status.lastUpdated.toISOString() 
          : undefined,
        findingId: remediationId.split('-')[1] || 'unknown', // Extract from ID
        action: 'AUTO_REMEDIATION',
        message: status.logs[status.logs.length - 1] || 'No status message',
        rollbackAvailable: status.status === 'COMPLETED',
        logs: status.logs
      };

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get remediation status',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/remediation/history
   * Get paginated remediation history
   */
  async getRemediationHistory(params: RemediationHistoryParams = {}): Promise<PaginatedResponse<RemediationResult>> {
    try {
      // In a real implementation, this would query a database
      // For now, we'll simulate history data
      let history = this.generateMockRemediationHistory();

      // Apply filters
      if (params.findingId) {
        history = history.filter(r => r.findingId === params.findingId);
      }

      if (params.status) {
        history = history.filter(r => r.success === (params.status === 'COMPLETED'));
      }

      if (params.dateFrom) {
        const fromDate = new Date(params.dateFrom);
        history = history.filter(r => r.executedAt >= fromDate);
      }

      if (params.dateTo) {
        const toDate = new Date(params.dateTo);
        history = history.filter(r => r.executedAt <= toDate);
      }

      // Apply pagination
      const page = params.page || 1;
      const limit = params.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedHistory = history.slice(startIndex, endIndex);
      const totalPages = Math.ceil(history.length / limit);

      return {
        success: true,
        data: paginatedHistory,
        pagination: {
          page,
          limit,
          total: history.length,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to get remediation history',
        pagination: {
          page: params.page || 1,
          limit: params.limit || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * POST /api/remediation/rollback/:id
   * Rollback a completed remediation
   */
  async rollbackRemediation(remediationId: string): Promise<APIResponse<{
    rollbackId: string;
    status: string;
    message: string;
  }>> {
    try {
      const status = this.remediationStatusCache.get(remediationId);
      
      if (!status) {
        return {
          success: false,
          error: `Remediation with ID ${remediationId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      if (status.status !== 'COMPLETED') {
        return {
          success: false,
          error: 'Only completed remediations can be rolled back',
          timestamp: new Date().toISOString()
        };
      }

      // Generate rollback ID
      const rollbackId = `rollback-${remediationId}`;

      // In a real implementation, this would execute the actual rollback
      // For now, we'll simulate the rollback process
      await this.simulateRollback(remediationId);

      // Update status
      status.status = 'ROLLED_BACK';
      status.lastUpdated = new Date();
      status.logs.push(`Rollback initiated: ${rollbackId}`);
      status.logs.push('Rollback completed successfully');

      return {
        success: true,
        data: {
          rollbackId,
          status: 'COMPLETED',
          message: 'Remediation rolled back successfully'
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rollback failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/remediation/recommendations/:findingId
   * Get remediation recommendations for a specific finding
   */
  async getRecommendations(findingId: string): Promise<APIResponse<RemediationRecommendation[]>> {
    try {
      // Get recommendations from the agent
      const workflowResult = await this.agentController.executeComplianceWorkflow({
        skipRemediation: true,
        targetFindings: [findingId]
      });

      const recommendations = workflowResult.recommendations.filter(
        rec => rec.findingId === findingId
      );

      return {
        success: true,
        data: recommendations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recommendations',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/remediation/active
   * Get currently active remediations
   */
  async getActiveRemediations(): Promise<APIResponse<RemediationStatusResponse[]>> {
    try {
      const activeRemediations: RemediationStatusResponse[] = [];

      for (const [remediationId, status] of this.remediationStatusCache.entries()) {
        if (status.status === 'IN_PROGRESS' || status.status === 'PENDING') {
          activeRemediations.push({
            remediationId,
            status: status.status,
            progress: status.progress,
            startTime: status.lastUpdated.toISOString(),
            findingId: remediationId.split('-')[1] || 'unknown',
            action: 'AUTO_REMEDIATION',
            message: status.logs[status.logs.length - 1] || 'No status message',
            rollbackAvailable: false,
            logs: status.logs
          });
        }
      }

      return {
        success: true,
        data: activeRemediations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active remediations',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * DELETE /api/remediation/cancel/:id
   * Cancel a pending or in-progress remediation
   */
  async cancelRemediation(remediationId: string): Promise<APIResponse<{ message: string }>> {
    try {
      const status = this.remediationStatusCache.get(remediationId);
      
      if (!status) {
        return {
          success: false,
          error: `Remediation with ID ${remediationId} not found`,
          timestamp: new Date().toISOString()
        };
      }

      if (status.status !== 'PENDING' && status.status !== 'IN_PROGRESS') {
        return {
          success: false,
          error: 'Only pending or in-progress remediations can be cancelled',
          timestamp: new Date().toISOString()
        };
      }

      // Update status to cancelled
      status.status = 'FAILED'; // Using FAILED as there's no CANCELLED status in the type
      status.lastUpdated = new Date();
      status.logs.push('Remediation cancelled by user request');

      return {
        success: true,
        data: { message: 'Remediation cancelled successfully' },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel remediation',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private helper methods

  private async performDryRun(findingIds: string[]): Promise<{ automatable: number; total: number }> {
    try {
      // Get recommendations for the findings
      const workflowResult = await this.agentController.executeComplianceWorkflow({
        skipRemediation: true,
        targetFindings: findingIds
      });

      const automatableCount = workflowResult.recommendations.filter(
        rec => rec.automatable && findingIds.includes(rec.findingId)
      ).length;

      return {
        automatable: automatableCount,
        total: findingIds.length
      };
    } catch (error) {
      console.error('Dry run failed:', error);
      return { automatable: 0, total: findingIds.length };
    }
  }

  private async scheduleRemediation(
    remediationId: string,
    findingIds: string[],
    scheduledTime: Date
  ): Promise<void> {
    // Create scheduled status
    const status: RemediationStatus = {
      id: remediationId,
      status: 'PENDING',
      progress: 0,
      lastUpdated: new Date(),
      logs: [`Remediation scheduled for ${scheduledTime.toISOString()}`]
    };

    this.remediationStatusCache.set(remediationId, status);

    // In a real implementation, this would use a job scheduler like AWS EventBridge
    // For now, we'll simulate with setTimeout
    const delay = scheduledTime.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        try {
          status.status = 'IN_PROGRESS';
          status.logs.push('Executing scheduled remediation...');
          
          const results = await this.agentController.executeAutomatedRemediation(findingIds);
          
          status.status = results.every(r => r.success) ? 'COMPLETED' : 'FAILED';
          status.progress = 100;
          status.lastUpdated = new Date();
          status.logs.push(`Scheduled remediation completed: ${results.filter(r => r.success).length}/${results.length} successful`);
        } catch (error) {
          status.status = 'FAILED';
          status.progress = 100;
          status.lastUpdated = new Date();
          status.logs.push(`Scheduled remediation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }, delay);
    }
  }

  private async simulateRollback(remediationId: string): Promise<void> {
    // Simulate rollback delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, this would execute the actual rollback logic
    console.log(`Simulating rollback for remediation ${remediationId}`);
  }

  private generateMockRemediationHistory(): RemediationResult[] {
    const history: RemediationResult[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 50; i++) {
      const executedAt = new Date(now - (i * 86400000) - Math.random() * 86400000); // Random time in last 50 days
      const success = Math.random() > 0.2; // 80% success rate
      
      history.push({
        remediationId: `rem-${Date.now()}-${i}`,
        success,
        message: success 
          ? 'Remediation completed successfully' 
          : 'Remediation failed due to insufficient permissions',
        executedAt,
        rollbackAvailable: success,
        findingId: `finding-${i}`
      });
    }
    
    return history.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
  }
}