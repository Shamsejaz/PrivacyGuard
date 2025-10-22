#!/bin/bash

# PrivacyGuard Fast Local Deployment Script
# Deploys without PII service for faster startup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="privacyguard-fast"
COMPOSE_FILE="docker-compose.coolify-fast.yml"
ENV_FILE=".env.coolify-fast"

# Function to print colored output
print_header() {
    echo -e "\n${PURPLE}${'='*60}${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}${'='*60}${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to clean up existing containers
cleanup_existing() {
    print_step "Cleaning up existing containers..."
    
    # Stop and remove existing containers
    docker-compose -f $COMPOSE_FILE down -v 2>/dev/null || true
    
    # Remove any orphaned containers
    docker container prune -f 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Function to build and start services
start_services() {
    print_header "🚀 Starting PrivacyGuard Fast Deployment"
    
    print_step "Building and starting services..."
    
    # Build and start services
    docker-compose -f $COMPOSE_FILE up --build -d
    
    print_success "Services started successfully"
}

# Function to wait for services to be healthy
wait_for_services() {
    print_step "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_info "Health check attempt $attempt/$max_attempts..."
        
        # Check if all services are healthy
        local healthy_services=$(docker-compose -f $COMPOSE_FILE ps --services --filter "status=running" | wc -l)
        local total_services=$(docker-compose -f $COMPOSE_FILE config --services | wc -l)
        
        if [ "$healthy_services" -eq "$total_services" ]; then
            print_success "All services are healthy!"
            return 0
        fi
        
        sleep 10
        ((attempt++))
    done
    
    print_warning "Some services may not be fully healthy yet, but continuing..."
}

# Function to show service status
show_status() {
    print_header "📊 Service Status"
    
    docker-compose -f $COMPOSE_FILE ps
}

# Function to show service URLs
show_urls() {
    print_header "🌐 Service URLs"
    
    echo -e "${CYAN}🌐 Application URLs:${NC}"
    echo -e "   Frontend (React):      ${GREEN}http://localhost:80${NC}"
    echo -e "   Backend API:           ${GREEN}http://localhost:3001${NC}"
    echo -e "   API Documentation:     ${GREEN}http://localhost:3001/api-docs${NC}"
    echo -e "   Health Check:          ${GREEN}http://localhost:80/health${NC}"
    
    echo -e "\n${CYAN}🗄️  Database Access:${NC}"
    echo -e "   PostgreSQL:            ${GREEN}localhost:5432${NC}"
    echo -e "   MongoDB:               ${GREEN}localhost:27017${NC}"
    echo -e "   Redis:                 ${GREEN}localhost:6379${NC}"
    
    echo -e "\n${CYAN}👤 Default Login Credentials:${NC}"
    echo -e "   Email:                 ${GREEN}admin@privacyguard.local${NC}"
    echo -e "   Password:              ${GREEN}admin123${NC}"
    
    echo -e "\n${CYAN}🔐 Database Credentials:${NC}"
    echo -e "   PostgreSQL User:       ${GREEN}privacyguard_user${NC}"
    echo -e "   PostgreSQL Password:   ${GREEN}privacyguard_secure_password_2024${NC}"
    echo -e "   MongoDB User:          ${GREEN}admin${NC}"
    echo -e "   MongoDB Password:      ${GREEN}mongo_secure_password_2024${NC}"
    echo -e "   Redis Password:        ${GREEN}redis_secure_password_2024${NC}"
}

# Function to show logs
show_logs() {
    print_header "📋 Service Logs"
    
    echo -e "${CYAN}To view logs for specific services:${NC}"
    echo -e "   All services:          ${GREEN}docker-compose -f $COMPOSE_FILE logs -f${NC}"
    echo -e "   Frontend only:         ${GREEN}docker-compose -f $COMPOSE_FILE logs -f frontend${NC}"
    echo -e "   Backend only:          ${GREEN}docker-compose -f $COMPOSE_FILE logs -f backend${NC}"
    echo -e "   Database logs:         ${GREEN}docker-compose -f $COMPOSE_FILE logs -f postgres mongodb redis${NC}"
}

# Function to show management commands
show_management() {
    print_header "🔧 Management Commands"
    
    echo -e "${CYAN}🔧 Common Commands:${NC}"
    echo -e "   Stop all services:     ${GREEN}docker-compose -f $COMPOSE_FILE down${NC}"
    echo -e "   Restart services:      ${GREEN}docker-compose -f $COMPOSE_FILE restart${NC}"
    echo -e "   View service status:   ${GREEN}docker-compose -f $COMPOSE_FILE ps${NC}"
    echo -e "   View logs:             ${GREEN}docker-compose -f $COMPOSE_FILE logs -f${NC}"
    echo -e "   Rebuild services:      ${GREEN}docker-compose -f $COMPOSE_FILE up --build -d${NC}"
    
    echo -e "\n${CYAN}🗄️  Database Commands:${NC}"
    echo -e "   PostgreSQL shell:      ${GREEN}docker-compose -f $COMPOSE_FILE exec postgres psql -U privacyguard_user -d privacyguard_prod${NC}"
    echo -e "   MongoDB shell:         ${GREEN}docker-compose -f $COMPOSE_FILE exec mongodb mongosh privacyguard_prod${NC}"
    echo -e "   Redis CLI:             ${GREEN}docker-compose -f $COMPOSE_FILE exec redis redis-cli -a redis_secure_password_2024${NC}"
    
    echo -e "\n${CYAN}🧹 Cleanup Commands:${NC}"
    echo -e "   Stop and remove:       ${GREEN}docker-compose -f $COMPOSE_FILE down -v${NC}"
    echo -e "   Full cleanup:          ${GREEN}docker-compose -f $COMPOSE_FILE down -v --rmi all${NC}"
}

# Function to test deployment
test_deployment() {
    print_header "🧪 Testing Deployment"
    
    print_step "Testing frontend..."
    if curl -f http://localhost:80/health &> /dev/null; then
        print_success "Frontend is responding"
    else
        print_warning "Frontend health check failed"
    fi
    
    print_step "Testing backend..."
    if curl -f http://localhost:3001/health &> /dev/null; then
        print_success "Backend is responding"
    else
        print_warning "Backend health check failed"
    fi
    
    print_step "Testing database connections..."
    if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U privacyguard_user -d privacyguard_prod &> /dev/null; then
        print_success "PostgreSQL is healthy"
    else
        print_warning "PostgreSQL connection failed"
    fi
    
    if docker-compose -f $COMPOSE_FILE exec -T mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        print_success "MongoDB is healthy"
    else
        print_warning "MongoDB connection failed"
    fi
    
    if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli --no-auth-warning -a redis_secure_password_2024 ping | grep -q PONG; then
        print_success "Redis is healthy"
    else
        print_warning "Redis connection failed"
    fi
}

# Main deployment function
deploy() {
    print_header "🚀 PrivacyGuard Fast Local Deployment"
    
    echo -e "${CYAN}Starting fast deployment without PII service...${NC}\n"
    
    # Step 1: Prerequisites
    check_prerequisites
    
    # Step 2: Cleanup
    cleanup_existing
    
    # Step 3: Start services
    start_services
    
    # Step 4: Wait for services
    wait_for_services
    
    # Step 5: Test deployment
    test_deployment
    
    # Step 6: Show information
    show_status
    show_urls
    show_logs
    show_management
    
    print_header "🎉 Fast Deployment Complete!"
    
    echo -e "${GREEN}PrivacyGuard is now running locally (without PII service)!${NC}"
    echo -e "${CYAN}Access the application at: ${GREEN}http://localhost:80${NC}"
    echo -e "${CYAN}Login with: ${GREEN}admin@privacyguard.local / admin123${NC}\n"
    
    echo -e "${YELLOW}Note: PII detection service is disabled for faster deployment.${NC}"
    echo -e "${YELLOW}To enable PII features, use the full deployment with docker-compose.local.yml${NC}\n"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "start")
        start_services
        wait_for_services
        show_urls
        ;;
    "stop")
        print_header "Stopping Services"
        docker-compose -f $COMPOSE_FILE down
        print_success "Services stopped"
        ;;
    "restart")
        print_header "Restarting Services"
        docker-compose -f $COMPOSE_FILE restart
        wait_for_services
        show_urls
        ;;
    "logs")
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    "status")
        show_status
        ;;
    "test")
        test_deployment
        ;;
    "clean")
        print_header "Cleaning Up"
        docker-compose -f $COMPOSE_FILE down -v --rmi all
        docker system prune -f
        print_success "Cleanup complete"
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Full deployment (default)"
        echo "  start     - Start services"
        echo "  stop      - Stop services"
        echo "  restart   - Restart services"
        echo "  logs      - Show logs"
        echo "  status    - Show status"
        echo "  test      - Test deployment"
        echo "  clean     - Clean up everything"
        echo "  help      - Show this help"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac