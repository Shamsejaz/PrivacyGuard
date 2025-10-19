/**
 * S3 Bucket Manager
 * Manages S3 buckets for Privacy Comply Agent
 */

import {
  S3Client,
  CreateBucketCommand,
  PutBucketEncryptionCommand,
  PutPublicAccessBlockCommand,
  PutBucketVersioningCommand,
  HeadBucketCommand,
  GetBucketEncryptionCommand,
  GetPublicAccessBlockCommand,
  GetBucketVersioningCommand
} from '@aws-sdk/client-s3';
import { AWSConfigManager } from '../config/aws-config';

export interface S3BucketConfig {
  bucketName: string;
  encryption: {
    enabled: boolean;
    kmsKeyId?: string;
  };
  versioning: boolean;
  publicAccess: boolean;
  logging: {
    enabled: boolean;
    targetBucket?: string;
    targetPrefix?: string;
  };
}

/**
 * S3 Bucket Manager
 */
export class S3BucketManager {
  private s3Client: S3Client;
  private configManager: AWSConfigManager;

  constructor() {
    this.configManager = AWSConfigManager.getInstance();
    const awsConfig = this.configManager.getServiceCredentials('s3');
    this.s3Client = new S3Client(awsConfig);
  }

  /**
   * Create all required S3 buckets
   */
  public async createAllBuckets(): Promise<void> {
    const buckets = this.getRequiredBuckets();
    
    for (const bucketConfig of buckets) {
      await this.createBucket(bucketConfig);
    }
  }

  /**
   * Create a single S3 bucket with security configurations
   */
  private async createBucket(config: S3BucketConfig): Promise<void> {
    try {
      // Check if bucket already exists
      try {
        await this.s3Client.send(new HeadBucketCommand({ Bucket: config.bucketName }));
        console.log(`Bucket already exists: ${config.bucketName}`);
        return;
      } catch (error) {
        // Bucket doesn't exist, continue with creation
      }

      // Create the bucket
      await this.s3Client.send(new CreateBucketCommand({
        Bucket: config.bucketName
      }));

      // Configure encryption
      if (config.encryption.enabled) {
        await this.s3Client.send(new PutBucketEncryptionCommand({
          Bucket: config.bucketName,
          ServerSideEncryptionConfiguration: {
            Rules: [
              {
                ApplyServerSideEncryptionByDefault: {
                  SSEAlgorithm: config.encryption.kmsKeyId ? 'aws:kms' : 'AES256',
                  KMSMasterKeyID: config.encryption.kmsKeyId
                }
              }
            ]
          }
        }));
      }

      // Configure public access block
      await this.s3Client.send(new PutPublicAccessBlockCommand({
        Bucket: config.bucketName,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: !config.publicAccess,
          IgnorePublicAcls: !config.publicAccess,
          BlockPublicPolicy: !config.publicAccess,
          RestrictPublicBuckets: !config.publicAccess
        }
      }));

      // Configure versioning
      if (config.versioning) {
        await this.s3Client.send(new PutBucketVersioningCommand({
          Bucket: config.bucketName,
          VersioningConfiguration: {
            Status: 'Enabled'
          }
        }));
      }

      console.log(`Created S3 bucket: ${config.bucketName}`);

    } catch (error) {
      console.error(`Error creating S3 bucket ${config.bucketName}:`, error);
      throw error;
    }
  }

  /**
   * Get required S3 buckets configuration
   */
  private getRequiredBuckets(): S3BucketConfig[] {
    const serviceConfig = this.configManager.getServiceConfig();
    
    return [
      {
        bucketName: serviceConfig.s3.reportsBucket,
        encryption: {
          enabled: true,
          kmsKeyId: undefined // Use default S3 encryption
        },
        versioning: true,
        publicAccess: false,
        logging: {
          enabled: true,
          targetBucket: `${serviceConfig.s3.reportsBucket}-access-logs`,
          targetPrefix: 'access-logs/'
        }
      },
      {
        bucketName: 'privacy-comply-data-lake',
        encryption: {
          enabled: true,
          kmsKeyId: undefined
        },
        versioning: true,
        publicAccess: false,
        logging: {
          enabled: true,
          targetBucket: 'privacy-comply-data-lake-access-logs',
          targetPrefix: 'access-logs/'
        }
      }
    ];
  }

  /**
   * Validate S3 buckets configuration
   */
  public async validateBuckets(): Promise<{
    valid: boolean;
    buckets: Array<{
      bucketName: string;
      exists: boolean;
      encrypted: boolean;
      publicAccess: boolean;
      versioning: boolean;
      logging: boolean;
    }>;
  }> {
    const requiredBuckets = this.getRequiredBuckets();
    const bucketValidations = [];

    for (const bucketConfig of requiredBuckets) {
      try {
        // Check if bucket exists
        await this.s3Client.send(new HeadBucketCommand({ Bucket: bucketConfig.bucketName }));
        
        // Check encryption
        let encrypted = false;
        try {
          await this.s3Client.send(new GetBucketEncryptionCommand({ Bucket: bucketConfig.bucketName }));
          encrypted = true;
        } catch (error) {
          // Encryption not configured
        }

        // Check public access
        let publicAccess = true;
        try {
          const publicAccessBlock = await this.s3Client.send(new GetPublicAccessBlockCommand({ 
            Bucket: bucketConfig.bucketName 
          }));
          publicAccess = !(publicAccessBlock.PublicAccessBlockConfiguration?.BlockPublicAcls);
        } catch (error) {
          // Public access block not configured
        }

        // Check versioning
        let versioning = false;
        try {
          const versioningConfig = await this.s3Client.send(new GetBucketVersioningCommand({ 
            Bucket: bucketConfig.bucketName 
          }));
          versioning = versioningConfig.Status === 'Enabled';
        } catch (error) {
          // Versioning not configured
        }

        bucketValidations.push({
          bucketName: bucketConfig.bucketName,
          exists: true,
          encrypted,
          publicAccess,
          versioning,
          logging: bucketConfig.logging.enabled
        });

      } catch (error) {
        bucketValidations.push({
          bucketName: bucketConfig.bucketName,
          exists: false,
          encrypted: false,
          publicAccess: true,
          versioning: false,
          logging: false
        });
      }
    }

    return {
      valid: bucketValidations.every(b => b.exists && b.encrypted && !b.publicAccess),
      buckets: bucketValidations
    };
  }
}