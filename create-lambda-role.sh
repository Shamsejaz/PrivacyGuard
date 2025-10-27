#!/bin/bash

# Create Lambda Execution Role for PrivacyComply Agent
# Make sure you have AWS CLI configured with appropriate permissions

ROLE_NAME="PrivacyComply-Lambda-ExecutionRole"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Creating Lambda execution role for PrivacyComply Agent..."

# Create trust policy for Lambda
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://trust-policy.json \
    --description "Execution role for PrivacyComply Agent Lambda functions"

# Attach basic execution policy
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom policy for PrivacyComply specific permissions
cat > privacycomply-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::privacycomply-*",
                "arn:aws:s3:::privacycomply-*/*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:*:$ACCOUNT_ID:table/privacycomply-*"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "securityhub:GetFindings",
                "macie2:GetFindings"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create and attach the custom policy
aws iam create-policy \
    --policy-name PrivacyComply-Lambda-Policy \
    --policy-document file://privacycomply-policy.json

aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/PrivacyComply-Lambda-Policy

# Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)

echo ""
echo "✅ Lambda execution role created successfully!"
echo "📋 Role ARN: $ROLE_ARN"
echo ""
echo "Use this ARN in your PrivacyComply Agent setup wizard:"
echo "$ROLE_ARN"

# Clean up temporary files
rm trust-policy.json privacycomply-policy.json

echo ""
echo "🔧 Next steps:"
echo "1. Copy the ARN above"
echo "2. Paste it into the Lambda Execution Role field in the setup wizard"
echo "3. Continue with the PrivacyComply Agent setup"