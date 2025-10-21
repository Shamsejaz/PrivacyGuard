#!/bin/bash

# PrivacyGuard Integration Check Script
# This script verifies that all frontend services are properly integrated with backend APIs

set -e

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

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

# Function to check if service is running
check_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-10}
    
    log_info "Checking $service_name at $url..."
    
    if curl -f -s --max-time $timeout "$url" > /dev/null; then
        log_success "$service_name is running"
        return 0
    else
        log_error "$service_name is not accessible"
        return 1
    fi
}

# Function to check API endpoint
check_api_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local description=$3
    
    log_info "Testing $description..."
    
    local response=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL$endpoint")
    
    if [ "$response" = "$expected_status" ]; then
        log_success "$description - OK (HTTP $response)"
        return 0
    else
        log_error "$description - Failed (HTTP $response)"
        return 1
    fi
}

# Function to check frontend service configuration
check_frontend_service() {
    local service_file=$1
    local service_name=$2
    
    log_info "Checking $service_name configuration..."
    
    if [ -f "$service_file" ]; then
        # Check if service uses correct API base URL
        if grep -q "VITE_API" "$service_file"; then
            log_success "$service_name uses environment-based API URL"
        else
            log_warning "$service_name may be using hardcoded API URL"
        fi
        
        # Check if service has proper error handling
        if grep -q "interceptors" "$service_file"; then
            log_success "$service_name has request/response interceptors"
        else
            log_warning "$service_name may lack proper error handling"
        fi
        
        # Check if service has authentication
        if grep -q "Authorization" "$service_file" || grep -q "Bearer" "$service_file"; then
            log_success "$service_name includes authentication headers"
        else
            log_warning "$service_name may lack authentication"
        fi
    else
        log_error "$service_name file not found: $service_file"
        return 1
    fi
}

# Main integration check function
main() {
    log_info "Starting PrivacyGuard Integration Check..."
    echo
    
    local errors=0
    
    # Check if backend services are running
    log_info "=== Backend Service Health Check ==="
    
    if ! check_service "Backend API" "$BACKEND_URL/health"; then
        ((errors++))
    fi
    
    if ! check_service "PostgreSQL" "$BACKEND_URL/api/v1/monitoring/db/postgres"; then
        log_warning "PostgreSQL health check endpoint not available"
    fi
    
    if ! check_service "MongoDB" "$BACKEND_URL/api/v1/monitoring/db/mongodb"; then
        log_warning "MongoDB health check endpoint not available"
    fi
    
    if ! check_service "Redis" "$BACKEND_URL/api/v1/monitoring/db/redis"; then
        log_warning "Redis health check endpoint not available"
    fi
    
    echo
    
    # Check API endpoints
    log_info "=== API Endpoint Check ==="
    
    # Authentication endpoints
    if ! check_api_endpoint "/api/v1/auth/status" "200" "Auth Status Endpoint"; then
        ((errors++))
    fi
    
    # DSAR endpoints
    if ! check_api_endpoint "/api/v1/dsar/requests" "401" "DSAR Requests Endpoint (expects auth)"; then
        log_warning "DSAR endpoint may not require authentication"
    fi
    
    # Risk assessment endpoints
    if ! check_api_endpoint "/api/v1/risk/assessments" "401" "Risk Assessments Endpoint (expects auth)"; then
        log_warning "Risk endpoint may not require authentication"
    fi
    
    # GDPR endpoints
    if ! check_api_endpoint "/api/v1/gdpr/dashboard" "401" "GDPR Dashboard Endpoint (expects auth)"; then
        log_warning "GDPR endpoint may not require authentication"
    fi
    
    # Policy endpoints
    if ! check_api_endpoint "/api/v1/policies" "401" "Policies Endpoint (expects auth)"; then
        log_warning "Policy endpoint may not require authentication"
    fi
    
    # Monitoring endpoints
    if ! check_api_endpoint "/api/v1/monitoring/metrics" "200" "Monitoring Metrics Endpoint"; then
        ((errors++))
    fi
    
    echo
    
    # Check frontend service configurations
    log_info "=== Frontend Service Configuration Check ==="
    
    check_frontend_service "src/services/authService.ts" "Authentication Service"
    check_frontend_service "src/services/dsarService.ts" "DSAR Service"
    check_frontend_service "src/services/riskAssessmentService.ts" "Risk Assessment Service"
    check_frontend_service "src/services/gdprService.ts" "GDPR Service"
    check_frontend_service "src/services/policyService.ts" "Policy Service"
    
    echo
    
    # Check environment configuration
    log_info "=== Environment Configuration Check ==="
    
    if [ -f ".env" ]; then
        log_success "Environment file found"
        
        if grep -q "VITE_API_BASE_URL" .env; then
            local api_url=$(grep "VITE_API_BASE_URL" .env | cut -d'=' -f2 | tr -d '"')
            log_info "Frontend API URL configured as: $api_url"
        else
            log_warning "VITE_API_BASE_URL not found in .env file"
        fi
        
        if grep -q "VITE_WS_URL" .env; then
            local ws_url=$(grep "VITE_WS_URL" .env | cut -d'=' -f2 | tr -d '"')
            log_info "WebSocket URL configured as: $ws_url"
        else
            log_warning "VITE_WS_URL not found in .env file"
        fi
    else
        log_warning "No .env file found - using default configuration"
    fi
    
    echo
    
    # Check WebSocket connection
    log_info "=== WebSocket Connection Check ==="
    
    # Note: This is a basic check - in a real scenario you'd want to test actual WebSocket connectivity
    if check_service "WebSocket Server" "$BACKEND_URL" 5; then
        log_success "WebSocket server appears to be running"
    else
        log_warning "WebSocket server may not be accessible"
    fi
    
    echo
    
    # Check for mock data usage
    log_info "=== Mock Data Usage Check ==="
    
    local mock_files=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "mockData\|MOCK_\|fake.*Data" 2>/dev/null || true)
    
    if [ -n "$mock_files" ]; then
        log_warning "Found files that may still use mock data:"
        echo "$mock_files" | while read -r file; do
            echo "  - $file"
        done
        log_warning "Please verify these files are using real API calls"
    else
        log_success "No obvious mock data usage found"
    fi
    
    echo
    
    # Integration test recommendations
    log_info "=== Integration Test Recommendations ==="
    
    echo "To fully verify integration, consider running these tests:"
    echo "1. User authentication flow"
    echo "2. DSAR request creation and management"
    echo "3. Risk assessment creation and updates"
    echo "4. GDPR compliance data retrieval"
    echo "5. Policy management operations"
    echo "6. Real-time WebSocket events"
    echo "7. Error handling and retry logic"
    
    echo
    
    # Summary
    if [ $errors -eq 0 ]; then
        log_success "Integration check completed successfully!"
        log_info "All critical services appear to be properly integrated."
    else
        log_error "Integration check found $errors critical issues."
        log_error "Please address the issues above before proceeding to production."
        exit 1
    fi
}

# Function to create integration test script
create_integration_tests() {
    log_info "Creating integration test script..."
    
    cat > "scripts/integration-tests.js" << 'EOF'
// PrivacyGuard Integration Tests
// Run with: node scripts/integration-tests.js

const axios = require('axios');

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3001';

class IntegrationTester {
  constructor() {
    this.results = [];
  }

  async test(name, testFn) {
    console.log(`Testing: ${name}...`);
    try {
      await testFn();
      this.results.push({ name, status: 'PASS' });
      console.log(`✅ ${name} - PASS`);
    } catch (error) {
      this.results.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name} - FAIL: ${error.message}`);
    }
  }

  async runTests() {
    console.log('Starting PrivacyGuard Integration Tests...\n');

    // Test health endpoint
    await this.test('Health Check', async () => {
      const response = await axios.get(`${API_BASE_URL}/health`);
      if (response.status !== 200) throw new Error('Health check failed');
    });

    // Test authentication
    await this.test('Authentication Status', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/auth/status`);
      if (response.status !== 200) throw new Error('Auth status check failed');
    });

    // Test DSAR endpoints (should require auth)
    await this.test('DSAR Endpoint Security', async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/v1/dsar/requests`);
        throw new Error('DSAR endpoint should require authentication');
      } catch (error) {
        if (error.response?.status === 401) {
          // Expected - endpoint requires auth
          return;
        }
        throw error;
      }
    });

    // Test monitoring endpoints
    await this.test('Monitoring Metrics', async () => {
      const response = await axios.get(`${API_BASE_URL}/api/v1/monitoring/metrics`);
      if (response.status !== 200) throw new Error('Monitoring metrics failed');
    });

    // Summary
    console.log('\n=== Test Results ===');
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`- ${r.name}: ${r.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n✅ All integration tests passed!');
    }
  }
}

// Run tests
const tester = new IntegrationTester();
tester.runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
EOF

    log_success "Integration test script created at scripts/integration-tests.js"
    log_info "Run with: node scripts/integration-tests.js"
}

# Function to update environment configuration
update_environment_config() {
    log_info "Updating environment configuration..."
    
    # Create or update .env file with proper API URLs
    if [ ! -f ".env" ]; then
        log_info "Creating .env file..."
        cat > ".env" << EOF
# PrivacyGuard Frontend Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
VITE_APP_NAME=PrivacyGuard
VITE_APP_VERSION=1.0.0
EOF
        log_success ".env file created"
    else
        log_info ".env file already exists - please verify configuration"
    fi
    
    # Update package.json scripts if needed
    if [ -f "package.json" ]; then
        if ! grep -q "integration:check" package.json; then
            log_info "Adding integration check script to package.json..."
            # Note: This would require jq or manual editing in a real scenario
            log_info "Please add the following script to package.json:"
            echo '  "integration:check": "./scripts/integration-check.sh"'
        fi
    fi
}

# Command line argument handling
case "${1:-check}" in
    "check")
        main
        ;;
    "test")
        create_integration_tests
        ;;
    "config")
        update_environment_config
        ;;
    "all")
        update_environment_config
        create_integration_tests
        main
        ;;
    *)
        echo "Usage: $0 {check|test|config|all}"
        echo
        echo "Commands:"
        echo "  check  - Run integration check (default)"
        echo "  test   - Create integration test script"
        echo "  config - Update environment configuration"
        echo "  all    - Run all operations"
        exit 1
        ;;
esac