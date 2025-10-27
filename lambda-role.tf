# Terraform configuration for PrivacyComply Lambda Execution Role

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# IAM role for Lambda execution
resource "aws_iam_role" "privacycomply_lambda_role" {
  name = "PrivacyComply-Lambda-ExecutionRole"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "PrivacyComply Lambda Execution Role"
    Environment = "production"
    Service     = "privacycomply-agent"
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.privacycomply_lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for PrivacyComply specific permissions
resource "aws_iam_policy" "privacycomply_lambda_policy" {
  name        = "PrivacyComply-Lambda-Policy"
  description = "Custom policy for PrivacyComply Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::privacycomply-*",
          "arn:aws:s3:::privacycomply-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:*:${data.aws_caller_identity.current.account_id}:table/privacycomply-*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:ListFoundationModels"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "securityhub:GetFindings",
          "macie2:GetFindings"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach custom policy to role
resource "aws_iam_role_policy_attachment" "privacycomply_lambda_policy_attachment" {
  role       = aws_iam_role.privacycomply_lambda_role.name
  policy_arn = aws_iam_policy.privacycomply_lambda_policy.arn
}

# Output the role ARN
output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role for PrivacyComply Agent"
  value       = aws_iam_role.privacycomply_lambda_role.arn
}

# Output instructions
output "setup_instructions" {
  description = "Instructions for using this role"
  value = "Copy this ARN and paste it into the Lambda Execution Role field in the PrivacyComply Agent setup wizard: ${aws_iam_role.privacycomply_lambda_role.arn}"
}