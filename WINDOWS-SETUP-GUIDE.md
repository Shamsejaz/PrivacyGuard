# 🪟 Windows Setup Guide for PrivacyComply Agent

## Quick Fix for Setup Issues

You're encountering these three issues:
- ✅ AWS credentials not configured
- ✅ Amazon Bedrock access not enabled  
- ✅ S3 bucket permissions insufficient

## 🚀 Option 1: Run the Simple Batch File

1. **Open Command Prompt**
   - Press `Win + R`
   - Type `cmd` and press Enter

2. **Navigate to your project folder**
   ```cmd
   cd C:\drive\PrivacyGuard-main\PrivacyGuard-main
   ```

3. **Run the setup script**
   ```cmd
   fix-aws-setup.bat
   ```

## 🚀 Option 2: Run the PowerShell Script

1. **Open PowerShell**
   - Press `Win + X`
   - Select "Windows PowerShell" or "Terminal"

2. **Navigate to your project folder**
   ```powershell
   cd "C:\drive\PrivacyGuard-main\PrivacyGuard-main"
   ```

3. **Run the setup script**
   ```powershell
   .\fix-aws-setup-windows.ps1
   ```

## 🚀 Option 3: Manual Setup (Step by Step)

### Step 1: Install AWS CLI (if not installed)
```cmd
winget install Amazon.AWSCLI
```
Or download from: https://aws.amazon.com/cli/

### Step 2: Configure AWS Credentials
```cmd
aws configure
```
Enter:
- **Access Key ID**: Your AKIA... key (20 characters)
- **Secret Access Key**: Your secret key (40 characters)  
- **Region**: `us-east-1`
- **Output format**: Press Enter (default)

### Step 3: Enable Bedrock Access
1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Click **"Model access"** in left sidebar
3. Click **"Manage model access"**
4. Find **"Anthropic Claude 3 Sonnet"** and enable it
5. Click **"Submit"**

### Step 4: Create S3 Bucket
1. Go to [S3 Console](https://console.aws.amazon.com/s3/)
2. Click **"Create bucket"**
3. Name: `privacycomply-reports-yourname-2024`
4. Region: `us-east-1`
5. Click **"Create bucket"**

### Step 5: Create Lambda Role
1. Go to [IAM Console](https://console.aws.amazon.com/iam/) → Roles
2. Click **"Create role"**
3. Select **"AWS service"** → **"Lambda"**
4. Attach policies:
   - `AWSLambdaBasicExecutionRole`
   - `AmazonS3FullAccess`
   - `AmazonDynamoDBFullAccess`
5. Name: `PrivacyComply-Lambda-ExecutionRole`
6. Copy the ARN

## 📋 Configuration Template

After completing the setup, use these values in the PrivacyComply Agent setup wizard:

```
AWS Credentials:
├── Access Key ID: AKIA... (your key)
├── Secret Access Key: ... (your secret)
└── Region: us-east-1

Amazon Bedrock:
├── Model ID: anthropic.claude-3-sonnet-20240229-v1:0
└── Region: us-east-1

S3 Configuration:
├── Reports Bucket: privacycomply-reports-[yourname]-2024
└── Region: us-east-1

Lambda Configuration:
├── Execution Role ARN: arn:aws:iam::[account-id]:role/PrivacyComply-Lambda-ExecutionRole
└── Region: us-east-1
```

## 🔧 Common Windows Issues

**PowerShell Execution Policy Error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**AWS CLI Not Found:**
```cmd
# Install via winget
winget install Amazon.AWSCLI

# Or via Chocolatey (if installed)
choco install awscli
```

**Permission Denied:**
- Run Command Prompt or PowerShell as Administrator
- Right-click → "Run as administrator"

## ✅ Verification

After setup, verify everything works:

1. **Test AWS credentials:**
   ```cmd
   aws sts get-caller-identity
   ```

2. **Test Bedrock access:**
   ```cmd
   aws bedrock list-foundation-models --region us-east-1
   ```

3. **Test S3 access:**
   ```cmd
   aws s3 ls
   ```

4. **Open diagnostic tool:**
   - Double-click `diagnose-setup.html`
   - Click "Run Diagnostics"

## 🆘 Still Having Issues?

If you're still stuck:

1. **Check the troubleshooting guide:** `AWS_SETUP_TROUBLESHOOTING.md`
2. **Run the diagnostic tool:** Open `diagnose-setup.html` in your browser
3. **Verify your AWS account has the necessary permissions**
4. **Make sure you're using the correct AWS region (us-east-1)**

The most common issue is incorrect AWS credentials format - make sure your Access Key ID starts with "AKIA" and is exactly 20 characters long.