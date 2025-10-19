import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AWSConfigManager, DEFAULT_CONFIG, ENV_VARS } from '../aws-config';

describe('AWSConfigManager', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    Object.values(ENV_VARS).forEach(envVar => {
      delete process.env[envVar];
    });
    
    // Reset singleton instance
    (AWSConfigManager as any).instance = undefined;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AWSConfigManager.getInstance();
      const instance2 = AWSConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('loadAWSConfig', () => {
    it('should load default configuration when no environment variables are set', () => {
      const configManager = AWSConfigManager.getInstance();
      const config = configManager.getAWSConfig();
      
      expect(config.region).toBe(DEFAULT_CONFIG.AWS_REGION);
      expect(config.accessKeyId).toBeUndefined();
      expect(config.secretAccessKey).toBeUndefined();
      expect(config.sessionToken).toBeUndefined();
      expect(config.profile).toBeUndefined();
    });

    it('should load configuration from environment variables', () => {
      process.env.AWS_REGION = 'us-west-2';
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.AWS_SESSION_TOKEN = 'test-session-token';
      process.env.AWS_PROFILE = 'test-profile';
      
      const configManager = AWSConfigManager.getInstance();
      const config = configManager.getAWSConfig();
      
      expect(config.region).toBe('us-west-2');
      expect(config.accessKeyId).toBe('test-access-key');
      expect(config.secretAccessKey).toBe('test-secret-key');
      expect(config.sessionToken).toBe('test-session-token');
      expect(config.profile).toBe('test-profile');
    });
  });

  describe('loadServiceConfig', () => {
    it('should load default service configuration', () => {
      const configManager = AWSConfigManager.getInstance();
      const serviceConfig = configManager.getServiceConfig();
      
      expect(serviceConfig.bedrock.modelId).toBe(DEFAULT_CONFIG.BEDROCK_MODEL_ID);
      expect(serviceConfig.s3.reportsBucket).toBe(DEFAULT_CONFIG.S3_REPORTS_BUCKET);
      expect(serviceConfig.dynamodb.tableName).toBe(DEFAULT_CONFIG.DYNAMODB_TABLE_NAME);
      expect(serviceConfig.sagemaker.endpointName).toBe(DEFAULT_CONFIG.SAGEMAKER_ENDPOINT_NAME);
    });

    it('should load service configuration from environment variables', () => {
      process.env.BEDROCK_MODEL_ID = 'custom-model-id';
      process.env.S3_REPORTS_BUCKET = 'custom-reports-bucket';
      process.env.DYNAMODB_TABLE_NAME = 'custom-table';
      process.env.SAGEMAKER_ENDPOINT_NAME = 'custom-endpoint';
      
      const configManager = AWSConfigManager.getInstance();
      const serviceConfig = configManager.getServiceConfig();
      
      expect(serviceConfig.bedrock.modelId).toBe('custom-model-id');
      expect(serviceConfig.s3.reportsBucket).toBe('custom-reports-bucket');
      expect(serviceConfig.dynamodb.tableName).toBe('custom-table');
      expect(serviceConfig.sagemaker.endpointName).toBe('custom-endpoint');
    });
  });

  describe('updateAWSConfig', () => {
    it('should update AWS configuration', () => {
      const configManager = AWSConfigManager.getInstance();
      
      configManager.updateAWSConfig({
        region: 'eu-west-1',
        accessKeyId: 'new-access-key'
      });
      
      const config = configManager.getAWSConfig();
      expect(config.region).toBe('eu-west-1');
      expect(config.accessKeyId).toBe('new-access-key');
    });
  });

  describe('updateServiceConfig', () => {
    it('should update service configuration', () => {
      const configManager = AWSConfigManager.getInstance();
      
      configManager.updateServiceConfig({
        bedrock: {
          modelId: 'updated-model-id',
          region: 'us-west-2'
        }
      });
      
      const serviceConfig = configManager.getServiceConfig();
      expect(serviceConfig.bedrock.modelId).toBe('updated-model-id');
      expect(serviceConfig.bedrock.region).toBe('us-west-2');
    });
  });

  describe('validateConfig', () => {
    it('should return valid when AWS credentials are properly configured', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      
      const configManager = AWSConfigManager.getInstance();
      const validation = configManager.validateConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return valid when AWS profile is configured', () => {
      process.env.AWS_PROFILE = 'test-profile';
      
      const configManager = AWSConfigManager.getInstance();
      const validation = configManager.validateConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return invalid when no credentials are configured', () => {
      const configManager = AWSConfigManager.getInstance();
      const validation = configManager.validateConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('AWS credentials not configured. Set AWS_ACCESS_KEY_ID or AWS_PROFILE');
    });

    it('should return invalid when access key is set without secret key', () => {
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      
      const configManager = AWSConfigManager.getInstance();
      const validation = configManager.validateConfig();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('AWS_SECRET_ACCESS_KEY required when using AWS_ACCESS_KEY_ID');
    });
  });

  describe('getServiceCredentials', () => {
    it('should return service-specific credentials for bedrock', () => {
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
      process.env.BEDROCK_REGION = 'us-west-2';
      
      const configManager = AWSConfigManager.getInstance();
      const credentials = configManager.getServiceCredentials('bedrock');
      
      expect(credentials.region).toBe('us-west-2');
      expect(credentials.credentials?.accessKeyId).toBe('test-access-key');
      expect(credentials.credentials?.secretAccessKey).toBe('test-secret-key');
    });

    it('should return base credentials for unknown service', () => {
      process.env.AWS_REGION = 'us-east-1';
      
      const configManager = AWSConfigManager.getInstance();
      const credentials = configManager.getServiceCredentials('unknown-service');
      
      expect(credentials.region).toBe('us-east-1');
      expect(credentials.credentials).toBeUndefined();
    });

    it('should not include credentials when using profile', () => {
      process.env.AWS_PROFILE = 'test-profile';
      
      const configManager = AWSConfigManager.getInstance();
      const credentials = configManager.getServiceCredentials('s3');
      
      expect(credentials.credentials).toBeUndefined();
    });
  });
});