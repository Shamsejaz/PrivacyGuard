# AWS Agent Quick Start Guide

Get your PrivacyGuard AWS integration up and running in 15 minutes with a fresh AWS account.

## 🚀 One-Command Setup

### Linux/Mac
```bash
chmod +x setup-aws-env.sh
./setup-aws-env.sh
```

### Windows PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-aws-env.ps1
```

## 📋 What the Setup Does

1. **Validates Prerequisites**
   - Checks AWS CLI installation
   - Verifies Node.js 18+ is installed
   - Tests AWS credentials

2. **Creates AWS Resources**
   - S3 bucket for compliance reports
   - DynamoDB table for findings storage
   - Validates Bedrock access

3. **Installs Dependencies**
   - AWS SDK packages
   - Required Node.js modules

4. **Runs Comprehensive Tests**
   - Bedrock connectivity
   - Claude 3 Sonnet integration
   - Compliance analysis
   - Report generation
   - Natural language queries

## 🎯 Expected Test Results

```
🧪 Running Test: Prerequisites Check
✅ Prerequisites Check PASSED (1234ms)

🧪 Running Test: Bedrock Connectivity
✅ Found 15 foundation models
✅ Model info retrieved: Claude 3 Sonnet
✅ Bedrock invocation successful (156 chars)
✅ Bedrock Connectivity PASSED (2345ms)

🧪 Running Test: Compliance Analysis
✅ Analysis completed (1247 chars)
✅ Risk score: 75/100
✅ Recommendations: 4
✅ Compliance Analysis PASSED (3456ms)

🧪 Running Test: Report Generation
✅ DPIA report generated (2134 chars)
✅ Executive summary included (234 chars)
✅ ROPA report generated (1876 chars)
✅ Report Generation PASSED (4567ms)

🧪 Running Test: Natural Language Queries
✅ Response received (567 chars, confidence: 0.89)
✅ Natural Language Queries PASSED (5678ms)

📊 TEST SUMMARY
================
Total Tests: 7
✅ Passed: 7
❌ Failed: 0
📈 Success Rate: 100.0%

🎉 ALL TESTS PASSED! AWS integration is working correctly.
```

## 🔧 Manual Setup (If Automated Setup Fails)

### Step 1: AWS Account Setup
1. Create AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Enable Bedrock service and request Claude 3 Sonnet access
3. Create IAM user with required permissions

### Step 2: Environment Configuration
```bash
# Create .env.aws file
cat > .env.aws << 'EOF'
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
S3_REPORTS_BUCKET=privacyguard-reports-test
DYNAMODB_TABLE_NAME=privacyguard-compliance-findings-test
EOF

# Load environment variables
source .env.aws  # Linux/Mac
# or use PowerShell equivalent on Windows
```

### Step 3: Create AWS Resources
```bash
# Create S3 bucket
aws s3 mb s3://privacyguard-reports-test --region us-east-1

# Create DynamoDB table
aws dynamodb create-table \
    --table-name privacyguard-compliance-findings-test \
    --attribute-definitions AttributeName=id,AttributeType=S AttributeName=timestamp,AttributeType=N \
    --key-schema AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --region us-east-1
```

### Step 4: Install Dependencies
```bash
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-bedrock
```

### Step 5: Run Tests
```bash
node run-aws-tests.js
```

## 🧪 Individual Test Commands

Run specific tests if needed:

```bash
# Test Bedrock connectivity only
node test-bedrock.js

# Test compliance analysis
node test-compliance.js

# Test report generation
node test-reports.js

# Test natural language queries
node test-queries.js
```

## 🔍 Troubleshooting

### Common Issues

**❌ "Access Denied" for Bedrock**
```bash
# Solution: Request model access in AWS Console
# Go to: AWS Console > Bedrock > Model access > Request access to Claude 3 Sonnet
```

**❌ "Region not supported"**
```bash
# Solution: Use supported regions
export AWS_REGION=us-east-1  # or us-west-2, eu-west-1
```

**❌ "Credentials not found"**
```bash
# Solution: Verify credentials are set
aws sts get-caller-identity
```

**❌ "Model not found"**
```bash
# Solution: Check available models
aws bedrock list-foundation-models --region us-east-1
```

### Debug Mode

Run tests with detailed logging:
```bash
DEBUG=* node run-aws-tests.js
```

### Check AWS Resources

Verify resources were created:
```bash
# Check S3 bucket
aws s3 ls s3://privacyguard-reports-test/

# Check DynamoDB table
aws dynamodb describe-table --table-name privacyguard-compliance-findings-test

# Check Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

## 💰 Cost Estimation

Testing costs (1-2 hours):
- **Bedrock Claude 3 Sonnet**: $2-5
- **Lambda executions**: <$1
- **DynamoDB**: <$1
- **S3 storage**: <$1
- **Total**: ~$5-8

## 🎯 Success Criteria

✅ All 7 tests pass  
✅ Compliance queries return accurate responses  
✅ Reports generate successfully  
✅ Risk scores calculated (0-100 range)  
✅ Streaming responses work  
✅ Error handling functions properly  

## 📚 Next Steps

After successful testing:

1. **Deploy to Production**: Use `serverless deploy --stage prod`
2. **Set up Monitoring**: Configure CloudWatch dashboards
3. **Enable Multi-Region**: Deploy to EU for GDPR compliance
4. **Add Security**: Implement API authentication
5. **Scale Testing**: Test with larger datasets

## 🆘 Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Review CloudWatch logs for detailed errors
3. Verify all environment variables are set correctly
4. Ensure AWS services are available in your region
5. Check the [AWS Testing Guide](./AWS_TESTING_GUIDE.md) for detailed steps

---

**Ready to test?** Run the setup script and you'll be analyzing compliance with AI in minutes! 🚀