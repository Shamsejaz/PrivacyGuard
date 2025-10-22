import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface PrivacyGuardStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'prod';
  domainName?: string;
  certificateArn?: string;
  enableMultiRegion?: boolean;
}

export class PrivacyGuardStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly complianceFindingsTable: dynamodb.Table;
  public readonly reportsBucket: s3.Bucket;
  public readonly agentLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: PrivacyGuardStackProps) {
    super(scope, id, props);

    // KMS Key for encryption
    const encryptionKey = new kms.Key(this, 'PrivacyGuardKey', {
      description: 'PrivacyGuard encryption key',
      enableKeyRotation: true,
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Secrets Manager for sensitive configuration
    const secrets = new secretsmanager.Secret(this, 'PrivacyGuardSecrets', {
      description: 'PrivacyGuard application secrets',
      encryptionKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          jwtSecret: '',
          bedrockModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        }),
        generateStringKey: 'jwtSecret',
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });

    // DynamoDB Tables
    this.complianceFindingsTable = new dynamodb.Table(this, 'ComplianceFindings', {
      tableName: `privacyguard-compliance-findings-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: props.environment === 'prod',
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Global Secondary Indexes
    this.complianceFindingsTable.addGlobalSecondaryIndex({
      indexName: 'SeverityIndex',
      partitionKey: { name: 'severity', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    this.complianceFindingsTable.addGlobalSecondaryIndex({
      indexName: 'ResourceArnIndex',
      partitionKey: { name: 'resourceArn', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    // DSAR Requests Table
    const dsarRequestsTable = new dynamodb.Table(this, 'DSARRequests', {
      tableName: `privacyguard-dsar-requests-${props.environment}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: props.environment === 'prod',
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    dsarRequestsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    // S3 Buckets
    this.reportsBucket = new s3.Bucket(this, 'ReportsBucket', {
      bucketName: `privacyguard-reports-${props.environment}-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(90),
        },
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Data Lake Bucket
    const dataLakeBucket = new s3.Bucket(this, 'DataLakeBucket', {
      bucketName: `privacyguard-datalake-${props.environment}-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'TransitionToGlacier',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
        },
      ],
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // SQS Queues
    const processingQueue = new sqs.Queue(this, 'ProcessingQueue', {
      queueName: `privacyguard-processing-${props.environment}`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
      visibilityTimeout: cdk.Duration.minutes(15),
      retentionPeriod: cdk.Duration.days(14),
    });

    const deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: `privacyguard-dlq-${props.environment}`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: encryptionKey,
      retentionPeriod: cdk.Duration.days(14),
    });

    // SNS Topics
    const alertsTopic = new sns.Topic(this, 'AlertsTopic', {
      topicName: `privacyguard-alerts-${props.environment}`,
      masterKey: encryptionKey,
    });

    // IAM Role for Lambda functions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        PrivacyGuardPolicy: new iam.PolicyDocument({
          statements: [
            // DynamoDB permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
              resources: [
                this.complianceFindingsTable.tableArn,
                `${this.complianceFindingsTable.tableArn}/index/*`,
                dsarRequestsTable.tableArn,
                `${dsarRequestsTable.tableArn}/index/*`,
              ],
            }),
            // S3 permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
              ],
              resources: [
                this.reportsBucket.bucketArn,
                `${this.reportsBucket.bucketArn}/*`,
                dataLakeBucket.bucketArn,
                `${dataLakeBucket.bucketArn}/*`,
              ],
            }),
            // Bedrock permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:ListFoundationModels',
                'bedrock:GetFoundationModel',
              ],
              resources: ['*'],
            }),
            // SageMaker permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sagemaker:InvokeEndpoint',
                'sagemaker:DescribeEndpoint',
              ],
              resources: [`arn:aws:sagemaker:${this.region}:${this.account}:endpoint/*`],
            }),
            // Comprehend permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'comprehend:DetectEntities',
                'comprehend:DetectPiiEntities',
                'comprehend:DetectSentiment',
              ],
              resources: ['*'],
            }),
            // SQS permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sqs:SendMessage',
                'sqs:ReceiveMessage',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
              ],
              resources: [processingQueue.queueArn, deadLetterQueue.queueArn],
            }),
            // SNS permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['sns:Publish'],
              resources: [alertsTopic.topicArn],
            }),
            // Secrets Manager permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['secretsmanager:GetSecretValue'],
              resources: [secrets.secretArn],
            }),
            // KMS permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'kms:Decrypt',
                'kms:DescribeKey',
                'kms:Encrypt',
                'kms:GenerateDataKey',
              ],
              resources: [encryptionKey.keyArn],
            }),
          ],
        }),
      },
    });

    // Lambda Layer for common dependencies
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      layerVersionName: `privacyguard-common-${props.environment}`,
      code: lambda.Code.fromAsset('lambda-layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common dependencies for PrivacyGuard Lambda functions',
    });

    // Privacy Comply Agent Lambda
    this.agentLambda = new lambda.Function(this, 'AgentLambda', {
      functionName: `privacyguard-agent-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/agent'),
      role: lambdaRole,
      layers: [commonLayer],
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        ENVIRONMENT: props.environment,
        COMPLIANCE_FINDINGS_TABLE: this.complianceFindingsTable.tableName,
        DSAR_REQUESTS_TABLE: dsarRequestsTable.tableName,
        REPORTS_BUCKET: this.reportsBucket.bucketName,
        DATA_LAKE_BUCKET: dataLakeBucket.bucketName,
        PROCESSING_QUEUE_URL: processingQueue.queueUrl,
        ALERTS_TOPIC_ARN: alertsTopic.topicArn,
        SECRETS_ARN: secrets.secretArn,
        KMS_KEY_ID: encryptionKey.keyId,
      },
      logRetention: props.environment === 'prod' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK,
    });

    // Compliance Analysis Lambda
    const complianceLambda = new lambda.Function(this, 'ComplianceLambda', {
      functionName: `privacyguard-compliance-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/compliance'),
      role: lambdaRole,
      layers: [commonLayer],
      timeout: cdk.Duration.minutes(10),
      memorySize: 512,
      environment: {
        ENVIRONMENT: props.environment,
        COMPLIANCE_FINDINGS_TABLE: this.complianceFindingsTable.tableName,
        REPORTS_BUCKET: this.reportsBucket.bucketName,
        SECRETS_ARN: secrets.secretArn,
      },
      logRetention: props.environment === 'prod' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK,
    });

    // DSAR Management Lambda
    const dsarLambda = new lambda.Function(this, 'DSARLambda', {
      functionName: `privacyguard-dsar-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/dsar'),
      role: lambdaRole,
      layers: [commonLayer],
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        ENVIRONMENT: props.environment,
        DSAR_REQUESTS_TABLE: dsarRequestsTable.tableName,
        REPORTS_BUCKET: this.reportsBucket.bucketName,
        ALERTS_TOPIC_ARN: alertsTopic.topicArn,
        SECRETS_ARN: secrets.secretArn,
      },
      logRetention: props.environment === 'prod' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK,
    });

    // Report Generation Lambda
    const reportLambda = new lambda.Function(this, 'ReportLambda', {
      functionName: `privacyguard-report-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda-functions/report'),
      role: lambdaRole,
      layers: [commonLayer],
      timeout: cdk.Duration.minutes(10),
      memorySize: 1024,
      environment: {
        ENVIRONMENT: props.environment,
        COMPLIANCE_FINDINGS_TABLE: this.complianceFindingsTable.tableName,
        DSAR_REQUESTS_TABLE: dsarRequestsTable.tableName,
        REPORTS_BUCKET: this.reportsBucket.bucketName,
        SECRETS_ARN: secrets.secretArn,
      },
      logRetention: props.environment === 'prod' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK,
    });

    // Step Functions State Machine for complex workflows
    const agentWorkflow = new stepfunctions.StateMachine(this, 'AgentWorkflow', {
      stateMachineName: `privacyguard-agent-workflow-${props.environment}`,
      definition: new stepfunctions.Parallel(this, 'ParallelProcessing')
        .branch(
          new sfnTasks.LambdaInvoke(this, 'ScanResources', {
            lambdaFunction: this.agentLambda,
            payload: stepfunctions.TaskInput.fromObject({
              action: 'scan',
              'input.$': '$',
            }),
          })
        )
        .branch(
          new sfnTasks.LambdaInvoke(this, 'AnalyzeCompliance', {
            lambdaFunction: complianceLambda,
            payload: stepfunctions.TaskInput.fromObject({
              action: 'analyze',
              'input.$': '$',
            }),
          })
        )
        .next(
          new sfnTasks.LambdaInvoke(this, 'GenerateReport', {
            lambdaFunction: reportLambda,
            payload: stepfunctions.TaskInput.fromObject({
              action: 'generate',
              'input.$': '$',
            }),
          })
        ),
      timeout: cdk.Duration.minutes(30),
    });

    // EventBridge Rules for scheduled scans
    const scheduledScanRule = new events.Rule(this, 'ScheduledScanRule', {
      ruleName: `privacyguard-scheduled-scan-${props.environment}`,
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
      description: 'Trigger daily compliance scans',
    });

    scheduledScanRule.addTarget(new targets.SfnStateMachine(agentWorkflow, {
      input: events.RuleTargetInput.fromObject({
        scanType: 'scheduled',
        timestamp: events.EventField.fromPath('$.time'),
      }),
    }));

    // API Gateway
    this.api = new apigateway.RestApi(this, 'PrivacyGuardAPI', {
      restApiName: `privacyguard-api-${props.environment}`,
      description: 'PrivacyGuard API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: props.environment === 'prod' 
          ? [props.domainName ? `https://${props.domainName}` : 'https://app.privacyguard.com']
          : apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
      deployOptions: {
        stageName: props.environment,
        throttlingRateLimit: props.environment === 'prod' ? 1000 : 100,
        throttlingBurstLimit: props.environment === 'prod' ? 2000 : 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: props.environment !== 'prod',
        metricsEnabled: true,
      },
    });

    // API Gateway Resources and Methods
    const agentResource = this.api.root.addResource('agent');
    agentResource.addMethod('GET', new apigateway.LambdaIntegration(this.agentLambda));
    agentResource.addMethod('POST', new apigateway.LambdaIntegration(this.agentLambda));

    const scanResource = agentResource.addResource('scan');
    scanResource.addMethod('POST', new apigateway.LambdaIntegration(this.agentLambda));

    const complianceResource = this.api.root.addResource('compliance');
    complianceResource.addMethod('GET', new apigateway.LambdaIntegration(complianceLambda));
    complianceResource.addMethod('POST', new apigateway.LambdaIntegration(complianceLambda));

    const findingsResource = complianceResource.addResource('findings');
    findingsResource.addMethod('GET', new apigateway.LambdaIntegration(complianceLambda));

    const dsarResource = this.api.root.addResource('dsar');
    dsarResource.addMethod('GET', new apigateway.LambdaIntegration(dsarLambda));
    dsarResource.addMethod('POST', new apigateway.LambdaIntegration(dsarLambda));

    const requestsResource = dsarResource.addResource('requests');
    requestsResource.addMethod('GET', new apigateway.LambdaIntegration(dsarLambda));
    requestsResource.addMethod('POST', new apigateway.LambdaIntegration(dsarLambda));

    const reportsResource = this.api.root.addResource('reports');
    reportsResource.addMethod('GET', new apigateway.LambdaIntegration(reportLambda));
    reportsResource.addMethod('POST', new apigateway.LambdaIntegration(reportLambda));

    // WAF Web ACL
    const webAcl = new wafv2.CfnWebACL(this, 'PrivacyGuardWebACL', {
      name: `privacyguard-waf-${props.environment}`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetric',
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsRuleSetMetric',
          },
        },
        {
          name: 'RateLimitRule',
          priority: 3,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: props.environment === 'prod' ? 2000 : 1000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRuleMetric',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'PrivacyGuardWebACL',
      },
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'PrivacyGuardDistribution', {
      comment: `PrivacyGuard CloudFront Distribution - ${props.environment}`,
      defaultBehavior: {
        origin: new origins.RestApiOrigin(this.api),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
      },
      webAclId: webAcl.attrArn,
      priceClass: props.environment === 'prod' 
        ? cloudfront.PriceClass.PRICE_CLASS_ALL 
        : cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      logBucket: new s3.Bucket(this, 'CloudFrontLogsBucket', {
        bucketName: `privacyguard-cf-logs-${props.environment}-${this.account}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        lifecycleRules: [
          {
            id: 'DeleteOldLogs',
            enabled: true,
            expiration: cdk.Duration.days(90),
          },
        ],
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Route 53 (if domain is provided)
    if (props.domainName && props.certificateArn) {
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domainName,
      });

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: `api.${props.domainName}`,
        target: route53.RecordTarget.fromAlias(
          new route53.targets.CloudFrontTarget(distribution)
        ),
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'APIGatewayURL', {
      value: this.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'ComplianceFindingsTableName', {
      value: this.complianceFindingsTable.tableName,
      description: 'DynamoDB Compliance Findings Table Name',
    });

    new cdk.CfnOutput(this, 'ReportsBucketName', {
      value: this.reportsBucket.bucketName,
      description: 'S3 Reports Bucket Name',
    });

    new cdk.CfnOutput(this, 'AgentLambdaFunctionName', {
      value: this.agentLambda.functionName,
      description: 'Privacy Comply Agent Lambda Function Name',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: agentWorkflow.stateMachineArn,
      description: 'Step Functions State Machine ARN',
    });

    // Tags
    cdk.Tags.of(this).add('Project', 'PrivacyGuard');
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Owner', 'PrivacyGuard Team');
    cdk.Tags.of(this).add('CostCenter', 'Compliance');
  }
}