# PowerShell script to switch between development (mock) and production (live) backend modes

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "production", "mock")]
    [string]$Mode
)

Write-Host "🔄 Switching to $Mode mode..." -ForegroundColor Cyan

switch ($Mode) {
    "development" {
        Write-Host "📝 Setting up development mode with mock authentication..." -ForegroundColor Green
        
        # Copy development environment
        if (Test-Path ".env.development") {
            Copy-Item ".env.development" ".env.local" -Force
            Write-Host "✅ Copied .env.development to .env.local" -ForegroundColor Green
        }
        
        Write-Host "🎭 Mock authentication enabled" -ForegroundColor Yellow
        Write-Host "Demo credentials:" -ForegroundColor White
        Write-Host "  DPO: dpo@privacycomply.com / DPO123!@#" -ForegroundColor Gray
        Write-Host "  Compliance: compliance@privacycomply.com / Compliance123!@#" -ForegroundColor Gray
        Write-Host "  Admin: admin@privacycomply.com / Admin123!@#" -ForegroundColor Gray
    }
    
    "production" {
        Write-Host "🌐 Setting up production mode with live backend..." -ForegroundColor Green
        
        # Copy production environment
        if (Test-Path ".env.production.local") {
            Copy-Item ".env.production.local" ".env.local" -Force
            Write-Host "✅ Copied .env.production.local to .env.local" -ForegroundColor Green
        }
        
        Write-Host "🔗 Live backend: https://app.privacycomply.ai/api/v1" -ForegroundColor Yellow
        Write-Host "⚠️  You'll need valid credentials from the live backend" -ForegroundColor Red
    }
    
    "mock" {
        Write-Host "🎭 Setting up mock-only mode..." -ForegroundColor Green
        
        # Create mock-only environment
        @"
# Mock-only mode - no backend API calls
VITE_API_BASE_URL=http://mock-disabled:9999
VITE_API_URL=http://mock-disabled:9999
VITE_WS_URL=ws://mock-disabled:9999
VITE_PYTHON_PII_ENDPOINT=http://localhost:8000
VITE_APP_NAME=PrivacyComply
VITE_NODE_ENV=development
"@ | Out-File -FilePath ".env.local" -Encoding UTF8
        
        Write-Host "✅ Created mock-only .env.local" -ForegroundColor Green
        Write-Host "🎭 Only demo credentials will work" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart the development server: npm run dev" -ForegroundColor White
Write-Host "2. Check the browser console for authentication mode confirmation" -ForegroundColor White

if ($Mode -eq "production") {
    Write-Host "3. Ensure the live backend at app.privacycomply.ai is accessible" -ForegroundColor White
}

Write-Host ""
Write-Host "✨ Backend mode switched to: $Mode" -ForegroundColor Green