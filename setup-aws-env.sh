#!/bin/bash

# AWS Environment Setup Script for PrivacyGuard Testing
# This script helps set up the AWS environment for testing

set -e

echo "🚀 PrivacyGuard AWS Environment Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if AWS CLI is installed
check_aws_cli() {
    if command -v aws &> /dev/null; then
        print_status "AWS CLI is installed"
        aws --version
    else
        print_error "AWS CLI is not installed"
        print_info "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
}

# Check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 18 or higher
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_warning "Node.js version 18+ recommended. Current: $NODE_VERSION"
        fi
    else
        print_error "Node.js is not installed"
        print_info "Please install Node.js 18+: https://nodejs.org/"
        exit 1
    fi
}

# Create environment file
create_env_file() {
    print_info "Creating .env.aws file..."
    
    # Prompt for AWS credentials
    echo ""
    echo "Please enter your AWS credentials:"
    read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
    read -s -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    echo ""
    read -p "AWS Region (default: us-east-1): " AWS_REGION
    AWS_REGION=${AWS_REGION:-us-east-1}
    
    # Create .env.aws file
    cat > .env.aws << EOF
# AWS Configuration
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=$AWS_REGION

# S3 Configuration
S3_REPORTS_BUCKET=privacyguard-reports-test-$(date +%s)
S3_REGION=$AWS_REGION

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=privacyguard-compliance-findings-test
DYNAMODB_REGION=$AWS_REGION

# SageMaker Configuration (optional)
SAGEMAKER_ENDPOINT_NAME=privacy-comply-endpoint
SAGEMAKER_REGION=$AWS_REGION
EOF

    print_status ".env.aws file created"
}

# Load environment variables
load_env() {
    if [ -f .env.aws ]; then
        print_info "Loading environment variables from .env.aws"
        export $(cat .env.aws | grep -v '^#' | xargs)
        print_status "Environment variables loaded"
    else
        print_error ".env.aws file not found"
        exit 1
    fi
}

# Test AWS credentials
test_aws_credentials() {
    print_info "Testing AWS credentials..."
    
    if aws sts get-caller-identity > /dev/null 2>&1; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
        print_status "AWS credentials are valid"
        print_info "Account ID: $ACCOUNT_ID"
        print_info "User/Role: $USER_ARN"
    else
        print_error "AWS credentials are invalid or insufficient permissions"
        exit 1
    fi
}

# Check Bedrock access
check_bedrock_access() {
    print_info "Checking Bedrock access..."
    
    if aws bedrock list-foundation-models --region $AWS_REGION > /dev/null 2>&1; then
        print_status "Bedrock access confirmed"
        
        # Check if Claude 3 Sonnet is available
        if aws bedrock list-foundation-models --region $AWS_REGION --query 'modelSummaries[?contains(modelId, `claude-3-sonnet`)]' --output text | grep -q claude; then
            print_status "Claude 3 Sonnet model is available"
        else
            print_warning "Claude 3 Sonnet model not found. You may need to request access."
            print_info "Go to AWS Console > Bedrock > Model access to request access"
        fi
    else
        print_error "Cannot access Bedrock. Check permissions and region availability."
        print_info "Bedrock is available in: us-east-1, us-west-2, eu-west-1, ap-southeast-1"
        exit 1
    fi
}

# Create AWS resources
create_aws_resources() {
    print_info "Creating AWS resources..."
    
    # Create S3 bucket
    print_info "Creating S3 bucket: $S3_REPORTS_BUCKET"
    if aws s3 mb s3://$S3_REPORTS_BUCKET --region $AWS_REGION; then
        print_status "S3 bucket created successfully"
    else
        print_warning "S3 bucket creation failed (may already exist)"
    fi
    
    # Create DynamoDB table
    print_info "Creating DynamoDB table: $DYNAMODB_TABLE_NAME"
    if aws dynamodb create-table \
        --table-name $DYNAMODB_TABLE_NAME \
        --attribute-definitions \
            AttributeName=id,AttributeType=S \
            AttributeName=timestamp,AttributeType=N \
        --key-schema \
            AttributeName=id,KeyType=HASH \
        --global-secondary-indexes \
            IndexName=TimestampIndex,KeySchema=[{AttributeName=timestamp,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region $AWS_REGION > /dev/null 2>&1; then
        print_status "DynamoDB table created successfully"
    else
        print_warning "DynamoDB table creation failed (may already exist)"
    fi
}

# Install Node.js dependencies
install_dependencies() {
    print_info "Installing Node.js dependencies..."
    
    # Check if package.json exists
    if [ -f package.json ]; then
        npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-bedrock @aws-sdk/client-s3 @aws-sdk/client-dynamodb
        print_status "AWS SDK dependencies installed"
    else
        print_warning "package.json not found. Make sure you're in the project root directory."
    fi
}

# Run tests
run_tests() {
    print_info "Running AWS integration tests..."
    
    if [ -f run-aws-tests.js ]; then
        node run-aws-tests.js
    else
        print_error "Test runner not found. Make sure run-aws-tests.js exists."
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    print_info "Starting AWS environment setup..."
    
    # Step 1: Check prerequisites
    check_aws_cli
    check_nodejs
    
    # Step 2: Setup environment
    if [ ! -f .env.aws ]; then
        create_env_file
    else
        print_info ".env.aws already exists. Using existing configuration."
    fi
    
    load_env
    
    # Step 3: Test AWS access
    test_aws_credentials
    check_bedrock_access
    
    # Step 4: Create resources
    create_aws_resources
    
    # Step 5: Install dependencies
    install_dependencies
    
    # Step 6: Run tests
    echo ""
    print_info "Setup complete! Ready to run tests."
    echo ""
    echo "To run tests manually:"
    echo "  source .env.aws"
    echo "  node run-aws-tests.js"
    echo ""
    read -p "Run tests now? (y/N): " RUN_TESTS
    
    if [[ $RUN_TESTS =~ ^[Yy]$ ]]; then
        run_tests
    else
        print_info "Setup complete. Run 'node run-aws-tests.js' when ready to test."
    fi
}

# Run main function
main "$@"