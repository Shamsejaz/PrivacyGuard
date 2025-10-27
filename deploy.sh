#!/bin/bash

# Simple bash deployment script for PrivacyComply
# Uses the default docker-compose.yml (backend authentication mode)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Default values
BUILD=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-build)
            BUILD=false
            shift
            ;;
        --logs)
            echo -e "${CYAN}📋 Showing logs...${NC}"
            docker-compose logs -f
            exit 0
            ;;
        --stop)
            echo -e "${CYAN}🛑 Stopping services...${NC}"
            docker-compose down
            echo -e "${GREEN}✅ Services stopped${NC}"
            exit 0
            ;;
        --clean)
            echo -e "${CYAN}🧹 Cleaning up...${NC}"
            docker-compose down -v --remove-orphans
            docker system prune -f
            echo -e "${GREEN}✅ Cleanup completed${NC}"
            exit 0
            ;;
        --status)
            echo -e "${CYAN}📊 Service Status${NC}"
            docker-compose ps
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--no-build] [--logs] [--stop] [--clean] [--status]"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}"
cat << "EOF"
🚀 PrivacyComply Deployment
==========================
EOF
echo -e "Mode: Backend Authentication (Default)"
echo -e "Backend: https://app.privacycomply.ai/api/v1"
echo -e "${NC}"

# Default deployment
if [ "$BUILD" = true ]; then
    echo -e "${CYAN}🔨 Building and starting services...${NC}"
    docker-compose up --build -d
else
    echo -e "${CYAN}🚀 Starting services...${NC}"
    docker-compose up -d
fi

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${WHITE}"
echo -e "${CYAN}🌐 Access URLs:${NC}"
echo -e "${WHITE}Frontend: http://localhost${NC}"
echo -e "${WHITE}Backend: https://app.privacycomply.ai/api/v1${NC}"
echo -e "${WHITE}"
echo -e "${YELLOW}🔑 Use real backend credentials (demo credentials won't work)${NC}"