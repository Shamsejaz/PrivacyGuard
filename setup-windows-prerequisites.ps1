# Windows Prerequisites Setup for PrivacyComply Agent
# Run this in PowerShell as Administrator

Write-Host "🪟 Setting up Windows prerequisites for PrivacyComply Agent..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "❌ Please run PowerShell as Administrator" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green

# Check if Chocolatey is installed
if (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "✅ Chocolatey is already installed" -ForegroundColor Green
} else {
    Write-Host "📦 Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Host "✅ Chocolatey installed" -ForegroundColor Green
}

# Install AWS CLI
if (Get-Command aws -ErrorAction SilentlyContinue) {
    Write-Host "✅ AWS CLI is already installed" -ForegroundColor Green
    aws --version
} else {
    Write-Host "📦 Installing AWS CLI..." -ForegroundColor Yellow
    choco install awscli -y
    Write-Host "✅ AWS CLI installed" -ForegroundColor Green
}

# Install Git (if not present)
if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Host "✅ Git is already installed" -ForegroundColor Green
} else {
    Write-Host "📦 Installing Git..." -ForegroundColor Yellow
    choco install git -y
    Write-Host "✅ Git installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Prerequisites setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Close and reopen PowerShell" -ForegroundColor White
Write-Host "2. Run: aws configure" -ForegroundColor White
Write-Host "3. Continue with PrivacyComply Agent setup" -ForegroundColor White