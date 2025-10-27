#!/bin/bash

# Setup S3 Bucket for PrivacyComply Agent
BUCKET_NAME=${1:-privacycomply-reports-$(date +%s)}
REGION=${2:-us-east-1}

echo "🪣 Setting up S3 bucket for PrivacyComply Agent..."
echo "Bucket name: $BUCKET_NAME"
echo "Region: $REGION"

# Check if bucket name is available
echo ""
echo "1. Checking bucket name availability..."
if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "   ⚠️  Bucket $BUCKET_NAME already exists"
    echo "   🔧 Please choose a different name or use existing bucket"
else
    echo "   ✅ Bucket name $BUCKET_NAME is available"
fi

# Create the bucket
echo ""
echo "2. Creating S3 bucket..."
if [ "$REGION" = "us-east-1" ]; then
    # us-east-1 doesn't need LocationConstraint
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION"
else
    # Other regions need LocationConstraint
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
fi

if [ $? -eq 0 ]; then
    echo "   ✅ Bucket created successfully"
else
    echo "   ❌ Failed to create bucket"
    exit 1
fi

# Enable versioning
echo ""
echo "3. Enabling bucket versioning..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Enabled

if [ $? -eq 0 ]; then
    echo "   ✅ Versioning enabled"
else
    echo "   ⚠️  Failed to enable versioning"
fi

# Set up bucket policy for PrivacyComply access
echo ""
echo "4. Setting up bucket policy..."

# Get current AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create bucket policy
cat > bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PrivacyComplyAgentAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::${ACCOUNT_ID}:root"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${BUCKET_NAME}",
                "arn:aws:s3:::${BUCKET_NAME}/*"
            ]
        }
    ]
}
EOF

# Apply bucket policy
aws s3api put-bucket-policy \
    --bucket "$BUCKET_NAME" \
    --policy file://bucket-policy.json

if [ $? -eq 0 ]; then
    echo "   ✅ Bucket policy applied"
else
    echo "   ⚠️  Failed to apply bucket policy"
fi

# Set up encryption
echo ""
echo "5. Enabling server-side encryption..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [
            {
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }
        ]
    }'

if [ $? -eq 0 ]; then
    echo "   ✅ Encryption enabled"
else
    echo "   ⚠️  Failed to enable encryption"
fi

# Test bucket access
echo ""
echo "6. Testing bucket access..."

# Create test file
echo "PrivacyComply Agent Test File" > test-file.txt

# Upload test file
aws s3 cp test-file.txt s3://"$BUCKET_NAME"/test-file.txt

if [ $? -eq 0 ]; then
    echo "   ✅ Upload test successful"
    
    # Download test file
    aws s3 cp s3://"$BUCKET_NAME"/test-file.txt downloaded-test-file.txt
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Download test successful"
        
        # Clean up test files
        aws s3 rm s3://"$BUCKET_NAME"/test-file.txt
        rm test-file.txt downloaded-test-file.txt
        echo "   ✅ Cleanup completed"
    else
        echo "   ❌ Download test failed"
    fi
else
    echo "   ❌ Upload test failed"
fi

# Clean up policy file
rm bucket-policy.json

echo ""
echo "🎉 S3 bucket setup complete!"
echo ""
echo "📋 Bucket details for PrivacyComply setup:"
echo "Bucket Name: $BUCKET_NAME"
echo "Region: $REGION"
echo "ARN: arn:aws:s3:::$BUCKET_NAME"
echo ""
echo "🔧 Use this bucket name in the PrivacyComply Agent setup wizard:"
echo "$BUCKET_NAME"