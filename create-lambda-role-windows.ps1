# Create Lambda Execution Role for PrivacyComply Agent (Windows)
# Run this in PowerShell

Write-Host "🔧 Creating Lambda Execution Role for PrivacyComply Agent..." -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

$roleName = "PrivacyComply-Lambda-ExecutionRole"

# Get current AWS account ID
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $accountId = $identity.Account
    Write-Host "✅ AWS Account ID: $accountId" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get AWS account information" -ForegroundColor Red
    Write-Host "Make sure AWS CLI is configured with valid credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "📋 Creating IAM role: $roleName" -ForegroundColor Yellow

# Create trust policy
$trustPolicy = @{
    "Version" = "2012-10-17"
    "Statement" = @(
        @{
            "Effect" = "Allow"
            "Principal" = @{
                "Service" = "lambda.amazonaws.com"
            }
            "Action" = "sts:AssumeRole"
        }
    )
} | ConvertTo-Json -Depth 10

# Save trust policy to temporary file
$trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding UTF8

# Create the IAM role
try {
    Write-Host "Creating IAM role..." -ForegroundColor Yellow
    aws iam create-role --role-name $roleName --assume-role-policy-document file://trust-policy.json --description "Execution role for PrivacyComply Agent Lambda functions"
    Write-Host "✅ IAM role created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Role might already exist, continuing..." -ForegroundColor Yellow
}

# Attach basic execution policy
Write-Host "Attaching basic Lambda execution policy..." -ForegroundColor Yellow
try {
    aws iam attach-role-policy --role-name $roleName --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    Write-Host "✅ Basic execution policy attached" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Policy might already be attached" -ForegroundColor Yellow
}

# Create custom policy for PrivacyComply specific permissions
$customPolicy = @{
    "Version" = "2012-10-17"
    "Statement" = @(
        @{
            "Effect" = "Allow"
            "Action" = @(
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            )
            "Resource" = @(
                "arn:aws:s3:::privacycomply-*",
                "arn:aws:s3:::privacycomply-*/*"
            )
        },
        @{
            "Effect" = "Allow"
            "Action" = @(
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            )
            "Resource" = @(
                "arn:aws:dynamodb:*:$accountId`:table/privacycomply-*"
            )
        },
        @{
            "Effect" = "Allow"
            "Action" = @(
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels"
            )
            "Resource" = "*"
        },
        @{
            "Effect" = "Allow"
            "Action" = @(
                "securityhub:GetFindings",
                "macie2:GetFindings"
            )
            "Resource" = "*"
        }
    )
} | ConvertTo-Json -Depth 10

# Save custom policy to temporary file
$customPolicy | Out-File -FilePath "privacycomply-policy.json" -Encoding UTF8

# Create and attach the custom policy
Write-Host "Creating custom PrivacyComply policy..." -ForegroundColor Yellow
try {
    aws iam create-policy --policy-name "PrivacyComply-Lambda-Policy" --policy-document file://privacycomply-policy.json --description "Custom policy for PrivacyComply Lambda functions"
    Write-Host "✅ Custom policy created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Policy might already exist, continuing..." -ForegroundColor Yellow
}

# Attach custom policy to role
Write-Host "Attaching custom policy to role..." -ForegroundColor Yellow
try {
    aws iam attach-role-policy --role-name $roleName --policy-arn "arn:aws:iam::$accountId`:policy/PrivacyComply-Lambda-Policy"
    Write-Host "✅ Custom policy attached" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Policy might already be attached" -ForegroundColor Yellow
}

# Get the role ARN
try {
    $roleInfo = aws iam get-role --role-name $roleName --output json | ConvertFrom-Json
    $roleArn = $roleInfo.Role.Arn
    
    Write-Host ""
    Write-Host "🎉 Lambda execution role created successfully!" -ForegroundColor Green
    Write-Host "📋 Role ARN: $roleArn" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔧 Use this ARN in your PrivacyComply Agent setup wizard:" -ForegroundColor Yellow
    Write-Host "$roleArn" -ForegroundColor White
    
    # Copy to clipboard if possible
    try {
        $roleArn | Set-Clipboard
        Write-Host ""
        Write-Host "📋 ARN copied to clipboard!" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "💡 Manually copy the ARN above" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Failed to get role ARN" -ForegroundColor Red
}

# Clean up temporary files
Remove-Item "trust-policy.json" -ErrorAction SilentlyContinue
Remove-Item "privacycomply-policy.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy the ARN above" -ForegroundColor White
Write-Host "2. Paste it into the Lambda Execution Role field in the setup wizard" -ForegroundColor White
Write-Host "3. Continue with the PrivacyComply Agent setup" -ForegroundColor White