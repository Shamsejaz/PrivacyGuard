/**
 * Encryption Enablement Lambda Function
 * Automatically enables encryption for AWS resources containing sensitive data
 */

import { 
  S3Client, 
  PutBucketEncryptionCommand, 
  GetBucketEncryptionCommand,
  DeleteBucketEncryptionCommand,
  ServerSideEncryption
} from '@aws-sdk/client-s3';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { LambdaHandler } from '../types';

interface EncryptionEnablementParams {
  resourceType: 'S3' | 'RDS' | 'EBS';
  resourceIdentifier: string;
  encryptionType?: 'AES256' | 'aws:kms';
  kmsKeyId?: string;
  applyImmediately?: boolean;
}

interface EncryptionEnablementResult {
  success: boolean;
  message: string;
  resourceType: string;
  resourceIdentifier: string;
  encryptionEnabled: boolean;
  encryptionType?: string;
  kmsKeyId?: string;
  rollbackData?: {
    previousEncryptionConfig?: any;
    requiresRestart?: boolean;
  };
}

/**
 * Lambda handler for enabling encryption on AWS resources
 */
export const handler: LambdaHandler<EncryptionEnablementParams, EncryptionEnablementResult> = async (event) => {
  const { resourceType, resourceIdentifier, encryptionType = 'aws:kms', kmsKeyId, applyImmediately = false } = event.parameters;
  
  try {
    switch (resourceType) {
      case 'S3':
        return await enableS3Encryption(resourceIdentifier, encryptionType, kmsKeyId);
      case 'RDS':
        return await enableRDSEncryption(resourceIdentifier, kmsKeyId, applyImmediately);
      case 'EBS':
        return await enableEBSEncryption(resourceIdentifier, kmsKeyId);
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  } catch (error) {
    console.error('Error enabling encryption:', error);
    return {
      success: false,
      message: `Failed to enable encryption for ${resourceType} resource ${resourceIdentifier}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resourceType,
      resourceIdentifier,
      encryptionEnabled: false
    };
  }
};

/**
 * Enable S3 bucket encryption
 */
async function enableS3Encryption(bucketName: string, encryptionType: string, kmsKeyId?: string): Promise<EncryptionEnablementResult> {
  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  
  // Get current encryption configuration for rollback
  let previousEncryptionConfig = null;
  try {
    const currentConfig = await s3Client.send(new GetBucketEncryptionCommand({ Bucket: bucketName }));
    previousEncryptionConfig = currentConfig.ServerSideEncryptionConfiguration;
  } catch (error) {
    // No existing encryption configuration
    previousEncryptionConfig = null;
  }

  // Configure server-side encryption
  const encryptionConfig = {
    Rules: [
      {
        ApplyServerSideEncryptionByDefault: {
          SSEAlgorithm: encryptionType === 'AES256' ? ServerSideEncryption.AES256 : ServerSideEncryption.aws_kms,
          ...(encryptionType === 'aws:kms' && kmsKeyId && { KMSMasterKeyID: kmsKeyId })
        },
        BucketKeyEnabled: encryptionType === 'aws:kms'
      }
    ]
  };

  await s3Client.send(new PutBucketEncryptionCommand({
    Bucket: bucketName,
    ServerSideEncryptionConfiguration: encryptionConfig
  }));

  return {
    success: true,
    message: `Successfully enabled ${encryptionType} encryption for S3 bucket ${bucketName}`,
    resourceType: 'S3',
    resourceIdentifier: bucketName,
    encryptionEnabled: true,
    encryptionType,
    kmsKeyId,
    rollbackData: {
      previousEncryptionConfig: previousEncryptionConfig
    }
  };
}

/**
 * Enable RDS instance encryption
 * Note: RDS encryption can only be enabled during creation or by creating an encrypted copy
 */
async function enableRDSEncryption(dbInstanceIdentifier: string, _kmsKeyId?: string, _applyImmediately: boolean = false): Promise<EncryptionEnablementResult> {
  const rdsClient = new RDSClient({ region: process.env.AWS_REGION || 'us-east-1' });
  
  // Get current DB instance details
  const describeResponse = await rdsClient.send(new DescribeDBInstancesCommand({
    DBInstanceIdentifier: dbInstanceIdentifier
  }));

  const dbInstance = describeResponse.DBInstances?.[0];
  if (!dbInstance) {
    throw new Error(`DB instance ${dbInstanceIdentifier} not found`);
  }

  // Check if already encrypted
  if (dbInstance.StorageEncrypted) {
    return {
      success: true,
      message: `RDS instance ${dbInstanceIdentifier} is already encrypted`,
      resourceType: 'RDS',
      resourceIdentifier: dbInstanceIdentifier,
      encryptionEnabled: true,
      kmsKeyId: dbInstance.KmsKeyId
    };
  }

  // For existing unencrypted RDS instances, we need to create an encrypted snapshot and restore
  // This is a complex operation that requires downtime, so we'll return a message indicating manual intervention needed
  return {
    success: false,
    message: `RDS instance ${dbInstanceIdentifier} cannot be encrypted in-place. Manual intervention required: create encrypted snapshot and restore.`,
    resourceType: 'RDS',
    resourceIdentifier: dbInstanceIdentifier,
    encryptionEnabled: false,
    rollbackData: {
      requiresRestart: true
    }
  };
}

/**
 * Enable EBS volume encryption
 * Note: EBS volumes cannot be encrypted in-place, requires creating encrypted copy
 */
async function enableEBSEncryption(volumeId: string, _kmsKeyId?: string): Promise<EncryptionEnablementResult> {
  // EBS volumes cannot be encrypted in-place
  // This requires creating an encrypted snapshot and new volume using EC2 APIs
  // The EBS Direct APIs are for snapshot block-level operations, not volume management
  return {
    success: false,
    message: `EBS volume ${volumeId} cannot be encrypted in-place. Manual intervention required: create encrypted snapshot and new volume using EC2 APIs.`,
    resourceType: 'EBS',
    resourceIdentifier: volumeId,
    encryptionEnabled: false,
    rollbackData: {
      requiresRestart: true
    }
  };
}

/**
 * Rollback function to restore previous encryption configuration
 */
export const rollbackHandler: LambdaHandler<{ resourceType: string; resourceIdentifier: string; rollbackData: any }, EncryptionEnablementResult> = async (event) => {
  const { resourceType, resourceIdentifier, rollbackData } = event.parameters;
  
  try {
    if (resourceType === 'S3' && rollbackData.previousEncryptionConfig) {
      const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      
      if (rollbackData.previousEncryptionConfig) {
        await s3Client.send(new PutBucketEncryptionCommand({
          Bucket: resourceIdentifier,
          ServerSideEncryptionConfiguration: rollbackData.previousEncryptionConfig
        }));
      } else {
        // Remove encryption if there was none before
        await s3Client.send(new DeleteBucketEncryptionCommand({ Bucket: resourceIdentifier }));
      }

      return {
        success: true,
        message: `Successfully rolled back encryption configuration for ${resourceType} resource ${resourceIdentifier}`,
        resourceType,
        resourceIdentifier,
        encryptionEnabled: !!rollbackData.previousEncryptionConfig
      };
    }

    // For RDS and EBS, rollback is not possible without manual intervention
    return {
      success: false,
      message: `Rollback not supported for ${resourceType} resources. Manual intervention required.`,
      resourceType,
      resourceIdentifier,
      encryptionEnabled: false
    };

  } catch (error) {
    console.error('Error rolling back encryption configuration:', error);
    return {
      success: false,
      message: `Failed to rollback encryption configuration for ${resourceType} resource ${resourceIdentifier}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      resourceType,
      resourceIdentifier,
      encryptionEnabled: false
    };
  }
};