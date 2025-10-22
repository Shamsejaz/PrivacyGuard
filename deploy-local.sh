#!/bin/bash

# PrivacyGuard Local Deployment Script
# Deploys the complete PrivacyGuard application stack using Docker Desktop

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
COMPOSE_FILE="docker-compose.local.yml"
PROJECT_NAME="privacyguard"
ENVIRONMENT="local"

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
    print_header "Checking Prerequisites"
    
    # Check Docker
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker is installed: $DOCKER_VERSION"
    else
        print_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version)
        print_success "Docker Compose is installed: $COMPOSE_VERSION"
    else
        print_error "Docker Compose is not installed."
        exit 1
    fi
    
    # Check if Docker is running
    if docker info &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Check available disk space (minimum 5GB)
    AVAILABLE_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        print_warning "Low disk space: ${AVAILABLE_SPACE}GB available. Minimum 5GB recommended."
    else
        print_success "Sufficient disk space: ${AVAILABLE_SPACE}GB available"
    fi
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Docker compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    print_success "All prerequisites met!"
}

# Function to create environment file
create_env_file() {
    print_header "Environment Configuration"
    
    if [ ! -f ".env.local" ]; then
        print_step "Creating .env.local file..."
        
        cat > .env.local << 'EOF'
# PrivacyGuard Local Development Environment

# Application Configuration
NODE_ENV=development
ENVIRONMENT=local
DEBUG_MODE=true

# Database Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=privacyguard_local
POSTGRES_USER=privacyguard_user
POSTGRES_PASSWORD=local_password_123

MONGODB_URI=mongodb://admin:local_admin_123@mongodb:27017/privacyguard_local?authSource=admin

REDIS_HOST=redis
REDIS_PORT=6379

# Security Configuration
JWT_SECRET=local_development_jwt_secret_at_least_32_characters_long_for_security
BCRYPT_ROUNDS=10

# External Services
PII_SERVICE_URL=http://python-pii-service:8000

# Email Configuration (using Mailhog)
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=

# AWS Configuration (optional - for testing)
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=your_key_here
# AWS_SECRET_ACCESS_KEY=your_secret_here
# BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
EOF
        
        print_success ".env.local file created"
    else
        print_info ".env.local file already exists"
    fi
}

# Function to pull latest images
pull_images() {
    print_header "Pulling Docker Images"
    
    print_step "Pulling base images..."
    docker-compose -f $COMPOSE_FILE pull postgres mongodb redis adminer mongo-express redis-commander mailhog
    
    print_success "Base images pulled successfully"
}

# Function to build application images
build_images() {
    print_header "Building Application Images"
    
    print_step "Building frontend image..."
    docker-compose -f $COMPOSE_FILE build frontend
    
    print_step "Building backend image..."
    docker-compose -f $COMPOSE_FILE build backend
    
    print_step "Building Python PII service image..."
    docker-compose -f $COMPOSE_FILE build python-pii-service
    
    print_success "All application images built successfully"
}

# Function to start services
start_services() {
    print_header "Starting Services"
    
    print_step "Starting database services..."
    docker-compose -f $COMPOSE_FILE up -d postgres mongodb redis
    
    print_step "Waiting for databases to be ready..."
    sleep 30
    
    print_step "Starting Python PII service..."
    docker-compose -f $COMPOSE_FILE up -d python-pii-service
    
    print_step "Waiting for PII service to download models..."
    sleep 60
    
    print_step "Starting backend service..."
    docker-compose -f $COMPOSE_FILE up -d backend
    
    print_step "Waiting for backend to be ready..."
    sleep 20
    
    print_step "Starting frontend service..."
    docker-compose -f $COMPOSE_FILE up -d frontend
    
    print_success "All core services started"
}

# Function to start optional tools
start_tools() {
    print_header "Starting Development Tools"
    
    print_step "Starting database management tools..."
    docker-compose -f $COMPOSE_FILE --profile tools up -d adminer mongo-express redis-commander mailhog
    
    print_success "Development tools started"
}

# Function to check service health
check_health() {
    print_header "Health Check"
    
    print_step "Checking service health..."
    
    # Wait for services to be fully ready
    sleep 30
    
    # Check PostgreSQL
    if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U privacyguard_user -d privacyguard_local &> /dev/null; then
        print_success "PostgreSQL is healthy"
    else
        print_warning "PostgreSQL health check failed"
    fi
    
    # Check MongoDB
    if docker-compose -f $COMPOSE_FILE exec -T mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        print_success "MongoDB is healthy"
    else
        print_warning "MongoDB health check failed"
    fi
    
    # Check Redis
    if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping | grep -q PONG; then
        print_success "Redis is healthy"
    else
        print_warning "Redis health check failed"
    fi
    
    # Check Backend
    if curl -f http://localhost:3001/health &> /dev/null; then
        print_success "Backend is healthy"
    else
        print_warning "Backend health check failed"
    fi
    
    # Check Frontend
    if curl -f http://localhost:5173 &> /dev/null; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend health check failed"
    fi
    
    # Check Python PII Service
    if curl -f http://localhost:8000/health &> /dev/null; then
        print_success "Python PII Service is healthy"
    else
        print_warning "Python PII Service health check failed"
    fi
}

# Function to show service URLs
show_urls() {
    print_header "Service URLs"
    
    echo -e "${CYAN}🌐 Application URLs:${NC}"
    echo -e "   Frontend (React):      ${GREEN}http://localhost:5173${NC}"
    echo -e "   Backend API:           ${GREEN}http://localhost:3001${NC}"
    echo -e "   API Documentation:     ${GREEN}http://localhost:3001/api-docs${NC}"
    echo -e "   Python PII Service:    ${GREEN}http://localhost:8000${NC}"
    echo -e "   PII Service Docs:      ${GREEN}http://localhost:8000/docs${NC}"
    
    echo -e "\n${CYAN}🛠️  Development Tools:${NC}"
    echo -e "   Adminer (PostgreSQL):  ${GREEN}http://localhost:8080${NC}"
    echo -e "   Mongo Express:         ${GREEN}http://localhost:8081${NC}"
    echo -e "   Redis Commander:       ${GREEN}http://localhost:8082${NC}"
    echo -e "   Mailhog (Email):       ${GREEN}http://localhost:8025${NC}"
    
    echo -e "\n${CYAN}📊 Database Connections:${NC}"
    echo -e "   PostgreSQL:            ${GREEN}localhost:5432${NC}"
    echo -e "   MongoDB:               ${GREEN}localhost:27017${NC}"
    echo -e "   Redis:                 ${GREEN}localhost:6379${NC}"
    
    echo -e "\n${CYAN}👤 Default Login Credentials:${NC}"
    echo -e "   Email:                 ${GREEN}admin@privacyguard.local${NC}"
    echo -e "   Password:              ${GREEN}admin123${NC}"
}

# Function to show logs
show_logs() {
    print_header "Service Logs"
    
    echo -e "${CYAN}To view logs for specific services:${NC}"
    echo -e "   All services:          ${GREEN}docker-compose -f $COMPOSE_FILE logs -f${NC}"
    echo -e "   Frontend only:         ${GREEN}docker-compose -f $COMPOSE_FILE logs -f frontend${NC}"
    echo -e "   Backend only:          ${GREEN}docker-compose -f $COMPOSE_FILE logs -f backend${NC}"
    echo -e "   PII Service only:      ${GREEN}docker-compose -f $COMPOSE_FILE logs -f python-pii-service${NC}"
    echo -e "   Database logs:         ${GREEN}docker-compose -f $COMPOSE_FILE logs -f postgres mongodb redis${NC}"
}

# Function to show management commands
show_management() {
    print_header "Management Commands"
    
    echo -e "${CYAN}🔧 Common Commands:${NC}"
    echo -e "   Stop all services:     ${GREEN}docker-compose -f $COMPOSE_FILE down${NC}"
    echo -e "   Restart services:      ${GREEN}docker-compose -f $COMPOSE_FILE restart${NC}"
    echo -e "   View service status:   ${GREEN}docker-compose -f $COMPOSE_FILE ps${NC}"
    echo -e "   Update images:         ${GREEN}docker-compose -f $COMPOSE_FILE pull && docker-compose -f $COMPOSE_FILE up -d${NC}"
    
    echo -e "\n${CYAN}🗄️  Database Commands:${NC}"
    echo -e "   PostgreSQL shell:      ${GREEN}docker-compose -f $COMPOSE_FILE exec postgres psql -U privacyguard_user -d privacyguard_local${NC}"
    echo -e "   MongoDB shell:         ${GREEN}docker-compose -f $COMPOSE_FILE exec mongodb mongosh privacyguard_local${NC}"
    echo -e "   Redis CLI:             ${GREEN}docker-compose -f $COMPOSE_FILE exec redis redis-cli${NC}"
    
    echo -e "\n${CYAN}🧹 Cleanup Commands:${NC}"
    echo -e "   Remove containers:     ${GREEN}docker-compose -f $COMPOSE_FILE down -v${NC}"
    echo -e "   Remove images:         ${GREEN}docker-compose -f $COMPOSE_FILE down --rmi all${NC}"
    echo -e "   Full cleanup:          ${GREEN}docker-compose -f $COMPOSE_FILE down -v --rmi all${NC}"
}

# Function to run deployment
deploy() {
    print_header "🚀 PrivacyGuard Local Deployment"
    
    echo -e "${CYAN}Starting deployment of PrivacyGuard application stack...${NC}\n"
    
    # Step 1: Prerequisites
    check_prerequisites
    
    # Step 2: Environment setup
    create_env_file
    
    # Step 3: Pull base images
    pull_images
    
    # Step 4: Build application images
    build_images
    
    # Step 5: Start services
    start_services
    
    # Step 6: Start development tools
    start_tools
    
    # Step 7: Health check
    check_health
    
    # Step 8: Show information
    show_urls
    show_logs
    show_management
    
    print_header "🎉 Deployment Complete!"
    
    echo -e "${GREEN}PrivacyGuard is now running locally!${NC}"
    echo -e "${CYAN}Access the application at: ${GREEN}http://localhost:5173${NC}"
    echo -e "${CYAN}Login with: ${GREEN}admin@privacyguard.local / admin123${NC}\n"
}

# Function to stop services
stop() {
    print_header "Stopping PrivacyGuard Services"
    
    print_step "Stopping all services..."
    docker-compose -f $COMPOSE_FILE down
    
    print_success "All services stopped"
}

# Function to cleanup
cleanup() {
    print_header "Cleaning Up PrivacyGuard"
    
    print_step "Stopping and removing containers, networks, and volumes..."
    docker-compose -f $COMPOSE_FILE down -v --rmi local
    
    print_step "Removing unused Docker resources..."
    docker system prune -f
    
    print_success "Cleanup complete"
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "start")
        print_header "Starting PrivacyGuard Services"
        docker-compose -f $COMPOSE_FILE up -d
        check_health
        show_urls
        ;;
    "stop")
        stop
        ;;
    "restart")
        stop
        sleep 5
        print_header "Starting PrivacyGuard Services"
        docker-compose -f $COMPOSE_FILE up -d
        check_health
        show_urls
        ;;
    "logs")
        docker-compose -f $COMPOSE_FILE logs -f
        ;;
    "status")
        docker-compose -f $COMPOSE_FILE ps
        ;;
    "cleanup")
        cleanup
        ;;
    "help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Full deployment (default)"
        echo "  start     - Start existing services"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  logs      - Show service logs"
        echo "  status    - Show service status"
        echo "  cleanup   - Stop and remove everything"
        echo "  help      - Show this help"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for available commands"
        exit 1
        ;;
esac