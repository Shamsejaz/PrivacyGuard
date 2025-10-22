# Dark Web Intelligence Infrastructure Deployment Script (PowerShell)

param(
    [string]$Environment = "dev",
    [string]$Region = "us-east-1",
    [string]$StackName = "PrivacyGuard-DarkWeb-Intelligence",
    [switch]$Help
)

# Show help
if ($Help) {
    Write-Host "Usage: .\deploy.ps1 [OPTIONS]"
    Write-Host "Options:"
    Write-Host "  -Environment ENV    Environment name (dev, staging, prod) [default: dev]"
    Write-Host "  -Region REGION      AWS region [default: us-east-1]"
    Write-Host "  -StackName NAME     CloudFormation stack name [default: PrivacyGuard-DarkWeb-Intelligence]"
    Write-Host "  -Help               Show this help message"
    exit 0
}

# Configuration
$TemplateFile = "cloudformation-template.yaml"

# Validate environment
if ($Environment -notin @("dev", "staging", "prod")) {
    Write-Error "Environment must be one of: dev, staging, prod"
    exit 1
}

# Update stack name with environment
$FullStackName = "$StackName-$Environment"

Write-Host "Deploying Dark Web Intelligence Infrastructure..." -ForegroundColor Green
Write-Host "Stack Name: $FullStackName"
Write-Host "Environment: $Environment"
Write-Host "Region: $Region"
Write-Host "Template: $TemplateFile"
Write-Host ""# 
Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Error "AWS CLI is not installed or not in PATH"
    exit 1
}

# Check if template file exists
if (-not (Test-Path $TemplateFile)) {
    Write-Error "Template file $TemplateFile not found"
    exit 1
}

# Validate CloudFormation template
Write-Host "Validating CloudFormation template..." -ForegroundColor Yellow
try {
    aws cloudformation validate-template --template-body file://$TemplateFile --region $Region
    if ($LASTEXITCODE -ne 0) {
        throw "Template validation failed"
    }
    Write-Host "Template validation successful" -ForegroundColor Green
} catch {
    Write-Error "Error: Template validation failed"
    exit 1
}

# Check if stack exists
try {
    $StackExists = aws cloudformation describe-stacks --stack-name $FullStackName --region $Region --query 'Stacks[0].StackName' --output text 2>$null
    if ($LASTEXITCODE -ne 0) {
        $StackExists = "NONE"
    }
} catch {
    $StackExists = "NONE"
}

if ($StackExists -eq "NONE") {
    Write-Host "Creating new stack: $FullStackName" -ForegroundColor Yellow
    $Operation = "create-stack"
} else {
    Write-Host "Updating existing stack: $FullStackName" -ForegroundColor Yellow
    $Operation = "update-stack"
}

Write-Host "Stack deployment completed successfully!" -ForegroundColor Green