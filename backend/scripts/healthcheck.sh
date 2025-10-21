#!/bin/sh

# Health check script for Docker container
# This script checks if the application is responding to health check requests

set -e

# Configuration
HOST=${HEALTH_CHECK_HOST:-localhost}
PORT=${HEALTH_CHECK_PORT:-3001}
TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}
ENDPOINT=${HEALTH_CHECK_ENDPOINT:-/health}

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HEALTHCHECK: $1"
}

# Function to check HTTP endpoint
check_http() {
    local url="http://${HOST}:${PORT}${ENDPOINT}"
    local response
    local http_code
    
    log "Checking HTTP endpoint: $url"
    
    # Use curl to check the health endpoint
    response=$(curl -s -w "%{http_code}" --max-time "$TIMEOUT" "$url" || echo "000")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        log "Health check passed (HTTP $http_code)"
        return 0
    else
        log "Health check failed (HTTP $http_code)"
        return 1
    fi
}

# Function to check process
check_process() {
    if pgrep -f "node.*server.js" > /dev/null; then
        log "Application process is running"
        return 0
    else
        log "Application process not found"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    local memory_limit=${MEMORY_LIMIT_MB:-1024}
    local memory_usage
    
    # Get memory usage in MB
    memory_usage=$(ps -o pid,vsz,rss,comm -p $$ | awk 'NR>1 {print int($3/1024)}')
    
    if [ "$memory_usage" -lt "$memory_limit" ]; then
        log "Memory usage OK: ${memory_usage}MB (limit: ${memory_limit}MB)"
        return 0
    else
        log "Memory usage high: ${memory_usage}MB (limit: ${memory_limit}MB)"
        return 1
    fi
}

# Main health check function
main() {
    local exit_code=0
    
    log "Starting health check..."
    
    # Check if process is running
    if ! check_process; then
        exit_code=1
    fi
    
    # Check HTTP endpoint
    if ! check_http; then
        exit_code=1
    fi
    
    # Check memory usage (warning only, don't fail)
    if ! check_memory; then
        log "WARNING: High memory usage detected"
    fi
    
    if [ $exit_code -eq 0 ]; then
        log "All health checks passed"
    else
        log "Health check failed"
    fi
    
    exit $exit_code
}

# Run the health check
main "$@"