# Simple PowerShell deployment script for PrivacyComply
# Uses the default docker-compose.yml (backend authentication mode)

param(
    [switch]$Build,
    [switch]$NoBuild,
    [switch]$Logs,
    [switch]$Stop,
    [switch]$Clean,
    [switch]$Status
)

# Colors for output
$Green = [System.ConsoleColor]::Green
$Cyan = [System.ConsoleColor]::Cyan
$Yellow = [System.ConsoleColor]::Yellow
$White = [System.ConsoleColor]::White

function Write-ColorOutput($ForegroundColor, $Message) {
    $originalColor = [Console]::ForegroundColor
    [Console]::ForegroundColor = $ForegroundColor
    Write-Output $Message
    [Console]::ForegroundColor = $originalColor
}

Write-ColorOutput $Cyan @"
🚀 PrivacyComply Deployment
==========================
Mode: Backend Authentication (Default)
Backend: https://app.privacycomply.ai/api/v1
"@

if ($Stop) {
    Write-ColorOutput $Cyan "🛑 Stopping services..."
    docker-compose down
    Write-ColorOutput $Green "✅ Services stopped"
    exit 0
}

if ($Clean) {
    Write-ColorOutput $Cyan "🧹 Cleaning up..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    Write-ColorOutput $Green "✅ Cleanup completed"
    exit 0
}

if ($Logs) {
    Write-ColorOutput $Cyan "📋 Showing logs..."
    docker-compose logs -f
    exit 0
}

if ($Status) {
    Write-ColorOutput $Cyan "📊 Service Status"
    docker-compose ps
    exit 0
}

# Default deployment
if ($Build -or -not $NoBuild) {
    Write-ColorOutput $Cyan "🔨 Building and starting services..."
    docker-compose up --build -d
} else {
    Write-ColorOutput $Cyan "🚀 Starting services..."
    docker-compose up -d
}

if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput $Green "✅ Deployment successful!"
    Write-ColorOutput $White ""
    Write-ColorOutput $Cyan "🌐 Access URLs:"
    Write-ColorOutput $White "Frontend: http://localhost"
    Write-ColorOutput $White "Backend: https://app.privacycomply.ai/api/v1"
    Write-ColorOutput $White ""
    Write-ColorOutput $Yellow "🔑 Use real backend credentials (demo credentials won't work)"
} else {
    Write-ColorOutput $Red "❌ Deployment failed"
    exit 1
}