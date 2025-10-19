import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AWSServiceClients } from '../service-clients';
import { AWSConfigManager } from '../aws-config';

// Mock the AWSConfigManager
vi.mock('../aws-config');

describe('AWSServiceClients', () => {
  let serviceClients: AWSServiceClients;
  let mockConfigManager: any;

  beforeEach(() => {
    // Reset singleton instance
    (AWSServiceClients as any).instance = undefined;
    
    // Create mock config manager
    mockConfigManager = {
      getServiceCredentials: vi.fn().mockReturnValue({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret'
        }
      }),
      getServiceConfig: vi.fn().mockReturnValue({
        bedrock: {
          modelId: 'test-model-id',
          region: 'us-east-1'
        },
        sagemaker: {
          endpointName: 'test-endpoint',
          region: 'us-east-1'
        },
        s3: {
          reportsBucket: 'test-bucket',
          region: 'us-east-1'
        },
        dynamodb: {
          tableName: 'test-table',
          region: 'us-east-1'
        }
      })
    };

    // Mock the getInstance method
    (AWSConfigManager.getInstance as any) = vi.fn().mockReturnValue(mockConfigManager);
    
    serviceClients = AWSServiceClients.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AWSServiceClients.getInstance();
      const instance2 = AWSServiceClients.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getS3Client', () => {
    it('should return S3 client with correct configuration', () => {
      const s3Client = serviceClients.getS3Client();
      
      expect(s3Client).toBeDefined();
      expect(s3Client.serviceName).toBe('s3');
      expect(s3Client.config).toBeDefined();
      expect(mockConfigManager.getServiceCredentials).toHaveBeenCalledWith('s3');
    });

    it('should cache S3 client instance', () => {
      const client1 = serviceClients.getS3Client();
      const client2 = serviceClients.getS3Client();
      
      expect(client1).toBe(client2);
      expect(mockConfigManager.getServiceCredentials).toHaveBeenCalledTimes(1);
    });

    it('should have required S3 methods', () => {
      const s3Client = serviceClients.getS3Client();
      
      expect(typeof s3Client.listBuckets).toBe('function');
      expect(typeof s3Client.getBucketPolicy).toBe('function');
      expect(typeof s3Client.getBucketEncryption).toBe('function');
      expect(typeof s3Client.getPublicAccessBlock).toBe('function');
    });
  });

  describe('getIAMClient', () => {
    it('should return IAM client with correct configuration', () => {
      const iamClient = serviceClients.getIAMClient();
      
      expect(iamClient).toBeDefined();
      expect(iamClient.serviceName).toBe('iam');
      expect(typeof iamClient.listRoles).toBe('function');
      expect(typeof iamClient.listAttachedRolePolicies).toBe('function');
      expect(typeof iamClient.getPolicy).toBe('function');
      expect(typeof iamClient.getPolicyVersion).toBe('function');
    });
  });

  describe('getCloudTrailClient', () => {
    it('should return CloudTrail client with correct configuration', () => {
      const cloudTrailClient = serviceClients.getCloudTrailClient();
      
      expect(cloudTrailClient).toBeDefined();
      expect(cloudTrailClient.serviceName).toBe('cloudtrail');
      expect(typeof cloudTrailClient.lookupEvents).toBe('function');
      expect(typeof cloudTrailClient.describeTrails).toBe('function');
    });
  });

  describe('getSecurityHubClient', () => {
    it('should return Security Hub client with correct configuration', () => {
      const securityHubClient = serviceClients.getSecurityHubClient();
      
      expect(securityHubClient).toBeDefined();
      expect(securityHubClient.serviceName).toBe('securityhub');
      expect(typeof securityHubClient.getFindings).toBe('function');
      expect(typeof securityHubClient.batchImportFindings).toBe('function');
    });
  });

  describe('getMacieClient', () => {
    it('should return Macie client with correct configuration', () => {
      const macieClient = serviceClients.getMacieClient();
      
      expect(macieClient).toBeDefined();
      expect(macieClient.serviceName).toBe('macie');
      expect(typeof macieClient.getFindings).toBe('function');
      expect(typeof macieClient.listClassificationJobs).toBe('function');
    });
  });

  describe('getBedrockClient', () => {
    it('should return Bedrock client with model ID from config', () => {
      const bedrockClient = serviceClients.getBedrockClient();
      
      expect(bedrockClient).toBeDefined();
      expect(bedrockClient.serviceName).toBe('bedrock');
      expect(bedrockClient.modelId).toBe('test-model-id');
      expect(typeof bedrockClient.invokeModel).toBe('function');
    });
  });

  describe('getSageMakerClient', () => {
    it('should return SageMaker client with endpoint name from config', () => {
      const sageMakerClient = serviceClients.getSageMakerClient();
      
      expect(sageMakerClient).toBeDefined();
      expect(sageMakerClient.serviceName).toBe('sagemaker');
      expect(sageMakerClient.endpointName).toBe('test-endpoint');
      expect(typeof sageMakerClient.invokeEndpoint).toBe('function');
    });
  });

  describe('getDynamoDBClient', () => {
    it('should return DynamoDB client with table name from config', () => {
      const dynamoDBClient = serviceClients.getDynamoDBClient();
      
      expect(dynamoDBClient).toBeDefined();
      expect(dynamoDBClient.serviceName).toBe('dynamodb');
      expect(dynamoDBClient.tableName).toBe('test-table');
      expect(typeof dynamoDBClient.putItem).toBe('function');
      expect(typeof dynamoDBClient.getItem).toBe('function');
    });
  });

  describe('getLambdaClient', () => {
    it('should return Lambda client with correct configuration', () => {
      const lambdaClient = serviceClients.getLambdaClient();
      
      expect(lambdaClient).toBeDefined();
      expect(lambdaClient.serviceName).toBe('lambda');
      expect(typeof lambdaClient.invoke).toBe('function');
      expect(typeof lambdaClient.listFunctions).toBe('function');
    });
  });

  describe('getQBusinessClient', () => {
    it('should return Q Business client with correct configuration', () => {
      const qBusinessClient = serviceClients.getQBusinessClient();
      
      expect(qBusinessClient).toBeDefined();
      expect(qBusinessClient.serviceName).toBe('qbusiness');
      expect(typeof qBusinessClient.chatSync).toBe('function');
    });
  });

  describe('clearClients', () => {
    it('should clear all cached clients', () => {
      // Get some clients to cache them
      serviceClients.getS3Client();
      serviceClients.getIAMClient();
      
      // Clear clients
      serviceClients.clearClients();
      
      // Getting clients again should create new instances
      const s3Client = serviceClients.getS3Client();
      expect(s3Client).toBeDefined();
      
      // Should have called getServiceCredentials again
      expect(mockConfigManager.getServiceCredentials).toHaveBeenCalledTimes(3); // 2 initial + 1 after clear
    });
  });

  describe('getAvailableClients', () => {
    it('should return list of available client names', () => {
      const availableClients = serviceClients.getAvailableClients();
      
      expect(availableClients).toContain('s3');
      expect(availableClients).toContain('iam');
      expect(availableClients).toContain('cloudtrail');
      expect(availableClients).toContain('securityhub');
      expect(availableClients).toContain('macie');
      expect(availableClients).toContain('bedrock');
      expect(availableClients).toContain('sagemaker');
      expect(availableClients).toContain('dynamodb');
      expect(availableClients).toContain('lambda');
      expect(availableClients).toContain('qbusiness');
    });
  });

  describe('testConnectivity', () => {
    it('should test connectivity to all AWS services', async () => {
      const results = await serviceClients.testConnectivity();
      
      expect(results).toHaveLength(10); // Number of available clients
      
      results.forEach(result => {
        expect(result).toHaveProperty('service');
        expect(result).toHaveProperty('connected');
        expect(typeof result.connected).toBe('boolean');
      });
    });

    it('should handle client creation errors', async () => {
      // Mock a client creation error
      const originalGetS3Client = serviceClients.getS3Client;
      serviceClients.getS3Client = vi.fn().mockImplementation(() => {
        throw new Error('Connection failed');
      });
      
      const results = await serviceClients.testConnectivity();
      
      const s3Result = results.find(r => r.service === 's3');
      expect(s3Result?.connected).toBe(false);
      expect(s3Result?.error).toBe('Connection failed');
      
      // Restore original method
      serviceClients.getS3Client = originalGetS3Client;
    });
  });
});