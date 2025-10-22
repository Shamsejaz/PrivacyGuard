#!/bin/bash

# Dark Web Intelligence Infrastructure Deployment Script

set -e

# Configuration
STACK_NAME="PrivacyGuard-DarkWeb-Intelligence"
TEMPLATE_FILE="cloudformation-template.yaml"
REGION="us-east-1"
ENVIRONMENT="dev"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --stack-name)
      STACK_NAME="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --environment ENV    Environment name (dev, staging, prod) [default: dev]"
      echo "  --region REGION      AWS region [default: us-east-1]"
      echo "  --stack-name NAME    CloudFormation stack name [default: PrivacyGuard-DarkWeb-Intelligence]"
      echo "  --help               Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
  echo "Error: Environment must be one of: dev, staging, prod"
  exit 1
fi

# Update stack name with environment
STACK_NAME="${STACK_NAME}-${ENVIRONMENT}"

echo "Deploying Dark Web Intelligence Infrastructure..."
echo "Stack Name: $STACK_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "Template: $TEMPLATE_FILE"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed or not in PATH"
  exit 1
fi

# Check if template file exists
if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Error: Template file $TEMPLATE_FILE not found"
  exit 1
fi

# Validate CloudFormation template
echo "Validating CloudFormation template..."
aws cloudformation validate-template \
  --template-body file://$TEMPLATE_FILE \
  --region $REGION

if [[ $? -ne 0 ]]; then
  echo "Error: Template validation failed"
  exit 1
fi

echo "Template validation successful"

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].StackName' \
  --output text 2>/dev/null || echo "NONE")

if [[ "$STACK_EXISTS" == "NONE" ]]; then
  echo "Creating new stack: $STACK_NAME"
  OPERATION="create-stack"
else
  echo "Updating existing stack: $STACK_NAME"
  OPERATION="update-stack"
fi

# Deploy the stack
echo "Deploying stack..."
aws cloudformation $OPERATION \
  --stack-name $STACK_NAME \
  --template-body file://$TEMPLATE_FILE \
  --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $REGION \
  --tags Key=Project,Value=PrivacyGuard \
         Key=Component,Value=DarkWebIntelligence \
         Key=Environment,Value=$ENVIRONMENT

if [[ $? -ne 0 ]]; then
  echo "Error: Stack deployment failed"
  exit 1
fi

# Wait for stack operation to complete
echo "Waiting for stack operation to complete..."
if [[ "$OPERATION" == "create-stack" ]]; then
  aws cloudformation wait stack-create-complete \
    --stack-name $STACK_NAME \
    --region $REGION
else
  aws cloudformation wait stack-update-complete \
    --stack-name $STACK_NAME \
    --region $REGION
fi

if [[ $? -ne 0 ]]; then
  echo "Error: Stack operation did not complete successfully"
  echo "Check the CloudFormation console for details"
  exit 1
fi

echo "Stack deployment completed successfully!"

# Display stack outputs
echo ""
echo "Stack Outputs:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue,Description]' \
  --output table

echo ""
echo "Next steps:"
echo "1. Configure API credentials in AWS Secrets Manager"
echo "2. Deploy Lambda functions for dark web scanning"
echo "3. Set up notification endpoints (Teams, Slack, etc.)"
echo "4. Configure scan schedules and monitoring rules"