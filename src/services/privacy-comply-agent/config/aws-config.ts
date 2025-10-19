// AWS Configuration Management
import { AWSConfig, ServiceConfig } from '../types';

/**
 * AWS Configuration Manager
 * Manages AWS credentials and service configurations
 */
export class AWSConfigManager {
  private static instance: AWSConfigManager;
  private config: AWSConfig;
  private serviceConfig: ServiceConfig;

  private constructor() {
    this.config = this.loadAWSConfig();
    this.serviceConfig = this.loadServiceConfig();
  }

  public static getInstance(): AWSConfigManager {
    if (!AWSConfigManager.instance) {
      AWSConfigManager.instance = new AWSConfigManager();
    }
    return AWSConfigManager.instance;
  }

  /**
   * Load AWS configuration from environment variables or config files
   */
  private loadAWSConfig(): AWSConfig {
    return {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
      profile: process.env.AWS_PROFILE
    };
  }

  /**
   * Load service-specific configurations
   */
  private loadServiceConfig(): ServiceConfig {
    return {
      bedrock: {
        modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
        region: process.env.BEDROCK_REGION || this.config.region
      },
      sagemaker: {
        endpointName: process.env.SAGEMAKER_ENDPOINT_NAME || 'privacy-comply-endpoint',
        region: process.env.SAGEMAKER_REGION || this.config.region
      },
      s3: {
        reportsBucket: process.env.S3_REPORTS_BUCKET || 'privacy-comply-reports',
        region: process.env.S3_REGION || this.config.region
      },
      dynamodb: {
        tableName: process.env.DYNAMODB_TABLE_NAME || 'privacy-comply-data',
        region: process.env.DYNAMODB_REGION || this.config.region
      }
    };
  }

  /**
   * Get AWS configuration
   */
  public getAWSConfig(): AWSConfig {
    return { ...this.config };
  }

  /**
   * Get service configuration
   */
  public getServiceConfig(): ServiceConfig {
    return { ...this.serviceConfig };
  }

  /**
   * Update AWS configuration
   */
  public updateAWSConfig(newConfig: Partial<AWSConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update service configuration
   */
  public updateServiceConfig(newConfig: Partial<ServiceConfig>): void {
    this.serviceConfig = { ...this.serviceConfig, ...newConfig };
  }

  /**
   * Validate configuration
   */
  public validateConfig(): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate AWS credentials
    if (!this.config.accessKeyId && !this.config.profile) {
      errors.push('AWS credentials not configured. Set AWS_ACCESS_KEY_ID or AWS_PROFILE');
    }

    if (this.config.accessKeyId && !this.config.secretAccessKey) {
      errors.push('AWS_SECRET_ACCESS_KEY required when using AWS_ACCESS_KEY_ID');
    }

    // Validate required service configurations
    if (!this.serviceConfig.s3.reportsBucket) {
      errors.push('S3 reports bucket not configured');
    }

    if (!this.serviceConfig.dynamodb.tableName) {
      errors.push('DynamoDB table name not configured');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration for specific AWS service
   */
  public getServiceCredentials(serviceName: string) {
    const baseConfig = {
      region: this.config.region,
      credentials: this.config.accessKeyId ? {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey!,
        sessionToken: this.config.sessionToken
      } : undefined
    };

    // Service-specific configurations
    switch (serviceName) {
      case 'bedrock':
        return {
          ...baseConfig,
          region: this.serviceConfig.bedrock.region
        };
      case 'sagemaker':
        return {
          ...baseConfig,
          region: this.serviceConfig.sagemaker.region
        };
      case 's3':
        return {
          ...baseConfig,
          region: this.serviceConfig.s3.region
        };
      case 'dynamodb':
        return {
          ...baseConfig,
          region: this.serviceConfig.dynamodb.region
        };
      default:
        return baseConfig;
    }
  }

  /**
   * Validate AWS credentials and permissions
   */
  public async validateCredentials(): Promise<{
    valid: boolean;
    accountId?: string;
    region?: string;
    permissions: {
      lambda: boolean;
      iam: boolean;
      s3: boolean;
      dynamodb: boolean;
      cloudwatch: boolean;
      eventbridge: boolean;
      securityhub: boolean;
      macie: boolean;
      bedrock: boolean;
    };
    missingPermissions?: string[];
  }> {
    // This would implement actual credential validation using STS and IAM
    // For now, return mock validation based on configuration
    const configValidation = this.validateConfig();
    
    if (!configValidation.valid) {
      return {
        valid: false,
        permissions: {
          lambda: false,
          iam: false,
          s3: false,
          dynamodb: false,
          cloudwatch: false,
          eventbridge: false,
          securityhub: false,
          macie: false,
          bedrock: false
        },
        missingPermissions: configValidation.errors
      };
    }

    // Mock successful validation
    return {
      valid: true,
      accountId: '123456789012',
      region: this.config.region,
      permissions: {
        lambda: true,
        iam: true,
        s3: true,
        dynamodb: true,
        cloudwatch: true,
        eventbridge: true,
        securityhub: true,
        macie: true,
        bedrock: true
      }
    };
  }
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  AWS_REGION: 'us-east-1',
  BEDROCK_MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
  S3_REPORTS_BUCKET: 'privacy-comply-reports',
  DYNAMODB_TABLE_NAME: 'privacy-comply-data',
  SAGEMAKER_ENDPOINT_NAME: 'privacy-comply-endpoint'
};

/**
 * Environment variable names
 */
export const ENV_VARS = {
  AWS_REGION: 'AWS_REGION',
  AWS_ACCESS_KEY_ID: 'AWS_ACCESS_KEY_ID',
  AWS_SECRET_ACCESS_KEY: 'AWS_SECRET_ACCESS_KEY',
  AWS_SESSION_TOKEN: 'AWS_SESSION_TOKEN',
  AWS_PROFILE: 'AWS_PROFILE',
  BEDROCK_MODEL_ID: 'BEDROCK_MODEL_ID',
  BEDROCK_REGION: 'BEDROCK_REGION',
  S3_REPORTS_BUCKET: 'S3_REPORTS_BUCKET',
  S3_REGION: 'S3_REGION',
  DYNAMODB_TABLE_NAME: 'DYNAMODB_TABLE_NAME',
  DYNAMODB_REGION: 'DYNAMODB_REGION',
  SAGEMAKER_ENDPOINT_NAME: 'SAGEMAKER_ENDPOINT_NAME',
  SAGEMAKER_REGION: 'SAGEMAKER_REGION'
};