# PrivacyGuard Local Deployment Script (Windows PowerShell)
# Deploys the complete PrivacyGuard application stack using Docker Desktop

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "start", "stop", "restart", "logs", "status", "cleanup", "help")]
    [string]$Command = "deploy"
)

# Configuration
$ComposeFile = "docker-compose.local.yml"
$ProjectName = "privacyguard"
$Environment = "local"

# Function to print colored output
function Write-Header {
    param($Message)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Magenta
    Write-Host $Message -ForegroundColor Magenta
    Write-Host ("=" * 60) -ForegroundColor Magenta
    Write-Host ""
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Step {
    param($Message)
    Write-Host "🔄 $Message" -ForegroundColor Cyan
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Header "Checking Prerequisites"
    
    # Check Docker
    try {
        $dockerVersion = docker --version 2>$null
        if ($dockerVersion) {
            Write-Success "Docker is installed: $dockerVersion"
        } else {
            throw "Docker not found"
        }
    }
    catch {
        Write-Error "Docker is not installed. Please install Docker Desktop."
        exit 1
    }
    
    # Check Docker Compose
    try {
        $composeVersion = docker-compose --version 2>$null
        if ($composeVersion) {
            Write-Success "Docker Compose is installed: $composeVersion"
        } else {
            throw "Docker Compose not found"
        }
    }
    catch {
        Write-Error "Docker Compose is not installed."
        exit 1
    }
    
    # Check if Docker is running
    try {
        docker info 2>$null | Out-Null
        Write-Success "Docker daemon is running"
    }
    catch {
        Write-Error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    }
    
    # Check available disk space (minimum 5GB)
    $drive = (Get-Location).Drive
    $freeSpace = [math]::Round((Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='$($drive.Name)'").FreeSpace / 1GB, 2)
    if ($freeSpace -lt 5) {
        Write-Warning "Low disk space: ${freeSpace}GB available. Minimum 5GB recommended."
    } else {
        Write-Success "Sufficient disk space: ${freeSpace}GB available"
    }
    
    # Check if compose file exists
    if (-not (Test-Path $ComposeFile)) {
        Write-Error "Docker compose file not found: $ComposeFile"
        exit 1
    }
    
    Write-Success "All prerequisites met!"
}

# Function to create environment file
function New-EnvFile {
    Write-Header "Environment Configuration"
    
    if (-not (Test-Path ".env.local")) {
        Write-Step "Creating .env.local file..."
        
        $envContent = @'
# PrivacyGuard Local Development Environment

# Application Configuration
NODE_ENV=development
ENVIRONMENT=local
DEBUG_MODE=true

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=privacyguard_local
POSTGRES_USER=privacyguard_user
POSTGRES_PASSWORD=local_password_123

MONGODB_URI=mongodb://admin:local_admin_123@mongodb:27017/privacyguard_local?authSource=admin

REDIS_HOST=redis
REDIS_PORT=6379

# Security Configuration
JWT_SECRET=local_development_jwt_secret_at_least_32_characters_long_for_security
BCRYPT_ROUNDS=10

# External Services
PII_SERVICE_URL=http://python-pii-service:8000

# Email Configuration (using Mailhog)
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# AWS Configuration (optional - for testing)
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_key_here
# AWS_SECRET_ACCESS_KEY=your_secret_here
# BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
'@
        
        $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
        Write-Success ".env.local file created"
    } else {
        Write-Info ".env.local file already exists"
    }
}

# Function to pull latest images
function Get-Images {
    Write-Header "Pulling Docker Images"
    
    Write-Step "Pulling base images..."
    docker-compose -f $ComposeFile pull postgres mongodb redis adminer mongo-express redis-commander mailhog
    
    Write-Success "Base images pulled successfully"
}

# Function to build application images
function Build-Images {
    Write-Header "Building Application Images"
    
    Write-Step "Building frontend image..."
    docker-compose -f $ComposeFile build frontend
    
    Write-Step "Building backend image..."
    docker-compose -f $ComposeFile build backend
    
    Write-Step "Building Python PII service image..."
    docker-compose -f $ComposeFile build python-pii-service
    
    Write-Success "All application images built successfully"
}

# Function to start services
function Start-Services {
    Write-Header "Starting Services"
    
    Write-Step "Starting database services..."
    docker-compose -f $ComposeFile up -d postgres mongodb redis
    
    Write-Step "Waiting for databases to be ready..."
    Start-Sleep -Seconds 30
    
    Write-Step "Starting Python PII service..."
    docker-compose -f $ComposeFile up -d python-pii-service
    
    Write-Step "Waiting for PII service to download models..."
    Start-Sleep -Seconds 60
    
    Write-Step "Starting backend service..."
    docker-compose -f $ComposeFile up -d backend
    
    Write-Step "Waiting for backend to be ready..."
    Start-Sleep -Seconds 20
    
    Write-Step "Starting frontend service..."
    docker-compose -f $ComposeFile up -d frontend
    
    Write-Success "All core services started"
}

# Function to start optional tools
function Start-Tools {
    Write-Header "Starting Development Tools"
    
    Write-Step "Starting database management tools..."
    docker-compose -f $ComposeFile --profile tools up -d adminer mongo-express redis-commander mailhog
    
    Write-Success "Development tools started"
}

# Function to check service health
function Test-Health {
    Write-Header "Health Check"
    
    Write-Step "Checking service health..."
    
    # Wait for services to be fully ready
    Start-Sleep -Seconds 30
    
    # Check Backend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend is healthy"
        } else {
            Write-Warning "Backend health check failed"
        }
    }
    catch {
        Write-Warning "Backend health check failed"
    }
    
    # Check Frontend
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend is healthy"
        } else {
            Write-Warning "Frontend health check failed"
        }
    }
    catch {
        Write-Warning "Frontend health check failed"
    }
    
    # Check Python PII Service
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Python PII Service is healthy"
        } else {
            Write-Warning "Python PII Service health check failed"
        }
    }
    catch {
        Write-Warning "Python PII Service health check failed"
    }
}

# Function to show service URLs
function Show-Urls {
    Write-Header "Service URLs"
    
    Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend (React):      " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Green
    Write-Host "   Backend API:           " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Green
    Write-Host "   API Documentation:     " -NoNewline; Write-Host "http://localhost:3001/api-docs" -ForegroundColor Green
    Write-Host "   Python PII Service:    " -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Green
    Write-Host "   PII Service Docs:      " -NoNewline; Write-Host "http://localhost:8000/docs" -ForegroundColor Green
    
    Write-Host "`n🛠️  Development Tools:" -ForegroundColor Cyan
    Write-Host "   Adminer (PostgreSQL):  " -NoNewline; Write-Host "http://localhost:8080" -ForegroundColor Green
    Write-Host "   Mongo Express:         " -NoNewline; Write-Host "http://localhost:8081" -ForegroundColor Green
    Write-Host "   Redis Commander:       " -NoNewline; Write-Host "http://localhost:8082" -ForegroundColor Green
    Write-Host "   Mailhog (Email):       " -NoNewline; Write-Host "http://localhost:8025" -ForegroundColor Green
    
    Write-Host "`n📊 Database Connections:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL:            " -NoNewline; Write-Host "localhost:5432" -ForegroundColor Green
    Write-Host "   MongoDB:               " -NoNewline; Write-Host "localhost:27017" -ForegroundColor Green
    Write-Host "   Redis:                 " -NoNewline; Write-Host "localhost:6379" -ForegroundColor Green
    
    Write-Host "`n👤 Default Login Credentials:" -ForegroundColor Cyan
    Write-Host "   Email:                 " -NoNewline; Write-Host "admin@privacyguard.local" -ForegroundColor Green
    Write-Host "   Password:              " -NoNewline; Write-Host "admin123" -ForegroundColor Green
}

# Function to show logs
function Show-Logs {
    Write-Header "Service Logs"
    
    Write-Host "To view logs for specific services:" -ForegroundColor Cyan
    Write-Host "   All services:          " -NoNewline; Write-Host "docker-compose -f $ComposeFile logs -f" -ForegroundColor Green
    Write-Host "   Frontend only:         " -NoNewline; Write-Host "docker-compose -f $ComposeFile logs -f frontend" -ForegroundColor Green
    Write-Host "   Backend only:          " -NoNewline; Write-Host "docker-compose -f $ComposeFile logs -f backend" -ForegroundColor Green
    Write-Host "   PII Service only:      " -NoNewline; Write-Host "docker-compose -f $ComposeFile logs -f python-pii-service" -ForegroundColor Green
    Write-Host "   Database logs:         " -NoNewline; Write-Host "docker-compose -f $ComposeFile logs -f postgres mongodb redis" -ForegroundColor Green
}

# Function to show management commands
function Show-Management {
    Write-Header "Management Commands"
    
    Write-Host "🔧 Common Commands:" -ForegroundColor Cyan
    Write-Host "   Stop all services:     " -NoNewline; Write-Host "docker-compose -f $ComposeFile down" -ForegroundColor Green
    Write-Host "   Restart services:      " -NoNewline; Write-Host "docker-compose -f $ComposeFile restart" -ForegroundColor Green
    Write-Host "   View service status:   " -NoNewline; Write-Host "docker-compose -f $ComposeFile ps" -ForegroundColor Green
    Write-Host "   Update images:         " -NoNewline; Write-Host "docker-compose -f $ComposeFile pull && docker-compose -f $ComposeFile up -d" -ForegroundColor Green
    
    Write-Host "`n🗄️  Database Commands:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL shell:      " -NoNewline; Write-Host "docker-compose -f $ComposeFile exec postgres psql -U privacyguard_user -d privacyguard_local" -ForegroundColor Green
    Write-Host "   MongoDB shell:         " -NoNewline; Write-Host "docker-compose -f $ComposeFile exec mongodb mongosh privacyguard_local" -ForegroundColor Green
    Write-Host "   Redis CLI:             " -NoNewline; Write-Host "docker-compose -f $ComposeFile exec redis redis-cli" -ForegroundColor Green
    
    Write-Host "`n🧹 Cleanup Commands:" -ForegroundColor Cyan
    Write-Host "   Remove containers:     " -NoNewline; Write-Host "docker-compose -f $ComposeFile down -v" -ForegroundColor Green
    Write-Host "   Remove images:         " -NoNewline; Write-Host "docker-compose -f $ComposeFile down --rmi all" -ForegroundColor Green
    Write-Host "   Full cleanup:          " -NoNewline; Write-Host "docker-compose -f $ComposeFile down -v --rmi all" -ForegroundColor Green
}

# Function to run deployment
function Start-Deployment {
    Write-Header "🚀 PrivacyGuard Local Deployment"
    
    Write-Host "Starting deployment of PrivacyGuard application stack...`n" -ForegroundColor Cyan
    
    # Step 1: Prerequisites
    Test-Prerequisites
    
    # Step 2: Environment setup
    New-EnvFile
    
    # Step 3: Pull base images
    Get-Images
    
    # Step 4: Build application images
    Build-Images
    
    # Step 5: Start services
    Start-Services
    
    # Step 6: Start development tools
    Start-Tools
    
    # Step 7: Health check
    Test-Health
    
    # Step 8: Show information
    Show-Urls
    Show-Logs
    Show-Management
    
    Write-Header "🎉 Deployment Complete!"
    
    Write-Host "PrivacyGuard is now running locally!" -ForegroundColor Green
    Write-Host "Access the application at: " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Green
    Write-Host "Login with: " -NoNewline; Write-Host "admin@privacyguard.local / admin123" -ForegroundColor Green
    Write-Host ""
}

# Function to stop services
function Stop-Services {
    Write-Header "Stopping PrivacyGuard Services"
    
    Write-Step "Stopping all services..."
    docker-compose -f $ComposeFile down
    
    Write-Success "All services stopped"
}

# Function to cleanup
function Remove-Everything {
    Write-Header "Cleaning Up PrivacyGuard"
    
    Write-Step "Stopping and removing containers, networks, and volumes..."
    docker-compose -f $ComposeFile down -v --rmi local
    
    Write-Step "Removing unused Docker resources..."
    docker system prune -f
    
    Write-Success "Cleanup complete"
}

# Main script logic
switch ($Command) {
    "deploy" {
        Start-Deployment
    }
    "start" {
        Write-Header "Starting PrivacyGuard Services"
        docker-compose -f $ComposeFile up -d
        Test-Health
        Show-Urls
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Stop-Services
        Start-Sleep -Seconds 5
        Write-Header "Starting PrivacyGuard Services"
        docker-compose -f $ComposeFile up -d
        Test-Health
        Show-Urls
    }
    "logs" {
        docker-compose -f $ComposeFile logs -f
    }
    "status" {
        docker-compose -f $ComposeFile ps
    }
    "cleanup" {
        Remove-Everything
    }
    "help" {
        Write-Host "Usage: .\deploy-local.ps1 [command]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  deploy    - Full deployment (default)"
        Write-Host "  start     - Start existing services"
        Write-Host "  stop      - Stop all services"
        Write-Host "  restart   - Restart all services"
        Write-Host "  logs      - Show service logs"
        Write-Host "  status    - Show service status"
        Write-Host "  cleanup   - Stop and remove everything"
        Write-Host "  help      - Show this help"
    }
    default {
        Write-Error "Unknown command: $Command"
        Write-Host "Use '.\deploy-local.ps1 help' for available commands"
        exit 1
    }
}