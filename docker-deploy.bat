@echo off
REM PrivacyGuard Docker Deployment Script for Windows

echo 🚀 Starting PrivacyGuard Docker Deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop and try again.
    pause
    exit /b 1
)

REM Check if .env file exists, if not create from example
if not exist ".env" (
    echo ⚠️ .env file not found. Creating from .env.production.example...
    copy .env.production.example .env
    echo 🔧 Please edit the .env file with your production settings before continuing.
    echo 📋 Important settings to update in .env:
    echo    - POSTGRES_PASSWORD (strong password)
    echo    - MONGODB_ROOT_PASSWORD (strong password)
    echo    - REDIS_PASSWORD (strong password)
    echo    - JWT_SECRET (strong secret at least 32 chars)
    echo    - CORS_ORIGIN (your production domain)
    echo.
    echo Press any key after editing .env to continue...
    pause >nul
)

REM Check if backend .env file exists
if not exist "backend\.env" (
    echo ⚠️ backend\.env file not found. Creating from .env.production.example...
    copy .env.production.example backend\.env
)

echo ✅ Verification complete. Starting services...

REM Check if services are already running and stop them
echo ⚠️ Stopping existing services...
docker-compose -f docker-compose.production.yml down >nul 2>&1

REM Build and start services in detached mode
echo 🔧 Building and starting PrivacyGuard services...
docker-compose -f docker-compose.production.yml up --build -d

echo ⏳ Waiting for services to start...

REM Wait for services to be healthy
timeout /t 30 /nobreak >nul
echo 🏥 Checking service health status...

REM Check the status of all services
docker-compose -f docker-compose.production.yml ps

echo 📊 Checking service logs for any errors...

REM Show recent logs for each service
echo 📋 --- Logs for postgres ---
docker-compose -f docker-compose.production.yml logs --tail=20 postgres 2>nul
echo.
echo 📋 --- Logs for mongodb ---
docker-compose -f docker-compose.production.yml logs --tail=20 mongodb 2>nul
echo.
echo 📋 --- Logs for redis ---
docker-compose -f docker-compose.production.yml logs --tail=20 redis 2>nul
echo.
echo 📋 --- Logs for backend ---
docker-compose -f docker-compose.production.yml logs --tail=20 backend 2>nul
echo.
echo 📋 --- Logs for frontend ---
docker-compose -f docker-compose.production.yml logs --tail=20 frontend 2>nul
echo.

REM Run database migrations
echo 🔧 Running database migrations...
docker-compose -f docker-compose.production.yml exec backend npm run migrate

REM Seed the database if needed
echo 🌱 Seeding database with initial data...
docker-compose -f docker-compose.production.yml exec backend npm run seed

echo ✅ PrivacyGuard deployment completed successfully!
echo.
echo 🌐 Services are now running:
echo    Frontend: http://localhost (or your configured domain)
echo    Backend API: http://localhost:3001/health
echo    Backend API Documentation: http://localhost:3001/api/v1
echo.
echo 🔐 Default credentials after seeding:
echo    Admin: admin@privacyguard.com / admin123
echo    DPO: dpo@privacyguard.com / dpo123
echo.
echo 📋 To view all services: docker-compose -f docker-compose.production.yml ps
echo 📋 To view logs: docker-compose -f docker-compose.production.yml logs -f
echo 📋 To stop services: docker-compose -f docker-compose.production.yml down
echo.
echo ⚠️  IMPORTANT: Change default passwords for production use!
pause