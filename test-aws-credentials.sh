#!/bin/bash

# Test AWS Credentials for PrivacyComply Agent Setup
echo "🔑 Testing AWS Credentials..."

# Check if AWS CLI is configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first."
    exit 1
fi

# Test basic AWS access
echo "1. Testing basic AWS access..."
if aws sts get-caller-identity >/dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    echo "   ✅ AWS credentials are valid"
    echo "   📋 Account ID: $ACCOUNT_ID"
    echo "   👤 User/Role: $USER_ARN"
else
    echo "   ❌ AWS credentials are invalid or not configured"
    echo ""
    echo "🔧 To fix this:"
    echo "1. Run: aws configure"
    echo "2. Enter your Access Key ID"
    echo "3. Enter your Secret Access Key"
    echo "4. Enter your default region (e.g., us-east-1)"
    echo "5. Press Enter for default output format"
    exit 1
fi

# Test required permissions
echo ""
echo "2. Testing required AWS permissions..."

# Test S3 access
echo "   Testing S3 access..."
if aws s3 ls >/dev/null 2>&1; then
    echo "   ✅ S3 access granted"
else
    echo "   ❌ S3 access denied"
fi

# Test IAM access
echo "   Testing IAM access..."
if aws iam list-roles --max-items 1 >/dev/null 2>&1; then
    echo "   ✅ IAM access granted"
else
    echo "   ❌ IAM access denied"
fi

# Test Bedrock access
echo "   Testing Bedrock access..."
if aws bedrock list-foundation-models --region us-east-1 >/dev/null 2>&1; then
    echo "   ✅ Bedrock access granted"
else
    echo "   ❌ Bedrock access denied or not available in region"
fi

# Test DynamoDB access
echo "   Testing DynamoDB access..."
if aws dynamodb list-tables >/dev/null 2>&1; then
    echo "   ✅ DynamoDB access granted"
else
    echo "   ❌ DynamoDB access denied"
fi

echo ""
echo "🎉 Credential testing complete!"
echo ""
echo "📋 Use these credentials in the PrivacyComply setup wizard:"
echo "Access Key ID: $(aws configure get aws_access_key_id)"
echo "Secret Access Key: $(aws configure get aws_secret_access_key | sed 's/./*/g')"
echo "Region: $(aws configure get region)"