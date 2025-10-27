# PowerShell script to test Docker build
# This script tests the Docker build process for PrivacyComply

param(
    [switch]$SkipBuild,
    [switch]$TestOnly
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
🧪 Docker Build Test
===================
Testing PrivacyComply Docker build process
"@

# Check if Docker is running
Write-ColorOutput $Cyan "🔍 Checking Docker availability..."
try {
    $dockerVersion = docker version --format "{{.Server.Version}}"
    Write-ColorOutput $Green "✅ Docker is running (version: $dockerVersion)"
}
catch {
    Write-ColorOutput $Red "❌ Docker is not running or not available"
    Write-ColorOutput $Yellow "Please start Docker Desktop and try again"
    exit 1
}

if (-not $SkipBuild) {
    Write-ColorOutput $Cyan "🔨 Testing Docker build..."
    
    try {
        # Test build with backend authentication configuration
        docker build -t privacycomply-test `
            --build-arg NODE_ENV=production `
            --build-arg VITE_API_BASE_URL=https://app.privacycomply.ai/api/v1 `
            --build-arg VITE_API_URL=https://app.privacycomply.ai/api/v1 `
            --build-arg VITE_WS_URL=wss://app.privacycomply.ai `
            --build-arg VITE_APP_NAME=PrivacyComply `
            --build-arg VITE_NODE_ENV=production `
            .
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput $Green "✅ Docker build successful!"
        } else {
            Write-ColorOutput $Red "❌ Docker build failed"
            exit 1
        }
    }
    catch {
        Write-ColorOutput $Red "❌ Docker build failed with error: $_"
        exit 1
    }
}

if ($TestOnly) {
    Write-ColorOutput $Cyan "🚀 Testing container startup..."
    
    try {
        # Start container in detached mode
        docker run -d --name privacycomply-test-container -p 8080:80 privacycomply-test
        
        # Wait a moment for startup
        Start-Sleep -Seconds 5
        
        # Test health check
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 10 -UseBasicParsing
        
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput $Green "✅ Container health check passed"
        } else {
            Write-ColorOutput $Yellow "⚠️  Health check returned status: $($response.StatusCode)"
        }
        
        # Test main page
        $mainResponse = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 10 -UseBasicParsing
        
        if ($mainResponse.StatusCode -eq 200) {
            Write-ColorOutput $Green "✅ Main page accessible"
        } else {
            Write-ColorOutput $Yellow "⚠️  Main page returned status: $($mainResponse.StatusCode)"
        }
        
    }
    catch {
        Write-ColorOutput $Red "❌ Container test failed: $_"
    }
    finally {
        # Cleanup
        Write-ColorOutput $Cyan "🧹 Cleaning up test container..."
        docker stop privacycomply-test-container 2>$null
        docker rm privacycomply-test-container 2>$null
        docker rmi privacycomply-test 2>$null
    }
}

Write-ColorOutput $Green "🎉 Docker build test completed!"
Write-ColorOutput $Cyan @"

📋 Next Steps:
1. Start Docker Desktop if not running
2. Run: docker-compose up --build
3. Access: http://localhost
4. Backend: https://app.privacycomply.ai/api/v1
"@