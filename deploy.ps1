# Simple Deployment Script for PrivacyGuard
# Uses environment variables from .env file for configuration

param(
    [string]$Environment = "development",
    [switch]$Build = $false,
    [switch]$Down = $false
)

$EnvFile = if ($Environment -eq "production") { ".env.production" } else { ".env" }

Write-Host "🚀 PrivacyGuard Deployment" -ForegroundColor Blue
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Config file: $EnvFile" -ForegroundColor Cyan

# Check if environment file exists
if (-not (Test-Path $EnvFile)) {
    Write-Host "[ERROR] Environment file $EnvFile not found!" -ForegroundColor Red
    if ($Environment -eq "production") {
        Write-Host "Please copy .env.production.example to .env.production and configure it" -ForegroundColor Yellow
    } else {
        Write-Host "Please ensure .env file exists for local development" -ForegroundColor Yellow
    }
    exit 1
}

# Stop containers if requested
if ($Down) {
    Write-Host "🛑 Stopping containers..." -ForegroundColor Yellow
    docker-compose --env-file $EnvFile down
    exit 0
}

# Build flag
$BuildFlag = if ($Build) { "--build" } else { "" }

# Deploy
Write-Host "🚀 Starting deployment..." -ForegroundColor Green
if ($Build) {
    Write-Host "📦 Building images..." -ForegroundColor Blue
}

try {
    docker-compose --env-file $EnvFile up -d $BuildFlag
    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    
    # Show status
    Write-Host "`n📊 Container Status:" -ForegroundColor Cyan
    docker-compose --env-file $EnvFile ps
    
    # Load environment to show URLs
    $envVars = @{}
    Get-Content $EnvFile | Where-Object { $_ -match "=" -and $_ -notmatch "^#" } | ForEach-Object {
        $key, $value = $_ -split "=", 2
        $envVars[$key] = $value
    }
    
    $frontendUrl = if ($envVars.ContainsKey("FRONTEND_URL")) { $envVars["FRONTEND_URL"] } else { "http://localhost:80" }
    $apiUrl = if ($envVars.ContainsKey("API_URL")) { $envVars["API_URL"] } else { "http://localhost:3001" }
    
    Write-Host "`n🌐 Access URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend: $frontendUrl" -ForegroundColor White
    Write-Host "   API: $apiUrl" -ForegroundColor White
    
    Write-Host "`n🔧 Management Commands:" -ForegroundColor Cyan
    Write-Host "   View logs: docker-compose --env-file $EnvFile logs -f" -ForegroundColor White
    Write-Host "   Stop: .\deploy.ps1 -Environment $Environment -Down" -ForegroundColor White
    Write-Host "   Rebuild: .\deploy.ps1 -Environment $Environment -Build" -ForegroundColor White
    
} catch {
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    exit 1
}