/**
 * AWS Service Configurator
 * Orchestrates the setup of all AWS service configurations for Privacy Comply Agent
 * Requirements: 1.5, 3.5, 4.4
 */

import { InfrastructureManager } from './infrastructure-manager';
import { AWSConfigManager } from '../config/aws-config';

export interface ServiceConfigurationResult {
  success: boolean;
  message: string;
  details: {
    iam: {
      success: boolean;
      rolesCreated: string[];
      errors?: string[];
    };
    dynamodb: {
      success: boolean;
      tablesCreated: string[];
      errors?: string[];
    };
    s3: {
      success: boolean;
      bucketsCreated: string[];
      errors?: string[];
    };
  };
  duration: number;
  timestamp: Date;
}

export interface ServiceValidationResult {
  valid: boolean;
  services: {
    iam: {
      valid: boolean;
      issues: string[];
    };
    dynamodb: {
      valid: boolean;
      issues: string[];
    };
    s3: {
      valid: boolean;
      issues: string[];
    };
  };
  recommendations: string[];
}

/**
 * AWS Service Configurator
 * Main class for setting up and validating AWS service configurations
 */
export class AWSServiceConfigurator {
  private infrastructureManager: InfrastructureManager;
  private configManager: AWSConfigManager;

  constructor() {
    this.infrastructureManager = new InfrastructureManager();
    this.configManager = AWSConfigManager.getInstance();
  }

  /**
   * Configure all AWS services for Privacy Comply Agent
   * This is the main entry point for task 10.1
   */
  public async configureAllServices(): Promise<ServiceConfigurationResult> {
    const startTime = Date.now();
    console.log('🚀 Starting AWS service configuration for Privacy Comply Agent...');

    const result: ServiceConfigurationResult = {
      success: false,
      message: '',
      details: {
        iam: { success: false, rolesCreated: [] },
        dynamodb: { success: false, tablesCreated: [] },
        s3: { success: false, bucketsCreated: [] }
      },
      duration: 0,
      timestamp: new Date()
    };

    try {
      // Step 1: Validate AWS configuration and credentials
      console.log('🔍 Validating AWS configuration and credentials...');
      const configValidation = this.configManager.validateConfig();
      if (!configValidation.valid) {
        throw new Error(`AWS configuration invalid: ${configValidation.errors.join(', ')}`);
      }

      const credentialValidation = await this.configManager.validateCredentials();
      if (!credentialValidation.valid) {
        throw new Error(`AWS credentials invalid: ${credentialValidation.missingPermissions?.join(', ')}`);
      }

      console.log('✅ AWS configuration and credentials validated');

      // Step 2: Set up infrastructure components
      console.log('🏗️ Setting up AWS infrastructure components...');
      const infrastructureResult = await this.infrastructureManager.setupInfrastructure();

      // Map infrastructure results to service configuration results
      result.details.iam = {
        success: infrastructureResult.components.iam.success,
        rolesCreated: infrastructureResult.components.iam.success ? [
          'PrivacyComplyLambdaExecutionRole',
          'PrivacyComplyAgentRole',
          'PrivacyComplyBedrockAccessRole'
        ] : [],
        errors: infrastructureResult.components.iam.success ? undefined : [infrastructureResult.components.iam.message]
      };

      result.details.dynamodb = {
        success: infrastructureResult.components.dynamodb.success,
        tablesCreated: infrastructureResult.components.dynamodb.success ? [
          'privacy-comply-findings',
          'privacy-comply-assessments'
        ] : [],
        errors: infrastructureResult.components.dynamodb.success ? undefined : [infrastructureResult.components.dynamodb.message]
      };

      result.details.s3 = {
        success: infrastructureResult.components.s3.success,
        bucketsCreated: infrastructureResult.components.s3.success ? [
          'privacy-comply-reports',
          'privacy-comply-data-lake'
        ] : [],
        errors: infrastructureResult.components.s3.success ? undefined : [infrastructureResult.components.s3.message]
      };

      result.success = infrastructureResult.success;
      result.duration = Date.now() - startTime;

      if (result.success) {
        result.message = 'All AWS services configured successfully';
        console.log('🎉 AWS service configuration completed successfully');
        console.log(`📊 Configuration Summary:`);
        console.log(`   ✅ IAM Roles: ${result.details.iam.rolesCreated.length} created`);
        console.log(`   ✅ DynamoDB Tables: ${result.details.dynamodb.tablesCreated.length} created`);
        console.log(`   ✅ S3 Buckets: ${result.details.s3.bucketsCreated.length} created`);
        console.log(`   ⏱️ Duration: ${result.duration}ms`);
      } else {
        result.message = 'AWS service configuration completed with errors';
        console.log('⚠️ AWS service configuration completed with errors');
        
        // Log specific errors
        if (!result.details.iam.success) {
          console.log(`   ❌ IAM: ${result.details.iam.errors?.join(', ')}`);
        }
        if (!result.details.dynamodb.success) {
          console.log(`   ❌ DynamoDB: ${result.details.dynamodb.errors?.join(', ')}`);
        }
        if (!result.details.s3.success) {
          console.log(`   ❌ S3: ${result.details.s3.errors?.join(', ')}`);
        }
      }

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.message = `AWS service configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ AWS service configuration failed:', error);
      
      return result;
    }
  }

  /**
   * Validate all configured AWS services
   */
  public async validateServiceConfiguration(): Promise<ServiceValidationResult> {
    console.log('🔍 Validating AWS service configuration...');

    try {
      const infrastructureValidation = await this.infrastructureManager.validateInfrastructure();

      const result: ServiceValidationResult = {
        valid: infrastructureValidation.valid,
        services: {
          iam: {
            valid: infrastructureValidation.iam.valid,
            issues: []
          },
          dynamodb: {
            valid: infrastructureValidation.dynamodb.valid,
            issues: []
          },
          s3: {
            valid: infrastructureValidation.s3.valid,
            issues: []
          }
        },
        recommendations: []
      };

      // Analyze IAM validation results
      if (!infrastructureValidation.iam.valid) {
        const missingRoles = infrastructureValidation.iam.roles
          .filter(role => !role.exists)
          .map(role => role.roleName);
        
        if (missingRoles.length > 0) {
          result.services.iam.issues.push(`Missing IAM roles: ${missingRoles.join(', ')}`);
        }
      }

      // Analyze DynamoDB validation results
      if (!infrastructureValidation.dynamodb.valid) {
        const issues = infrastructureValidation.dynamodb.tables
          .filter(table => !table.exists || !table.encrypted || table.status !== 'ACTIVE')
          .map(table => {
            const problems = [];
            if (!table.exists) problems.push('does not exist');
            if (!table.encrypted) problems.push('not encrypted');
            if (table.status !== 'ACTIVE') problems.push(`status: ${table.status}`);
            return `${table.tableName}: ${problems.join(', ')}`;
          });
        
        result.services.dynamodb.issues.push(...issues);
      }

      // Analyze S3 validation results
      if (!infrastructureValidation.s3.valid) {
        const issues = infrastructureValidation.s3.buckets
          .filter(bucket => !bucket.exists || !bucket.encrypted || bucket.publicAccess)
          .map(bucket => {
            const problems = [];
            if (!bucket.exists) problems.push('does not exist');
            if (!bucket.encrypted) problems.push('not encrypted');
            if (bucket.publicAccess) problems.push('has public access');
            return `${bucket.bucketName}: ${problems.join(', ')}`;
          });
        
        result.services.s3.issues.push(...issues);
      }

      // Generate recommendations
      if (!result.valid) {
        result.recommendations.push('Run configureAllServices() to fix configuration issues');
        
        if (!result.services.iam.valid) {
          result.recommendations.push('Verify IAM permissions for role creation and policy attachment');
        }
        
        if (!result.services.dynamodb.valid) {
          result.recommendations.push('Check DynamoDB permissions and table configuration');
        }
        
        if (!result.services.s3.valid) {
          result.recommendations.push('Verify S3 permissions and bucket security settings');
        }
      }

      if (result.valid) {
        console.log('✅ All AWS services are properly configured');
      } else {
        console.log('⚠️ AWS service configuration issues detected:');
        Object.entries(result.services).forEach(([service, config]) => {
          if (!config.valid) {
            console.log(`   ❌ ${service.toUpperCase()}: ${config.issues.join(', ')}`);
          }
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Service validation failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive service status
   */
  public async getServiceStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      iam: 'healthy' | 'degraded' | 'unhealthy';
      dynamodb: 'healthy' | 'degraded' | 'unhealthy';
      s3: 'healthy' | 'degraded' | 'unhealthy';
    };
    details: any;
    lastChecked: Date;
  }> {
    console.log('📊 Getting comprehensive service status...');

    try {
      const infrastructureStatus = await this.infrastructureManager.getInfrastructureStatus();

      return {
        overall: infrastructureStatus.overall,
        services: infrastructureStatus.components,
        details: infrastructureStatus.details,
        lastChecked: new Date()
      };

    } catch (error) {
      console.error('❌ Failed to get service status:', error);
      throw error;
    }
  }

  /**
   * Test connectivity to all configured services
   */
  public async testServiceConnectivity(): Promise<{
    success: boolean;
    services: {
      iam: boolean;
      dynamodb: boolean;
      s3: boolean;
      securityhub: boolean;
      macie: boolean;
      bedrock: boolean;
    };
    message: string;
  }> {
    console.log('🔗 Testing connectivity to AWS services...');

    try {
      const connectivityResult = await this.infrastructureManager.testInfrastructureConnectivity();

      const result = {
        success: connectivityResult.success,
        services: connectivityResult.services,
        message: connectivityResult.success 
          ? 'All services are reachable' 
          : 'Some services are unreachable'
      };

      if (result.success) {
        console.log('✅ All AWS services are reachable');
      } else {
        console.log('⚠️ Some AWS services are unreachable:');
        Object.entries(result.services).forEach(([service, reachable]) => {
          if (!reachable) {
            console.log(`   ❌ ${service.toUpperCase()}: unreachable`);
          }
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Connectivity test failed:', error);
      return {
        success: false,
        services: {
          iam: false,
          dynamodb: false,
          s3: false,
          securityhub: false,
          macie: false,
          bedrock: false
        },
        message: `Connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Update service configurations
   */
  public async updateServiceConfiguration(): Promise<ServiceConfigurationResult> {
    console.log('🔄 Updating AWS service configuration...');
    
    // For updates, we use the same configuration process
    // The individual managers handle checking for existing resources
    return this.configureAllServices();
  }

  /**
   * Generate configuration report
   */
  public async generateConfigurationReport(): Promise<{
    timestamp: Date;
    configuration: ServiceConfigurationResult;
    validation: ServiceValidationResult;
    connectivity: any;
    recommendations: string[];
  }> {
    console.log('📋 Generating comprehensive configuration report...');

    try {
      const [validation, connectivity] = await Promise.all([
        this.validateServiceConfiguration(),
        this.testServiceConnectivity()
      ]);

      // Mock configuration result for report (would be from last configuration)
      const configuration: ServiceConfigurationResult = {
        success: validation.valid,
        message: validation.valid ? 'Configuration is valid' : 'Configuration has issues',
        details: {
          iam: {
            success: validation.services.iam.valid,
            rolesCreated: validation.services.iam.valid ? [
              'PrivacyComplyLambdaExecutionRole',
              'PrivacyComplyAgentRole',
              'PrivacyComplyBedrockAccessRole'
            ] : []
          },
          dynamodb: {
            success: validation.services.dynamodb.valid,
            tablesCreated: validation.services.dynamodb.valid ? [
              'privacy-comply-findings',
              'privacy-comply-assessments'
            ] : []
          },
          s3: {
            success: validation.services.s3.valid,
            bucketsCreated: validation.services.s3.valid ? [
              'privacy-comply-reports',
              'privacy-comply-data-lake'
            ] : []
          }
        },
        duration: 0,
        timestamp: new Date()
      };

      const recommendations = [
        ...validation.recommendations,
        ...(connectivity.success ? [] : ['Check network connectivity to AWS services']),
        'Regularly validate service configurations',
        'Monitor service health and performance',
        'Keep IAM policies up to date with least privilege principle'
      ];

      const report = {
        timestamp: new Date(),
        configuration,
        validation,
        connectivity,
        recommendations
      };

      console.log('📊 Configuration report generated successfully');
      return report;

    } catch (error) {
      console.error('❌ Failed to generate configuration report:', error);
      throw error;
    }
  }
}

/**
 * Utility function to run the complete AWS service configuration
 * This is the main function to execute for task 10.1
 */
export async function setupAWSServiceConfigurations(): Promise<ServiceConfigurationResult> {
  const configurator = new AWSServiceConfigurator();
  return configurator.configureAllServices();
}

/**
 * Utility function to validate the AWS service configuration
 */
export async function validateAWSServiceConfigurations(): Promise<ServiceValidationResult> {
  const configurator = new AWSServiceConfigurator();
  return configurator.validateServiceConfiguration();
}