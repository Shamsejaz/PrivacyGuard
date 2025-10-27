#!/bin/bash

# Script to switch between development (mock) and production (live) backend modes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Check if mode argument is provided
if [ $# -eq 0 ]; then
    print_color $RED "❌ Error: Please specify a mode"
    echo "Usage: $0 [development|production|mock]"
    echo ""
    echo "Modes:"
    echo "  development - Mock authentication with local development setup"
    echo "  production  - Live backend at app.privacycomply.ai"
    echo "  mock       - Mock-only mode, no backend calls"
    exit 1
fi

MODE=$1

print_color $CYAN "🔄 Switching to $MODE mode..."

case $MODE in
    "development")
        print_color $GREEN "📝 Setting up development mode with mock authentication..."
        
        # Copy development environment
        if [ -f ".env.development" ]; then
            cp ".env.development" ".env.local"
            print_color $GREEN "✅ Copied .env.development to .env.local"
        fi
        
        print_color $YELLOW "🎭 Mock authentication enabled"
        print_color $WHITE "Demo credentials:"
        print_color $GRAY "  DPO: dpo@privacycomply.com / DPO123!@#"
        print_color $GRAY "  Compliance: compliance@privacycomply.com / Compliance123!@#"
        print_color $GRAY "  Admin: admin@privacycomply.com / Admin123!@#"
        ;;
        
    "production")
        print_color $GREEN "🌐 Setting up production mode with live backend..."
        
        # Copy production environment
        if [ -f ".env.production.local" ]; then
            cp ".env.production.local" ".env.local"
            print_color $GREEN "✅ Copied .env.production.local to .env.local"
        fi
        
        print_color $YELLOW "🔗 Live backend: https://app.privacycomply.ai/api/v1"
        print_color $RED "⚠️  You'll need valid credentials from the live backend"
        ;;
        
    "mock")
        print_color $GREEN "🎭 Setting up mock-only mode..."
        
        # Create mock-only environment
        cat > .env.local << EOF
# Mock-only mode - no backend API calls
VITE_API_BASE_URL=http://mock-disabled:9999
VITE_API_URL=http://mock-disabled:9999
VITE_WS_URL=ws://mock-disabled:9999
VITE_PYTHON_PII_ENDPOINT=http://localhost:8000
VITE_APP_NAME=PrivacyComply
VITE_NODE_ENV=development
EOF
        
        print_color $GREEN "✅ Created mock-only .env.local"
        print_color $YELLOW "🎭 Only demo credentials will work"
        ;;
        
    *)
        print_color $RED "❌ Error: Invalid mode '$MODE'"
        echo "Valid modes: development, production, mock"
        exit 1
        ;;
esac

echo ""
print_color $CYAN "🚀 Next steps:"
print_color $WHITE "1. Restart the development server: npm run dev"
print_color $WHITE "2. Check the browser console for authentication mode confirmation"

if [ "$MODE" = "production" ]; then
    print_color $WHITE "3. Ensure the live backend at app.privacycomply.ai is accessible"
fi

echo ""
print_color $GREEN "✨ Backend mode switched to: $MODE"