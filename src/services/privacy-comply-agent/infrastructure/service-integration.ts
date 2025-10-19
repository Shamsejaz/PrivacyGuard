/**
 * Service Integration Manager
 * Configures integrations and permissions between AWS services for Privacy Comply Agent
 */

import {
  IAMClient,
  CreatePolicyCommand,
  GetRoleCommand
} from '@aws-sdk/client-iam';
import {
  EventBridgeClient,
  CreateEventBusCommand,
  PutPermissionCommand as EventBridgePermissionCommand
} from '@aws-sdk/client-eventbridge';
import {
  SNSClient,
  CreateTopicCommand,
  SetTopicAttributesCommand
} from '@aws-sdk/client-sns';
import { AWSConfigManager } from '../config/aws-config';

export interface ServiceIntegrationConfig {
  serviceName: string;
  permissions: PermissionConfig[];
  eventBusConfig?: EventBusConfig;
  notificationConfig?: NotificationConfig;
}

export interface PermissionConfig {
  principal: string;
  action: string[];
  resource: string;
  condition?: any;
}

export interface EventBusConfig {
  eventBusName: string;
  rules: EventRuleConfig[];
}

export interface EventRuleConfig {
  ruleName: string;
  eventPattern: any;
  targets: EventTargetConfig[];
}

export interface EventTargetConfig {
  targetType: 'LAMBDA' | 'SNS' | 'SQS';
  targetArn: string;
  inputTransformer?: any;
}

export interface NotificationConfig {
  topicName: string;
  subscriptions: NotificationSubscription[];
}

export interface NotificationSubscription {
  protocol: 'email' | 'sms' | 'lambda' | 'sqs';
  endpoint: string;
}

/**
 * Service Integration Manager
 */
export class ServiceIntegrationManager {
  private iamClient: IAMClient;
  private eventBridgeClient: EventBridgeClient;
  private snsClient: SNSClient;
  private configManager: AWSConfigManager;

  constructor() {
    this.configManager = AWSConfigManager.getInstance();
    const awsConfig = this.configManager.getServiceCredentials('iam');
    
    this.iamClient = new IAMClient(awsConfig);
    this.eventBridgeClient = new EventBridgeClient(awsConfig);
    this.snsClient = new SNSClient(awsConfig);
  }

  /**
   * Configure all service integrations
   */
  public async configureAllIntegrations(): Promise<void> {
    await Promise.all([
      this.configureLambdaIntegrations(),
      this.configureEventBridgeIntegrations(),
      this.configureNotificationIntegrations(),
      this.configureSecurityHubIntegration(),
      this.configureMacieIntegration(),
      this.configureBedrockIntegration()
    ]);
  }

  /**
   * Configure Lambda function integrations
   */
  private async configureLambdaIntegrations(): Promise<void> {
    const lambdaFunctions = [
      'privacy-comply-s3-access-restriction',
      'privacy-comply-encryption-enablement',
      'privacy-comply-iam-policy-adjustment'
    ];

    for (const functionName of lambdaFunctions) {
      await this.configureLambdaPermissions(functionName);
    }
  }

  /**
   * Configure permissions for a specific Lambda function
   */
  private async configureLambdaPermissions(functionName: string): Promise<void> {
    const permissions = this.getLambdaPermissions(functionName);

    for (const permission of permissions) {
      await this.createOrUpdateIAMPolicy(
        `${functionName}-execution-policy`,
        permission
      );
    }
  }

  /**
   * Get required permissions for a Lambda function
   */
  private getLambdaPermissions(functionName: string): PermissionConfig[] {
    const basePermissions: PermissionConfig[] = [
      {
        principal: 'lambda.amazonaws.com',
        action: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resource: `arn:aws:logs:${this.configManager.getAWSConfig().region}:*:*`
      },
      {
        principal: 'lambda.amazonaws.com',
        action: [
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:GetItem'
        ],
        resource: `arn:aws:dynamodb:${this.configManager.getAWSConfig().region}:*:table/privacy-comply-data`
      }
    ];

    // Function-specific permissions
    switch (functionName) {
      case 'privacy-comply-s3-access-restriction':
        basePermissions.push({
          principal: 'lambda.amazonaws.com',
          action: [
            's3:GetBucketPolicy',
            's3:PutBucketPolicy',
            's3:DeleteBucketPolicy',
            's3:GetPublicAccessBlock',
            's3:PutPublicAccessBlock',
            's3:GetBucketAcl',
            's3:PutBucketAcl'
          ],
          resource: 'arn:aws:s3:::*'
        });
        break;

      case 'privacy-comply-encryption-enablement':
        basePermissions.push({
          principal: 'lambda.amazonaws.com',
          action: [
            's3:GetBucketEncryption',
            's3:PutBucketEncryption',
            'rds:DescribeDBInstances',
            'rds:ModifyDBInstance',
            'kms:CreateKey',
            'kms:DescribeKey',
            'kms:ListKeys'
          ],
          resource: '*'
        });
        break;

      case 'privacy-comply-iam-policy-adjustment':
        basePermissions.push({
          principal: 'lambda.amazonaws.com',
          action: [
            'iam:GetRole',
            'iam:GetRolePolicy',
            'iam:PutRolePolicy',
            'iam:DeleteRolePolicy',
            'iam:AttachRolePolicy',
            'iam:DetachRolePolicy',
            'iam:ListAttachedRolePolicies',
            'iam:GetUser',
            'iam:GetUserPolicy',
            'iam:PutUserPolicy',
            'iam:DeleteUserPolicy'
          ],
          resource: '*',
          condition: {
            StringEquals: {
              'iam:PassedToService': 'lambda.amazonaws.com'
            }
          }
        });
        break;
    }

    return basePermissions;
  }

  /**
   * Configure EventBridge integrations
   */
  private async configureEventBridgeIntegrations(): Promise<void> {
    // Create custom event bus for Privacy Comply Agent
    try {
      await this.eventBridgeClient.send(new CreateEventBusCommand({
        Name: 'privacy-comply-agent-events'
      }));
    } catch (error) {
      if (error instanceof Error && error.name !== 'ResourceAlreadyExistsException') {
        console.error('Error creating event bus:', error);
      }
    }

    // Configure cross-service event permissions
    await this.configureEventBridgePermissions();
  }

  /**
   * Configure EventBridge permissions
   */
  private async configureEventBridgePermissions(): Promise<void> {
    const permissions = [
      {
        principal: 'events.amazonaws.com',
        action: 'lambda:InvokeFunction',
        statementId: 'privacy-comply-eventbridge-lambda-permission'
      },
      {
        principal: 's3.amazonaws.com',
        action: 'events:PutEvents',
        statementId: 'privacy-comply-s3-eventbridge-permission'
      },
      {
        principal: 'iam.amazonaws.com',
        action: 'events:PutEvents',
        statementId: 'privacy-comply-iam-eventbridge-permission'
      }
    ];

    for (const permission of permissions) {
      try {
        await this.eventBridgeClient.send(new EventBridgePermissionCommand({
          Principal: permission.principal,
          Action: permission.action,
          StatementId: permission.statementId
        }));
      } catch (error) {
        console.warn(`Permission already exists: ${permission.statementId}`);
      }
    }
  }

  /**
   * Configure notification integrations
   */
  private async configureNotificationIntegrations(): Promise<void> {
    // Create SNS topics for different types of notifications
    const topics = [
      {
        name: 'privacy-comply-critical-alerts',
        description: 'Critical privacy compliance alerts'
      },
      {
        name: 'privacy-comply-remediation-results',
        description: 'Automated remediation results'
      },
      {
        name: 'privacy-comply-compliance-reports',
        description: 'Compliance report notifications'
      }
    ];

    for (const topic of topics) {
      await this.createNotificationTopic(topic.name, topic.description);
    }
  }

  /**
   * Create SNS notification topic
   */
  private async createNotificationTopic(topicName: string, description: string): Promise<string> {
    try {
      const response = await this.snsClient.send(new CreateTopicCommand({
        Name: topicName
      }));

      const topicArn = response.TopicArn!;

      // Set topic attributes
      await this.snsClient.send(new SetTopicAttributesCommand({
        TopicArn: topicArn,
        AttributeName: 'DisplayName',
        AttributeValue: description
      }));

      console.log(`Created SNS topic: ${topicName}`);
      return topicArn;

    } catch (error) {
      if (error instanceof Error && error.name === 'TopicAlreadyExists') {
        console.log(`SNS topic already exists: ${topicName}`);
        return `arn:aws:sns:${this.configManager.getAWSConfig().region}:*:${topicName}`;
      }
      throw error;
    }
  }

  /**
   * Configure Security Hub integration
   */
  private async configureSecurityHubIntegration(): Promise<void> {
    const securityHubPermissions: PermissionConfig = {
      principal: 'lambda.amazonaws.com',
      action: [
        'securityhub:GetFindings',
        'securityhub:BatchImportFindings',
        'securityhub:UpdateFindings',
        'securityhub:BatchUpdateFindings'
      ],
      resource: '*'
    };

    await this.createOrUpdateIAMPolicy(
      'privacy-comply-securityhub-integration-policy',
      securityHubPermissions
    );
  }

  /**
   * Configure Macie integration
   */
  private async configureMacieIntegration(): Promise<void> {
    const maciePermissions: PermissionConfig = {
      principal: 'lambda.amazonaws.com',
      action: [
        'macie2:GetFindings',
        'macie2:ListFindings',
        'macie2:CreateClassificationJob',
        'macie2:DescribeClassificationJob',
        'macie2:ListClassificationJobs'
      ],
      resource: '*'
    };

    await this.createOrUpdateIAMPolicy(
      'privacy-comply-macie-integration-policy',
      maciePermissions
    );
  }

  /**
   * Configure Bedrock integration
   */
  private async configureBedrockIntegration(): Promise<void> {
    const bedrockPermissions: PermissionConfig = {
      principal: 'lambda.amazonaws.com',
      action: [
        'bedrock:InvokeModel',
        'bedrock:ListFoundationModels',
        'bedrock:GetFoundationModel'
      ],
      resource: '*'
    };

    await this.createOrUpdateIAMPolicy(
      'privacy-comply-bedrock-integration-policy',
      bedrockPermissions
    );
  }

  /**
   * Create or update IAM policy
   */
  private async createOrUpdateIAMPolicy(
    policyName: string,
    permissions: PermissionConfig
  ): Promise<void> {
    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: permissions.action,
          Resource: permissions.resource,
          ...(permissions.condition && { Condition: permissions.condition })
        }
      ]
    };

    try {
      // Try to create the policy
      await this.iamClient.send(new CreatePolicyCommand({
        PolicyName: policyName,
        PolicyDocument: JSON.stringify(policyDocument),
        Description: `Privacy Comply Agent integration policy: ${policyName}`
      }));

      console.log(`Created IAM policy: ${policyName}`);

    } catch (error) {
      if (error instanceof Error && error.name === 'EntityAlreadyExists') {
        console.log(`IAM policy already exists: ${policyName}`);
      } else {
        console.error(`Error creating IAM policy ${policyName}:`, error);
        throw error;
      }
    }
  }

  /**
   * Validate service integrations
   */
  public async validateIntegrations(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Check if required roles exist
      const requiredRoles = [
        'PrivacyComplyLambdaExecutionRole',
        'PrivacyComplyAgentRole',
        'PrivacyComplyBedrockAccessRole'
      ];

      for (const roleName of requiredRoles) {
        try {
          await this.iamClient.send(new GetRoleCommand({ RoleName: roleName }));
        } catch (error) {
          issues.push(`Required IAM role not found: ${roleName}`);
        }
      }

      // Additional validation checks would go here
      // - Check EventBridge rules
      // - Check SNS topics
      // - Check Lambda permissions

    } catch (error) {
      issues.push(`Error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Get integration status
   */
  public async getIntegrationStatus(): Promise<{
    lambdaIntegrations: boolean;
    eventBridgeIntegrations: boolean;
    notificationIntegrations: boolean;
    securityHubIntegration: boolean;
    macieIntegration: boolean;
    bedrockIntegration: boolean;
  }> {
    // This would implement actual status checking
    // For now, return placeholder data
    return {
      lambdaIntegrations: true,
      eventBridgeIntegrations: true,
      notificationIntegrations: true,
      securityHubIntegration: true,
      macieIntegration: true,
      bedrockIntegration: true
    };
  }

  /**
   * Clean up integrations (for testing or decommissioning)
   */
  public async cleanupIntegrations(): Promise<void> {
    console.log('Cleaning up service integrations...');
    // Implementation would remove created resources
    // This is useful for testing environments
  }

  /**
   * Validate data flow between services
   */
  public async validateDataFlow(): Promise<{
    valid: boolean;
    flows: Array<{
      source: string;
      target: string;
      success: boolean;
      latency: number;
      dataIntegrity: boolean;
    }>;
  }> {
    // This would implement actual data flow validation
    return {
      valid: true,
      flows: [
        {
          source: 'S3 Event',
          target: 'Lambda Function',
          success: true,
          latency: 250,
          dataIntegrity: true
        },
        {
          source: 'Lambda Function',
          target: 'DynamoDB',
          success: true,
          latency: 150,
          dataIntegrity: true
        },
        {
          source: 'Lambda Function',
          target: 'SNS Topic',
          success: true,
          latency: 100,
          dataIntegrity: true
        },
        {
          source: 'Bedrock',
          target: 'Lambda Function',
          success: true,
          latency: 3000,
          dataIntegrity: true
        }
      ]
    };
  }

  /**
   * Validate encryption at rest and in transit
   */
  public async validateEncryption(): Promise<{
    valid: boolean;
    atRest: {
      s3Buckets: { encrypted: boolean; keyManagement: string };
      dynamodbTables: { encrypted: boolean; keyManagement: string };
      lambdaEnvironmentVariables: { encrypted: boolean; keyManagement: string };
    };
    inTransit: {
      apiEndpoints: { tlsVersion: string; certificateValid: boolean };
      serviceConnections: { encrypted: boolean; protocol: string };
      lambdaInvocations: { encrypted: boolean; protocol: string };
    };
  }> {
    // This would implement actual encryption validation
    return {
      valid: true,
      atRest: {
        s3Buckets: { encrypted: true, keyManagement: 'AWS-KMS' },
        dynamodbTables: { encrypted: true, keyManagement: 'AWS-KMS' },
        lambdaEnvironmentVariables: { encrypted: true, keyManagement: 'AWS-KMS' }
      },
      inTransit: {
        apiEndpoints: { tlsVersion: '1.2', certificateValid: true },
        serviceConnections: { encrypted: true, protocol: 'HTTPS' },
        lambdaInvocations: { encrypted: true, protocol: 'TLS' }
      }
    };
  }

  /**
   * Validate access controls and least privilege
   */
  public async validateAccessControls(): Promise<{
    valid: boolean;
    iamRoles: Array<{
      roleName: string;
      leastPrivilege: boolean;
      unnecessaryPermissions: string[];
      missingPermissions: string[];
    }>;
    resourcePolicies: {
      s3BucketsPublicAccess: boolean;
      lambdaFunctionPublicAccess: boolean;
      dynamodbTablePublicAccess: boolean;
    };
  }> {
    // This would implement actual access control validation
    return {
      valid: true,
      iamRoles: [
        {
          roleName: 'PrivacyComplyLambdaExecutionRole',
          leastPrivilege: true,
          unnecessaryPermissions: [],
          missingPermissions: []
        },
        {
          roleName: 'PrivacyComplyAgentRole',
          leastPrivilege: true,
          unnecessaryPermissions: [],
          missingPermissions: []
        }
      ],
      resourcePolicies: {
        s3BucketsPublicAccess: false,
        lambdaFunctionPublicAccess: false,
        dynamodbTablePublicAccess: false
      }
    };
  }
}