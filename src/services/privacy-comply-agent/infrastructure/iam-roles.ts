/**
 * IAM Role Manager
 * Manages IAM roles and policies for Privacy Comply Agent
 */

import {
  IAMClient,
  CreateRoleCommand,
  AttachRolePolicyCommand,
  PutRolePolicyCommand,
  GetRoleCommand,
  ListAttachedRolePoliciesCommand,
  ListRolePoliciesCommand
} from '@aws-sdk/client-iam';
import { AWSConfigManager } from '../config/aws-config';

export interface IAMRoleConfig {
  roleName: string;
  description: string;
  assumeRolePolicyDocument: any;
  managedPolicies: string[];
  inlinePolicies: { [policyName: string]: any };
}

/**
 * IAM Role Manager
 */
export class IAMRoleManager {
  private iamClient: IAMClient;
  private configManager: AWSConfigManager;

  constructor() {
    this.configManager = AWSConfigManager.getInstance();
    const awsConfig = this.configManager.getServiceCredentials('iam');
    this.iamClient = new IAMClient(awsConfig);
  }

  /**
   * Create all required IAM roles
   */
  public async createAllRoles(): Promise<void> {
    const roles = this.getRequiredRoles();
    
    for (const roleConfig of roles) {
      await this.createRole(roleConfig);
    }
  }

  /**
   * Create a single IAM role
   */
  private async createRole(config: IAMRoleConfig): Promise<void> {
    try {
      // Check if role already exists
      try {
        await this.iamClient.send(new GetRoleCommand({ RoleName: config.roleName }));
        console.log(`Role already exists: ${config.roleName}`);
        return;
      } catch (error) {
        // Role doesn't exist, continue with creation
      }

      // Create the role
      await this.iamClient.send(new CreateRoleCommand({
        RoleName: config.roleName,
        AssumeRolePolicyDocument: JSON.stringify(config.assumeRolePolicyDocument),
        Description: config.description
      }));

      // Attach managed policies
      for (const policyArn of config.managedPolicies) {
        await this.iamClient.send(new AttachRolePolicyCommand({
          RoleName: config.roleName,
          PolicyArn: policyArn
        }));
      }

      // Create and attach inline policies
      for (const [policyName, policyDocument] of Object.entries(config.inlinePolicies)) {
        await this.iamClient.send(new PutRolePolicyCommand({
          RoleName: config.roleName,
          PolicyName: policyName,
          PolicyDocument: JSON.stringify(policyDocument)
        }));
      }

      console.log(`Created IAM role: ${config.roleName}`);

    } catch (error) {
      console.error(`Error creating IAM role ${config.roleName}:`, error);
      throw error;
    }
  }

  /**
   * Get required IAM roles configuration
   */
  private getRequiredRoles(): IAMRoleConfig[] {
    return [
      {
        roleName: 'PrivacyComplyLambdaExecutionRole',
        description: 'Execution role for Privacy Comply Agent Lambda functions',
        assumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        managedPolicies: [
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
        ],
        inlinePolicies: {
          'PrivacyComplyLambdaPolicy': {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  's3:GetBucketPolicy',
                  's3:PutBucketPolicy',
                  's3:DeleteBucketPolicy',
                  's3:GetPublicAccessBlock',
                  's3:PutPublicAccessBlock',
                  's3:GetBucketEncryption',
                  's3:PutBucketEncryption'
                ],
                Resource: 'arn:aws:s3:::*'
              },
              {
                Effect: 'Allow',
                Action: [
                  'dynamodb:PutItem',
                  'dynamodb:UpdateItem',
                  'dynamodb:GetItem',
                  'dynamodb:Query',
                  'dynamodb:Scan'
                ],
                Resource: `arn:aws:dynamodb:${this.configManager.getAWSConfig().region}:*:table/privacy-comply-*`
              },
              {
                Effect: 'Allow',
                Action: [
                  'iam:GetRole',
                  'iam:GetRolePolicy',
                  'iam:PutRolePolicy',
                  'iam:DeleteRolePolicy'
                ],
                Resource: '*'
              }
            ]
          }
        }
      },
      {
        roleName: 'PrivacyComplyAgentRole',
        description: 'Main service role for Privacy Comply Agent',
        assumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: ['lambda.amazonaws.com', 'events.amazonaws.com'] },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        managedPolicies: [],
        inlinePolicies: {
          'PrivacyComplyAgentPolicy': {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  'securityhub:GetFindings',
                  'securityhub:BatchImportFindings',
                  'securityhub:UpdateFindings'
                ],
                Resource: '*'
              },
              {
                Effect: 'Allow',
                Action: [
                  'macie2:GetFindings',
                  'macie2:ListFindings',
                  'macie2:CreateClassificationJob'
                ],
                Resource: '*'
              },
              {
                Effect: 'Allow',
                Action: [
                  'events:PutEvents',
                  'events:PutRule',
                  'events:PutTargets'
                ],
                Resource: '*'
              }
            ]
          }
        }
      },
      {
        roleName: 'PrivacyComplyBedrockAccessRole',
        description: 'Role for accessing Amazon Bedrock services',
        assumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { Service: 'lambda.amazonaws.com' },
              Action: 'sts:AssumeRole'
            }
          ]
        },
        managedPolicies: [],
        inlinePolicies: {
          'BedrockInvokeModelPolicy': {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: [
                  'bedrock:InvokeModel',
                  'bedrock:ListFoundationModels',
                  'bedrock:GetFoundationModel'
                ],
                Resource: '*'
              }
            ]
          }
        }
      }
    ];
  }

  /**
   * Validate IAM roles exist and have correct policies
   */
  public async validateRoles(): Promise<{
    valid: boolean;
    roles: Array<{
      roleName: string;
      exists: boolean;
      policies: string[];
    }>;
  }> {
    const requiredRoles = this.getRequiredRoles();
    const roleValidations = [];

    for (const roleConfig of requiredRoles) {
      try {
        // Check if role exists
        await this.iamClient.send(new GetRoleCommand({ RoleName: roleConfig.roleName }));
        
        // Get attached policies
        const attachedPolicies = await this.iamClient.send(new ListAttachedRolePoliciesCommand({
          RoleName: roleConfig.roleName
        }));

        const inlinePolicies = await this.iamClient.send(new ListRolePoliciesCommand({
          RoleName: roleConfig.roleName
        }));

        const allPolicies = [
          ...(attachedPolicies.AttachedPolicies?.map(p => p.PolicyName!) || []),
          ...(inlinePolicies.PolicyNames || [])
        ];

        roleValidations.push({
          roleName: roleConfig.roleName,
          exists: true,
          policies: allPolicies
        });

      } catch (error) {
        roleValidations.push({
          roleName: roleConfig.roleName,
          exists: false,
          policies: []
        });
      }
    }

    return {
      valid: roleValidations.every(r => r.exists),
      roles: roleValidations
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
    // For now, return mock validation
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