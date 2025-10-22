/**
 * IAM Policy templates for Dark Web Intelligence system
 * Implements least privilege access principles
 */

export interface IAMPolicyDocument {
  Version: string;
  Statement: IAMStatement[];
}

export interface IAMStatement {
  Sid?: string;
  Effect: 'Allow' | 'Deny';
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, any>;
  Principal?: Record<string, string | string[]>;
}

/**
 * IAM policy templates for different components
 */
export class IAMPolicyTemplates {
  
  /**
   * Policy for Lambda functions performing dark web scans
   */
  static getDarkWebScannerPolicy(
    evidenceBucketArn: string,
    findingsTableArn: string,
    kmsKeyArn: string,
    secretsPrefix: string = 'darkweb/*'
  ): IAMPolicyDocument {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'CloudWatchLogsAccess',
          Effect: 'Allow',
          Action: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/darkweb-scanner-*'
        },
        {
          Sid: 'SecretsManagerAccess',
          Effect: 'Allow',
          Action: [
            'secretsmanager:GetSecretValue',
            'secretsmanager:DescribeSecret'
          ],
          Resource: `arn:aws:secretsmanager:*:*:secret:${secretsPrefix}`
        },
        {
          Sid: 'DynamoDBFindingsAccess',
          Effect: 'Allow',
          Action: [
            'dynamodb:PutItem',
            'dynamodb:GetItem',
            'dynamodb:UpdateItem',
            'dynamodb:Query',
            'dynamodb:Scan'
          ],
          Resource: [
            findingsTableArn,
            `${findingsTableArn}/index/*`
          ]
        },
        {
          Sid: 'S3EvidenceReadWrite',
          Effect: 'Allow',
          Action: [
            's3:PutObject',
            's3:GetObject',
            's3:DeleteObject'
          ],
          Resource: `${evidenceBucketArn}/*`
        },
        {
          Sid: 'S3EvidenceBucketAccess',
          Effect: 'Allow',
          Action: [
            's3:ListBucket',
            's3:GetBucketLocation'
          ],
          Resource: evidenceBucketArn
        },
        {
          Sid: 'KMSAccess',
          Effect: 'Allow',
          Action: [
            'kms:Encrypt',
            'kms:Decrypt',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:DescribeKey'
          ],
          Resource: kmsKeyArn
        }
      ]
    };
  } 
 /**
   * Policy for Bedrock intelligence analysis
   */
  static getBedrockAnalysisPolicy(
    findingsTableArn: string,
    kmsKeyArn: string
  ): IAMPolicyDocument {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'CloudWatchLogsAccess',
          Effect: 'Allow',
          Action: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/darkweb-bedrock-*'
        },
        {
          Sid: 'BedrockModelAccess',
          Effect: 'Allow',
          Action: [
            'bedrock:InvokeModel',
            'bedrock:InvokeModelWithResponseStream'
          ],
          Resource: [
            'arn:aws:bedrock:*::foundation-model/anthropic.claude-*',
            'arn:aws:bedrock:*::foundation-model/amazon.titan-*'
          ]
        },
        {
          Sid: 'DynamoDBFindingsReadWrite',
          Effect: 'Allow',
          Action: [
            'dynamodb:GetItem',
            'dynamodb:UpdateItem',
            'dynamodb:Query',
            'dynamodb:Scan'
          ],
          Resource: [
            findingsTableArn,
            `${findingsTableArn}/index/*`
          ]
        },
        {
          Sid: 'KMSAccess',
          Effect: 'Allow',
          Action: [
            'kms:Encrypt',
            'kms:Decrypt',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:DescribeKey'
          ],
          Resource: kmsKeyArn
        }
      ]
    };
  }

  /**
   * Policy for credential management service
   */
  static getCredentialManagementPolicy(
    secretsPrefix: string = 'darkweb/*',
    kmsKeyArn: string
  ): IAMPolicyDocument {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'CloudWatchLogsAccess',
          Effect: 'Allow',
          Action: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/darkweb-credentials-*'
        },
        {
          Sid: 'SecretsManagerFullAccess',
          Effect: 'Allow',
          Action: [
            'secretsmanager:CreateSecret',
            'secretsmanager:GetSecretValue',
            'secretsmanager:UpdateSecret',
            'secretsmanager:DeleteSecret',
            'secretsmanager:DescribeSecret',
            'secretsmanager:ListSecrets',
            'secretsmanager:RotateSecret',
            'secretsmanager:UpdateSecretVersionStage'
          ],
          Resource: `arn:aws:secretsmanager:*:*:secret:${secretsPrefix}`
        },
        {
          Sid: 'KMSAccess',
          Effect: 'Allow',
          Action: [
            'kms:Encrypt',
            'kms:Decrypt',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:DescribeKey'
          ],
          Resource: kmsKeyArn
        }
      ]
    };
  }

  /**
   * Generate trust policy for Lambda execution role
   */
  static getLambdaTrustPolicy(): IAMPolicyDocument {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com'
          },
          Action: 'sts:AssumeRole',
          Resource: '*' // Trust policies don't restrict resources
        }
      ]
    };
  }

  /**
   * Utility method to convert policy document to JSON string
   */
  static policyToJSON(policy: IAMPolicyDocument): string {
    return JSON.stringify(policy, null, 2);
  }

  /**
   * Validate policy document structure
   */
  static validatePolicy(policy: IAMPolicyDocument): boolean {
    if (!policy.Version || !policy.Statement) {
      return false;
    }

    if (!Array.isArray(policy.Statement)) {
      return false;
    }

    return policy.Statement.every(statement => 
      statement.Effect && 
      (statement.Effect === 'Allow' || statement.Effect === 'Deny') &&
      statement.Action &&
      statement.Resource
    );
  }
}