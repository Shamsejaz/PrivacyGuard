# Production Deployment Script for app.privacycomply.ai
# This script deploys PrivacyGuard to production with SSL certificates

param(
    [string]$Domain = "app.privacycomply.ai",
    [string]$Email = "admin@privacycomply.ai"
)

# Configuration
$ComposeFile = "docker-compose.yml"
$EnvFile = ".env.production"

Write-Host "🚀 Starting PrivacyGuard Production Deployment for $Domain" -ForegroundColor Blue

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Success "Docker is installed"
} catch {
    Write-Error "Docker is not installed. Please install Docker Desktop first."
    exit 1
}

# Check if Docker Compose is installed
try {
    docker-compose --version | Out-Null
    Write-Success "Docker Compose is installed"
} catch {
    Write-Error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
}

# Check if environment file exists
if (-not (Test-Path $EnvFile)) {
    Write-Error "Environment file $EnvFile not found!"
    Write-Info "Please copy .env.production.example to .env.production and configure it"
    Write-Info "Update the DOMAIN, API_URL, WS_URL, and CORS_ORIGIN values for your domain"
    Write-Info "Also change all passwords marked with 'CHANGE_THIS'"
    exit 1
}

# Validate environment variables
Write-Info "Validating environment configuration..."
$envContent = Get-Content $EnvFile | Where-Object { $_ -match "=" -and $_ -notmatch "^#" }
$envVars = @{}
foreach ($line in $envContent) {
    $key, $value = $line -split "=", 2
    $envVars[$key] = $value
}

$requiredVars = @("POSTGRES_PASSWORD", "MONGO_ROOT_PASSWORD", "REDIS_PASSWORD", "JWT_SECRET")
foreach ($var in $requiredVars) {
    if (-not $envVars.ContainsKey($var) -or $envVars[$var] -like "*CHANGE_THIS*") {
        Write-Error "Please set a secure value for $var in $EnvFile"
        exit 1
    }
}

Write-Success "Environment validation passed!"

# Generate Nginx configuration from template
Write-Info "Generating Nginx configuration..."
if (Test-Path "nginx/production.conf.template") {
    $nginxTemplate = Get-Content "nginx/production.conf.template" -Raw
    $nginxConfig = $nginxTemplate -replace '\$\{DOMAIN\}', $envVars["DOMAIN"]
    $nginxConfig | Set-Content "nginx/production.conf"
    Write-Success "Nginx configuration generated for domain: $($envVars["DOMAIN"])"
}

# Create SSL directory
if (-not (Test-Path "nginx/ssl")) {
    New-Item -ItemType Directory -Path "nginx/ssl" -Force | Out-Null
    Write-Info "Created SSL directory"
}

# Check if SSL certificates exist
if (-not (Test-Path "nginx/ssl/fullchain.pem") -or -not (Test-Path "nginx/ssl/privkey.pem")) {
    Write-Warning "SSL certificates not found."
    Write-Info "For production deployment, you need to:"
    Write-Info "1. Obtain SSL certificates from Let's Encrypt or your certificate provider"
    Write-Info "2. Place fullchain.pem and privkey.pem in nginx/ssl/ directory"
    Write-Info "3. For Let's Encrypt, you can use certbot on your server"
    Write-Info ""
    Write-Info "Creating self-signed certificates for testing (NOT for production)..."
    
    # Create self-signed certificate for testing
    $certParams = @{
        Subject = "CN=$Domain"
        CertStoreLocation = "Cert:\CurrentUser\My"
        KeyExportPolicy = "Exportable"
        KeySpec = "Signature"
        KeyLength = 2048
        KeyAlgorithm = "RSA"
        HashAlgorithm = "SHA256"
        NotAfter = (Get-Date).AddYears(1)
    }
    
    try {
        $cert = New-SelfSignedCertificate @certParams
        Write-Warning "Self-signed certificate created for testing. Replace with proper SSL certificate for production!"
    } catch {
        Write-Warning "Could not create self-signed certificate. Please provide SSL certificates manually."
    }
}

# Pull latest images
Write-Info "Pulling latest Docker images..."
docker-compose -f $ComposeFile pull

# Build application
Write-Info "Building application..."
docker-compose -f $ComposeFile build --no-cache

# Stop existing containers
Write-Info "Stopping existing containers..."
docker-compose -f $ComposeFile down

# Start services
Write-Info "Starting production services..."
docker-compose -f $ComposeFile --env-file $EnvFile up -d

# Wait for services to be healthy
Write-Info "Waiting for services to be healthy..."
Start-Sleep -Seconds 30

# Check service health
Write-Info "Checking service health..."
$services = docker-compose -f $ComposeFile ps --format json | ConvertFrom-Json
$unhealthyServices = $services | Where-Object { $_.Health -eq "unhealthy" }

if ($unhealthyServices) {
    Write-Error "Some services are unhealthy. Check logs with: docker-compose -f $ComposeFile logs"
    exit 1
}

# Display deployment information
Write-Success "🎉 PrivacyGuard deployed successfully!"
Write-Host ""
Write-Host "📋 Deployment Information:" -ForegroundColor Cyan
Write-Host "   🌐 Domain: https://$Domain" -ForegroundColor White
Write-Host "   🔒 SSL: Configure proper certificates for production" -ForegroundColor White
Write-Host "   📊 Status: docker-compose -f $ComposeFile ps" -ForegroundColor White
Write-Host "   📝 Logs: docker-compose -f $ComposeFile logs -f" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "   Stop: docker-compose -f $ComposeFile down" -ForegroundColor White
Write-Host "   Restart: docker-compose -f $ComposeFile restart" -ForegroundColor White
Write-Host "   Update: .\deploy-production.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Security Reminders:" -ForegroundColor Cyan
Write-Host "   - Obtain proper SSL certificates from Let's Encrypt or CA" -ForegroundColor White
Write-Host "   - Configure firewall (ports 80, 443, 22 only)" -ForegroundColor White
Write-Host "   - Set up monitoring and backups" -ForegroundColor White
Write-Host "   - Configure domain DNS to point to your server IP" -ForegroundColor White
Write-Host ""

Write-Success "Deployment completed! Configure DNS and SSL, then visit https://$Domain"