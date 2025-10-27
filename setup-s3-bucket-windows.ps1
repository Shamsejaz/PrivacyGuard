# Setup S3 Bucket for PrivacyComply Agent (Windows)
# Run this in PowerShell

param(
    [string]$BucketName = "",
    [string]$Region = "us-east-1"
)

Write-Host "🪣 Setting up S3 bucket for PrivacyComply Agent..." -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Get account ID for unique bucket name
try {
    $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $accountId = $identity.Account
} catch {
    Write-Host "❌ Failed to get AWS account information" -ForegroundColor Red
    exit 1
}

# Generate bucket name if not provided
if (-not $BucketName) {
    $timestamp = Get-Date -Format "yyyyMMdd"
    $BucketName = "privacycomply-reports-$accountId-$timestamp"
}

Write-Host "Bucket name: $BucketName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

# Check if bucket name is available
Write-Host ""
Write-Host "1. Checking bucket name availability..." -ForegroundColor Cyan
try {
    aws s3api head-bucket --bucket $BucketName 2>$null
    Write-Host "⚠️  Bucket $BucketName already exists" -ForegroundColor Yellow
    Write-Host "🔧 Please choose a different name or use existing bucket" -ForegroundColor Yellow
} catch {
    Write-Host "✅ Bucket name $BucketName is available" -ForegroundColor Green
}

# Create the bucket
Write-Host ""
Write-Host "2. Creating S3 bucket..." -ForegroundColor Cyan
try {
    if ($Region -eq "us-east-1") {
        # us-east-1 doesn't need LocationConstraint
        aws s3api create-bucket --bucket $BucketName --region $Region
    } else {
        # Other regions need LocationConstraint
        aws s3api create-bucket --bucket $BucketName --region $Region --create-bucket-configuration LocationConstraint=$Region
    }
    
    Write-Host "✅ Bucket created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create bucket" -ForegroundColor Red
    exit 1
}

# Enable versioning
Write-Host ""
Write-Host "3. Enabling bucket versioning..." -ForegroundColor Cyan
try {
    aws s3api put-bucket-versioning --bucket $BucketName --versioning-configuration Status=Enabled
    Write-Host "✅ Versioning enabled" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Failed to enable versioning" -ForegroundColor Yellow
}

# Set up bucket policy for PrivacyComply access
Write-Host ""
Write-Host "4. Setting up bucket policy..." -ForegroundColor Cyan

# Create bucket policy
$bucketPolicy = @{
    "Version" = "2012-10-17"
    "Statement" = @(
        @{
            "Sid" = "PrivacyComplyAgentAccess"
            "Effect" = "Allow"
            "Principal" = @{
                "AWS" = "arn:aws:iam::$accountId`:root"
            }
            "Action" = @(
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            )
            "Resource" = @(
                "arn:aws:s3:::$BucketName",
                "arn:aws:s3:::$BucketName/*"
            )
        }
    )
} | ConvertTo-Json -Depth 10

# Save bucket policy to temporary file
$bucketPolicy | Out-File -FilePath "bucket-policy.json" -Encoding UTF8

# Apply bucket policy
try {
    aws s3api put-bucket-policy --bucket $BucketName --policy file://bucket-policy.json
    Write-Host "✅ Bucket policy applied" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Failed to apply bucket policy" -ForegroundColor Yellow
}

# Set up encryption
Write-Host ""
Write-Host "5. Enabling server-side encryption..." -ForegroundColor Cyan

$encryptionConfig = @{
    "Rules" = @(
        @{
            "ApplyServerSideEncryptionByDefault" = @{
                "SSEAlgorithm" = "AES256"
            }
        }
    )
} | ConvertTo-Json -Depth 10

$encryptionConfig | Out-File -FilePath "encryption-config.json" -Encoding UTF8

try {
    aws s3api put-bucket-encryption --bucket $BucketName --server-side-encryption-configuration file://encryption-config.json
    Write-Host "✅ Encryption enabled" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Failed to enable encryption" -ForegroundColor Yellow
}

# Test bucket access
Write-Host ""
Write-Host "6. Testing bucket access..." -ForegroundColor Cyan

# Create test file
"PrivacyComply Agent Test File" | Out-File -FilePath "test-file.txt" -Encoding UTF8

# Upload test file
try {
    aws s3 cp test-file.txt "s3://$BucketName/test-file.txt"
    Write-Host "✅ Upload test successful" -ForegroundColor Green
    
    # Download test file
    aws s3 cp "s3://$BucketName/test-file.txt" "downloaded-test-file.txt"
    Write-Host "✅ Download test successful" -ForegroundColor Green
    
    # Clean up test files
    aws s3 rm "s3://$BucketName/test-file.txt"
    Remove-Item "test-file.txt" -ErrorAction SilentlyContinue
    Remove-Item "downloaded-test-file.txt" -ErrorAction SilentlyContinue
    Write-Host "✅ Cleanup completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Bucket access test failed" -ForegroundColor Red
}

# Clean up policy files
Remove-Item "bucket-policy.json" -ErrorAction SilentlyContinue
Remove-Item "encryption-config.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 S3 bucket setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Bucket details for PrivacyComply setup:" -ForegroundColor Cyan
Write-Host "Bucket Name: $BucketName" -ForegroundColor White
Write-Host "Region: $Region" -ForegroundColor White
Write-Host "ARN: arn:aws:s3:::$BucketName" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Use this bucket name in the PrivacyComply Agent setup wizard:" -ForegroundColor Yellow
Write-Host "$BucketName" -ForegroundColor White

# Copy bucket name to clipboard if possible
try {
    $BucketName | Set-Clipboard
    Write-Host ""
    Write-Host "📋 Bucket name copied to clipboard!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "💡 Manually copy the bucket name above" -ForegroundColor Yellow
}