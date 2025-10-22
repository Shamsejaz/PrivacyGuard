# AWS PrivacyComply Agent Setup Troubleshooting Guide

## Common Setup Issues and Solutions

### Issue: "Setup incomplete - 3 error(s) found"

This error typically occurs when the AWS PrivacyComply Agent setup wizard encounters validation or deployment issues. Here are the most common causes and solutions:

## 1. Missing or Invalid AWS Credentials

**Symptoms:**
- Error: "AWS credentials are required for AWS PrivacyComply Agent"
- Error: "Invalid AWS credential format for PrivacyComply Agent"

**Solutions:**
- Ensure AWS Access Key ID is at least 16 characters long
- Ensure AWS Secret Access Key is at least 32 characters long
- Verify credentials are active and not expired
- Check that credentials have the required permissions

**Required AWS Permissions:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels",
                "bedrock:GetFoundationModel",
                "s3:CreateBucket",
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket",
                "dynamodb:CreateTable",
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "lambda:CreateFunction",
                "lambda:UpdateFunctionCode",
                "lambda:InvokeFunction",
                "iam:CreateRole",
                "iam:AttachRolePolicy",
                "iam:PassRole",
                "securityhub:GetFindings",
                "macie2:GetFindings"
            ],
            "Resource": "*"
        }
    ]
}
```

## 2. Missing Required Configuration

**Symptoms:**
- Error: "S3 reports bucket name is required"
- Error: "Lambda execution role ARN is required"

**Solutions:**
- Provide a valid S3 bucket name (lowercase, no spaces, valid DNS name)
- Provide a valid Lambda execution role ARN in format: `arn:aws:iam::123456789012:role/role-name`

**Example Configuration:**
```javascript
{
  aws: {
    credentials: {
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      region: "us-east-1"
    },
    services: {
      s3: {
        reportsBucket: "privacy-comply-reports-your-org",
        region: "us-east-1"
      },
      lambda: {
        executionRole: "arn:aws:iam::123456789012:role/privacy-comply-lambda-role",
        region: "us-east-1"
      }
    }
  }
}
```

## 3. Lambda Execution Role Issues

**Symptoms:**
- Error: "Invalid Lambda execution role ARN format"
- Error: "Lambda execution role ARN is required for function deployment"

**Solutions:**

### Create Lambda Execution Role:
1. Go to AWS IAM Console
2. Create a new role with the following trust policy:
```json
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
```

3. Attach the following managed policies:
   - `AWSLambdaBasicExecutionRole`
   - `AmazonS3FullAccess` (or more restrictive S3 permissions)
   - `AmazonDynamoDBFullAccess` (or more restrictive DynamoDB permissions)

4. Copy the role ARN and use it in the setup wizard

## 4. S3 Bucket Configuration Issues

**Symptoms:**
- Error: "S3 reports bucket name is required"
- Deployment fails during S3 setup

**Solutions:**
- Use a globally unique bucket name
- Ensure bucket name follows AWS naming conventions:
  - 3-63 characters long
  - Lowercase letters, numbers, hyphens, and periods only
  - Must start and end with letter or number
- Example: `privacy-comply-reports-yourcompany-2024`

## 5. Network and Connectivity Issues

**Symptoms:**
- Timeouts during validation
- "Failed to validate AWS credentials" with network errors

**Solutions:**
- Check internet connectivity
- Verify firewall settings allow HTTPS traffic to AWS endpoints
- If using corporate network, check proxy settings
- Ensure AWS service endpoints are accessible

## 6. Browser Storage Issues

**Symptoms:**
- Configuration not saving
- Setup resets after page refresh

**Solutions:**
- Clear browser cache and localStorage
- Disable browser extensions that might interfere
- Try in incognito/private browsing mode
- Check browser console for JavaScript errors

## Diagnostic Steps

### 1. Use the Diagnostic Tool
Open `diagnose-setup.html` in your browser to check:
- Configuration storage status
- Credential format validation
- Service configuration completeness

### 2. Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for error messages during setup
4. Check Network tab for failed API calls

### 3. Verify Environment Variables
If running locally, ensure these environment variables are set:
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_REPORTS_BUCKET=your-bucket-name
```

### 4. Test AWS CLI Access
Verify your credentials work with AWS CLI:
```bash
aws sts get-caller-identity
aws s3 ls
aws iam list-roles
```

## Manual Setup Alternative

If the wizard continues to fail, you can manually configure the agent:

1. Create the required AWS resources manually:
   - S3 bucket for reports
   - DynamoDB tables
   - Lambda execution role
   - IAM policies

2. Update the configuration directly in localStorage:
```javascript
// Open browser console and run:
const config = {
  aws: {
    credentials: {
      accessKeyId: "YOUR_ACCESS_KEY",
      secretAccessKey: "YOUR_SECRET_KEY",
      region: "us-east-1"
    },
    services: {
      s3: { reportsBucket: "your-bucket-name", region: "us-east-1" },
      lambda: { executionRole: "your-role-arn", region: "us-east-1" },
      dynamodb: { tablePrefix: "privacy-comply-", region: "us-east-1" }
    }
  }
};
localStorage.setItem('privacy-comply-agent-config', JSON.stringify(config));
```

## Getting Help

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Verify your AWS account has the required service quotas
3. Ensure your AWS credentials have the necessary permissions
4. Try the setup in a different browser or incognito mode
5. Contact support with the specific error messages and your configuration (without credentials)

## Recent Fixes Applied

The following issues have been addressed in the latest version:

1. **Missing AWS SDK Dependency**: Added `@aws-sdk/client-bedrock` package
2. **Improved Validation Logic**: Enhanced error handling and validation messages
3. **Better Deployment Flow**: Fixed the deployment process to properly validate prerequisites
4. **Configuration Persistence**: Improved configuration saving and loading
5. **Error Reporting**: More detailed error messages and troubleshooting information

## Testing Your Setup

After completing the setup, you can test the agent functionality:

1. Navigate to the AWS PrivacyComply Agent dashboard
2. Check that all services show as "Connected"
3. Run a test compliance scan
4. Verify reports are generated in your S3 bucket
5. Check CloudWatch logs for any runtime errors