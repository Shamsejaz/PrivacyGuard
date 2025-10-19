/**
 * Agent Control API
 * REST endpoints for managing the Privacy Comply Agent lifecycle and status
 */

import { AgentController } from '../orchestration/agent-controller';
import {
  APIResponse,
  AgentStatusResponse,
  AgentControlRequest,
  AgentControlResponse,
  ConfigurationUpdateRequest,
  ConfigurationValidationResponse,
  HealthCheckResponse
} from './types';
import { AgentConfiguration } from '../types';

export class AgentAPI {
  private agentController: AgentController;

  constructor(agentController: AgentController) {
    this.agentController = agentController;
  }

  /**
   * GET /api/agent/status
   * Get current agent status and health information
   */
  async getStatus(): Promise<APIResponse<AgentStatusResponse>> {
    try {
      const systemStatus = await this.agentController.getSystemStatus();
      const healthScore = await this.getHealthScore();
      
      const response: AgentStatusResponse = {
        status: systemStatus.status,
        initialized: this.agentController.getState().initialized,
        monitoring: this.agentController.getState().monitoring,
        services: systemStatus.services,
        lastScan: systemStatus.lastScan.toISOString(),
        nextScan: systemStatus.nextScan.toISOString(),
        activeWorkflows: systemStatus.activeWorkflows,
        activeRemediations: this.agentController.getState().activeWorkflows.size,
        configuration: systemStatus.configuration,
        systemHealth: healthScore
      };

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent status',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * POST /api/agent/control
   * Control agent operations (start, stop, restart, scan, initialize)
   */
  async controlAgent(request: AgentControlRequest): Promise<APIResponse<AgentControlResponse>> {
    try {
      const startTime = Date.now();
      let workflowId: string | undefined;
      let message: string;

      switch (request.action) {
        case 'initialize':
          await this.agentController.initialize();
          message = 'Agent initialized successfully';
          break;

        case 'start':
          await this.agentController.startContinuousMonitoring();
          message = 'Continuous monitoring started';
          break;

        case 'stop':
          await this.agentController.stopContinuousMonitoring();
          message = 'Continuous monitoring stopped';
          break;

        case 'restart':
          await this.agentController.stopContinuousMonitoring();
          await this.agentController.startContinuousMonitoring();
          message = 'Agent restarted successfully';
          break;

        case 'scan':
          const workflowResult = await this.agentController.executeComplianceWorkflow(request.options);
          workflowId = workflowResult.workflowId;
          message = `Compliance scan completed. Found ${workflowResult.findings.length} findings, generated ${workflowResult.recommendations.length} recommendations`;
          break;

        default:
          throw new Error(`Unknown action: ${request.action}`);
      }

      const executionTime = Date.now() - startTime;

      const response: AgentControlResponse = {
        action: request.action,
        success: true,
        message,
        workflowId,
        executionTime
      };

      return {
        success: true,
        data: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const response: AgentControlResponse = {
        action: request.action,
        success: false,
        message: error instanceof Error ? error.message : 'Action failed'
      };

      return {
        success: false,
        data: response,
        error: error instanceof Error ? error.message : 'Agent control action failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * GET /api/agent/configuration
   * Get current agent configuration
   */
  async getConfiguration(): Promise<APIResponse<AgentConfiguration>> {
    try {
      const configuration = this.agentController.getConfiguration();

      return {
        success: true,
        data: configuration,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configuration',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * PUT /api/agent/configuration
   * Update agent configuration
   */
  async updateConfiguration(request: ConfigurationUpdateRequest): Promise<APIResponse<AgentConfiguration>> {
    try {
      // Validate configuration first
      const validation = await this.validateConfiguration(request);
      if (!validation.valid) {
        return {
          success: false,
          error: `Configuration validation failed: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString()
        };
      }

      // Update configuration
      await this.agentController.updateConfiguration(request);
      const updatedConfiguration = this.agentController.getConfiguration();

      return {
        success: true,
        data: updatedConfiguration,
        message: 'Configuration updated successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configuration',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * POST /api/agent/configuration/validate
   * Validate configuration without applying changes
   */
  async validateConfiguration(config: Partial<AgentConfiguration>): Promise<ConfigurationValidationResponse> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Validate scan interval
      if (config.scanInterval !== undefined) {
        if (config.scanInterval < 60000) { // Less than 1 minute
          errors.push('Scan interval must be at least 60 seconds');
        } else if (config.scanInterval < 300000) { // Less than 5 minutes
          warnings.push('Scan interval less than 5 minutes may impact performance');
        }
      }

      // Validate max concurrent remediations
      if (config.maxConcurrentRemediations !== undefined) {
        if (config.maxConcurrentRemediations < 1) {
          errors.push('Max concurrent remediations must be at least 1');
        } else if (config.maxConcurrentRemediations > 20) {
          warnings.push('High concurrency may overwhelm AWS services');
          recommendations.push('Consider using a lower value for maxConcurrentRemediations');
        }
      }

      // Validate risk threshold
      if (config.riskThreshold !== undefined) {
        if (config.riskThreshold < 0 || config.riskThreshold > 1) {
          errors.push('Risk threshold must be between 0 and 1');
        } else if (config.riskThreshold < 0.5) {
          warnings.push('Low risk threshold may result in excessive auto-remediation');
        }
      }

      // Validate retry attempts
      if (config.retryAttempts !== undefined) {
        if (config.retryAttempts < 1) {
          errors.push('Retry attempts must be at least 1');
        } else if (config.retryAttempts > 10) {
          warnings.push('High retry attempts may cause delays');
        }
      }

      // Validate retry delay
      if (config.retryDelay !== undefined) {
        if (config.retryDelay < 1000) {
          warnings.push('Short retry delay may not allow services to recover');
        } else if (config.retryDelay > 60000) {
          warnings.push('Long retry delay may cause timeouts');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        recommendations: []
      };
    }
  }

  /**
   * GET /api/agent/health
   * Get detailed health check information
   */
  async getHealthCheck(): Promise<APIResponse<HealthCheckResponse>> {
    try {
      const systemStatus = await this.agentController.getSystemStatus();
      const performanceMetrics = this.agentController.getPerformanceMetrics();
      const uptime = process.uptime() * 1000; // Convert to milliseconds

      const services = Object.entries(systemStatus.services).map(([name, healthy]) => ({
        name,
        status: healthy ? 'healthy' as const : 'unhealthy' as const,
        lastCheck: new Date().toISOString(),
        responseTime: healthy ? Math.random() * 100 : undefined // Simulated response time
      }));

      const healthResponse: HealthCheckResponse = {
        status: systemStatus.status.toLowerCase() as 'healthy' | 'degraded' | 'unhealthy',
        version: '1.0.0', // This should come from package.json or environment
        uptime,
        services,
        metrics: {
          totalRequests: performanceMetrics.getTotalOperations(),
          errorRate: performanceMetrics.getErrorRate(),
          averageResponseTime: performanceMetrics.getAverageResponseTime(),
          memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
          cpuUsage: process.cpuUsage().user / 1000000 // Convert to seconds
        }
      };

      return {
        success: true,
        data: healthResponse,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * POST /api/agent/shutdown
   * Gracefully shutdown the agent
   */
  async shutdown(): Promise<APIResponse<{ message: string }>> {
    try {
      await this.agentController.shutdown();

      return {
        success: true,
        data: { message: 'Agent shutdown completed successfully' },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Shutdown failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Helper method to get health score
   */
  private async getHealthScore(): Promise<{
    overallScore: number;
    categoryScores: Record<string, number>;
    criticalIssues: number;
  }> {
    try {
      // This would typically call the agent's getComplianceHealthScore method
      // For now, we'll return a simplified version
      return {
        overallScore: 0.85,
        categoryScores: {
          'ENCRYPTION': 0.9,
          'ACCESS_CONTROL': 0.8,
          'PII_EXPOSURE': 0.85,
          'LOGGING': 0.9
        },
        criticalIssues: 2
      };
    } catch (error) {
      return {
        overallScore: 0,
        categoryScores: {},
        criticalIssues: 0
      };
    }
  }
}