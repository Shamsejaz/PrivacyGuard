# Privacy Comply Agent Infrastructure

This directory contains infrastructure management components for the Privacy Comply Agent, including AWS service deployment, monitoring, and configuration management.

## Overview

The infrastructure system consists of several key components:

### Core Infrastructure Managers
- **Infrastructure Manager**: Main orchestrator for AWS infrastructure setup
- **IAM Role Manager**: IAM role and policy management
- **DynamoDB Table Manager**: DynamoDB table creation and configuration
- **S3 Bucket Manager**: S3 bucket setup with security configurations

### AWS Service Configuration (Task 10.1) - NEW
- **AWS Service Configurator**: Main AWS service configuration orchestrator
- **Setup AWS Services CLI**: Command-line tool for AWS service setup
- **Example AWS Setup**: Usage examples and workflows

### Deployment and Orchestration
- **Lambda Deployment Manager**: Deploys and manages remediation Lambda functions
- **CloudWatch Monitoring Manager**: Sets up monitoring, alarms, and dashboards
- **Service Integration Manager**: Configures permissions and integrations between AWS services
- **Deployment Orchestrator**: Coordinates the entire deployment process
- **Deployment CLI**: Command-line interface for deployment operations

## Quick Start - AWS Service Configuration (Task 10.1)

The fastest way to set up all AWS services for Privacy Comply Agent:

```typescript
import { setupAWSServiceConfigurations, validateAWSServiceConfigurations } from './aws-service-configurator';

// Set up all AWS services
const result = await setupAWSServiceConfigurations();

if (result.success) {
  console.log('✅ All AWS services configured successfully');
  console.log(`IAM Roles: ${result.details.iam.rolesCreated.length}`);
  console.log(`DynamoDB Tables: ${result.details.dynamodb.tablesCreated.length}`);
  console.log(`S3 Buckets: ${result.details.s3.bucketsCreated.length}`);
} else {
  console.error('❌ Configuration failed:', result.message);
}

// Validate configuration
const validation = await validateAWSServiceConfigurations();
if (validation.valid) {
  console.log('✅ All configurations are valid');
} else {
  console.log('⚠️ Configuration issues detected');
}
```

### CLI Usage for AWS Service Setup

```bash
# Set up all AWS services (Task 10.1)
node setup-aws-services.ts setup --verbose

# Validate existing configuration
node setup-aws-services.ts validate

# Get service status
node setup-aws-services.ts status

# Test connectivity
node setup-aws-services.ts test

# Generate comprehensive report
node setup-aws-services.ts report

# Show help
node setup-aws-services.ts --help
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                AWS Service Configurator (NEW)                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ IAM Role        │  │ DynamoDB Table  │  │ S3 Bucket       │  │
│  │ Manager         │  │ Manager         │  │ Manager         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment Orchestrator                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Lambda          │  │ CloudWatch      │  │ Service         │  │
│  │ Deployment      │  │ Monitoring      │  │ Integration     │  │
│  │ Manager         │  │ Manager         │  │ Manager         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Services                              │
├─────────────────────────────────────────────────────────────────┤
│  IAM Roles  │  DynamoDB  │  S3 Buckets  │  Lambda  │  CloudWatch │
└─────────────────────────────────────────────────────────────────┘
```

## Infrastructure Components (Task 10.1)

### IAM Roles (Requirements: 1.5, 3.5)

The system creates the following IAM roles:

- **PrivacyComplyLambdaExecutionRole** - Execution role for Lambda functions
  - Permissions: Lambda execution, S3 access, DynamoDB access, IAM policy management
- **PrivacyComplyAgentRole** - Main service role for the agent
  - Permissions: Security Hub, Macie, EventBridge access
- **PrivacyComplyBedrockAccessRole** - Role for accessing Amazon Bedrock
  - Permissions: Bedrock model invocation and management

### DynamoDB Tables (Requirements: 1.5, 4.4)

- **privacy-comply-findings** - Stores compliance findings and violations
  - Encrypted at rest with AWS KMS
  - Point-in-time recovery enabled
  - Automatic backups with 30-day retention
- **privacy-comply-assessments** - Stores compliance assessments and analysis
  - Encrypted at rest with AWS KMS
  - Point-in-time recovery enabled
  - Automatic backups with 30-day retention

### S3 Buckets (Requirements: 4.4)

- **privacy-comply-reports** - Encrypted storage for compliance reports
  - Server-side encryption enabled (AES256/KMS)
  - Public access blocked
  - Versioning enabled
  - Access logging enabled
- **privacy-comply-data-lake** - Encrypted data lake for compliance data
  - Server-side encryption enabled (AES256/KMS)
  - Public access blocked
  - Versioning enabled
  - Access logging enabled

## Lambda Functions

The system deploys three main remediation Lambda functions:

### 1. S3 Access Restriction (`privacy-comply-s3-access-restriction`)
- **Purpose**: Automatically restricts public access to S3 buckets containing PII/PHI
- **Triggers**: 
  - CloudWatch Events for S3 API calls (PutBucketAcl, PutBucketPolicy, etc.)
  - Scheduled checks every hour
- **Permissions**: S3 bucket policy management, public access block configuration

### 2. Encryption Enablement (`privacy-comply-encryption-enablement`)
- **Purpose**: Enables encryption for AWS resources containing sensitive data
- **Triggers**:
  - CloudWatch Events for resource creation (CreateBucket, CreateDBInstance)
  - Scheduled checks every hour
- **Permissions**: S3 encryption, RDS encryption, KMS key management

### 3. IAM Policy Adjustment (`privacy-comply-iam-policy-adjustment`)
- **Purpose**: Adjusts IAM policies to follow principle of least privilege
- **Triggers**:
  - CloudWatch Events for IAM policy changes
  - Scheduled checks every hour
- **Permissions**: IAM role and policy management

## Event Triggers

### CloudWatch Events Configuration

Each Lambda function is configured with specific event patterns:

```json
{
  "source": ["aws.s3"],
  "detail-type": ["AWS API Call via CloudTrail"],
  "detail": {
    "eventSource": ["s3.amazonaws.com"],
    "eventName": ["PutBucketAcl", "PutBucketPolicy", "PutPublicAccessBlock"]
  }
}
```

### Scheduled Triggers

All functions include scheduled triggers for periodic compliance checks:
- **Schedule**: `rate(1 hour)`
- **Purpose**: Proactive compliance monitoring

## Monitoring and Alerting

### CloudWatch Alarms

Each Lambda function has the following alarms configured:

1. **High Error Rate**: Triggers when error count > 5 in 10 minutes
2. **High Duration**: Triggers when average execution time > 4 minutes
3. **Throttling**: Triggers when any throttling occurs

### Custom Metrics

The system publishes custom metrics for tracking:
- `RemediationSuccess`: Success/failure rate of remediation actions
- `RemediationExecutionTime`: Time taken for remediation operations

### Dashboard

A unified CloudWatch dashboard provides visibility into:
- Lambda function invocations and errors
- Execution duration and throttling
- Custom remediation metrics
- Recent error logs across all functions

## Service Integrations

### Required IAM Roles

1. **PrivacyComplyLambdaExecutionRole**: Lambda execution role with permissions for:
   - CloudWatch Logs
   - S3 bucket management
   - IAM policy management
   - DynamoDB access

2. **PrivacyComplyAgentRole**: Main service role for:
   - AWS service monitoring
   - Security Hub integration
   - Macie integration
   - Bedrock access

3. **PrivacyComplyBedrockAccessRole**: Bedrock-specific access role

### EventBridge Configuration

- Custom event bus: `privacy-comply-agent-events`
- Cross-service event permissions for S3, IAM, and other services

### SNS Topics

Notification topics for different alert types:
- `privacy-comply-critical-alerts`: Critical compliance violations
- `privacy-comply-remediation-results`: Automated remediation outcomes
- `privacy-comply-compliance-reports`: Report generation notifications

## Deployment

### Prerequisites

1. **AWS Credentials**: Configure AWS credentials via:
   - Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
   - AWS Profile (`AWS_PROFILE`)
   - IAM roles (for EC2/Lambda execution)

2. **Required Permissions**: The deployment user/role needs permissions for:
   - Lambda function management
   - IAM role and policy creation
   - CloudWatch configuration
   - EventBridge rule management
   - SNS topic creation

### Using the CLI

```bash
# Full deployment
node deployment-cli.js deploy

# Deploy with options
node deployment-cli.js deploy --skip-iam --verbose

# Check status
node deployment-cli.js status --verbose

# Test connectivity
node deployment-cli.js test

# Update functions only
node deployment-cli.js update

# Validate deployment
node deployment-cli.js validate

# Rollback deployment
node deployment-cli.js rollback
```

### Using the API

```typescript
import { DeploymentOrchestrator } from './deployment-orchestrator';

const orchestrator = new DeploymentOrchestrator();

// Full deployment
const result = await orchestrator.deployAll();

// Custom deployment plan
const customPlan = {
  deployIAMRoles: true,
  deployLambdaFunctions: true,
  configureMonitoring: false,
  configureIntegrations: true,
  validateDeployment: true
};

const customResult = await orchestrator.executeDeployment(customPlan);
```

### Environment Variables

Configure the following environment variables:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Service Configuration
S3_REPORTS_BUCKET=privacy-comply-reports
DYNAMODB_TABLE_NAME=privacy-comply-data
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

## Validation and Testing

### Automated Tests

Run the deployment validation tests:

```bash
npm test -- src/services/privacy-comply-agent/infrastructure/__tests__/deployment-validation.test.ts --run
```

### Manual Validation

1. **Check Lambda Functions**:
   ```bash
   aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `privacy-comply`)]'
   ```

2. **Check CloudWatch Alarms**:
   ```bash
   aws cloudwatch describe-alarms --alarm-name-prefix privacy-comply
   ```

3. **Check EventBridge Rules**:
   ```bash
   aws events list-rules --name-prefix privacy-comply
   ```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**:
   - Verify AWS credentials are configured correctly
   - Check IAM permissions for deployment user/role
   - Ensure required service permissions are granted

2. **Lambda Function Creation Fails**:
   - Check if execution role exists and has correct permissions
   - Verify Lambda service limits haven't been exceeded
   - Check VPC configuration if using VPC-enabled functions

3. **CloudWatch Alarms Not Created**:
   - Verify CloudWatch permissions
   - Check if alarm names are unique
   - Ensure metric namespaces are correct

4. **EventBridge Rules Not Triggering**:
   - Verify event patterns match actual AWS events
   - Check CloudTrail is enabled for API call events
   - Ensure Lambda permissions allow EventBridge invocation

### Debugging

Enable verbose logging:

```bash
node deployment-cli.js deploy --verbose
```

Check deployment status:

```bash
node deployment-cli.js status --verbose
```

Test connectivity:

```bash
node deployment-cli.js test
```

### Rollback

If deployment fails or needs to be reverted:

```bash
node deployment-cli.js rollback
```

## Security Considerations

1. **Least Privilege**: All IAM roles follow the principle of least privilege
2. **Encryption**: All data is encrypted in transit and at rest
3. **Audit Logging**: All actions are logged to CloudTrail
4. **Network Security**: VPC endpoints used where applicable
5. **Access Control**: Resource-based policies restrict access to authorized services only

## Cost Optimization

1. **Lambda Pricing**: Functions are configured with appropriate memory and timeout settings
2. **CloudWatch Costs**: Log retention set to 30 days to balance cost and compliance needs
3. **EventBridge**: Event patterns are specific to minimize unnecessary invocations
4. **Monitoring**: Alarms are configured to avoid false positives and excessive notifications

## Maintenance

### Regular Tasks

1. **Update Lambda Functions**: Deploy code updates using the CLI
2. **Review Alarms**: Adjust thresholds based on operational experience
3. **Monitor Costs**: Review AWS billing for Lambda, CloudWatch, and EventBridge usage
4. **Security Updates**: Keep AWS SDK dependencies updated

### Monitoring Health

1. **Check Deployment Status**: Run `deployment-cli.js status` regularly
2. **Review CloudWatch Dashboards**: Monitor function performance and errors
3. **Validate Integrations**: Ensure all service integrations remain functional
4. **Test Connectivity**: Verify AWS service connectivity periodically

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review CloudWatch logs for detailed error information
3. Run validation tests to identify specific problems
4. Use the CLI's verbose mode for detailed deployment information