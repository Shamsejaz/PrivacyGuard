/**
 * Agent Configuration Manager
 * Manages configuration and initialization for the Privacy Comply Agent
 */

import { AgentConfiguration } from '../types';
import { AWSConfigManager } from './aws-config';

export interface AgentConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface InitializationStep {
  name: string;
  description: string;
  required: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
  duration?: number;
}

export interface SystemRequirements {
  minNodeVersion: string;
  requiredAWSServices: string[];
  requiredPermissions: string[];
  minimumMemory: number; // MB
  recommendedCPU: number; // cores
}

/**
 * Agent Configuration Manager
 * Handles all configuration validation, initialization, and system requirements
 */
export class AgentConfigurationManager {
  private static instance: AgentConfigurationManager;
  private awsConfigManager: AWSConfigManager;
  private initializationSteps: InitializationStep[] = [];
  
  private constructor() {
    this.awsConfigManager = AWSConfigManager.getInstance();
    this.defineInitializationSteps();
  }

  public static getInstance(): AgentConfigurationManager {
    if (!AgentConfigurationManager.instance) {
      AgentConfigurationManager.instance = new AgentConfigurationManager();
    }
    return AgentConfigurationManager.instance;
  }

  /**
   * Define the initialization steps for the agent
   */
  private defineInitializationSteps(): void {
    this.initializationSteps = [
      {
        name: 'system_requirements',
        description: 'Validate system requirements',
        required: true,
        status: 'pending'
      },
      {
        name: 'configuration_validation',
        description: 'Validate agent configuration',
        required: true,
        status: 'pending'
      },
      {
        name: 'aws_connectivity',
        description: 'Test AWS service connectivity',
        required: true,
        status: 'pending'
      },
      {
        name: 'permissions_check',
        description: 'Verify required AWS permissions',
        required: true,
        status: 'pending'
      },
      {
        name: 'service_initialization',
        description: 'Initialize core services',
        required: true,
        status: 'pending'
      },
      {
        name: 'orchestration_setup',
        description: 'Set up orchestration components',
        required: true,
        status: 'pending'
      },
      {
        name: 'monitoring_setup',
        description: 'Initialize monitoring and metrics',
        required: false,
        status: 'pending'
      },
      {
        name: 'health_check',
        description: 'Perform initial health check',
        required: true,
        status: 'pending'
      }
    ];
  }

  /**
   * Get system requirements
   */
  getSystemRequirements(): SystemRequirements {
    return {
      minNodeVersion: '18.0.0',
      requiredAWSServices: [
        'S3',
        'IAM',
        'CloudTrail',
        'SecurityHub',
        'Macie',
        'Bedrock',
        'Lambda',
        'DynamoDB',
        'SageMaker'
      ],
      requiredPermissions: [
        's3:GetBucketPolicy',
        's3:GetBucketEncryption',
        's3:GetBucketPublicAccessBlock',
        'iam:ListRoles',
        'iam:GetRole',
        'iam:GetRolePolicy',
        'cloudtrail:DescribeTrails',
        'cloudtrail:GetTrailStatus',
        'securityhub:GetFindings',
        'macie2:GetFindings',
        'bedrock:InvokeModel',
        'lambda:InvokeFunction',
        'dynamodb:Query',
        'dynamodb:PutItem',
        'sagemaker:DescribeEndpoint',
        'sagemaker:InvokeEndpoint'
      ],
      minimumMemory: 2048, // 2GB
      recommendedCPU: 2
    };
  }

  /**
   * Validate agent configuration
   */
  validateAgentConfiguration(config: AgentConfiguration): AgentConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate scan interval
    if (config.scanInterval < 60000) {
      errors.push('Scan interval must be at least 60 seconds (60000ms)');
    }
    if (config.scanInterval > 86400000) { // 24 hours
      warnings.push('Scan interval is very long (>24 hours), consider shorter intervals for better compliance monitoring');
    }

    // Validate max concurrent remediations
    if (config.maxConcurrentRemediations < 1) {
      errors.push('Max concurrent remediations must be at least 1');
    }
    if (config.maxConcurrentRemediations > 20) {
      warnings.push('High number of concurrent remediations may impact system performance');
    }

    // Validate risk threshold
    if (config.riskThreshold < 0 || config.riskThreshold > 1) {
      errors.push('Risk threshold must be between 0 and 1');
    }
    if (config.riskThreshold < 0.3) {
      warnings.push('Low risk threshold may result in excessive automated remediations');
    }

    // Validate retry configuration
    if (config.retryAttempts < 1) {
      errors.push('Retry attempts must be at least 1');
    }
    if (config.retryAttempts > 10) {
      warnings.push('High retry attempts may cause long delays on failures');
    }

    if (config.retryDelay < 1000) {
      warnings.push('Very short retry delay may overwhelm services');
    }

    // Auto-remediation warnings
    if (config.autoRemediation && config.riskThreshold > 0.8) {
      warnings.push('High risk threshold with auto-remediation enabled may miss important issues');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate system requirements
   */
  async validateSystemRequirements(): Promise<AgentConfigValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements = this.getSystemRequirements();

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const minVersion = requirements.minNodeVersion;
      if (this.compareVersions(nodeVersion.substring(1), minVersion) < 0) {
        errors.push(`Node.js version ${nodeVersion} is below minimum required version ${minVersion}`);
      }

      // Check available memory
      const totalMemory = process.memoryUsage().heapTotal / 1024 / 1024; // Convert to MB
      if (totalMemory < requirements.minimumMemory) {
        warnings.push(`Available memory (${totalMemory.toFixed(0)}MB) is below recommended minimum (${requirements.minimumMemory}MB)`);
      }

      // Check CPU cores (if available)
      const cpuCount = require('os').cpus().length;
      if (cpuCount < requirements.recommendedCPU) {
        warnings.push(`CPU cores (${cpuCount}) is below recommended minimum (${requirements.recommendedCPU})`);
      }

    } catch (error) {
      warnings.push(`Could not fully validate system requirements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Validate AWS permissions
   */
  async validateAWSPermissions(): Promise<AgentConfigValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const requirements = this.getSystemRequirements();

    try {
      // This would typically test actual AWS permissions
      // For now, we'll do basic validation
      const awsValidation = this.awsConfigManager.validateConfig();
      if (!awsValidation.valid) {
        errors.push(...awsValidation.errors);
      }

      // TODO: Implement actual permission testing
      // This would involve making test calls to each required AWS service
      // to verify the configured credentials have the necessary permissions

    } catch (error) {
      errors.push(`AWS permission validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Run complete configuration validation
   */
  async runCompleteValidation(config: AgentConfiguration): Promise<{
    overall: AgentConfigValidation;
    systemRequirements: AgentConfigValidation;
    agentConfig: AgentConfigValidation;
    awsPermissions: AgentConfigValidation;
  }> {
    const systemRequirements = await this.validateSystemRequirements();
    const agentConfig = this.validateAgentConfiguration(config);
    const awsPermissions = await this.validateAWSPermissions();

    const allErrors = [
      ...systemRequirements.errors,
      ...agentConfig.errors,
      ...awsPermissions.errors
    ];

    const allWarnings = [
      ...systemRequirements.warnings,
      ...agentConfig.warnings,
      ...awsPermissions.warnings
    ];

    const overall: AgentConfigValidation = {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };

    return {
      overall,
      systemRequirements,
      agentConfig,
      awsPermissions
    };
  }

  /**
   * Update initialization step status
   */
  updateInitializationStep(stepName: string, status: InitializationStep['status'], error?: string, duration?: number): void {
    const step = this.initializationSteps.find(s => s.name === stepName);
    if (step) {
      step.status = status;
      if (error) step.error = error;
      if (duration) step.duration = duration;
    }
  }

  /**
   * Get initialization progress
   */
  getInitializationProgress(): {
    steps: InitializationStep[];
    completed: number;
    total: number;
    failed: number;
    inProgress: boolean;
  } {
    const completed = this.initializationSteps.filter(s => s.status === 'completed').length;
    const failed = this.initializationSteps.filter(s => s.status === 'failed').length;
    const inProgress = this.initializationSteps.some(s => s.status === 'in_progress');

    return {
      steps: [...this.initializationSteps],
      completed,
      total: this.initializationSteps.length,
      failed,
      inProgress
    };
  }

  /**
   * Reset initialization steps
   */
  resetInitializationSteps(): void {
    this.initializationSteps.forEach(step => {
      step.status = 'pending';
      delete step.error;
      delete step.duration;
    });
  }

  /**
   * Get default agent configuration
   */
  getDefaultConfiguration(): AgentConfiguration {
    return {
      scanInterval: 3600000, // 1 hour
      autoRemediation: false, // Disabled by default for safety
      maxConcurrentRemediations: 3,
      riskThreshold: 0.7,
      enableContinuousMonitoring: true,
      retryAttempts: 3,
      retryDelay: 5000
    };
  }

  /**
   * Merge configuration with defaults
   */
  mergeWithDefaults(config?: Partial<AgentConfiguration>): AgentConfiguration {
    const defaults = this.getDefaultConfiguration();
    return { ...defaults, ...config };
  }

  /**
   * Export configuration for backup/restore
   */
  exportConfiguration(config: AgentConfiguration): string {
    return JSON.stringify({
      agentConfiguration: config,
      awsConfiguration: this.awsConfigManager.getConfig(),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfiguration(configJson: string): {
    agentConfiguration: AgentConfiguration;
    awsConfiguration: any;
    success: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    let agentConfiguration: AgentConfiguration = this.getDefaultConfiguration();
    let awsConfiguration: any = {};

    try {
      const imported = JSON.parse(configJson);
      
      if (imported.agentConfiguration) {
        const validation = this.validateAgentConfiguration(imported.agentConfiguration);
        if (validation.valid) {
          agentConfiguration = imported.agentConfiguration;
        } else {
          errors.push(...validation.errors);
        }
      }

      if (imported.awsConfiguration) {
        awsConfiguration = imported.awsConfiguration;
      }

    } catch (error) {
      errors.push(`Failed to parse configuration JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      agentConfiguration,
      awsConfiguration,
      success: errors.length === 0,
      errors
    };
  }
}