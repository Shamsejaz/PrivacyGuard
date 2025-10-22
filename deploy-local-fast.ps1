# PrivacyGuard Fast Local Deployment Script (Windows PowerShell)
# Deploys without PII service for faster startup

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "start", "stop", "restart", "logs", "status", "test", "clean", "help")]
    [string]$Command = "deploy"
)

# Configuration
$ComposeFile = "docker-compose.coolify-fast.yml"
$EnvFile = ".env.coolify-fast"
$ProjectName = "privacyguard-fast"

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
    Write-Step "Checking prerequisites..."
    
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
    
    Write-Success "Prerequisites check passed"
}

# Function to clean up existing containers
function Remove-ExistingContainers {
    Write-Step "Cleaning up existing containers..."
    
    try {
        docker-compose -f $ComposeFile down -v 2>$null
        docker container prune -f 2>$null
        Write-Success "Cleanup completed"
    }
    catch {
        Write-Info "No existing containers to clean up"
    }
}

# Function to start services
function Start-Services {
    Write-Header "🚀 Starting PrivacyGuard Fast Deployment"
    
    Write-Step "Building and starting services..."
    
    try {
        docker-compose -f $ComposeFile up --build -d
        Write-Success "Services started successfully"
    }
    catch {
        Write-Error "Failed to start services: $($_.Exception.Message)"
        exit 1
    }
}

# Function to wait for services
function Wait-ForServices {
    Write-Step "Waiting for services to be healthy..."
    
    $maxAttempts = 30
    $attempt = 1
    
    while ($attempt -le $maxAttempts) {
        Write-Info "Health check attempt $attempt/$maxAttempts..."
        
        try {
            $runningServices = docker-compose -f $ComposeFile ps --services --filter "status=running" 2>$null
            $totalServices = docker-compose -f $ComposeFile config --services 2>$null
            
            if ($runningServices.Count -eq $totalServices.Count) {
                Write-Success "All services are healthy!"
                return
            }
        }
        catch {
            Write-Info "Still waiting for services..."
        }
        
        Start-Sleep -Seconds 10
        $attempt++
    }
    
    Write-Warning "Some services may not be fully healthy yet, but continuing..."
}

# Function to show service status
function Show-Status {
    Write-Header "📊 Service Status"
    
    docker-compose -f $ComposeFile ps
}

# Function to show service URLs
function Show-Urls {
    Write-Header "🌐 Service URLs"
    
    Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend (React):      " -NoNewline; Write-Host "http://localhost:80" -ForegroundColor Green
    Write-Host "   Backend API:           " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Green
    Write-Host "   API Documentation:     " -NoNewline; Write-Host "http://localhost:3001/api-docs" -ForegroundColor Green
    Write-Host "   Health Check:          " -NoNewline; Write-Host "http://localhost:80/health" -ForegroundColor Green
    
    Write-Host "`n🗄️  Database Access:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL:            " -NoNewline; Write-Host "localhost:5432" -ForegroundColor Green
    Write-Host "   MongoDB:               " -NoNewline; Write-Host "localhost:27017" -ForegroundColor Green
    Write-Host "   Redis:                 " -NoNewline; Write-Host "localhost:6379" -ForegroundColor Green
    
    Write-Host "`n👤 Default Login Credentials:" -ForegroundColor Cyan
    Write-Host "   Email:                 " -NoNewline; Write-Host "admin@privacyguard.local" -ForegroundColor Green
    Write-Host "   Password:              " -NoNewline; Write-Host "admin123" -ForegroundColor Green
    
    Write-Host "`n🔐 Database Credentials:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL User:       " -NoNewline; Write-Host "privacyguard_user" -ForegroundColor Green
    Write-Host "   PostgreSQL Password:   " -NoNewline; Write-Host "privacyguard_secure_password_2024" -ForegroundColor Green
    Write-Host "   MongoDB User:          " -NoNewline; Write-Host "admin" -ForegroundColor Green
    Write-Host "   MongoDB Password:      " -NoNewline; Write-Host "mongo_secure_password_2024" -ForegroundColor Green
    Write-Host "   Redis Password:        " -NoNewline; Write-Host "redis_secure_password_2024" -ForegroundColor Green
}

# Function to show management commands
function Show-Management {
    Write-Header "🔧 Management Commands"
    
    Write-Host "🔧 Common Commands:" -ForegroundColor Cyan
    Write-Host "   Stop all services:     " -NoNewline; Write-Host "docker-compose -f $ComposeFile down" -ForegroundColor Green
    Write-Host "   Restart services:      " -NoNewline; Write-Host "docker-compose -f $ComposeFile restart" -ForegroundColor Green
    Write-Host "   View service status:   " -NoNewline; Write-Host "docker-compose -f $ComposeFile ps" -ForegroundColor Green
    Write-Host "   View logs:             " -NoNewline; Write-Host "docker-compose -f $ComposeFile logs -f" -ForegroundColor Green
    Write-Host "   Rebuild services:      " -NoNewline; Write-Host "docker-compose -f $ComposeFile up --build -d" -ForegroundColor Green
    
    Write-Host "`n🗄️  Database Commands:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL shell:      " -NoNewline; Write-Host "docker-compose -f $ComposeFile exec postgres psql -U privacyguard_user -d privacyguard_prod" -ForegroundColor Green
    Write-Host "   MongoDB shell:         " -NoNewline; Write-Host "docker-compose -f $ComposeFile exec mongodb mongosh privacyguard_prod" -ForegroundColor Green
    Write-Host "   Redis CLI:             " -NoNewline; Write-Host "docker-compose -f $ComposeFile exec redis redis-cli -a redis_secure_password_2024" -ForegroundColor Green
}

# Function to test deployment
function Test-Deployment {
    Write-Header "🧪 Testing Deployment"
    
    Write-Step "Testing frontend..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:80/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Frontend is responding"
        }
    }
    catch {
        Write-Warning "Frontend health check failed"
    }
    
    Write-Step "Testing backend..."
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend is responding"
        }
    }
    catch {
        Write-Warning "Backend health check failed"
    }
}

# Main deployment function
function Start-Deployment {
    Write-Header "🚀 PrivacyGuard Fast Local Deployment"
    
    Write-Host "Starting fast deployment without PII service...`n" -ForegroundColor Cyan
    
    # Step 1: Prerequisites
    Test-Prerequisites
    
    # Step 2: Cleanup
    Remove-ExistingContainers
    
    # Step 3: Start services
    Start-Services
    
    # Step 4: Wait for services
    Wait-ForServices
    
    # Step 5: Test deployment
    Test-Deployment
    
    # Step 6: Show information
    Show-Status
    Show-Urls
    Show-Management
    
    Write-Header "🎉 Fast Deployment Complete!"
    
    Write-Host "PrivacyGuard is now running locally (without PII service)!" -ForegroundColor Green
    Write-Host "Access the application at: " -NoNewline; Write-Host "http://localhost:80" -ForegroundColor Green
    Write-Host "Login with: " -NoNewline; Write-Host "admin@privacyguard.local / admin123" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Note: PII detection service is disabled for faster deployment." -ForegroundColor Yellow
    Write-Host "To enable PII features, use the full deployment with docker-compose.local.yml" -ForegroundColor Yellow
    Write-Host ""
}

# Main script logic
switch ($Command) {
    "deploy" {
        Start-Deployment
    }
    "start" {
        Start-Services
        Wait-ForServices
        Show-Urls
    }
    "stop" {
        Write-Header "Stopping Services"
        docker-compose -f $ComposeFile down
        Write-Success "Services stopped"
    }
    "restart" {
        Write-Header "Restarting Services"
        docker-compose -f $ComposeFile restart
        Wait-ForServices
        Show-Urls
    }
    "logs" {
        docker-compose -f $ComposeFile logs -f
    }
    "status" {
        Show-Status
    }
    "test" {
        Test-Deployment
    }
    "clean" {
        Write-Header "Cleaning Up"
        docker-compose -f $ComposeFile down -v --rmi all
        docker system prune -f
        Write-Success "Cleanup complete"
    }
    "help" {
        Write-Host "Usage: .\deploy-local-fast.ps1 [command]"
        Write-Host ""
        Write-Host "Commands:"
        Write-Host "  deploy    - Full deployment (default)"
        Write-Host "  start     - Start services"
        Write-Host "  stop      - Stop services"
        Write-Host "  restart   - Restart services"
        Write-Host "  logs      - Show logs"
        Write-Host "  status    - Show status"
        Write-Host "  test      - Test deployment"
        Write-Host "  clean     - Clean up everything"
        Write-Host "  help      - Show this help"
    }
    default {
        Write-Error "Unknown command: $Command"
        Write-Host "Use '.\deploy-local-fast.ps1 help' for available commands"
        exit 1
    }
}