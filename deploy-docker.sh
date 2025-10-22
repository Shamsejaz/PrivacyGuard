#!/bin/bash

# PrivacyGuard Docker Deployment Script
# Comprehensive deployment script for all environments

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
PROJECT_NAME="privacyguard"
DEFAULT_ENVIRONMENT="development"
COMPOSE_FILES_DIR="."

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development environment"
    echo "  prod        Start production environment"
    echo "  local       Start local development with all tools"
    echo "  stop        Stop all services"
    echo "  restart     Restart services"
    echo "  logs        Show service logs"
    echo "  status      Show service status"
    echo "  clean       Clean up containers and volumes"
    echo "  build       Build all images"
    echo "  test        Run test suite"
    echo "  backup      Create backup of data volumes"
    echo "  restore     Restore from backup"
    echo "  monitor     Start monitoring stack"
    echo "  help        Show this help message"
    echo ""
    echo "Options:"
    echo "  --profile PROFILE    Use specific profile (tools, monitoring, logging)"
    echo "  --service SERVICE    Target specific service"
    echo "  --no-cache          Build without cache"
    echo "  --pull              Pull latest images before starting"
    echo "  --detach            Run in detached mode (default)"
    echo "  --follow            Follow logs output"
    echo "  --verbose           Verbose output"
    echo ""
    echo "Examples:"
    echo "  $0 dev                          # Start development environment"
    echo "  $0 prod --pull                  # Start production with latest images"
    echo "  $0 local --profile tools        # Start local with development tools"
    echo "  $0 logs --service backend       # Show backend logs"
    echo "  $0 monitor                      # Start with monitoring stack"
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
    
    # Check available disk space (minimum 5GB)
    AVAILABLE_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        print_warning "Low disk space: ${AVAILABLE_SPACE}GB available. Minimum 5GB recommended."
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create necessary directories
create_directories() {
    print_step "Creating necessary directories..."
    
    # Create directories for production volumes
    sudo mkdir -p /opt/privacyguard/{data,logs,backups,uploads,models}/{postgres,mongodb,redis,backend,nginx}
    sudo mkdir -p /opt/privacyguard/secrets
    
    # Create local directories
    mkdir -p {logs,backups,uploads,secrets}
    mkdir -p monitoring/{prometheus,grafana,elasticsearch}
    mkdir -p nginx/{ssl,cache}
    
    print_success "Directories created"
}

# Function to generate secrets
generate_secrets() {
    print_step "Generating secrets..."
    
    # Generate random passwords if they don't exist
    if [ ! -f secrets/postgres_password.txt ]; then
        openssl rand -base64 32 > secrets/postgres_password.txt
        print_success "Generated PostgreSQL password"
    fi
    
    if [ ! -f secrets/mongo_password.txt ]; then
        openssl rand -base64 32 > secrets/mongo_password.txt
        print_success "Generated MongoDB password"
    fi
    
    if [ ! -f secrets/redis_password.txt ]; then
        openssl rand -base64 32 > secrets/redis_password.txt
        print_success "Generated Redis password"
    fi
    
    if [ ! -f secrets/jwt_secret.txt ]; then
        openssl rand -base64 64 > secrets/jwt_secret.txt
        print_success "Generated JWT secret"
    fi
    
    if [ ! -f secrets/grafana_password.txt ]; then
        echo "admin123" > secrets/grafana_password.txt
        print_success "Generated Grafana password"
    fi
    
    # Set proper permissions
    chmod 600 secrets/*.txt
    
    print_success "Secrets generated and secured"
}

# Function to create environment file
create_env_file() {
    local env_type=$1
    local env_file=".env.${env_type}"
    
    if [ ! -f "$env_file" ]; then
        print_step "Creating $env_file..."
        
        case $env_type in
            "development")
                cat > "$env_file" << 'EOF'
# Development Environment Configuration
ENVIRONMENT=development
NODE_ENV=development
LOG_LEVEL=debug

# Database Configuration
POSTGRES_DB=privacyguard_dev
POSTGRES_USER=privacyguard_dev_user
POSTGRES_PASSWORD=dev_password_123
POSTGRES_PORT=5433

MONGO_DB=privacyguard_dev
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=dev_admin_123
MONGO_PORT=27018

REDIS_PASSWORD=
REDIS_PORT=6380

# Application Configuration
BACKEND_PORT=3001
FRONTEND_PORT=5173
PII_SERVICE_PORT=8000

# Security Configuration
JWT_SECRET=development_jwt_secret_at_least_32_characters_long_for_security
BCRYPT_ROUNDS=10

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# External Services
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_PYTHON_PII_ENDPOINT=http://localhost:8000

# Development Flags
DEBUG_MODE=true
ENABLE_SWAGGER=true
SEED_DATA=true
HOT_RELOAD=true

# AWS Configuration (optional)
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
EOF
                ;;
            "production")
                cat > "$env_file" << 'EOF'
# Production Environment Configuration
ENVIRONMENT=production
NODE_ENV=production
LOG_LEVEL=warn

# Database Configuration
POSTGRES_DB=privacyguard_production
POSTGRES_USER=privacyguard_prod_user
POSTGRES_PORT=5432

MONGO_DB=privacyguard_production
MONGO_ROOT_USER=admin
MONGO_PORT=27017

REDIS_PORT=6379

# Application Configuration
BACKEND_PORT=3001
FRONTEND_PORT=8081
PII_SERVICE_PORT=8000

# Security Configuration (use Docker secrets in production)
BCRYPT_ROUNDS=14

# CORS Configuration
CORS_ORIGIN=https://privacyguard.com

# External Services
VITE_API_BASE_URL=https://api.privacyguard.com
VITE_WS_URL=wss://api.privacyguard.com
VITE_PYTHON_PII_ENDPOINT=https://pii.privacyguard.com

# Production Flags
DEBUG_MODE=false
ENABLE_SWAGGER=false
SEED_DATA=false
HOT_RELOAD=false

# Monitoring
MONITORING_ENABLED=true
METRICS_ENABLED=true

# AWS Configuration
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
EOF
                ;;
        esac
        
        print_success "$env_file created"
    else
        print_info "$env_file already exists"
    fi
}

# Function to build images
build_images() {
    local no_cache=$1
    local pull=$2
    
    print_header "Building Docker Images"
    
    local build_args=""
    if [ "$no_cache" = true ]; then
        build_args="$build_args --no-cache"
    fi
    
    if [ "$pull" = true ]; then
        build_args="$build_args --pull"
    fi
    
    print_step "Building frontend image..."
    docker-compose -f docker-compose.local.yml build $build_args frontend
    
    print_step "Building backend image..."
    docker-compose -f docker-compose.local.yml build $build_args backend
    
    print_step "Building Python PII service image..."
    docker-compose -f docker-compose.local.yml build $build_args python-pii-service
    
    print_success "All images built successfully"
}

# Function to start services
start_services() {
    local environment=$1
    local profile=$2
    local pull=$3
    local detach=$4
    
    print_header "Starting PrivacyGuard Services ($environment)"
    
    local compose_files=""
    local compose_args=""
    
    # Determine compose files based on environment
    case $environment in
        "development")
            compose_files="-f docker-compose.dev.yml"
            create_env_file "development"
            ;;
        "production")
            compose_files="-f docker-compose.yml -f docker-compose.prod.yml"
            create_env_file "production"
            generate_secrets
            ;;
        "local")
            compose_files="-f docker-compose.local.yml"
            create_env_file "development"
            ;;
    esac
    
    # Add profile if specified
    if [ -n "$profile" ]; then
        compose_args="$compose_args --profile $profile"
    fi
    
    # Pull latest images if requested
    if [ "$pull" = true ]; then
        print_step "Pulling latest images..."
        docker-compose $compose_files pull
    fi
    
    # Start services
    if [ "$detach" = true ]; then
        compose_args="$compose_args -d"
    fi
    
    print_step "Starting services..."
    docker-compose $compose_files up $compose_args
    
    if [ "$detach" = true ]; then
        print_success "Services started in detached mode"
        show_service_urls $environment
    fi
}

# Function to show service URLs
show_service_urls() {
    local environment=$1
    
    print_header "Service URLs"
    
    case $environment in
        "development"|"local")
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
            
            echo -e "\n${CYAN}📊 Monitoring (if enabled):${NC}"
            echo -e "   Prometheus:            ${GREEN}http://localhost:9090${NC}"
            echo -e "   Grafana:               ${GREEN}http://localhost:3000${NC}"
            echo -e "   SonarQube:             ${GREEN}http://localhost:9000${NC}"
            ;;
        "production")
            echo -e "${CYAN}🌐 Production URLs:${NC}"
            echo -e "   Frontend:              ${GREEN}http://localhost:8081${NC}"
            echo -e "   Backend API:           ${GREEN}http://localhost:3001${NC}"
            echo -e "   Python PII Service:    ${GREEN}http://localhost:8000${NC}"
            echo -e "   Nginx (if enabled):    ${GREEN}http://localhost:80${NC}"
            
            echo -e "\n${CYAN}📊 Monitoring:${NC}"
            echo -e "   Prometheus:            ${GREEN}http://localhost:9090${NC}"
            echo -e "   Grafana:               ${GREEN}http://localhost:3000${NC}"
            echo -e "   Elasticsearch:         ${GREEN}http://localhost:9200${NC}"
            echo -e "   Kibana:                ${GREEN}http://localhost:5601${NC}"
            ;;
    esac
    
    echo -e "\n${CYAN}👤 Default Login Credentials:${NC}"
    echo -e "   Email:                 ${GREEN}admin@privacyguard.local${NC}"
    echo -e "   Password:              ${GREEN}admin123${NC}"
}

# Function to stop services
stop_services() {
    print_header "Stopping PrivacyGuard Services"
    
    print_step "Stopping all services..."
    docker-compose -f docker-compose.local.yml down
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
    
    print_success "All services stopped"
}

# Function to show logs
show_logs() {
    local service=$1
    local follow=$2
    
    print_header "Service Logs"
    
    local log_args=""
    if [ "$follow" = true ]; then
        log_args="-f"
    fi
    
    if [ -n "$service" ]; then
        print_info "Showing logs for service: $service"
        docker-compose -f docker-compose.local.yml logs $log_args "$service"
    else
        print_info "Showing logs for all services"
        docker-compose -f docker-compose.local.yml logs $log_args
    fi
}

# Function to show status
show_status() {
    print_header "Service Status"
    
    print_step "Checking service status..."
    docker-compose -f docker-compose.local.yml ps
    docker-compose -f docker-compose.dev.yml ps
    docker-compose -f docker-compose.yml ps
}

# Function to run tests
run_tests() {
    print_header "Running Test Suite"
    
    print_step "Starting test environment..."
    docker-compose -f docker-compose.dev.yml up -d postgres-dev mongodb-dev redis-dev python-pii-service backend-dev
    
    # Wait for services to be ready
    sleep 30
    
    print_step "Running frontend tests..."
    docker-compose -f docker-compose.dev.yml exec frontend-dev npm test
    
    print_step "Running backend tests..."
    docker-compose -f docker-compose.dev.yml exec backend-dev npm test
    
    print_step "Running Python service tests..."
    docker-compose -f docker-compose.dev.yml exec python-pii-service python -m pytest tests/
    
    print_success "All tests completed"
}

# Function to create backup
create_backup() {
    print_header "Creating Backup"
    
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    print_step "Backing up PostgreSQL..."
    docker-compose -f docker-compose.local.yml exec postgres pg_dump -U privacyguard_user privacyguard_local > "$backup_dir/postgres.sql"
    
    print_step "Backing up MongoDB..."
    docker-compose -f docker-compose.local.yml exec mongodb mongodump --out /backups/mongodb
    docker cp $(docker-compose -f docker-compose.local.yml ps -q mongodb):/backups/mongodb "$backup_dir/"
    
    print_step "Backing up Redis..."
    docker-compose -f docker-compose.local.yml exec redis redis-cli BGSAVE
    docker cp $(docker-compose -f docker-compose.local.yml ps -q redis):/data/dump.rdb "$backup_dir/"
    
    print_step "Backing up application data..."
    docker run --rm -v privacyguard_backend_logs:/data -v $(pwd)/$backup_dir:/backup alpine tar czf /backup/backend_logs.tar.gz -C /data .
    docker run --rm -v privacyguard_pii_models:/data -v $(pwd)/$backup_dir:/backup alpine tar czf /backup/pii_models.tar.gz -C /data .
    
    print_success "Backup created in $backup_dir"
}

# Function to clean up
cleanup() {
    print_header "Cleaning Up"
    
    print_step "Stopping all services..."
    stop_services
    
    print_step "Removing containers..."
    docker-compose -f docker-compose.local.yml down -v
    docker-compose -f docker-compose.dev.yml down -v
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down -v
    
    print_step "Removing unused images..."
    docker image prune -f
    
    print_step "Removing unused volumes..."
    docker volume prune -f
    
    print_step "Removing unused networks..."
    docker network prune -f
    
    print_success "Cleanup completed"
}

# Parse command line arguments
COMMAND=""
PROFILE=""
SERVICE=""
NO_CACHE=false
PULL=false
DETACH=true
FOLLOW=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        dev|prod|local|stop|restart|logs|status|clean|build|test|backup|restore|monitor|help)
            COMMAND="$1"
            shift
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --pull)
            PULL=true
            shift
            ;;
        --detach)
            DETACH=true
            shift
            ;;
        --follow)
            FOLLOW=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            set -x
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Set default command if none provided
if [ -z "$COMMAND" ]; then
    COMMAND="help"
fi

# Main execution
case $COMMAND in
    "dev")
        check_prerequisites
        create_directories
        start_services "development" "$PROFILE" "$PULL" "$DETACH"
        ;;
    "prod")
        check_prerequisites
        create_directories
        start_services "production" "$PROFILE" "$PULL" "$DETACH"
        ;;
    "local")
        check_prerequisites
        create_directories
        start_services "local" "$PROFILE" "$PULL" "$DETACH"
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        stop_services
        sleep 5
        start_services "local" "$PROFILE" "$PULL" "$DETACH"
        ;;
    "logs")
        show_logs "$SERVICE" "$FOLLOW"
        ;;
    "status")
        show_status
        ;;
    "clean")
        cleanup
        ;;
    "build")
        check_prerequisites
        build_images "$NO_CACHE" "$PULL"
        ;;
    "test")
        check_prerequisites
        run_tests
        ;;
    "backup")
        create_backup
        ;;
    "monitor")
        check_prerequisites
        create_directories
        start_services "local" "monitoring" "$PULL" "$DETACH"
        ;;
    "help")
        show_usage
        ;;
    *)
        print_error "Unknown command: $COMMAND"
        show_usage
        exit 1
        ;;
esac