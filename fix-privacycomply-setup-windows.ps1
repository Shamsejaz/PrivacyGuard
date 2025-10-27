# Windows PowerShell Script for PrivacyComply Agent Setup
# Fixes all three common setup issues on Windows

Write-Host "PrivacyComply Agent Setup Fix Script (Windows)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Function to write colored output
function Write-Status {
    param(
        [string]$Type,
        [string]$Message
    )
    
    switch ($Type) {
        "success" { Write-Host "OK $Message" -ForegroundColor Green }
        "error" { Write-Host "ERROR $Message" -ForegroundColor Red }
        "warning" { Write-Host "WARNING $Message" -ForegroundColor Yellow }
        "info" { Write-Host "INFO $Message" -ForegroundColor Blue }
    }
}

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>$null
    if ($awsVersion) {
        Write-Status "success" "AWS CLI found: $awsVersion"
    } else {
        throw "AWS CLI not found"
    }
} catch {
    Write-Status "error" "AWS CLI not found"
    Write-Host ""
    Write-Host "🔧 To install AWS CLI on Windows:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://aws.amazon.com/cli/" -ForegroundColor White
    Write-Host "2. Or run as Administrator: choco install awscli" -ForegroundColor White
    Write-Host "3. Or run: winget install Amazon.AWSCLI" -ForegroundColor White
    exit 1
}

# Issue 1: AWS Credentials
Write-Host ""
Write-Host "🔑 Issue 1: Checking AWS Credentials..." -ForegroundColor Cyan

try {
    $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
    if ($identity) {
        Write-Status "success" "AWS credentials are valid"
        Write-Status "info" "Account ID: $($identity.Account)"
        Write-Status "info" "User ARN: $($identity.Arn)"
        $accountId = $identity.Account
    } else {
        throw "Invalid credentials"
    }
} catch {
    Write-Status "error" "AWS credentials not configured"
    Write-Host ""
    Write-Host "🔧 To configure AWS credentials on Windows:" -ForegroundColor Yellow
    Write-Host "1. Open PowerShell or Command Prompt" -ForegroundColor White
    Write-Host "2. Run: aws configure" -ForegroundColor White
    Write-Host "3. Enter your Access Key ID (starts with AKIA...)" -ForegroundColor White
    Write-Host "4. Enter your Secret Access Key" -ForegroundColor White
    Write-Host "5. Enter region: us-east-1" -ForegroundColor White
    Write-Host "6. Press Enter for output format" -ForegroundColor White
    Write-Host ""
    Write-Host "Or set environment variables:" -ForegroundColor Yellow
    Write-Host '$env:AWS_ACCESS_KEY_ID="your-access-key"' -ForegroundColor White
    Write-Host '$env:AWS_SECRET_ACCESS_KEY="your-secret-key"' -ForegroundColor White
    Write-Host '$env:AWS_DEFAULT_REGION="us-east-1"' -ForegroundColor White
    exit 1
}

# Issue 2: Amazon Bedrock Access
Write-Host ""
Write-Host "🤖 Issue 2: Checking Amazon Bedrock Access..." -ForegroundColor Cyan

$region = "us-east-1"
try {
    $awsRegion = aws configure get region
    if ($awsRegion) {
        $region = $awsRegion
    }
} catch {
    # Use default region
}

Write-Status "info" "Using region: $region"

# Check Bedrock availability
$availableRegions = @("us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1")
if ($availableRegions -contains $region) {
    Write-Status "success" "Bedrock is available in $region"
} else {
    Write-Status "error" "Bedrock is not available in $region"
    Write-Status "info" "Available regions: $($availableRegions -join ', ')"
    Write-Host ""
    Write-Host "🔧 To fix Bedrock region issue:" -ForegroundColor Yellow
    Write-Host "1. Run: aws configure set region us-east-1" -ForegroundColor White
    exit 1
}

# Test Bedrock access
try {
    $models = aws bedrock list-foundation-models --region $region --output json 2>$null | ConvertFrom-Json
    if ($models) {
        Write-Status "success" "Bedrock API access granted"
        
        # Check Claude models
        $claudeModels = $models.modelSummaries | Where-Object { $_.modelId -like "*claude*" }
        
        if ($claudeModels) {
            Write-Status "success" "Claude models are available"
            
            # Check specific Claude 3 Sonnet model
            $claudeModel = "anthropic.claude-3-sonnet-20240229-v1:0"
            $sonnetModel = $claudeModels | Where-Object { $_.modelId -like "*claude-3-sonnet*" }
            
            if ($sonnetModel) {
                Write-Status "success" "Claude 3 Sonnet is accessible"
            } else {
                Write-Status "warning" "Claude 3 Sonnet not found, but other Claude models available"
            }
        } else {
            Write-Status "error" "No Claude models available"
            Write-Host ""
            Write-Host "🔧 To enable Bedrock model access:" -ForegroundColor Yellow
            Write-Host "1. Go to AWS Console → Amazon Bedrock" -ForegroundColor White
            Write-Host "2. Click 'Model access' in the left sidebar" -ForegroundColor White
            Write-Host "3. Click 'Manage model access'" -ForegroundColor White
            Write-Host "4. Enable 'Anthropic Claude 3 Sonnet'" -ForegroundColor White
            Write-Host "5. Submit the request (usually approved instantly)" -ForegroundColor White
            exit 1
        }
    } else {
        throw "No response from Bedrock API"
    }
} catch {
    Write-Status "error" "Bedrock API access denied"
    Write-Host ""
    Write-Host "🔧 To fix Bedrock access:" -ForegroundColor Yellow
    Write-Host "1. Ensure your IAM user/role has these permissions:" -ForegroundColor White
    Write-Host "   - bedrock:ListFoundationModels" -ForegroundColor White
    Write-Host "   - bedrock:InvokeModel" -ForegroundColor White
    Write-Host "   - bedrock:GetFoundationModel" -ForegroundColor White
    Write-Host "2. Check if Bedrock is available in your region" -ForegroundColor White
    Write-Host "3. Verify your AWS account has Bedrock access" -ForegroundColor White
    exit 1
}

# Issue 3: S3 Bucket Permissions
Write-Host ""
Write-Host "🪣 Issue 3: Checking S3 Access..." -ForegroundColor Cyan

# Test basic S3 access
try {
    $buckets = aws s3 ls --output json 2>$null
    if ($buckets) {
        Write-Status "success" "S3 access granted"
    } else {
        throw "No S3 access"
    }
} catch {
    Write-Status "error" "S3 access denied"
    Write-Host ""
    Write-Host "🔧 To fix S3 access:" -ForegroundColor Yellow
    Write-Host "1. Ensure your IAM user/role has these permissions:" -ForegroundColor White
    Write-Host "   - s3:ListAllMyBuckets" -ForegroundColor White
    Write-Host "   - s3:CreateBucket" -ForegroundColor White
    Write-Host "   - s3:GetObject" -ForegroundColor White
    Write-Host "   - s3:PutObject" -ForegroundColor White
    Write-Host "   - s3:DeleteObject" -ForegroundColor White
    Write-Host "   - s3:ListBucket" -ForegroundColor White
    exit 1
}

# Suggest bucket name
$timestamp = Get-Date -Format "yyyyMMdd"
$suggestedBucket = "privacycomply-reports-$accountId-$timestamp"
Write-Status "info" "Suggested S3 bucket name: $suggestedBucket"

# Test if suggested bucket exists
try {
    aws s3api head-bucket --bucket $suggestedBucket 2>$null
    Write-Status "info" "Suggested bucket already exists and is accessible"
} catch {
    Write-Status "info" "Suggested bucket name is available"
    
    $createBucket = Read-Host "Would you like to create the S3 bucket '$suggestedBucket'? (y/n)"
    
    if ($createBucket -eq 'y' -or $createBucket -eq 'Y') {
        Write-Host "Creating S3 bucket..." -ForegroundColor Yellow
        
        try {
            if ($region -eq "us-east-1") {
                aws s3api create-bucket --bucket $suggestedBucket --region $region
            } else {
                aws s3api create-bucket --bucket $suggestedBucket --region $region --create-bucket-configuration LocationConstraint=$region
            }
            
            Write-Status "success" "S3 bucket created successfully"
            
            # Enable versioning
            aws s3api put-bucket-versioning --bucket $suggestedBucket --versioning-configuration Status=Enabled
            Write-Status "success" "Bucket versioning enabled"
        } catch {
            Write-Status "error" "Failed to create S3 bucket"
            exit 1
        }
    }
}

# Generate Lambda execution role ARN
$lambdaRoleArn = "arn:aws:iam::$accountId:role/PrivacyComply-Lambda-ExecutionRole"

# Final summary
Write-Host ""
Write-Host "🎉 Setup Check Complete!" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration for PrivacyComply Agent Setup Wizard:" -ForegroundColor Cyan
Write-Host ""
Write-Host "AWS Credentials:" -ForegroundColor Yellow
$accessKey = aws configure get aws_access_key_id
Write-Host "  Access Key ID: $accessKey" -ForegroundColor White
Write-Host "  Secret Access Key: [Hidden - use your actual secret key]" -ForegroundColor White
Write-Host "  Region: $region" -ForegroundColor White
Write-Host ""
Write-Host "Amazon Bedrock:" -ForegroundColor Yellow
Write-Host "  Model ID: anthropic.claude-3-sonnet-20240229-v1:0" -ForegroundColor White
Write-Host "  Region: $region" -ForegroundColor White
Write-Host ""
Write-Host "S3 Configuration:" -ForegroundColor Yellow
Write-Host "  Reports Bucket: $suggestedBucket" -ForegroundColor White
Write-Host "  Region: $region" -ForegroundColor White
Write-Host ""
Write-Host "Lambda Configuration:" -ForegroundColor Yellow
Write-Host "  Execution Role ARN: $lambdaRoleArn" -ForegroundColor White
Write-Host "  Region: $region" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy the configuration values above" -ForegroundColor White
Write-Host "2. Open the PrivacyComply Agent setup wizard" -ForegroundColor White
Write-Host "3. Paste the values into the corresponding fields" -ForegroundColor White
Write-Host "4. Complete the setup process" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Note: Make sure to create the Lambda execution role if it doesn't exist:" -ForegroundColor Yellow
Write-Host "   Run: .\create-lambda-role-windows.ps1" -ForegroundColor White

# Save configuration to file for easy reference
$config = @{
    "AWS_ACCESS_KEY_ID" = $accessKey
    "AWS_REGION" = $region
    "BEDROCK_MODEL_ID" = "anthropic.claude-3-sonnet-20240229-v1:0"
    "S3_REPORTS_BUCKET" = $suggestedBucket
    "LAMBDA_EXECUTION_ROLE_ARN" = $lambdaRoleArn
}

$config | ConvertTo-Json | Out-File -FilePath "privacycomply-config.json" -Encoding UTF8
Write-Host ""
Write-Host "💾 Configuration saved to: privacycomply-config.json" -ForegroundColor Green