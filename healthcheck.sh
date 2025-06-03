#!/bin/bash

# Health check script for AI English App
# This script checks the health of all services

set -e

echo "🔍 Checking AI English App Health..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local service_name=$1
    local container_name=$2
    
    if docker ps --format "table {{.Names}}" | grep -q "^${container_name}$"; then
        echo -e "${GREEN}✓${NC} ${service_name} is running"
        return 0
    else
        echo -e "${RED}✗${NC} ${service_name} is not running"
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✓${NC} ${service_name} HTTP endpoint is healthy"
        return 0
    else
        echo -e "${RED}✗${NC} ${service_name} HTTP endpoint is not responding"
        return 1
    fi
}

# Function to check database connection
check_database() {
    if docker-compose exec -T db pg_isready -U aienglish_user -d aienglish >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Database is accepting connections"
        return 0
    else
        echo -e "${RED}✗${NC} Database is not accepting connections"
        return 1
    fi
}

# Function to check Redis connection
check_redis() {
    if docker-compose exec -T redis redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Redis is responding"
        return 0
    else
        echo -e "${RED}✗${NC} Redis is not responding"
        return 1
    fi
}

# Main health check
main() {
    local exit_code=0
    
    echo "📋 Container Status:"
    echo "-------------------"
    
    # Check if containers are running
    check_service "Redis" "aienglish-redis" || exit_code=1
    check_service "Backend" "aienglish-backend" || exit_code=1
    check_service "Frontend" "aienglish-frontend" || exit_code=1
    
    echo ""
    echo "🔗 Service Connectivity:"
    echo "------------------------"
    
    # Check service connectivity
    check_redis || exit_code=1
    
    echo ""
    echo "🌐 HTTP Endpoints:"
    echo "------------------"
    
    # Check HTTP endpoints
    check_http "Frontend" "http://localhost:3000" || exit_code=1
    check_http "Backend API" "http://localhost:8000/docs" || exit_code=1
    
    echo ""
    echo "📊 Resource Usage:"
    echo "------------------"
    
    # Show resource usage
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep aienglish
    
    echo ""
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All services are healthy!${NC}"
    else
        echo -e "${RED}❌ Some services are not healthy. Check the logs for more details.${NC}"
        echo "Run 'docker-compose logs' to see detailed logs."
    fi
    
    return $exit_code
}

# Run the health check
main "$@"