#!/bin/bash

# Deployment script for AI English App
# This script automates the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="AI English App"
DOCKER_COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="backups"

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

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_success "Docker is running"
}

# Check if required files exist
check_files() {
    local files=("$DOCKER_COMPOSE_FILE" "Dockerfile" "backend/Dockerfile")
    
    for file in "${files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file $file not found"
            exit 1
        fi
    done
    log_success "All required files found"
}

# Create backup directory
setup_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        log_info "Created backup directory: $BACKUP_DIR"
    fi
}

# Backup database (SQLite)
backup_database() {
    if docker-compose ps | grep -q "aienglish-backend.*Up"; then
        local backup_file="$BACKUP_DIR/aienglish_backup_$(date +%Y%m%d_%H%M%S).db"
        log_info "Creating SQLite database backup..."
        
        if cp "./backend/aienglish.db" "$backup_file" 2>/dev/null; then
            log_success "Database backup created: $backup_file"
        else
            log_warning "Failed to create database backup (database file may not exist yet)"
        fi
    else
        log_info "Backend container not running, skipping backup"
    fi
}

# Build images
build_images() {
    log_info "Building Docker images..."
    
    if [[ "$1" == "prod" ]]; then
        docker-compose -f "$PROD_COMPOSE_FILE" build
    else
        docker-compose build
    fi
    
    log_success "Docker images built successfully"
}

# Deploy application
deploy() {
    local mode=${1:-dev}
    
    log_info "Deploying $APP_NAME in $mode mode..."
    
    if [[ "$mode" == "prod" ]]; then
        # Production deployment
        if [[ ! -f ".env" ]]; then
            log_error "Production deployment requires .env file"
            exit 1
        fi
        
        docker-compose -f "$PROD_COMPOSE_FILE" up -d
    else
        # Development deployment
        docker-compose up -d
    fi
    
    log_success "$APP_NAME deployed successfully in $mode mode"
}

# Wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s http://localhost:3000 >/dev/null 2>&1 && \
           curl -s http://localhost:8000/docs >/dev/null 2>&1; then
            log_success "All services are ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Services not ready yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    log_warning "Services may not be fully ready. Check logs if needed."
}

# Show deployment status
show_status() {
    echo ""
    log_info "Deployment Status:"
    echo "=================="
    
    docker-compose ps
    
    echo ""
    log_info "Access URLs:"
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:8000"
    echo "API Documentation: http://localhost:8000/docs"
    
    echo ""
    log_info "Useful Commands:"
    echo "View logs: docker-compose logs -f"
    echo "Stop services: docker-compose down"
    echo "Health check: ./healthcheck.sh"
}

# Cleanup old images and containers
cleanup() {
    log_info "Cleaning up old Docker resources..."
    
    # Remove stopped containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused networks
    docker network prune -f
    
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    local mode=${1:-dev}
    local skip_backup=${2:-false}
    
    echo "🚀 Starting deployment of $APP_NAME"
    echo "===================================="
    
    # Pre-deployment checks
    check_docker
    check_files
    setup_backup_dir
    
    # Backup database if not skipped
    if [[ "$skip_backup" != "true" ]]; then
        backup_database
    fi
    
    # Build and deploy
    build_images "$mode"
    deploy "$mode"
    
    # Wait for services and show status
    wait_for_services
    show_status
    
    # Cleanup
    cleanup
    
    echo ""
    log_success "🎉 Deployment completed successfully!"
}

# Help function
show_help() {
    echo "Usage: $0 [MODE] [OPTIONS]"
    echo ""
    echo "Modes:"
    echo "  dev     Deploy in development mode (default)"
    echo "  prod    Deploy in production mode"
    echo ""
    echo "Options:"
    echo "  --skip-backup    Skip database backup"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy in development mode"
    echo "  $0 prod               # Deploy in production mode"
    echo "  $0 dev --skip-backup  # Deploy without backup"
}

# Parse command line arguments
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    show_help
    exit 0
fi

mode=${1:-dev}
skip_backup=false

if [[ "$2" == "--skip-backup" ]] || [[ "$1" == "--skip-backup" ]]; then
    skip_backup=true
    if [[ "$1" == "--skip-backup" ]]; then
        mode="dev"
    fi
fi

# Validate mode
if [[ "$mode" != "dev" ]] && [[ "$mode" != "prod" ]]; then
    log_error "Invalid mode: $mode. Use 'dev' or 'prod'"
    show_help
    exit 1
fi

# Run main deployment
main "$mode" "$skip_backup"