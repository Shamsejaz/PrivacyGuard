# Coolify Setup Helper Script
# This script helps you prepare environment variables for Coolify

Write-Host "🚀 Coolify Setup Helper for PrivacyGuard" -ForegroundColor Blue
Write-Host "Domain: app.privacycomply.ai" -ForegroundColor Cyan
Write-Host ""

# Generate secure passwords
function Generate-SecurePassword {
    param([int]$Length = 32)
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    $password = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

Write-Host "🔐 Generated Secure Passwords:" -ForegroundColor Green
$postgresPassword = Generate-SecurePassword
$mongoPassword = Generate-SecurePassword
$redisPassword = Generate-SecurePassword
$jwtSecret = Generate-SecurePassword -Length 64

Write-Host "POSTGRES_PASSWORD=$postgresPassword" -ForegroundColor Yellow
Write-Host "MONGO_ROOT_PASSWORD=$mongoPassword" -ForegroundColor Yellow
Write-Host "REDIS_PASSWORD=$redisPassword" -ForegroundColor Yellow
Write-Host "JWT_SECRET=$jwtSecret" -ForegroundColor Yellow
Write-Host ""

Write-Host "📋 Complete Environment Variables for Coolify:" -ForegroundColor Cyan
Write-Host "Copy and paste these into your Coolify application's Environment Variables section:" -ForegroundColor White
Write-Host ""

$envVars = @"
NODE_ENV=production
DOMAIN=app.privacycomply.ai
FRONTEND_URL=https://app.privacycomply.ai
API_URL=https://app.privacycomply.ai/api/v1
WS_URL=wss://app.privacycomply.ai
POSTGRES_DB=privacyguard_prod
POSTGRES_USER=privacyguard_user
POSTGRES_PASSWORD=$postgresPassword
POSTGRES_MAX_CONNECTIONS=50
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=$mongoPassword
MONGO_DB=privacyguard_prod
REDIS_PASSWORD=$redisPassword
JWT_SECRET=$jwtSecret
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://app.privacycomply.ai,https://privacycomply.ai
LOG_LEVEL=info
LOG_CONSOLE=true
LOG_FILE=true
LOG_AUDIT=true
PII_SERVICE_ENABLED=false
PII_SERVICE_URL=disabled
DEBUG_MODE=false
ENABLE_SWAGGER=false
SEED_DATA=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
"@

Write-Host $envVars -ForegroundColor Green

# Save to file
$envVars | Out-File -FilePath ".env.coolify.generated" -Encoding UTF8
Write-Host ""
Write-Host "💾 Environment variables saved to: .env.coolify.generated" -ForegroundColor Blue

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Copy the environment variables above" -ForegroundColor White
Write-Host "2. Go to your Coolify dashboard" -ForegroundColor White
Write-Host "3. Navigate to your PrivacyGuard application" -ForegroundColor White
Write-Host "4. Go to Environment Variables section" -ForegroundColor White
Write-Host "5. Paste the variables (one per line: KEY=VALUE)" -ForegroundColor White
Write-Host "6. Set up domain: app.privacycomply.ai" -ForegroundColor White
Write-Host "7. Enable SSL certificate" -ForegroundColor White
Write-Host "8. Deploy the application" -ForegroundColor White
Write-Host ""
Write-Host "🌐 After deployment, your app will be available at:" -ForegroundColor Green
Write-Host "https://app.privacycomply.ai" -ForegroundColor Yellow