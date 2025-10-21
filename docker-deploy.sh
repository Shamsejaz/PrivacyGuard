#!/bin/bash

# PrivacyGuard Docker Deployment Script

set -e  # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting PrivacyGuard Docker Deployment..."

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo "❌ Docker is not installed. Please install Docker and try again."
  exit 1
fi

# Check if Docker Compose is installed
if ! [ -x "$(command -v docker-compose)" ]; then
  echo "⚠️ Docker Compose is not installed. Attempting to use docker compose (v2)..."
  if ! [ -x "$(command -v docker)" ] || ! docker compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
  fi
fi

# Check if .env file exists, if not create from example
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Creating from .env.production.example..."
    cp .env.production.example .env
    echo "🔧 Please edit the .env file with your production settings before continuing."
    echo "📋 Important settings to update in .env:"
    echo "   - POSTGRES_PASSWORD (strong password)"
    echo "   - MONGODB_ROOT_PASSWORD (strong password)"
    echo "   - REDIS_PASSWORD (strong password)"
    echo "   - JWT_SECRET (strong secret at least 32 chars)"
    echo "   - CORS_ORIGIN (your production domain)"
    echo ""
    read -p "Press Enter to continue after editing .env, or Ctrl+C to cancel..."
fi

# Check if backend .env file exists
if [ ! -f backend/.env ]; then
    echo "⚠️ backend/.env file not found. Creating from .env.production.example..."
    cp .env.production.example backend/.env
fi

echo "✅ Verification complete. Starting services..."

# Check if services are already running
if [ -x "$(command -v docker)" ] && docker compose ps > /dev/null 2>&1; then
    echo "⚠️ Stopping existing services..."
    docker compose down
elif docker-compose ps > /dev/null 2>&1; then
    echo "⚠️ Stopping existing services..."
    docker-compose down
fi

# Build and start services in detached mode
echo "🔧 Building and starting PrivacyGuard services..."
if [ -x "$(command -v docker)" ] && docker compose version > /dev/null 2>&1; then
    docker compose -f docker-compose.production.yml up --build -d
else
    docker-compose -f docker-compose.production.yml up --build -d
fi

echo "⏳ Waiting for services to start..."

# Wait for all services to be healthy
echo "🏥 Checking service health status..."
sleep 30

# Check the status of all services
if [ -x "$(command -v docker)" ] && docker compose version > /dev/null 2>&1; then
    docker compose -f docker-compose.production.yml ps
else
    docker-compose -f docker-compose.production.yml ps
fi

echo "📊 Checking service logs for any errors..."

# Show recent logs for each service
SERVICES=("postgres" "mongodb" "redis" "backend" "frontend")
for service in "${SERVICES[@]}"; do
    echo "📋 --- Logs for $service ---"
    if [ -x "$(command -v docker)" ] && docker compose version > /dev/null 2>&1; then
        docker compose -f docker-compose.production.yml logs --tail=20 "$service" 2>/dev/null || echo "⚠️  Could not retrieve logs for $service"
    else
        docker-compose -f docker-compose.production.yml logs --tail=20 "$service" 2>/dev/null || echo "⚠️  Could not retrieve logs for $service"
    fi
    echo ""
done

# Run database migrations
echo "🔧 Running database migrations..."
if [ -x "$(command -v docker)" ] && docker compose version > /dev/null 2>&1; then
    docker compose -f docker-compose.production.yml exec backend npm run migrate
else
    docker-compose -f docker-compose.production.yml exec backend npm run migrate
fi

# Seed the database if needed
echo "🌱 Seeding database with initial data..."
if [ -x "$(command -v docker)" ] && docker compose version > /dev/null 2>&1; then
    docker compose -f docker-compose.production.yml exec backend npm run seed
else
    docker-compose -f docker-compose.production.yml exec backend npm run seed
fi

echo "✅ PrivacyGuard deployment completed successfully!"
echo ""
echo "🌐 Services are now running:"
echo "   Frontend: http://localhost (or your configured domain)"
echo "   Backend API: http://localhost:3001/health"
echo "   Backend API Documentation: http://localhost:3001/api/v1"
echo ""
echo "🔐 Default credentials after seeding:"
echo "   Admin: admin@privacyguard.com / admin123"
echo "   DPO: dpo@privacyguard.com / dpo123"
echo ""
echo "📋 To view all services: docker compose -f docker-compose.production.yml ps"
echo "📋 To view logs: docker compose -f docker-compose.production.yml logs -f"
echo "📋 To stop services: docker compose -f docker-compose.production.yml down"
echo ""
echo "⚠️  IMPORTANT: Change default passwords for production use!"