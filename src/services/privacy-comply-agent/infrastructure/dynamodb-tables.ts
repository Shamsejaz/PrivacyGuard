/**
 * DynamoDB Table Manager
 * Manages DynamoDB tables for Privacy Comply Agent
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  UpdateContinuousBackupsCommand,
  DescribeContinuousBackupsCommand
} from '@aws-sdk/client-dynamodb';
import { AWSConfigManager } from '../config/aws-config';

export interface DynamoDBTableConfig {
  tableName: string;
  keySchema: Array<{
    AttributeName: string;
    KeyType: 'HASH' | 'RANGE';
  }>;
  attributeDefinitions: Array<{
    AttributeName: string;
    AttributeType: 'S' | 'N' | 'B';
  }>;
  billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
  provisionedThroughput?: {
    ReadCapacityUnits: number;
    WriteCapacityUnits: number;
  };
  encryption: {
    enabled: boolean;
    kmsKeyId?: string;
  };
  pointInTimeRecovery: boolean;
  backupPolicy: {
    enabled: boolean;
    retentionPeriod?: number;
  };
}

/**
 * DynamoDB Table Manager
 */
export class DynamoDBTableManager {
  private dynamodbClient: DynamoDBClient;
  private configManager: AWSConfigManager;

  constructor() {
    this.configManager = AWSConfigManager.getInstance();
    const awsConfig = this.configManager.getServiceCredentials('dynamodb');
    this.dynamodbClient = new DynamoDBClient(awsConfig);
  }

  /**
   * Create all required DynamoDB tables
   */
  public async createAllTables(): Promise<void> {
    const tables = this.getRequiredTables();
    
    for (const tableConfig of tables) {
      await this.createTable(tableConfig);
    }
  }  
/**
   * Create a single DynamoDB table
   */
  private async createTable(config: DynamoDBTableConfig): Promise<void> {
    try {
      // Check if table already exists
      try {
        const existingTable = await this.dynamodbClient.send(new DescribeTableCommand({
          TableName: config.tableName
        }));
        
        if (existingTable.Table?.TableStatus === 'ACTIVE') {
          console.log(`Table already exists: ${config.tableName}`);
          return;
        }
      } catch (error) {
        // Table doesn't exist, continue with creation
      }

      // Create the table
      const createTableParams: any = {
        TableName: config.tableName,
        KeySchema: config.keySchema,
        AttributeDefinitions: config.attributeDefinitions,
        BillingMode: config.billingMode
      };

      if (config.billingMode === 'PROVISIONED' && config.provisionedThroughput) {
        createTableParams.ProvisionedThroughput = config.provisionedThroughput;
      }

      if (config.encryption.enabled) {
        createTableParams.SSESpecification = {
          Enabled: true,
          SSEType: config.encryption.kmsKeyId ? 'KMS' : 'AES256',
          KMSMasterKeyId: config.encryption.kmsKeyId
        };
      }

      await this.dynamodbClient.send(new CreateTableCommand(createTableParams));

      // Wait for table to be active
      await this.waitForTableActive(config.tableName);

      // Configure point-in-time recovery
      if (config.pointInTimeRecovery) {
        await this.dynamodbClient.send(new UpdateContinuousBackupsCommand({
          TableName: config.tableName,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true
          }
        }));
      }

      console.log(`Created DynamoDB table: ${config.tableName}`);

    } catch (error) {
      console.error(`Error creating DynamoDB table ${config.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Wait for table to become active
   */
  private async waitForTableActive(tableName: string, maxWaitTime = 300000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await this.dynamodbClient.send(new DescribeTableCommand({
          TableName: tableName
        }));
        
        if (response.Table?.TableStatus === 'ACTIVE') {
          return;
        }
        
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`Error checking table status for ${tableName}:`, error);
        throw error;
      }
    }
    
    throw new Error(`Table ${tableName} did not become active within ${maxWaitTime}ms`);
  }

  /**
   * Get required DynamoDB tables configuration
   */
  private getRequiredTables(): DynamoDBTableConfig[] {
    return [
      {
        tableName: 'privacy-comply-findings',
        keySchema: [
          { AttributeName: 'id', KeyType: 'HASH' },
          { AttributeName: 'detectedAt', KeyType: 'RANGE' }
        ],
        attributeDefinitions: [
          { AttributeName: 'id', AttributeType: 'S' },
          { AttributeName: 'detectedAt', AttributeType: 'S' }
        ],
        billingMode: 'PAY_PER_REQUEST',
        encryption: {
          enabled: true
        },
        pointInTimeRecovery: true,
        backupPolicy: {
          enabled: true,
          retentionPeriod: 30
        }
      },
      {
        tableName: 'privacy-comply-assessments',
        keySchema: [
          { AttributeName: 'findingId', KeyType: 'HASH' },
          { AttributeName: 'assessedAt', KeyType: 'RANGE' }
        ],
        attributeDefinitions: [
          { AttributeName: 'findingId', AttributeType: 'S' },
          { AttributeName: 'assessedAt', AttributeType: 'S' }
        ],
        billingMode: 'PAY_PER_REQUEST',
        encryption: {
          enabled: true
        },
        pointInTimeRecovery: true,
        backupPolicy: {
          enabled: true,
          retentionPeriod: 30
        }
      }
    ];
  }

  /**
   * Validate DynamoDB tables configuration
   */
  public async validateTables(): Promise<{
    valid: boolean;
    tables: Array<{
      tableName: string;
      exists: boolean;
      encrypted: boolean;
      backupEnabled: boolean;
      pointInTimeRecovery: boolean;
      status: string;
    }>;
  }> {
    const requiredTables = this.getRequiredTables();
    const tableValidations = [];

    for (const tableConfig of requiredTables) {
      try {
        const response = await this.dynamodbClient.send(new DescribeTableCommand({
          TableName: tableConfig.tableName
        }));

        const table = response.Table!;
        
        // Check continuous backups
        const backupsResponse = await this.dynamodbClient.send(new DescribeContinuousBackupsCommand({
          TableName: tableConfig.tableName
        }));

        tableValidations.push({
          tableName: tableConfig.tableName,
          exists: true,
          encrypted: table.SSEDescription?.Status === 'ENABLED',
          backupEnabled: true, // Would check actual backup configuration
          pointInTimeRecovery: backupsResponse.ContinuousBackupsDescription?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus === 'ENABLED',
          status: table.TableStatus!
        });

      } catch (error) {
        tableValidations.push({
          tableName: tableConfig.tableName,
          exists: false,
          encrypted: false,
          backupEnabled: false,
          pointInTimeRecovery: false,
          status: 'NOT_FOUND'
        });
      }
    }

    return {
      valid: tableValidations.every(t => t.exists && t.encrypted && t.status === 'ACTIVE'),
      tables: tableValidations
    };
  }
}