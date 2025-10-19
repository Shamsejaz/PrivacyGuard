/**
 * Unit tests for Lambda functions
 * Tests individual Lambda function logic with mocked AWS services
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handler as s3Handler, rollbackHandler as s3RollbackHandler } from '../s3-access-restriction';
import { handler as encryptionHandler, rollbackHandler as encryptionRollbackHandler } from '../encryption-enablement';
import { handler as iamHandler, rollbackHandler as iamRollbackHandler } from '../iam-policy-adjustment';
import { LambdaEvent } from '../../types';

// Mock AWS SDK clients
const mockS3Send = vi.fn();
const mockIAMSend = vi.fn();
const mockRDSSend = vi.fn();
const mockEBSSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: mockS3Send })),
  PutPublicAccessBlockCommand: vi.fn(),
  GetPublicAccessBlockCommand: vi.fn(),
  GetBucketPolicyCommand: vi.fn(),
  DeleteBucketPolicyCommand: vi.fn(),
  PutBucketEncryptionCommand: vi.fn(),
  GetBucketEncryptionCommand: vi.fn(),
  DeleteBucketEncryptionCommand: vi.fn(),
  PutBucketPolicyCommand: vi.fn(),
  ServerSideEncryption: {
    AES256: 'AES256',
    aws_kms: 'aws:kms'
  }
}));

vi.mock('@aws-sdk/client-iam', () => ({
  IAMClient: vi.fn(() => ({ send: mockIAMSend })),
  GetRolePolicyCommand: vi.fn(),
  PutRolePolicyCommand: vi.fn(),
  DeleteRolePolicyCommand: vi.fn(),
  GetUserPolicyCommand: vi.fn(),
  PutUserPolicyCommand: vi.fn(),
  DeleteUserPolicyCommand: vi.fn(),
  ListAttachedRolePoliciesCommand: vi.fn(),
  ListAttachedUserPoliciesCommand: vi.fn(),
  DetachRolePolicyCommand: vi.fn(),
  DetachUserPolicyCommand: vi.fn(),
  AttachRolePolicyCommand: vi.fn(),
  AttachUserPolicyCommand: vi.fn()
}));

vi.mock('@aws-sdk/client-rds', () => ({
  RDSClient: vi.fn(() => ({ send: mockRDSSend })),
  ModifyDBInstanceCommand: vi.fn(),
  DescribeDBInstancesCommand: vi.fn()
}));

vi.mock('@aws-sdk/client-ebs', () => ({
  EBSClient: vi.fn(() => ({ send: mockEBSSend }))
}));

describe('Lambda Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('S3 Access Restriction Lambda', () => {
    it('should successfully restrict S3 bucket access', async () => {
      // Mock S3 responses
      mockS3Send
        .mockResolvedValueOnce({ PublicAccessBlockConfiguration: null }) // GetPublicAccessBlockCommand
        .mockResolvedValueOnce({ Policy: null }) // GetBucketPolicyCommand
        .mockResolvedValueOnce({}); // PutPublicAccessBlockCommand

      const event: LambdaEvent = {
        parameters: {
          bucketName: 'test-bucket',
          restrictPublicRead: true,
          restrictPublicWrite: true,
          blockPublicAcls: true,
          ignorePublicAcls: true,
          blockPublicPolicy: true,
          restrictPublicBuckets: true
        }
      };

      const result = await s3Handler(event);

      expect(result.success).toBe(true);
      expect(result.bucketName).toBe('test-bucket');
      expect(result.actionsPerformed).toContain('Applied public access block configuration');
      expect(result.rollbackData).toBeDefined();
      expect(mockS3Send).toHaveBeenCalledTimes(3); // Get access block, get policy, put access block
    });

    it('should handle S3 errors gracefully', async () => {
      mockS3Send.mockRejectedValue(new Error('Access denied'));

      const event: LambdaEvent = {
        parameters: {
          bucketName: 'test-bucket-error'
        }
      };

      const result = await s3Handler(event);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Access denied');
      expect(result.bucketName).toBe('test-bucket-error');
    });

    it('should remove public bucket policy when restricting access', async () => {
      const publicPolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::test-bucket/*'
        }]
      });

      mockS3Send
        .mockResolvedValueOnce({ PublicAccessBlockConfiguration: null })
        .mockResolvedValueOnce({ Policy: publicPolicy })
        .mockResolvedValueOnce({}) // PutPublicAccessBlockCommand
        .mockResolvedValueOnce({}); // DeleteBucketPolicyCommand

      const event: LambdaEvent = {
        parameters: {
          bucketName: 'test-bucket-with-policy',
          restrictPublicRead: true,
          restrictPublicWrite: true
        }
      };

      const result = await s3Handler(event);

      expect(result.success).toBe(true);
      expect(result.actionsPerformed).toContain('Removed public bucket policy');
      expect(mockS3Send).toHaveBeenCalledTimes(4);
    });

    it('should successfully rollback S3 access restrictions', async () => {
      const rollbackData = {
        previousPublicAccessBlock: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false
        },
        previousBucketPolicy: JSON.stringify({
          Version: '2012-10-17',
          Statement: []
        })
      };

      mockS3Send
        .mockResolvedValueOnce({}) // PutPublicAccessBlockCommand
        .mockResolvedValueOnce({}); // PutBucketPolicyCommand

      const event: LambdaEvent = {
        parameters: {
          bucketName: 'test-rollback-bucket',
          rollbackData
        }
      };

      const result = await s3RollbackHandler(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('rolled back');
      expect(result.actionsPerformed).toContain('Restored previous public access block configuration');
      expect(result.actionsPerformed).toContain('Restored previous bucket policy');
    });
  });

  describe('Encryption Enablement Lambda', () => {
    it('should successfully enable S3 bucket encryption', async () => {
      mockS3Send
        .mockResolvedValueOnce({ ServerSideEncryptionConfiguration: null }) // GetBucketEncryptionCommand
        .mockResolvedValueOnce({}); // PutBucketEncryptionCommand

      const event: LambdaEvent = {
        parameters: {
          resourceType: 'S3',
          resourceIdentifier: 'test-encryption-bucket',
          encryptionType: 'aws:kms',
          kmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
        }
      };

      const result = await encryptionHandler(event);

      expect(result.success).toBe(true);
      expect(result.resourceType).toBe('S3');
      expect(result.resourceIdentifier).toBe('test-encryption-bucket');
      expect(result.encryptionEnabled).toBe(true);
      expect(result.encryptionType).toBe('aws:kms');
      expect(result.rollbackData).toBeDefined();
      expect(mockS3Send).toHaveBeenCalledTimes(2);
    });

    it('should handle already encrypted S3 buckets', async () => {
      const existingEncryption = {
        Rules: [{
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          }
        }]
      };

      mockS3Send
        .mockResolvedValueOnce({ ServerSideEncryptionConfiguration: existingEncryption })
        .mockResolvedValueOnce({});

      const event: LambdaEvent = {
        parameters: {
          resourceType: 'S3',
          resourceIdentifier: 'already-encrypted-bucket',
          encryptionType: 'aws:kms'
        }
      };

      const result = await encryptionHandler(event);

      expect(result.success).toBe(true);
      expect(result.rollbackData?.previousEncryptionConfig).toEqual(existingEncryption);
    });

    it('should handle RDS encryption limitations', async () => {
      mockRDSSend.mockResolvedValue({
        DBInstances: [{
          DBInstanceIdentifier: 'test-db',
          StorageEncrypted: false
        }]
      });

      const event: LambdaEvent = {
        parameters: {
          resourceType: 'RDS',
          resourceIdentifier: 'test-db'
        }
      };

      const result = await encryptionHandler(event);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Manual intervention required');
      expect(result.encryptionEnabled).toBe(false);
    });

    it('should handle already encrypted RDS instances', async () => {
      mockRDSSend.mockResolvedValue({
        DBInstances: [{
          DBInstanceIdentifier: 'encrypted-db',
          StorageEncrypted: true,
          KmsKeyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
        }]
      });

      const event: LambdaEvent = {
        parameters: {
          resourceType: 'RDS',
          resourceIdentifier: 'encrypted-db'
        }
      };

      const result = await encryptionHandler(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('already encrypted');
      expect(result.encryptionEnabled).toBe(true);
    });

    it('should successfully rollback S3 encryption', async () => {
      const rollbackData = {
        previousEncryptionConfig: {
          Rules: [{
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256'
            }
          }]
        }
      };

      mockS3Send.mockResolvedValueOnce({});

      const event: LambdaEvent = {
        parameters: {
          resourceType: 'S3',
          resourceIdentifier: 'test-rollback-encryption-bucket',
          rollbackData
        }
      };

      const result = await encryptionRollbackHandler(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('rolled back');
      expect(result.encryptionEnabled).toBe(true);
    });
  });

  describe('IAM Policy Adjustment Lambda', () => {
    it('should successfully remove overprivileged access from role', async () => {
      mockIAMSend
        .mockResolvedValueOnce({ AttachedPolicies: [] }) // ListAttachedRolePoliciesCommand
        .mockResolvedValueOnce({}); // PutRolePolicyCommand

      const event: LambdaEvent = {
        parameters: {
          principalType: 'role',
          principalName: 'test-role',
          adjustmentType: 'REMOVE_OVERPRIVILEGED',
          targetActions: ['s3:*'],
          targetResources: ['*']
        }
      };

      const result = await iamHandler(event);

      expect(result.success).toBe(true);
      expect(result.principalType).toBe('role');
      expect(result.principalName).toBe('test-role');
      expect(result.adjustmentType).toBe('REMOVE_OVERPRIVILEGED');
      expect(result.actionsPerformed).toContain('Added restrictive policy to deny overprivileged actions');
      expect(result.rollbackData).toBeDefined();
      expect(mockIAMSend).toHaveBeenCalledTimes(2);
    });

    it('should successfully add restrictions to user', async () => {
      mockIAMSend
        .mockResolvedValueOnce({ AttachedPolicies: [] }) // ListAttachedUserPoliciesCommand
        .mockResolvedValueOnce({}); // PutUserPolicyCommand

      const event: LambdaEvent = {
        parameters: {
          principalType: 'user',
          principalName: 'test-user',
          adjustmentType: 'ADD_RESTRICTIONS',
          targetActions: ['s3:DeleteObject'],
          targetResources: ['arn:aws:s3:::sensitive-bucket/*'],
          policyName: 'TestRestriction'
        }
      };

      const result = await iamHandler(event);

      expect(result.success).toBe(true);
      expect(result.principalType).toBe('user');
      expect(result.actionsPerformed).toContain('Added restriction policy TestRestriction');
    });

    it('should successfully apply least privilege principle', async () => {
      mockIAMSend
        .mockResolvedValueOnce({ AttachedPolicies: [] })
        .mockResolvedValueOnce({});

      const event: LambdaEvent = {
        parameters: {
          principalType: 'role',
          principalName: 'test-role',
          adjustmentType: 'APPLY_LEAST_PRIVILEGE',
          allowedActions: ['s3:GetObject'],
          allowedResources: ['arn:aws:s3:::allowed-bucket/*'],
          policyName: 'LeastPrivilegePolicy'
        }
      };

      const result = await iamHandler(event);

      expect(result.success).toBe(true);
      expect(result.actionsPerformed).toContain('Applied least privilege policy LeastPrivilegePolicy');
    });

    it('should handle IAM errors gracefully', async () => {
      mockIAMSend.mockRejectedValue(new Error('Insufficient permissions'));

      const event: LambdaEvent = {
        parameters: {
          principalType: 'role',
          principalName: 'test-role',
          adjustmentType: 'REMOVE_OVERPRIVILEGED'
        }
      };

      const result = await iamHandler(event);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient permissions');
    });

    it('should successfully rollback IAM policy changes', async () => {
      const rollbackData = {
        attachedPolicies: [{
          PolicyName: 'TestPolicy',
          PolicyArn: 'arn:aws:iam::123456789012:policy/TestPolicy'
        }]
      };

      mockIAMSend
        .mockResolvedValueOnce({}) // DeleteRolePolicyCommand
        .mockResolvedValueOnce({}) // DeleteRolePolicyCommand
        .mockResolvedValueOnce({}); // AttachRolePolicyCommand

      const event: LambdaEvent = {
        parameters: {
          principalType: 'role',
          principalName: 'test-role',
          rollbackData
        }
      };

      const result = await iamRollbackHandler(event);

      expect(result.success).toBe(true);
      expect(result.message).toContain('rolled back');
      expect(result.actionsPerformed).toContain('Restored attached policy TestPolicy');
    });

    it('should handle unsupported adjustment types', async () => {
      const event: LambdaEvent = {
        parameters: {
          principalType: 'role',
          principalName: 'test-role',
          adjustmentType: 'UNSUPPORTED_TYPE'
        }
      };

      const result = await iamHandler(event);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unsupported adjustment type');
    });
  });

  describe('Lambda Function Registry Integration', () => {
    it('should validate function parameters correctly', async () => {
      const { getLambdaRegistry } = await import('../lambda-registry');
      const registry = getLambdaRegistry();

      // Test valid parameters
      const validParams = {
        bucketName: 'test-bucket',
        restrictPublicRead: true
      };

      const validValidation = registry.validateParameters('privacy-comply-s3-access-restriction', validParams);
      expect(validValidation.valid).toBe(true);
      expect(validValidation.missingRequired).toHaveLength(0);

      // Test missing required parameters
      const invalidParams = {
        restrictPublicRead: true
        // Missing bucketName
      };

      const invalidValidation = registry.validateParameters('privacy-comply-s3-access-restriction', invalidParams);
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.missingRequired).toContain('bucketName');
    });

    it('should get functions by action', async () => {
      const { getLambdaRegistry } = await import('../lambda-registry');
      const registry = getLambdaRegistry();

      const restrictAccessFunctions = registry.getFunctionsByAction('RESTRICT_ACCESS');
      expect(restrictAccessFunctions.length).toBeGreaterThan(0);
      expect(restrictAccessFunctions[0].metadata.functionName).toBe('privacy-comply-s3-access-restriction');

      const encryptionFunctions = registry.getFunctionsByAction('ENABLE_ENCRYPTION');
      expect(encryptionFunctions.length).toBeGreaterThan(0);
      expect(encryptionFunctions[0].metadata.functionName).toBe('privacy-comply-encryption-enablement');
    });

    it('should get functions by risk level', async () => {
      const { getLambdaRegistry } = await import('../lambda-registry');
      const registry = getLambdaRegistry();

      const highRiskFunctions = registry.getFunctionsByRiskLevel('HIGH');
      expect(highRiskFunctions.length).toBeGreaterThan(0);
      expect(highRiskFunctions[0].metadata.functionName).toBe('privacy-comply-iam-policy-adjustment');

      const mediumRiskFunctions = registry.getFunctionsByRiskLevel('MEDIUM');
      expect(mediumRiskFunctions.length).toBeGreaterThan(0);
      expect(mediumRiskFunctions[0].metadata.functionName).toBe('privacy-comply-s3-access-restriction');
    });
  });
});