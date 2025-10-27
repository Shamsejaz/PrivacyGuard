# PowerShell script to build PrivacyComply Docker image
# This script handles the Docker build process with proper error handling

param(
    [string]$Tag = "privacycomply:latest",
    [switch]$NoCache,
    [switch]$Verbose,
    [string]$Platform = "linux/amd64"
)

# Colors for output
$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow
$Cyan = [System.ConsoleColor]::Cyan

function Write-ColorOutput($ForegroundColor, $Message) {
    $originalColor = [Console]::ForegroundColor
    [Console]::ForegroundColor = $ForegroundColor
    Write-Output $Message
    [Console]::ForegroundColor = $originalColor
}

Write-ColorOutput $Cyan @"
🐳 PrivacyComply Docker Build
============================
Tag: $Tag
Platform: $Platform
No Cache: $NoCache
"@

# Check if Docker is available
Write-ColorOutput $Cyan "🔍 Checking Docker availability..."
try {
    $dockerVersion = docker version --format "{{.Server.Version}}" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not responding"
    }
    Write-ColorOutput $Green "✅ Docker is available (version: $dockerVersion)"
}
catch {
    Write-ColorOutput $Red "❌ Docker is not available or not running"
    Write-ColorOutput $Yellow "Please start Docker Desktop and try again"
    exit 1
}

# Prepare build arguments
$buildArgs = @(
    "--build-arg", "NODE_ENV=production",
    "--build-arg", "VITE_API_BASE_URL=https://app.privacycomply.ai/api/v1",
    "--build-arg", "VITE_API_URL=https://app.privacycomply.ai/api/v1",
    "--build-arg", "VITE_WS_URL=wss://app.privacycomply.ai",
    "--build-arg", "VITE_APP_NAME=PrivacyComply",
    "--build-arg", "VITE_NODE_ENV=production",
    "--platform", $Platform,
    "--tag", $Tag
)

if ($NoCache) {
    $buildArgs += "--no-cache"
}

if ($Verbose) {
    $buildArgs += "--progress=plain"
}

# Build the Docker image
Write-ColorOutput $Cyan "🔨 Building Docker image..."
Write-ColorOutput $Yellow "Command: docker build $($buildArgs -join ' ') ."

try {
    $buildCommand = "docker"
    $buildParams = @("build") + $buildArgs + @(".")
    
    & $buildCommand $buildParams
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput $Green "✅ Docker build completed successfully!"
        
        # Show image info
        Write-ColorOutput $Cyan "📊 Image Information:"
        docker images $Tag --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
        
    } else {
        Write-ColorOutput $Red "❌ Docker build failed with exit code: $LASTEXITCODE"
        exit 1
    }
}
catch {
    Write-ColorOutput $Red "❌ Docker build failed with error: $_"
    exit 1
}

Write-ColorOutput $Green @"

🎉 Build completed successfully!

📋 Next Steps:
1. Test the image: docker run -p 8080:80 $Tag
2. Access the app: http://localhost:8080
3. Deploy with: docker-compose up
"@