# Simple Windows PowerShell Script for PrivacyComply Agent Setup
# Fixes AWS credentials, Bedrock access, and S3 bucket issues

Write-Host "PrivacyComply Agent Setup Fix Script (Windows)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Check if AWS CLI is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>$null
    if ($awsVersion) {
        Write-Host "OK AWS CLI found: $awsVersion" -ForegroundColor Green
    } else {
        throw "AWS CLI not found"
    }
} catch {
    Write-Host "ERROR AWS CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "To install AWS CLI on Windows:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://aws.amazon.com/cli/" -ForegroundColor White
    Write-Host "2. Or run as Administrator: winget install Amazon.AWSCLI" -ForegroundColor White
    exit 1
}

# Issue 1: Check AWS Credentials
Write-Host ""
Write-Host "Issue 1: Checking AWS Credentials..." -ForegroundColor Cyan

try {
    $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
    if ($identity) {
        Write-Host "OK AWS credentials are valid" -ForegroundColor Green
        Write-Host "INFO Account ID: $($identity.Account)" -ForegroundColor Blue
        Write-Host "INFO User ARN: $($identity.Arn)" -ForegroundColor Blue
        $accountId = $identity.Account
    } else {
        throw "Invalid credentials"
    }
} catch {
    Write-Host "ERROR AWS credentials not configured" -ForegroundColor Red
    Write-Host ""
    Write-Host "To configure AWS credentials:" -ForegroundColor Yellow
    Write-Host "1. Run: aws configure" -ForegroundColor White
    Write-Host "2. Enter your Access Key ID (starts with AKIA...)" -ForegroundColor White
    Write-Host "3. Enter your Secret Access Key" -ForegroundColor White
    Write-Host "4. Enter region: us-east-1" -ForegroundColor White
    Write-Host "5. Press Enter for output format" -ForegroundColor White
    exit 1
}

# Issue 2: Check Amazon Bedrock Access
Write-Host ""
Write-Host "Issue 2: Checking Amazon Bedrock Access..." -ForegroundColor Cyan

$region = "us-east-1"
try {
    $awsRegion = aws configure get region
    if ($awsRegion) {
        $region = $awsRegion
    }
} catch {
    # Use default region
}

Write-Host "INFO Using region: $region" -ForegroundColor Blue

# Check Bedrock availability
$availableRegions = @("us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1")
if ($availableRegions -contains $region) {
    Write-Host "OK Bedrock is available in $region" -ForegroundColor Green
} else {
    Write-Host "ERROR Bedrock is not available in $region" -ForegroundColor Red
    Write-Host "INFO Available regions: $($availableRegions -join ', ')" -ForegroundColor Blue
    Write-Host ""
    Write-Host "To fix Bedrock region issue:" -ForegroundColor Yellow
    Write-Host "Run: aws configure set region us-east-1" -ForegroundColor White
    exit 1
}

# Test Bedrock access
try {
    $models = aws bedrock list-foundation-models --region $region --output json 2>$null | ConvertFrom-Json
    if ($models) {
        Write-Host "OK Bedrock API access granted" -ForegroundColor Green
        
        # Check Claude models
        $claudeModels = $models.modelSummaries | Where-Object { $_.modelId -like "*claude*" }
        
        if ($claudeModels) {
            Write-Host "OK Claude models are available" -ForegroundColor Green
            
            # Check specific Claude 3 Sonnet model
            $sonnetModel = $claudeModels | Where-Object { $_.modelId -like "*claude-3-sonnet*" }
            
            if ($sonnetModel) {
                Write-Host "OK Claude 3 Sonnet is accessible" -ForegroundColor Green
            } else {
                Write-Host "WARNING Claude 3 Sonnet not found, but other Claude models available" -ForegroundColor Yellow
            }
        } else {
            Write-Host "ERROR No Claude models available" -ForegroundColor Red
            Write-Host ""
            Write-Host "To enable Bedrock model access:" -ForegroundColor Yellow
            Write-Host "1. Go to AWS Console -> Amazon Bedrock" -ForegroundColor White
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
    Write-Host "ERROR Bedrock API access denied" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix Bedrock access:" -ForegroundColor Yellow
    Write-Host "1. Ensure your IAM user/role has these permissions:" -ForegroundColor White
    Write-Host "   - bedrock:ListFoundationModels" -ForegroundColor White
    Write-Host "   - bedrock:InvokeModel" -ForegroundColor White
    Write-Host "   - bedrock:GetFoundationModel" -ForegroundColor White
    Write-Host "2. Check if Bedrock is available in your region" -ForegroundColor White
    exit 1
}

# Issue 3: Check S3 Access
Write-Host ""
Write-Host "Issue 3: Checking S3 Access..." -ForegroundColor Cyan

# Test basic S3 access
try {
    $buckets = aws s3 ls --output json 2>$null
    if ($buckets) {
        Write-Host "OK S3 access granted" -ForegroundColor Green
    } else {
        throw "No S3 access"
    }
} catch {
    Write-Host "ERROR S3 access denied" -ForegroundColor Red
    Write-Host ""
    Write-Host "To fix S3 access:" -ForegroundColor Yellow
    Write-Host "1. Ensure your IAM user/role has these permissions:" -ForegroundColor White
    Write-Host "   - s3:ListAllMyBuckets" -ForegroundColor White
    Write-Host "   - s3:CreateBucket" -ForegroundColor White
    Write-Host "   - s3:GetObject, s3:PutObject, s3:DeleteObject" -ForegroundColor White
    Write-Host "   - s3:ListBucket" -ForegroundColor White
    exit 1
}

# Suggest bucket name
$timestamp = Get-Date -Format "yyyyMMdd"
$suggestedBucket = "privacycomply-reports-$accountId-$timestamp"
Write-Host "INFO Suggested S3 bucket name: $suggestedBucket" -ForegroundColor Blue

# Test if suggested bucket exists
try {
    aws s3api head-bucket --bucket $suggestedBucket 2>$null
    Write-Host "INFO Suggested bucket already exists and is accessible" -ForegroundColor Blue
} catch {
    Write-Host "INFO Suggested bucket name is available" -ForegroundColor Blue
    
    $createBucket = Read-Host "Would you like to create the S3 bucket '$suggestedBucket'? (y/n)"
    
    if ($createBucket -eq 'y' -or $createBucket -eq 'Y') {
        Write-Host "Creating S3 bucket..." -ForegroundColor Yellow
        
        try {
            if ($region -eq "us-east-1") {
                aws s3api create-bucket --bucket $suggestedBucket --region $region
            } else {
                aws s3api create-bucket --bucket $suggestedBucket --region $region --create-bucket-configuration LocationConstraint=$region
            }
            
            Write-Host "OK S3 bucket created successfully" -ForegroundColor Green
            
            # Enable versioning
            aws s3api put-bucket-versioning --bucket $suggestedBucket --versioning-configuration Status=Enabled
            Write-Host "OK Bucket versioning enabled" -ForegroundColor Green
        } catch {
            Write-Host "ERROR Failed to create S3 bucket" -ForegroundColor Red
            exit 1
        }
    }
}

# Generate Lambda execution role ARN
$lambdaRoleArn = "arn:aws:iam::$accountId:role/PrivacyComply-Lambda-ExecutionRole"

# Final summary
Write-Host ""
Write-Host "Setup Check Complete!" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration for PrivacyComply Agent Setup Wizard:" -ForegroundColor Cyan
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
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy the configuration values above" -ForegroundColor White
Write-Host "2. Open the PrivacyComply Agent setup wizard" -ForegroundColor White
Write-Host "3. Paste the values into the corresponding fields" -ForegroundColor White
Write-Host "4. Complete the setup process" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Make sure to create the Lambda execution role if it doesn't exist:" -ForegroundColor Yellow
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
Write-Host "Configuration saved to: privacycomply-config.json" -ForegroundColor Green