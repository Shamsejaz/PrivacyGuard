# AWS Agent Testing Guide - Fresh Account Setup

This guide will walk you through testing the PrivacyGuard AWS integration step-by-step with a fresh AWS account.

## Prerequisites

- Fresh AWS account with administrative access
- AWS CLI installed on your machine
- Node.js 18+ installed
- Docker installed (optional, for containerized deployment)

## Phase 1: AWS Account Setup (15-20 minutes)

### Step 1: Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Follow the registration process
4. Verify your email and phone number
5. Add payment method (required even for free tier)

### Step 2: Enable Required AWS Services
1. **Enable Bedrock Service**:
   - Go to AWS Console → Amazon Bedrock
   - Click "Get Started"
   - Request access to Claude 3 Sonnet model:
     - Navigate to "Model access" in left sidebar
     - Click "Request model access"
     - Select "Anthropic Claude 3 Sonnet"
     - Submit request (usually approved within minutes)

2. **Verify Service Availability**:
   - Ensure these services are available in your region:
     - Amazon Bedrock
     - AWS Lambda
     - Amazon S3
     - Amazon DynamoDB
     - AWS IAM
     - Amazon CloudWatch

### Step 3: Create IAM User for PrivacyGuard
1. Go to AWS Console → IAM → Users
2. Click "Create user"
3. Username: `privacyguard-agent`
4. Select "Programmatic access"
5. Attach policies:
   - `AmazonBedrockFullAccess`
   - `AWSLambdaFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonDynamoDBFullAccess`
   - `CloudWatchFullAccess`
   - `IAMReadOnlyAccess`
6. Download the Access Key ID and Secret Access Key

### Step 4: Configure AWS CLI
```bash
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Default region: us-east-1
# Default output format: json
```

## Phase 2: Environment Configuration (10 minutes)

### Step 1: Set Environment Variables
Create a `.env.aws` file in your project root:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# S3 Configuration
S3_REPORTS_BUCKET=privacyguard-reports-test
S3_REGION=us-east-1

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=privacyguard-compliance-findings
DYNAMODB_REGION=us-east-1

# SageMaker Configuration (optional for Phase 1)
SAGEMAKER_ENDPOINT_NAME=privacy-comply-endpoint
SAGEMAKER_REGION=us-east-1
```

### Step 2: Load Environment Variables
```bash
# Linux/Mac
source .env.aws

# Windows
# Copy the variables to your system environment or use:
# Get-Content .env.aws | ForEach-Object { $name, $value = $_.split('='); Set-Item -Path "env:$name" -Value $value }
```

## Phase 3: Test Basic AWS Connectivity (5 minutes)

### Step 1: Test AWS CLI Access
```bash
# Test basic AWS access
aws sts get-caller-identity

# Test Bedrock access
aws bedrock list-foundation-models --region us-east-1

# Test S3 access
aws s3 ls
```

### Step 2: Create Required AWS Resources
```bash
# Create S3 bucket for reports
aws s3 mb s3://privacyguard-reports-test --region us-east-1

# Create DynamoDB table
aws dynamodb create-table \
    --table-name privacyguard-compliance-findings \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --global-secondary-indexes \
        IndexName=TimestampIndex,KeySchema=[{AttributeName=timestamp,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1
```

## Phase 4: Test Bedrock Integration (10 minutes)

### Step 1: Install Dependencies
```bash
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-bedrock
```

### Step 2: Test Bedrock Service
Create a test file `test-bedrock.js`:

```javascript
import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';

async function testBedrock() {
    try {
        console.log('🚀 Testing Bedrock Service...');
        
        const bedrockService = new BedrockService();
        
        // Test 1: List available models
        console.log('📋 Testing model listing...');
        const models = await bedrockService.listFoundationModels();
        console.log(`✅ Found ${models.length} models`);
        
        // Test 2: Get model info
        console.log('📊 Testing model info...');
        const modelInfo = await bedrockService.getModelInfo();
        console.log('✅ Model info retrieved:', modelInfo?.modelName || 'Claude 3 Sonnet');
        
        // Test 3: Simple compliance query
        console.log('🤖 Testing compliance query...');
        const response = await bedrockService.invokeClaudeForCompliance(
            'What are the key GDPR requirements for data encryption?'
        );
        console.log('✅ Compliance query successful');
        console.log('Response length:', response.response.length);
        console.log('Confidence:', response.confidence);
        
        // Test 4: Streaming response
        console.log('🌊 Testing streaming response...');
        const stream = await bedrockService.streamComplianceAnalysis(
            'Explain the CCPA data subject rights in simple terms.'
        );
        
        let streamedContent = '';
        for await (const chunk of stream) {
            streamedContent += chunk;
            process.stdout.write('.');
        }
        console.log('\n✅ Streaming test completed');
        console.log('Streamed content length:', streamedContent.length);
        
        console.log('🎉 All Bedrock tests passed!');
        
    } catch (error) {
        console.error('❌ Bedrock test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testBedrock();
```

Run the test:
```bash
node test-bedrock.js
```

## Phase 5: Test Complete Agent Functionality (15 minutes)

### Step 1: Test Compliance Analysis
Create `test-compliance.js`:

```javascript
import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';

async function testComplianceAnalysis() {
    const bedrockService = new BedrockService();
    
    // Mock compliance findings
    const mockFindings = [
        {
            id: 'finding-001',
            resourceArn: 'arn:aws:s3:::test-bucket',
            findingType: 'ENCRYPTION',
            severity: 'HIGH',
            description: 'S3 bucket not encrypted at rest',
            detectedAt: new Date()
        },
        {
            id: 'finding-002',
            resourceArn: 'arn:aws:iam::123456789012:role/test-role',
            findingType: 'ACCESS_CONTROL',
            severity: 'MEDIUM',
            description: 'IAM role has overly broad permissions',
            detectedAt: new Date()
        }
    ];
    
    try {
        console.log('🔍 Testing compliance analysis...');
        
        const analysis = await bedrockService.analyzeComplianceFindings(mockFindings);
        
        console.log('✅ Analysis completed');
        console.log('Risk Score:', analysis.riskScore);
        console.log('Recommendations:', analysis.recommendations.length);
        console.log('Priority Actions:', analysis.priorityActions.length);
        
        return analysis;
    } catch (error) {
        console.error('❌ Compliance analysis failed:', error.message);
        throw error;
    }
}

testComplianceAnalysis();
```

### Step 2: Test Report Generation
Create `test-reports.js`:

```javascript
import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';

async function testReportGeneration() {
    const bedrockService = new BedrockService();
    
    const mockData = {
        organization: 'Test Company',
        dataProcessingActivities: [
            {
                name: 'Customer Data Processing',
                purpose: 'Service delivery',
                dataTypes: ['email', 'name', 'phone'],
                legalBasis: 'Contract'
            }
        ],
        timeframe: '2024-Q1'
    };
    
    try {
        console.log('📄 Testing DPIA report generation...');
        
        const report = await bedrockService.generateComplianceReport('DPIA', mockData);
        
        console.log('✅ DPIA report generated');
        console.log('Report length:', report.report.length);
        console.log('Has executive summary:', !!report.executiveSummary);
        console.log('Recommendations count:', report.recommendations.length);
        
        return report;
    } catch (error) {
        console.error('❌ Report generation failed:', error.message);
        throw error;
    }
}

testReportGeneration();
```

### Step 3: Test Natural Language Queries
Create `test-queries.js`:

```javascript
import { BedrockService } from './src/services/privacy-comply-agent/aws/BedrockService.js';

async function testNaturalLanguageQueries() {
    const bedrockService = new BedrockService();
    
    const testQueries = [
        'What are my GDPR compliance obligations for customer data?',
        'How should I handle a data breach notification?',
        'What encryption standards are required for HIPAA compliance?',
        'Explain the difference between GDPR and CCPA data subject rights'
    ];
    
    const context = {
        organization: 'Healthcare Provider',
        dataTypes: ['patient records', 'billing information'],
        regions: ['EU', 'California']
    };
    
    try {
        console.log('💬 Testing natural language queries...');
        
        for (const query of testQueries) {
            console.log(`\n🤔 Query: "${query}"`);
            
            const response = await bedrockService.processComplianceQuery(query, context);
            
            console.log('✅ Response received');
            console.log('Confidence:', response.confidence);
            console.log('Sources:', response.sources.length);
            console.log('Follow-up questions:', response.followUpQuestions.length);
        }
        
        console.log('\n🎉 All queries processed successfully!');
        
    } catch (error) {
        console.error('❌ Query processing failed:', error.message);
        throw error;
    }
}

testNaturalLanguageQueries();
```

## Phase 6: Test API Gateway Integration (Optional - 20 minutes)

### Step 1: Deploy Serverless Infrastructure
```bash
# Install Serverless Framework
npm install -g serverless

# Navigate to infrastructure directory
cd infrastructure/api-gateway

# Install dependencies
npm install

# Deploy to AWS
serverless deploy --stage test
```

### Step 2: Test API Endpoints
```bash
# Get the API Gateway URL from deployment output
export API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com/test"

# Test agent status
curl -X GET "$API_URL/api/agent/status"

# Test compliance scan
curl -X POST "$API_URL/api/agent/scan" \
  -H "Content-Type: application/json" \
  -d '{"scope": "s3", "region": "us-east-1"}'

# Test natural language query
curl -X POST "$API_URL/api/agent/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are my GDPR compliance gaps?", "context": {}}'
```

## Phase 7: Monitoring and Validation (10 minutes)

### Step 1: Check CloudWatch Logs
```bash
# View Lambda function logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/privacyguard"

# View recent log events
aws logs filter-log-events \
  --log-group-name "/aws/lambda/privacyguard-api-gateway-test-agentQuery" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### Step 2: Verify DynamoDB Data
```bash
# Check if compliance findings are being stored
aws dynamodb scan \
  --table-name privacyguard-compliance-findings \
  --limit 10
```

### Step 3: Check S3 Reports
```bash
# List generated reports
aws s3 ls s3://privacyguard-reports-test/
```

## Expected Results

After completing all phases, you should see:

✅ **Bedrock Integration**:
- Successfully list foundation models
- Claude 3 Sonnet responding to compliance queries
- Streaming responses working
- Confidence scores calculated

✅ **Compliance Analysis**:
- Risk scores generated (0-100)
- Specific recommendations provided
- Priority actions identified
- Legal mappings to GDPR/CCPA/HIPAA

✅ **Report Generation**:
- DPIA reports generated with executive summaries
- ROPA reports with processing activities
- Audit reports with compliance scores

✅ **Natural Language Processing**:
- Complex compliance questions answered
- Context-aware responses
- Follow-up questions suggested
- High confidence scores (>0.8)

✅ **API Integration** (if deployed):
- All endpoints responding
- WebSocket connections established
- Real-time notifications working

## Troubleshooting Common Issues

### Issue: "Access Denied" for Bedrock
**Solution**: Ensure Claude 3 Sonnet access is approved in Bedrock console

### Issue: "Region not supported"
**Solution**: Use us-east-1 or us-west-2 for Bedrock availability

### Issue: "Credentials not found"
**Solution**: Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set

### Issue: "Model not found"
**Solution**: Check BEDROCK_MODEL_ID matches available models

### Issue: Lambda timeout
**Solution**: Increase timeout in serverless.yml (current: 300s for scans)

## Cost Estimation

For testing (1-2 hours):
- Bedrock Claude 3 Sonnet: ~$2-5
- Lambda executions: <$1
- DynamoDB: <$1
- S3 storage: <$1
- **Total: ~$5-8**

## Next Steps

1. **Production Deployment**: Use the production serverless configuration
2. **Multi-Region Setup**: Deploy to EU regions for GDPR compliance
3. **Advanced Features**: Enable Bedrock Agents for enhanced orchestration
4. **Monitoring**: Set up comprehensive CloudWatch dashboards
5. **Security**: Implement API authentication and WAF protection

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review CloudWatch logs for detailed error messages
3. Verify all environment variables are correctly set
4. Ensure AWS services are available in your region

---

**🎯 Success Criteria**: All tests pass, compliance queries return accurate responses, and reports are generated successfully.