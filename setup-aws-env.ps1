# AWS Environment Setup Script for PrivacyGuard Testing (Windows PowerShell)
# This script helps set up the AWS environment for testing on Windows

param(
    [switch]$SkipTests
)

Write-Host "🚀 PrivacyGuard AWS Environment Setup (Windows)" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Function to print colored output
function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# Check if AWS CLI is installed
function Test-AwsCli {
    try {
        $awsVersion = aws --version 2>$null
        if ($awsVersion) {
            Write-Success "AWS CLI is installed"
            Write-Host $awsVersion
            return $true
        }
    }
    catch {
        Write-Error "AWS CLI is not installed"
        Write-Info "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        return $false
    }
}

# Check if Node.js is installed
function Test-NodeJs {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Success "Node.js is installed: $nodeVersion"
            
            # Check if version is 18 or higher
            $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
            if ($majorVersion -lt 18) {
                Write-Warning "Node.js version 18+ recommended. Current: $nodeVersion"
            }
            return $true
        }
    }
    catch {
        Write-Error "Node.js is not installed"
        Write-Info "Please install Node.js 18+: https://nodejs.org/"
        return $false
    }
}

# Create environment file
function New-EnvFile {
    Write-Info "Creating .env.aws file..."
    
    # Prompt for AWS credentials
    Write-Host ""
    Write-Host "Please enter your AWS credentials:"
    $awsAccessKeyId = Read-Host "AWS Access Key ID"
    $awsSecretAccessKey = Read-Host "AWS Secret Access Key" -AsSecureString
    $awsSecretAccessKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($awsSecretAccessKey))
    
    $awsRegion = Read-Host "AWS Region (default: us-east-1)"
    if ([string]::IsNullOrEmpty($awsRegion)) {
        $awsRegion = "us-east-1"
    }
    
    # Generate unique bucket name
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $bucketName = "privacyguard-reports-test-$timestamp"
    
    # Create .env.aws file
    $envContent = @"
# AWS Configuration
AWS_REGION=$awsRegion
AWS_ACCESS_KEY_ID=$awsAccessKeyId
AWS_SECRET_ACCESS_KEY=$awsSecretAccessKeyPlain

# Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=$awsRegion

# S3 Configuration
S3_REPORTS_BUCKET=$bucketName
S3_REGION=$awsRegion

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=privacyguard-compliance-findings-test
DYNAMODB_REGION=$awsRegion

# SageMaker Configuration (optional)
SAGEMAKER_ENDPOINT_NAME=privacy-comply-endpoint
SAGEMAKER_REGION=$awsRegion
"@

    $envContent | Out-File -FilePath ".env.aws" -Encoding UTF8
    Write-Success ".env.aws file created"
}

# Load environment variables
function Import-EnvFile {
    if (Test-Path ".env.aws") {
        Write-Info "Loading environment variables from .env.aws"
        
        Get-Content ".env.aws" | ForEach-Object {
            if ($_ -match "^([^#][^=]+)=(.*)$") {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
        
        Write-Success "Environment variables loaded"
        return $true
    }
    else {
        Write-Error ".env.aws file not found"
        return $false
    }
}

# Test AWS credentials
function Test-AwsCredentials {
    Write-Info "Testing AWS credentials..."
    
    try {
        $identity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
        if ($identity) {
            Write-Success "AWS credentials are valid"
            Write-Info "Account ID: $($identity.Account)"
            Write-Info "User/Role: $($identity.Arn)"
            return $true
        }
    }
    catch {
        Write-Error "AWS credentials are invalid or insufficient permissions"
        return $false
    }
}

# Check Bedrock access
function Test-BedrockAccess {
    Write-Info "Checking Bedrock access..."
    
    try {
        $models = aws bedrock list-foundation-models --region $env:AWS_REGION --output json 2>$null | ConvertFrom-Json
        if ($models) {
            Write-Success "Bedrock access confirmed"
            
            # Check if Claude 3 Sonnet is available
            $claudeModels = $models.modelSummaries | Where-Object { $_.modelId -like "*claude-3-sonnet*" }
            if ($claudeModels) {
                Write-Success "Claude 3 Sonnet model is available"
            }
            else {
                Write-Warning "Claude 3 Sonnet model not found. You may need to request access."
                Write-Info "Go to AWS Console > Bedrock > Model access to request access"
            }
            return $true
        }
    }
    catch {
        Write-Error "Cannot access Bedrock. Check permissions and region availability."
        Write-Info "Bedrock is available in: us-east-1, us-west-2, eu-west-1, ap-southeast-1"
        return $false
    }
}

# Create AWS resources
function New-AwsResources {
    Write-Info "Creating AWS resources..."
    
    # Create S3 bucket
    Write-Info "Creating S3 bucket: $env:S3_REPORTS_BUCKET"
    try {
        aws s3 mb "s3://$env:S3_REPORTS_BUCKET" --region $env:AWS_REGION 2>$null
        Write-Success "S3 bucket created successfully"
    }
    catch {
        Write-Warning "S3 bucket creation failed (may already exist)"
    }
    
    # Create DynamoDB table
    Write-Info "Creating DynamoDB table: $env:DYNAMODB_TABLE_NAME"
    try {
        $tableParams = @{
            'table-name' = $env:DYNAMODB_TABLE_NAME
            'attribute-definitions' = 'AttributeName=id,AttributeType=S AttributeName=timestamp,AttributeType=N'
            'key-schema' = 'AttributeName=id,KeyType=HASH'
            'global-secondary-indexes' = 'IndexName=TimestampIndex,KeySchema=[{AttributeName=timestamp,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}'
            'provisioned-throughput' = 'ReadCapacityUnits=5,WriteCapacityUnits=5'
            'region' = $env:AWS_REGION
        }
        
        aws dynamodb create-table @tableParams 2>$null | Out-Null
        Write-Success "DynamoDB table created successfully"
    }
    catch {
        Write-Warning "DynamoDB table creation failed (may already exist)"
    }
}

# Install Node.js dependencies
function Install-Dependencies {
    Write-Info "Installing Node.js dependencies..."
    
    if (Test-Path "package.json") {
        try {
            npm install @aws-sdk/client-bedrock-runtime @aws-sdk/client-bedrock @aws-sdk/client-s3 @aws-sdk/client-dynamodb
            Write-Success "AWS SDK dependencies installed"
        }
        catch {
            Write-Warning "Failed to install some dependencies. Check npm output above."
        }
    }
    else {
        Write-Warning "package.json not found. Make sure you're in the project root directory."
    }
}

# Run tests
function Invoke-Tests {
    Write-Info "Running AWS integration tests..."
    
    if (Test-Path "run-aws-tests.js") {
        try {
            node run-aws-tests.js
        }
        catch {
            Write-Error "Test execution failed. Check the output above for details."
        }
    }
    else {
        Write-Error "Test runner not found. Make sure run-aws-tests.js exists."
    }
}

# Main execution
function Main {
    Write-Host ""
    Write-Info "Starting AWS environment setup..."
    
    # Step 1: Check prerequisites
    if (-not (Test-AwsCli)) { exit 1 }
    if (-not (Test-NodeJs)) { exit 1 }
    
    # Step 2: Setup environment
    if (-not (Test-Path ".env.aws")) {
        New-EnvFile
    }
    else {
        Write-Info ".env.aws already exists. Using existing configuration."
    }
    
    if (-not (Import-EnvFile)) { exit 1 }
    
    # Step 3: Test AWS access
    if (-not (Test-AwsCredentials)) { exit 1 }
    if (-not (Test-BedrockAccess)) { exit 1 }
    
    # Step 4: Create resources
    New-AwsResources
    
    # Step 5: Install dependencies
    Install-Dependencies
    
    # Step 6: Run tests
    Write-Host ""
    Write-Info "Setup complete! Ready to run tests."
    Write-Host ""
    
    if (-not $SkipTests) {
        $runTests = Read-Host "Run tests now? (y/N)"
        
        if ($runTests -match "^[Yy]$") {
            Invoke-Tests
        }
        else {
            Write-Info "Setup complete. Run 'node run-aws-tests.js' when ready to test."
        }
    }
    else {
        Write-Info "Setup complete. Run 'node run-aws-tests.js' when ready to test."
    }
}

# Run main function
try {
    Main
}
catch {
    Write-Error "Setup failed: $($_.Exception.Message)"
    exit 1
}