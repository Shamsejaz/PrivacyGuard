/**
 * AWS Service Configurator Tests
 * Tests for AWS service configuration setup and validation
 * Requirements: 1.5, 3.5, 4.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AWSServiceConfigurator, setupAWSServiceConfigurations, validateAWSServiceConfigurations } from '../aws-service-configurator';
import { InfrastructureManager } from '../infrastructure-manager';
import { AWSConfigManager } from '../../config/aws-config';

// Mock dependencies
vi.mock('../infrastructure-manager');
vi.mock('../../config/aws-config');

describe('AWSServiceConfigurator', () => {
  let configurator: AWSServiceConfigurator;
  let mockInfrastructureManager: vi.Mocked<InfrastructureManager>;
  let mockConfigManager: vi.Mocked<AWSConfigManager>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock InfrastructureManager
    mockInfrastructureManager = {
      setupInfrastructure: vi.fn(),
      validateInfrastructure: vi.fn(),
      getInfrastructureStatus: vi.fn(),
      testInfrastructureConnectivity: vi.fn()
    } as any;

    // Mock AWSConfigManager
    mockConfigManager = {
      validateConfig: vi.fn(),
      validateCredentials: vi.fn()
    } as any;

    // Mock the getInstance method
    vi.mocked(AWSConfigManager.getInstance).mockReturnValue(mockConfigManager);
    
    // Mock constructor calls
    vi.mocked(InfrastructureManager).mockImplementation(() => mockInfrastructureManager);

    configurator = new AWSServiceConfigurator();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('configureAllServices', () => {
    it('should successfully configure all AWS services', async () => {
      // Mock successful configuration validation
      mockConfigManager.validateConfig.mockReturnValue({
        valid: true,
        errors: []
      });

      mockConfigManager.validateCredentials.mockResolvedValue({
        valid: true,
        accountId: '123456789012',
        region: 'us-east-1',
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
      });

      // Mock successful infrastructure setup
      mockInfrastructureManager.setupInfrastructure.mockResolvedValue({
        success: true,
        components: {
          iam: {
            success: true,
            message: 'IAM roles created successfully',
            details: { rolesCreated: true }
          },
          dynamodb: {
            success: true,
            message: 'DynamoDB tables created successfully',
            details: { tablesCreated: true }
          },
          s3: {
            success: true,
            message: 'S3 buckets created successfully',
            details: { bucketsCreated: true }
          }
        },
        duration: 5000,
        timestamp: new Date()
      });

      const result = await configurator.configureAllServices();

      expect(result.success).toBe(true);
      expect(result.message).toBe('All AWS services configured successfully');
      expect(result.details.iam.success).toBe(true);
      expect(result.details.dynamodb.success).toBe(true);
      expect(result.details.s3.success).toBe(true);
      expect(result.details.iam.rolesCreated).toEqual([
        'PrivacyComplyLambdaExecutionRole',
        'PrivacyComplyAgentRole',
        'PrivacyComplyBedrockAccessRole'
      ]);
      expect(result.details.dynamodb.tablesCreated).toEqual([
        'privacy-comply-findings',
        'privacy-comply-assessments'
      ]);
      expect(result.details.s3.bucketsCreated).toEqual([
        'privacy-comply-reports',
        'privacy-comply-data-lake'
      ]);
    });

    it('should handle configuration validation failures', async () => {
      // Mock configuration validation failure
      mockConfigManager.validateConfig.mockReturnValue({
        valid: false,
        errors: ['AWS credentials not configured']
      });

      const result = await configurator.configureAllServices();

      expect(result.success).toBe(false);
      expect(result.message).toContain('AWS configuration invalid');
      expect(mockInfrastructureManager.setupInfrastructure).not.toHaveBeenCalled();
    });

    it('should handle credential validation failures', async () => {
      // Mock successful config but failed credentials
      mockConfigManager.validateConfig.mockReturnValue({
        valid: true,
        errors: []
      });

      mockConfigManager.validateCredentials.mockResolvedValue({
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
        missingPermissions: ['iam:CreateRole', 's3:CreateBucket']
      });

      const result = await configurator.configureAllServices();

      expect(result.success).toBe(false);
      expect(result.message).toContain('AWS credentials invalid');
      expect(mockInfrastructureManager.setupInfrastructure).not.toHaveBeenCalled();
    });

    it('should handle partial infrastructure setup failures', async () => {
      // Mock successful validation
      mockConfigManager.validateConfig.mockReturnValue({
        valid: true,
        errors: []
      });

      mockConfigManager.validateCredentials.mockResolvedValue({
        valid: true,
        accountId: '123456789012',
        region: 'us-east-1',
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
      });

      // Mock partial infrastructure setup failure
      mockInfrastructureManager.setupInfrastructure.mockResolvedValue({
        success: false,
        components: {
          iam: {
            success: true,
            message: 'IAM roles created successfully',
            details: { rolesCreated: true }
          },
          dynamodb: {
            success: false,
            message: 'DynamoDB setup failed: Access denied',
            details: { error: 'Access denied' }
          },
          s3: {
            success: true,
            message: 'S3 buckets created successfully',
            details: { bucketsCreated: true }
          }
        },
        duration: 3000,
        timestamp: new Date()
      });

      const result = await configurator.configureAllServices();

      expect(result.success).toBe(false);
      expect(result.message).toBe('AWS service configuration completed with errors');
      expect(result.details.iam.success).toBe(true);
      expect(result.details.dynamodb.success).toBe(false);
      expect(result.details.dynamodb.errors).toEqual(['DynamoDB setup failed: Access denied']);
      expect(result.details.s3.success).toBe(true);
    });

    it('should handle infrastructure setup exceptions', async () => {
      // Mock successful validation
      mockConfigManager.validateConfig.mockReturnValue({
        valid: true,
        errors: []
      });

      mockConfigManager.validateCredentials.mockResolvedValue({
        valid: true,
        accountId: '123456789012',
        region: 'us-east-1',
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
      });

      // Mock infrastructure setup exception
      mockInfrastructureManager.setupInfrastructure.mockRejectedValue(
        new Error('Network connection failed')
      );

      const result = await configurator.configureAllServices();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network connection failed');
    });
  });

  describe('validateServiceConfiguration', () => {
    it('should successfully validate all service configurations', async () => {
      // Mock successful infrastructure validation
      mockInfrastructureManager.validateInfrastructure.mockResolvedValue({
        valid: true,
        iam: {
          valid: true,
          roles: [
            { roleName: 'PrivacyComplyLambdaExecutionRole', exists: true, policies: ['policy1'] },
            { roleName: 'PrivacyComplyAgentRole', exists: true, policies: ['policy2'] },
            { roleName: 'PrivacyComplyBedrockAccessRole', exists: true, policies: ['policy3'] }
          ]
        },
        dynamodb: {
          valid: true,
          tables: [
            { tableName: 'privacy-comply-findings', exists: true, encrypted: true, backupEnabled: true, pointInTimeRecovery: true, status: 'ACTIVE' },
            { tableName: 'privacy-comply-assessments', exists: true, encrypted: true, backupEnabled: true, pointInTimeRecovery: true, status: 'ACTIVE' }
          ]
        },
        s3: {
          valid: true,
          buckets: [
            { bucketName: 'privacy-comply-reports', exists: true, encrypted: true, publicAccess: false, versioning: true, logging: true },
            { bucketName: 'privacy-comply-data-lake', exists: true, encrypted: true, publicAccess: false, versioning: true, logging: true }
          ]
        }
      });

      const result = await configurator.validateServiceConfiguration();

      expect(result.valid).toBe(true);
      expect(result.services.iam.valid).toBe(true);
      expect(result.services.dynamodb.valid).toBe(true);
      expect(result.services.s3.valid).toBe(true);
      expect(result.services.iam.issues).toHaveLength(0);
      expect(result.services.dynamodb.issues).toHaveLength(0);
      expect(result.services.s3.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('should detect IAM configuration issues', async () => {
      // Mock IAM validation failure
      mockInfrastructureManager.validateInfrastructure.mockResolvedValue({
        valid: false,
        iam: {
          valid: false,
          roles: [
            { roleName: 'PrivacyComplyLambdaExecutionRole', exists: false, policies: [] },
            { roleName: 'PrivacyComplyAgentRole', exists: true, policies: ['policy2'] },
            { roleName: 'PrivacyComplyBedrockAccessRole', exists: false, policies: [] }
          ]
        },
        dynamodb: {
          valid: true,
          tables: []
        },
        s3: {
          valid: true,
          buckets: []
        }
      });

      const result = await configurator.validateServiceConfiguration();

      expect(result.valid).toBe(false);
      expect(result.services.iam.valid).toBe(false);
      expect(result.services.iam.issues).toContain('Missing IAM roles: PrivacyComplyLambdaExecutionRole, PrivacyComplyBedrockAccessRole');
      expect(result.recommendations).toContain('Run configureAllServices() to fix configuration issues');
      expect(result.recommendations).toContain('Verify IAM permissions for role creation and policy attachment');
    });

    it('should detect DynamoDB configuration issues', async () => {
      // Mock DynamoDB validation failure
      mockInfrastructureManager.validateInfrastructure.mockResolvedValue({
        valid: false,
        iam: {
          valid: true,
          roles: []
        },
        dynamodb: {
          valid: false,
          tables: [
            { tableName: 'privacy-comply-findings', exists: true, encrypted: false, backupEnabled: true, pointInTimeRecovery: true, status: 'ACTIVE' },
            { tableName: 'privacy-comply-assessments', exists: false, encrypted: false, backupEnabled: false, pointInTimeRecovery: false, status: 'NOT_FOUND' }
          ]
        },
        s3: {
          valid: true,
          buckets: []
        }
      });

      const result = await configurator.validateServiceConfiguration();

      expect(result.valid).toBe(false);
      expect(result.services.dynamodb.valid).toBe(false);
      expect(result.services.dynamodb.issues).toContain('privacy-comply-findings: not encrypted');
      expect(result.services.dynamodb.issues).toContain('privacy-comply-assessments: does not exist, not encrypted, status: NOT_FOUND');
      expect(result.recommendations).toContain('Check DynamoDB permissions and table configuration');
    });

    it('should detect S3 configuration issues', async () => {
      // Mock S3 validation failure
      mockInfrastructureManager.validateInfrastructure.mockResolvedValue({
        valid: false,
        iam: {
          valid: true,
          roles: []
        },
        dynamodb: {
          valid: true,
          tables: []
        },
        s3: {
          valid: false,
          buckets: [
            { bucketName: 'privacy-comply-reports', exists: true, encrypted: false, publicAccess: true, versioning: true, logging: true },
            { bucketName: 'privacy-comply-data-lake', exists: false, encrypted: false, publicAccess: false, versioning: false, logging: false }
          ]
        }
      });

      const result = await configurator.validateServiceConfiguration();

      expect(result.valid).toBe(false);
      expect(result.services.s3.valid).toBe(false);
      expect(result.services.s3.issues).toContain('privacy-comply-reports: not encrypted, has public access');
      expect(result.services.s3.issues).toContain('privacy-comply-data-lake: does not exist, not encrypted');
      expect(result.recommendations).toContain('Verify S3 permissions and bucket security settings');
    });
  });

  describe('getServiceStatus', () => {
    it('should return comprehensive service status', async () => {
      const mockStatus = {
        overall: 'healthy' as const,
        components: {
          iam: 'healthy' as const,
          dynamodb: 'healthy' as const,
          s3: 'healthy' as const
        },
        details: {
          valid: true,
          iam: { valid: true, roles: [] },
          dynamodb: { valid: true, tables: [] },
          s3: { valid: true, buckets: [] }
        }
      };

      mockInfrastructureManager.getInfrastructureStatus.mockResolvedValue(mockStatus);

      const result = await configurator.getServiceStatus();

      expect(result.overall).toBe('healthy');
      expect(result.services.iam).toBe('healthy');
      expect(result.services.dynamodb).toBe('healthy');
      expect(result.services.s3).toBe('healthy');
      expect(result.details).toEqual(mockStatus.details);
      expect(result.lastChecked).toBeInstanceOf(Date);
    });

    it('should handle degraded service status', async () => {
      const mockStatus = {
        overall: 'degraded' as const,
        components: {
          iam: 'healthy' as const,
          dynamodb: 'unhealthy' as const,
          s3: 'healthy' as const
        },
        details: {
          valid: false,
          iam: { valid: true, roles: [] },
          dynamodb: { valid: false, tables: [] },
          s3: { valid: true, buckets: [] }
        }
      };

      mockInfrastructureManager.getInfrastructureStatus.mockResolvedValue(mockStatus);

      const result = await configurator.getServiceStatus();

      expect(result.overall).toBe('degraded');
      expect(result.services.dynamodb).toBe('unhealthy');
    });
  });

  describe('testServiceConnectivity', () => {
    it('should successfully test connectivity to all services', async () => {
      mockInfrastructureManager.testInfrastructureConnectivity.mockResolvedValue({
        success: true,
        services: {
          iam: true,
          dynamodb: true,
          s3: true,
          securityhub: true,
          macie: true,
          bedrock: true
        },
        permissions: {
          iamPermissions: true,
          dynamodbPermissions: true,
          s3Permissions: true,
          securityhubPermissions: true,
          maciePermissions: true,
          bedrockPermissions: true
        }
      });

      const result = await configurator.testServiceConnectivity();

      expect(result.success).toBe(true);
      expect(result.message).toBe('All services are reachable');
      expect(Object.values(result.services).every(Boolean)).toBe(true);
    });

    it('should handle partial connectivity failures', async () => {
      mockInfrastructureManager.testInfrastructureConnectivity.mockResolvedValue({
        success: false,
        services: {
          iam: true,
          dynamodb: false,
          s3: true,
          securityhub: false,
          macie: true,
          bedrock: false
        },
        permissions: {
          iamPermissions: true,
          dynamodbPermissions: false,
          s3Permissions: true,
          securityhubPermissions: false,
          maciePermissions: true,
          bedrockPermissions: false
        }
      });

      const result = await configurator.testServiceConnectivity();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Some services are unreachable');
      expect(result.services.dynamodb).toBe(false);
      expect(result.services.securityhub).toBe(false);
      expect(result.services.bedrock).toBe(false);
    });

    it('should handle connectivity test exceptions', async () => {
      mockInfrastructureManager.testInfrastructureConnectivity.mockRejectedValue(
        new Error('Network timeout')
      );

      const result = await configurator.testServiceConnectivity();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Network timeout');
      expect(Object.values(result.services).every(service => !service)).toBe(true);
    });
  });

  describe('generateConfigurationReport', () => {
    it('should generate comprehensive configuration report', async () => {
      // Mock validation result
      mockInfrastructureManager.validateInfrastructure.mockResolvedValue({
        valid: true,
        iam: { valid: true, roles: [] },
        dynamodb: { valid: true, tables: [] },
        s3: { valid: true, buckets: [] }
      });

      // Mock connectivity result
      mockInfrastructureManager.testInfrastructureConnectivity.mockResolvedValue({
        success: true,
        services: {
          iam: true,
          dynamodb: true,
          s3: true,
          securityhub: true,
          macie: true,
          bedrock: true
        },
        permissions: {
          iamPermissions: true,
          dynamodbPermissions: true,
          s3Permissions: true,
          securityhubPermissions: true,
          maciePermissions: true,
          bedrockPermissions: true
        }
      });

      const report = await configurator.generateConfigurationReport();

      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.configuration.success).toBe(true);
      expect(report.validation.valid).toBe(true);
      expect(report.connectivity.success).toBe(true);
      expect(report.recommendations).toContain('Regularly validate service configurations');
      expect(report.recommendations).toContain('Monitor service health and performance');
    });

    it('should include issues and recommendations in report', async () => {
      // Mock validation with issues
      mockInfrastructureManager.validateInfrastructure.mockResolvedValue({
        valid: false,
        iam: { valid: false, roles: [] },
        dynamodb: { valid: true, tables: [] },
        s3: { valid: true, buckets: [] }
      });

      // Mock connectivity failure
      mockInfrastructureManager.testInfrastructureConnectivity.mockResolvedValue({
        success: false,
        services: {
          iam: false,
          dynamodb: true,
          s3: true,
          securityhub: true,
          macie: true,
          bedrock: true
        },
        permissions: {
          iamPermissions: false,
          dynamodbPermissions: true,
          s3Permissions: true,
          securityhubPermissions: true,
          maciePermissions: true,
          bedrockPermissions: true
        }
      });

      const report = await configurator.generateConfigurationReport();

      expect(report.configuration.success).toBe(false);
      expect(report.validation.valid).toBe(false);
      expect(report.connectivity.success).toBe(false);
      expect(report.recommendations).toContain('Run configureAllServices() to fix configuration issues');
      expect(report.recommendations).toContain('Check network connectivity to AWS services');
    });
  });

  describe('Utility Functions', () => {
    describe('setupAWSServiceConfigurations', () => {
      it('should call configurator.configureAllServices', async () => {
        // Mock successful configuration validation
        mockConfigManager.validateConfig.mockReturnValue({
          valid: true,
          errors: []
        });

        mockConfigManager.validateCredentials.mockResolvedValue({
          valid: true,
          accountId: '123456789012',
          region: 'us-east-1',
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
        });

        // Mock successful infrastructure setup
        mockInfrastructureManager.setupInfrastructure.mockResolvedValue({
          success: true,
          components: {
            iam: {
              success: true,
              message: 'IAM roles created successfully',
              details: { rolesCreated: true }
            },
            dynamodb: {
              success: true,
              message: 'DynamoDB tables created successfully',
              details: { tablesCreated: true }
            },
            s3: {
              success: true,
              message: 'S3 buckets created successfully',
              details: { bucketsCreated: true }
            }
          },
          duration: 5000,
          timestamp: new Date()
        });

        const result = await setupAWSServiceConfigurations();
        expect(result.success).toBe(true);
      });
    });

    describe('validateAWSServiceConfigurations', () => {
      it('should call configurator.validateServiceConfiguration', async () => {
        // Mock successful infrastructure validation
        mockInfrastructureManager.validateInfrastructure.mockResolvedValue({
          valid: true,
          iam: {
            valid: true,
            roles: [
              { roleName: 'PrivacyComplyLambdaExecutionRole', exists: true, policies: ['policy1'] },
              { roleName: 'PrivacyComplyAgentRole', exists: true, policies: ['policy2'] },
              { roleName: 'PrivacyComplyBedrockAccessRole', exists: true, policies: ['policy3'] }
            ]
          },
          dynamodb: {
            valid: true,
            tables: [
              { tableName: 'privacy-comply-findings', exists: true, encrypted: true, backupEnabled: true, pointInTimeRecovery: true, status: 'ACTIVE' },
              { tableName: 'privacy-comply-assessments', exists: true, encrypted: true, backupEnabled: true, pointInTimeRecovery: true, status: 'ACTIVE' }
            ]
          },
          s3: {
            valid: true,
            buckets: [
              { bucketName: 'privacy-comply-reports', exists: true, encrypted: true, publicAccess: false, versioning: true, logging: true },
              { bucketName: 'privacy-comply-data-lake', exists: true, encrypted: true, publicAccess: false, versioning: true, logging: true }
            ]
          }
        });

        const result = await validateAWSServiceConfigurations();
        expect(result.valid).toBe(true);
      });
    });
  });
});