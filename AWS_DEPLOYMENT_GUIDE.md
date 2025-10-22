# PrivacyGuard AWS Deployment Guide

Complete guide for deploying the PrivacyGuard AI Agent to AWS using Infrastructure as Code.

## 🏗️ Architecture Overview

The PrivacyGuard AWS architecture follows a serverless-first, multi-region approach designed for enterprise-scale privacy compliance management.

### Key Components

- **🤖 AI/ML Layer**: Amazon Bedrock (Claude 3 Sonnet), SageMaker, Comprehend
- **⚡ Compute Layer**: AWS Lambda functions with auto-scaling
- **🌐 API Layer**: API Gateway with CloudFront CDN
- **💾 Data Layer**: DynamoDB, S3, RDS PostgreSQL
- **🔒 Security Layer**: WAF, KMS, Secrets Manager, IAM
- **📊 Monitoring**: CloudWatch, X-Ray, CloudTrail

## 📋 Prerequisites

### AWS Account Setup
- AWS Account with administrative access
- AWS CLI configured with appropriate credentials
- Node.js 18+ and npm installed
- Docker installed (for Lambda layers)

### Required AWS Services
Ensure these services are available in your target regions:
- Amazon Bedrock (us-east-1, us-west-2, eu-west-1, ap-southeast-1)
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3
- AWS KMS
- AWS Secrets Manager

### Permissions Required
Your AWS user/role needs these permissions:
- `AdministratorAccess` (recommended for initial setup)
- Or specific permissions for: Lambda, API Gateway, DynamoDB, S3, KMS, IAM, CloudFormation

## 🚀 Deployment Options

### Option 1: AWS CDK (Recommended)
Infrastructure as Code using AWS CDK with TypeScript.

### Option 2: Serverless Framework
Simplified deployment using Serverless Framework.

### Option 3: Manual AWS Console
Step-by-step manual deployment (not recommended for production).

## 📦 CDK Deployment (Recommended)

### Step 1: Setup CDK Environment

```bash
# Clone the repository
git clone https://github.com/privacyguard/aws-agent.git
cd aws-agent

# Navigate to CDK directory
cd infrastructure/aws-cdk

# Install dependencies
npm install

# Bootstrap CDK (one-time setup per account/region)
npx cdk bootstrap
```

### Step 2: Configure Environment

Create `cdk.context.json`:
```json
{
  "environment": "dev",
  "enableMultiRegion": false,
  "domainName": "your-domain.com",
  "certificateArn": "arn:aws:acm:us-east-1:123456789012:certificate/abc123"
}
```

### Step 3: Deploy Development Environment

```bash
# Synthesize CloudFormation templates
npm run synth:dev

# Review changes
npm run diff:dev

# Deploy to development
npm run deploy:dev
```

### Step 4: Deploy Staging Environment

```bash
# Deploy to staging
npm run deploy:staging
```

### Step 5: Deploy Production Environment

```bash
# Deploy single-region production
npm run deploy:prod

# Or deploy multi-region production
npm run deploy:multi-region
```

## 🌍 Multi-Region Deployment

For global compliance requirements (GDPR, PDPL), deploy across multiple regions:

### Regions and Compliance
- **US East 1** (Primary): Main region, all services
- **EU West 1** (GDPR): European data residency
- **AP Southeast 1** (PDPL): Asia-Pacific data residency

### Multi-Region Setup

```bash
# Deploy all regions
cdk deploy --all \
  --context environment=prod \
  --context enableMultiRegion=true \
  --context domainName=your-domain.com \
  --require-approval broadening
```

### Data Replication
- **DynamoDB Global Tables**: Automatic cross-region replication
- **S3 Cross-Region Replication**: Compliance reports and data
- **RDS Cross-Region Backups**: Metadata and audit logs

## ⚙️ Configuration

### Environment Variables

The deployment automatically configures these environment variables:

```bash
# Application Configuration
ENVIRONMENT=prod
AWS_REGION=us-east-1

# Database Configuration
COMPLIANCE_FINDINGS_TABLE=privacyguard-compliance-findings-prod
DSAR_REQUESTS_TABLE=privacyguard-dsar-requests-prod

# Storage Configuration
REPORTS_BUCKET=privacyguard-reports-prod-123456789012
DATA_LAKE_BUCKET=privacyguard-datalake-prod-123456789012

# AI/ML Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
SAGEMAKER_ENDPOINT_NAME=privacyguard-pii-endpoint

# Security Configuration
SECRETS_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:privacyguard-secrets
KMS_KEY_ID=alias/privacyguard-key

# Integration Configuration
PROCESSING_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/privacyguard-processing
ALERTS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:privacyguard-alerts
```

### Secrets Management

Sensitive configuration is stored in AWS Secrets Manager:

```json
{
  "jwtSecret": "auto-generated-32-character-secret",
  "bedrockModelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "databasePassword": "auto-generated-password",
  "apiKeys": {
    "external": "your-external-api-keys"
  }
}
```

## 🔒 Security Configuration

### IAM Roles and Policies

The deployment creates least-privilege IAM roles:

- **Lambda Execution Role**: Access to DynamoDB, S3, Bedrock, Secrets Manager
- **API Gateway Role**: CloudWatch logging
- **Step Functions Role**: Lambda invocation, state management

### Encryption

All data is encrypted at rest and in transit:

- **KMS Customer Managed Key**: For all encryption needs
- **DynamoDB Encryption**: Customer-managed KMS key
- **S3 Encryption**: KMS encryption for all buckets
- **Secrets Manager**: KMS encryption for secrets
- **Lambda Environment Variables**: KMS encryption

### Network Security

- **VPC**: Optional VPC deployment for enhanced security
- **Security Groups**: Restrictive inbound/outbound rules
- **WAF**: Web Application Firewall with managed rule sets
- **API Gateway**: Throttling and request validation

## 📊 Monitoring and Observability

### CloudWatch Dashboards

Automatically created dashboards for:
- API Gateway metrics (latency, errors, throttling)
- Lambda function metrics (duration, errors, concurrent executions)
- DynamoDB metrics (read/write capacity, throttling)
- Bedrock metrics (invocations, latency, errors)

### Alarms and Notifications

Pre-configured CloudWatch alarms:
- High error rates (>5%)
- High latency (>5 seconds)
- DynamoDB throttling
- Lambda function errors
- Bedrock quota limits

### Logging

Centralized logging with retention policies:
- **API Gateway**: Access logs and execution logs
- **Lambda Functions**: CloudWatch Logs with structured logging
- **CloudTrail**: API calls and resource changes
- **VPC Flow Logs**: Network traffic (if VPC enabled)

## 🧪 Testing the Deployment

### Health Checks

```bash
# Test API Gateway health
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/health

# Test agent endpoint
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/agent/status \
  -H "Content-Type: application/json"

# Test compliance scan
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/agent/scan \
  -H "Content-Type: application/json" \
  -d '{"scanType": "s3", "region": "us-east-1"}'
```

### Integration Tests

```bash
# Run integration test suite
cd tests/integration
npm install
npm test

# Test specific components
npm run test:bedrock
npm run test:compliance
npm run test:dsar
```

### Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Run load tests
artillery run load-tests/api-gateway.yml
artillery run load-tests/bedrock-integration.yml
```

## 💰 Cost Optimization

### Estimated Monthly Costs

| Component | Development | Production |
|-----------|-------------|------------|
| Lambda | $10-50 | $100-500 |
| API Gateway | $5-20 | $50-200 |
| DynamoDB | $5-25 | $50-250 |
| S3 | $5-15 | $25-100 |
| Bedrock | $20-100 | $200-1000 |
| CloudFront | $5-15 | $25-100 |
| **Total** | **$50-225** | **$450-2150** |

### Cost Optimization Strategies

1. **Lambda Optimization**
   - Right-size memory allocation
   - Use ARM-based Graviton2 processors
   - Implement connection pooling

2. **DynamoDB Optimization**
   - Use on-demand billing for variable workloads
   - Implement DynamoDB Accelerator (DAX) for caching
   - Archive old data to S3

3. **S3 Optimization**
   - Use Intelligent Tiering
   - Implement lifecycle policies
   - Enable compression

4. **Bedrock Optimization**
   - Batch requests when possible
   - Implement response caching
   - Use streaming for long responses

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Deploy PrivacyGuard AWS Infrastructure

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd infrastructure/aws-cdk
          npm ci
          
      - name: Run tests
        run: |
          cd infrastructure/aws-cdk
          npm test
          
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
          
      - name: Deploy to development
        if: github.ref == 'refs/heads/develop'
        run: |
          cd infrastructure/aws-cdk
          npm run deploy:dev
          
      - name: Deploy to production
        if: github.ref == 'refs/heads/main'
        run: |
          cd infrastructure/aws-cdk
          npm run deploy:prod
```

## 🛠️ Maintenance and Updates

### Regular Maintenance Tasks

1. **Weekly**
   - Review CloudWatch alarms and metrics
   - Check cost and usage reports
   - Update Lambda function dependencies

2. **Monthly**
   - Review and rotate secrets
   - Update CDK and dependencies
   - Analyze performance metrics

3. **Quarterly**
   - Review IAM permissions and policies
   - Update Bedrock model versions
   - Conduct security assessments

### Updating the Infrastructure

```bash
# Update CDK and dependencies
cd infrastructure/aws-cdk
npm update

# Review changes
npm run diff:prod

# Deploy updates
npm run deploy:prod
```

### Rollback Procedures

```bash
# Rollback to previous version
cdk deploy --rollback

# Or deploy specific version
git checkout <previous-commit>
npm run deploy:prod
```

## 🚨 Troubleshooting

### Common Issues

**1. Bedrock Access Denied**
```bash
# Check model access in AWS Console
aws bedrock list-foundation-models --region us-east-1

# Request access if needed
# Go to AWS Console > Bedrock > Model access
```

**2. Lambda Timeout**
```bash
# Check CloudWatch logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/privacyguard-agent-prod \
  --start-time $(date -d '1 hour ago' +%s)000

# Increase timeout in CDK stack
timeout: cdk.Duration.minutes(15)
```

**3. DynamoDB Throttling**
```bash
# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ThrottledRequests \
  --dimensions Name=TableName,Value=privacyguard-compliance-findings-prod \
  --start-time $(date -d '1 hour ago' --iso-8601) \
  --end-time $(date --iso-8601) \
  --period 300 \
  --statistics Sum

# Switch to on-demand billing if needed
```

**4. API Gateway 5xx Errors**
```bash
# Check API Gateway logs
aws logs filter-log-events \
  --log-group-name API-Gateway-Execution-Logs_<api-id>/prod

# Check Lambda function logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/privacyguard-agent-prod
```

### Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Bedrock Documentation**: https://docs.aws.amazon.com/bedrock/
- **GitHub Issues**: https://github.com/privacyguard/aws-agent/issues

## 📚 Next Steps

1. **Configure Custom Domain**: Set up Route 53 and SSL certificates
2. **Enable Monitoring**: Set up comprehensive dashboards and alerts
3. **Implement Backup Strategy**: Configure automated backups
4. **Security Hardening**: Implement additional security controls
5. **Performance Optimization**: Fine-tune based on usage patterns

---

**🎉 Congratulations!** You now have a fully deployed, enterprise-grade PrivacyGuard AI Agent running on AWS. The system is ready to help you manage privacy compliance at scale with AI-powered insights and automation.