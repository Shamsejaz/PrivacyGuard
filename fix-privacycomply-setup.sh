#!/bin/bash

# Complete PrivacyComply Agent Setup Fix Script
# This script addresses all three common setup issues

echo "🛡️ PrivacyComply Agent Setup Fix Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $1 in
        "success") echo -e "${GREEN}✅ $2${NC}" ;;
        "error") echo -e "${RED}❌ $2${NC}" ;;
        "warning") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "info") echo -e "${BLUE}ℹ️  $2${NC}" ;;
    esac
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    print_status "error" "AWS CLI not found. Please install it first."
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

print_status "success" "AWS CLI found"

# Issue 1: AWS Credentials
echo ""
echo "🔑 Issue 1: Checking AWS Credentials..."

if aws sts get-caller-identity >/dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    print_status "success" "AWS credentials are valid"
    print_status "info" "Account ID: $ACCOUNT_ID"
    print_status "info" "User/Role: $USER_ARN"
else
    print_status "error" "AWS credentials not configured"
    echo ""
    echo "🔧 To fix AWS credentials:"
    echo "1. Run: aws configure"
    echo "2. Enter your Access Key ID (starts with AKIA...)"
    echo "3. Enter your Secret Access Key"
    echo "4. Enter your region (e.g., us-east-1)"
    echo "5. Press Enter for default output format"
    echo ""
    echo "Or set environment variables:"
    echo "export AWS_ACCESS_KEY_ID=your-access-key"
    echo "export AWS_SECRET_ACCESS_KEY=your-secret-key"
    echo "export AWS_DEFAULT_REGION=us-east-1"
    exit 1
fi

# Issue 2: Amazon Bedrock Access
echo ""
echo "🤖 Issue 2: Checking Amazon Bedrock Access..."

REGION=$(aws configure get region || echo "us-east-1")
print_status "info" "Using region: $REGION"

# Check Bedrock availability
AVAILABLE_REGIONS=("us-east-1" "us-west-2" "eu-west-1" "ap-southeast-1")
if [[ " ${AVAILABLE_REGIONS[@]} " =~ " ${REGION} " ]]; then
    print_status "success" "Bedrock is available in $REGION"
else
    print_status "error" "Bedrock is not available in $REGION"
    print_status "info" "Available regions: ${AVAILABLE_REGIONS[*]}"
    echo ""
    echo "🔧 To fix Bedrock region issue:"
    echo "1. Change your AWS region to one of the available regions"
    echo "2. Run: aws configure set region us-east-1"
    exit 1
fi

# Test Bedrock access
if aws bedrock list-foundation-models --region $REGION >/dev/null 2>&1; then
    print_status "success" "Bedrock API access granted"
    
    # Check Claude models
    CLAUDE_MODELS=$(aws bedrock list-foundation-models --region $REGION --query 'modelSummaries[?contains(modelId, `claude`)].modelId' --output text)
    
    if [ -n "$CLAUDE_MODELS" ]; then
        print_status "success" "Claude models are available"
        
        # Check specific Claude 3 Sonnet model
        CLAUDE_MODEL="anthropic.claude-3-sonnet-20240229-v1:0"
        if echo "$CLAUDE_MODELS" | grep -q "claude-3-sonnet"; then
            print_status "success" "Claude 3 Sonnet is accessible"
        else
            print_status "warning" "Claude 3 Sonnet not found, but other Claude models available"
        fi
    else
        print_status "error" "No Claude models available"
        echo ""
        echo "🔧 To enable Bedrock model access:"
        echo "1. Go to AWS Console → Amazon Bedrock"
        echo "2. Click 'Model access' in the left sidebar"
        echo "3. Click 'Manage model access'"
        echo "4. Enable 'Anthropic Claude 3 Sonnet'"
        echo "5. Submit the request (usually approved instantly)"
        exit 1
    fi
else
    print_status "error" "Bedrock API access denied"
    echo ""
    echo "🔧 To fix Bedrock access:"
    echo "1. Ensure your IAM user/role has these permissions:"
    echo "   - bedrock:ListFoundationModels"
    echo "   - bedrock:InvokeModel"
    echo "   - bedrock:GetFoundationModel"
    echo "2. Check if Bedrock is available in your region"
    echo "3. Verify your AWS account has Bedrock access"
    exit 1
fi

# Issue 3: S3 Bucket Permissions
echo ""
echo "🪣 Issue 3: Checking S3 Access..."

# Test basic S3 access
if aws s3 ls >/dev/null 2>&1; then
    print_status "success" "S3 access granted"
else
    print_status "error" "S3 access denied"
    echo ""
    echo "🔧 To fix S3 access:"
    echo "1. Ensure your IAM user/role has these permissions:"
    echo "   - s3:ListAllMyBuckets"
    echo "   - s3:CreateBucket"
    echo "   - s3:GetObject"
    echo "   - s3:PutObject"
    echo "   - s3:DeleteObject"
    echo "   - s3:ListBucket"
    exit 1
fi

# Suggest bucket name
SUGGESTED_BUCKET="privacycomply-reports-$ACCOUNT_ID-$(date +%Y%m%d)"
print_status "info" "Suggested S3 bucket name: $SUGGESTED_BUCKET"

# Test if suggested bucket exists
if aws s3api head-bucket --bucket "$SUGGESTED_BUCKET" 2>/dev/null; then
    print_status "info" "Suggested bucket already exists and is accessible"
else
    print_status "info" "Suggested bucket name is available"
    
    echo ""
    read -p "Would you like to create the S3 bucket '$SUGGESTED_BUCKET'? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Creating S3 bucket..."
        
        if [ "$REGION" = "us-east-1" ]; then
            aws s3api create-bucket --bucket "$SUGGESTED_BUCKET" --region "$REGION"
        else
            aws s3api create-bucket \
                --bucket "$SUGGESTED_BUCKET" \
                --region "$REGION" \
                --create-bucket-configuration LocationConstraint="$REGION"
        fi
        
        if [ $? -eq 0 ]; then
            print_status "success" "S3 bucket created successfully"
            
            # Enable versioning
            aws s3api put-bucket-versioning \
                --bucket "$SUGGESTED_BUCKET" \
                --versioning-configuration Status=Enabled
            
            print_status "success" "Bucket versioning enabled"
        else
            print_status "error" "Failed to create S3 bucket"
            exit 1
        fi
    fi
fi

# Generate Lambda execution role ARN
LAMBDA_ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/PrivacyComply-Lambda-ExecutionRole"

# Final summary
echo ""
echo "🎉 Setup Check Complete!"
echo "======================="
echo ""
echo "📋 Configuration for PrivacyComply Agent Setup Wizard:"
echo ""
echo "AWS Credentials:"
echo "  Access Key ID: $(aws configure get aws_access_key_id)"
echo "  Secret Access Key: [Hidden - use your actual secret key]"
echo "  Region: $REGION"
echo ""
echo "Amazon Bedrock:"
echo "  Model ID: anthropic.claude-3-sonnet-20240229-v1:0"
echo "  Region: $REGION"
echo ""
echo "S3 Configuration:"
echo "  Reports Bucket: $SUGGESTED_BUCKET"
echo "  Region: $REGION"
echo ""
echo "Lambda Configuration:"
echo "  Execution Role ARN: $LAMBDA_ROLE_ARN"
echo "  Region: $REGION"
echo ""
echo "🔧 Next Steps:"
echo "1. Copy the configuration values above"
echo "2. Open the PrivacyComply Agent setup wizard"
echo "3. Paste the values into the corresponding fields"
echo "4. Complete the setup process"
echo ""
echo "⚠️  Note: Make sure to create the Lambda execution role if it doesn't exist:"
echo "   Run: ./create-lambda-role.sh"