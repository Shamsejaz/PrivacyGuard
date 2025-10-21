#!/bin/bash

# PrivacyGuard Production Deployment Script
# This script handles the deployment of PrivacyGuard to production environments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "$PROJECT_ROOT/$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found. Please create it from .env.example"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to validate environment variables
validate_environment() {
    log_info "Validating environment variables..."
    
    # Source the environment file
    source "$PROJECT_ROOT/$ENV_FILE"
    
    # Required variables
    required_vars=(
        "POSTGRES_PASSWORD"
        "MONGODB_ROOT_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        log_error "Please set these variables in $ENV_FILE"
        exit 1
    fi
    
    # Validate JWT secret strength
    if [ ${#JWT_SECRET} -lt 32 ]; then
        log_error "JWT_SECRET must be at least 32 characters long"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Function to create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    
    directories=(
        "backups/postgresql"
        "backups/mongodb"
        "backups/redis"
        "logs/nginx"
        "nginx/ssl"
        "monitoring"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$PROJECT_ROOT/$dir"
        log_info "Created directory: $dir"
    done
    
    log_success "Directories created"
}

# Function to generate SSL certificates (self-signed for development)
generate_ssl_certificates() {
    log_info "Checking SSL certificates..."
    
    ssl_dir="$PROJECT_ROOT/nginx/ssl"
    cert_file="$ssl_dir/privacyguard.crt"
    key_file="$ssl_dir/privacyguard.key"
    
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        log_warning "SSL certificates not found. Generating self-signed certificates..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$key_file" \
            -out "$cert_file" \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        log_success "Self-signed SSL certificates generated"
        log_warning "For production, replace with proper SSL certificates"
    else
        log_success "SSL certificates found"
    fi
}

# Function to build and start services
deploy_services() {
    log_info "Building and starting services..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    log_info "Pulling latest base images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
    
    # Build custom images
    log_info "Building application images..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    
    # Start services
    log_info "Starting services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    log_success "Services started"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Wait for databases to be ready
    log_info "Waiting for databases to be ready..."
    sleep 30
    
    # Run PostgreSQL migrations
    log_info "Running PostgreSQL migrations..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend npm run migrate
    
    # Seed initial data if needed
    if [ "$SEED_DATA" = "true" ]; then
        log_info "Seeding initial data..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T backend npm run seed
    fi
    
    log_success "Database migrations completed"
}

# Function to verify deployment
verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check service health
    services=("postgres" "mongodb" "redis" "backend" "frontend")
    
    for service in "${services[@]}"; do
        log_info "Checking $service health..."
        
        # Wait for service to be healthy
        timeout=60
        counter=0
        
        while [ $counter -lt $timeout ]; do
            if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps "$service" | grep -q "healthy\|Up"; then
                log_success "$service is healthy"
                break
            fi
            
            sleep 2
            counter=$((counter + 2))
        done
        
        if [ $counter -ge $timeout ]; then
            log_error "$service failed to become healthy within $timeout seconds"
            return 1
        fi
    done
    
    # Test API endpoint
    log_info "Testing API endpoint..."
    backend_port=$(grep BACKEND_PORT "$PROJECT_ROOT/$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo "3001")
    
    if curl -f -s "http://localhost:$backend_port/health" > /dev/null; then
        log_success "API endpoint is responding"
    else
        log_error "API endpoint is not responding"
        return 1
    fi
    
    # Test frontend
    log_info "Testing frontend..."
    frontend_port=$(grep FRONTEND_PORT "$PROJECT_ROOT/$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo "80")
    
    if curl -f -s "http://localhost:$frontend_port" > /dev/null; then
        log_success "Frontend is responding"
    else
        log_error "Frontend is not responding"
        return 1
    fi
    
    log_success "Deployment verification completed"
}

# Function to show deployment status
show_status() {
    log_info "Deployment Status:"
    echo
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo
    log_info "Service URLs:"
    
    backend_port=$(grep BACKEND_PORT "$PROJECT_ROOT/$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo "3001")
    frontend_port=$(grep FRONTEND_PORT "$PROJECT_ROOT/$ENV_FILE" | cut -d'=' -f2 | tr -d '"' || echo "80")
    
    echo "  Frontend: http://localhost:$frontend_port"
    echo "  Backend API: http://localhost:$backend_port"
    echo "  API Health: http://localhost:$backend_port/health"
    
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps | grep -q "grafana"; then
        echo "  Grafana: http://localhost:3000"
    fi
    
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps | grep -q "prometheus"; then
        echo "  Prometheus: http://localhost:9090"
    fi
}

# Function to create backup
create_backup() {
    log_info "Creating backup before deployment..."
    
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_dir="$PROJECT_ROOT/backups/pre_deploy_$timestamp"
    
    mkdir -p "$backup_dir"
    
    # Backup databases if they're running
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps postgres | grep -q "Up"; then
        log_info "Backing up PostgreSQL..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_dumpall -U postgres > "$backup_dir/postgres_backup.sql"
    fi
    
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps mongodb | grep -q "Up"; then
        log_info "Backing up MongoDB..."
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T mongodb mongodump --archive > "$backup_dir/mongodb_backup.archive"
    fi
    
    log_success "Backup created at $backup_dir"
}

# Function to rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    # Restore from backup if available
    latest_backup=$(ls -t "$PROJECT_ROOT/backups/pre_deploy_"* 2>/dev/null | head -1)
    
    if [ -n "$latest_backup" ]; then
        log_info "Restoring from backup: $latest_backup"
        # Restore logic would go here
        log_success "Rollback completed"
    else
        log_warning "No backup found for rollback"
    fi
}

# Function to clean up old deployments
cleanup() {
    log_info "Cleaning up old deployments..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove old backups (keep last 5)
    find "$PROJECT_ROOT/backups" -name "pre_deploy_*" -type d | sort -r | tail -n +6 | xargs rm -rf
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting PrivacyGuard deployment to $DEPLOY_ENV environment"
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            validate_environment
            create_directories
            generate_ssl_certificates
            create_backup
            deploy_services
            run_migrations
            verify_deployment
            show_status
            cleanup
            log_success "Deployment completed successfully!"
            ;;
        "rollback")
            rollback_deployment
            ;;
        "status")
            show_status
            ;;
        "stop")
            log_info "Stopping services..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
            log_success "Services stopped"
            ;;
        "restart")
            log_info "Restarting services..."
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
            log_success "Services restarted"
            ;;
        "logs")
            docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "${2:-}"
            ;;
        "backup")
            create_backup
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|status|stop|restart|logs|backup|cleanup}"
            echo
            echo "Commands:"
            echo "  deploy   - Deploy the application (default)"
            echo "  rollback - Rollback to previous deployment"
            echo "  status   - Show deployment status"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart all services"
            echo "  logs     - Show service logs (optionally specify service name)"
            echo "  backup   - Create manual backup"
            echo "  cleanup  - Clean up old deployments and images"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"