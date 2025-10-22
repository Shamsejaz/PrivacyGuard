#!/bin/bash

# Production Deployment Script for app.privacycomply.ai
# This script deploys PrivacyGuard to production with SSL certificates

set -e

echo "🚀 Starting PrivacyGuard Production Deployment for app.privacycomply.ai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="app.privacycomply.ai"
EMAIL="admin@privacycomply.ai"  # Change this to your email
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env.production"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    log_error "Environment file $ENV_FILE not found!"
    log_info "Please copy .env.production.example to .env.production and configure it"
    log_info "Update the DOMAIN, API_URL, WS_URL, and CORS_ORIGIN values for your domain"
    log_info "Also change all passwords marked with 'CHANGE_THIS'"
    exit 1
fi

# Check if SSL certificates exist
if [[ ! -f "nginx/ssl/fullchain.pem" ]] || [[ ! -f "nginx/ssl/privkey.pem" ]]; then
    log_warning "SSL certificates not found. Setting up Let's Encrypt..."
    
    # Create SSL directory
    mkdir -p nginx/ssl
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        log_info "Installing certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot
    fi
    
    # Stop any running containers
    log_info "Stopping existing containers..."
    docker-compose -f $COMPOSE_FILE down || true
    
    # Start temporary nginx for certificate generation
    log_info "Starting temporary web server for certificate generation..."
    docker run -d --name temp-nginx -p 80:80 -v $(pwd)/nginx/ssl:/etc/nginx/ssl nginx:alpine
    
    # Generate SSL certificate
    log_info "Generating SSL certificate for $DOMAIN..."
    sudo certbot certonly --webroot -w nginx/ssl -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    # Copy certificates
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
    sudo chown $(whoami):$(whoami) nginx/ssl/*.pem
    
    # Stop temporary container
    docker stop temp-nginx && docker rm temp-nginx
    
    log_success "SSL certificates generated successfully!"
fi

# Validate environment variables
log_info "Validating environment configuration..."
source $ENV_FILE

required_vars=("POSTGRES_PASSWORD" "MONGO_ROOT_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]] || [[ "${!var}" == *"CHANGE_THIS"* ]]; then
        log_error "Please set a secure value for $var in $ENV_FILE"
        exit 1
    fi
done

log_success "Environment validation passed!"

# Pull latest images
log_info "Pulling latest Docker images..."
docker-compose -f $COMPOSE_FILE pull

# Build application
log_info "Building application..."
docker-compose -f $COMPOSE_FILE build --no-cache

# Stop existing containers
log_info "Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down

# Start services
log_info "Starting production services..."
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
log_info "Waiting for services to be healthy..."
sleep 30

# Check service health
log_info "Checking service health..."
if docker-compose -f $COMPOSE_FILE ps | grep -q "unhealthy"; then
    log_error "Some services are unhealthy. Check logs with: docker-compose -f $COMPOSE_FILE logs"
    exit 1
fi

# Run database migrations (if needed)
log_info "Running database migrations..."
docker-compose -f $COMPOSE_FILE exec -T backend npm run migrate || log_warning "Migration failed or not needed"

# Setup SSL certificate renewal
log_info "Setting up SSL certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f $(pwd)/$COMPOSE_FILE restart frontend") | crontab -

# Display deployment information
log_success "🎉 PrivacyGuard deployed successfully!"
echo ""
echo "📋 Deployment Information:"
echo "   🌐 Domain: https://$DOMAIN"
echo "   🔒 SSL: Enabled with Let's Encrypt"
echo "   📊 Status: docker-compose -f $COMPOSE_FILE ps"
echo "   📝 Logs: docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🔧 Management Commands:"
echo "   Stop: docker-compose -f $COMPOSE_FILE down"
echo "   Restart: docker-compose -f $COMPOSE_FILE restart"
echo "   Update: ./deploy-production.sh"
echo ""
echo "🔐 Security Reminders:"
echo "   - Change default passwords in $ENV_FILE"
echo "   - Set up firewall rules (ports 80, 443, 22 only)"
echo "   - Enable automatic security updates"
echo "   - Set up monitoring and backups"
echo ""

log_success "Deployment completed! Visit https://$DOMAIN to access your application."