@echo off
echo PrivacyComply Agent Setup Fix Script (Windows)
echo =================================================
echo.

REM Check if AWS CLI is installed
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS CLI not found
    echo.
    echo To install AWS CLI:
    echo 1. Download from: https://aws.amazon.com/cli/
    echo 2. Or run: winget install Amazon.AWSCLI
    pause
    exit /b 1
)

echo OK: AWS CLI found

REM Check AWS credentials
echo.
echo Issue 1: Checking AWS Credentials...
aws sts get-caller-identity >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: AWS credentials not configured
    echo.
    echo To configure AWS credentials:
    echo 1. Run: aws configure
    echo 2. Enter your Access Key ID (starts with AKIA...)
    echo 3. Enter your Secret Access Key
    echo 4. Enter region: us-east-1
    echo 5. Press Enter for output format
    pause
    exit /b 1
)

echo OK: AWS credentials are valid

REM Get account info
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query Account --output text') do set ACCOUNT_ID=%%i
echo INFO: Account ID: %ACCOUNT_ID%

REM Check Bedrock access
echo.
echo Issue 2: Checking Amazon Bedrock Access...
aws bedrock list-foundation-models --region us-east-1 >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Bedrock API access denied
    echo.
    echo To fix Bedrock access:
    echo 1. Go to AWS Console - Amazon Bedrock
    echo 2. Click 'Model access' in the left sidebar
    echo 3. Click 'Manage model access'
    echo 4. Enable 'Anthropic Claude 3 Sonnet'
    echo 5. Submit the request
    pause
    exit /b 1
)

echo OK: Bedrock API access granted

REM Check S3 access
echo.
echo Issue 3: Checking S3 Access...
aws s3 ls >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: S3 access denied
    echo.
    echo To fix S3 access:
    echo 1. Ensure your IAM user has S3 permissions
    echo 2. Check: s3:ListAllMyBuckets, s3:CreateBucket, s3:GetObject, s3:PutObject
    pause
    exit /b 1
)

echo OK: S3 access granted

REM Generate configuration
echo.
echo Setup Check Complete!
echo =======================
echo.
echo Configuration for PrivacyComply Agent Setup Wizard:
echo.
echo AWS Credentials:
for /f "tokens=*" %%i in ('aws configure get aws_access_key_id') do echo   Access Key ID: %%i
echo   Secret Access Key: [Use your actual secret key]
echo   Region: us-east-1
echo.
echo Amazon Bedrock:
echo   Model ID: anthropic.claude-3-sonnet-20240229-v1:0
echo   Region: us-east-1
echo.
echo S3 Configuration:
echo   Reports Bucket: privacycomply-reports-%ACCOUNT_ID%-20241223
echo   Region: us-east-1
echo.
echo Lambda Configuration:
echo   Execution Role ARN: arn:aws:iam::%ACCOUNT_ID%:role/PrivacyComply-Lambda-ExecutionRole
echo   Region: us-east-1
echo.
echo Next Steps:
echo 1. Copy the configuration values above
echo 2. Open the PrivacyComply Agent setup wizard
echo 3. Paste the values into the corresponding fields
echo 4. Complete the setup process
echo.
echo NOTE: Create the Lambda execution role if it doesn't exist
echo       Run: create-lambda-role-windows.ps1
echo.
pause