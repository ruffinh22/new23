#!/bin/bash

# SGDRA Production Deployment Script
# Usage: ./deploy.sh [start|stop|restart|logs|update]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${PROJECT_DIR}/.env.production"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
LOG_DIR="${PROJECT_DIR}/logs"

# Functions
print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] ${msg}${NC}"
}

check_requirements() {
    print_msg "$BLUE" "Checking requirements..."
    
    command -v docker &> /dev/null || { print_msg "$RED" "Docker is not installed"; exit 1; }
    command -v docker-compose &> /dev/null || { print_msg "$RED" "Docker Compose is not installed"; exit 1; }
    
    if [ ! -f "$ENV_FILE" ]; then
        print_msg "$RED" "Environment file not found: $ENV_FILE"
        exit 1
    fi
    
    print_msg "$GREEN" "All requirements satisfied"
}

create_directories() {
    print_msg "$BLUE" "Creating necessary directories..."
    mkdir -p "$LOG_DIR"
    mkdir -p "${PROJECT_DIR}/frontend/ssl"
    print_msg "$GREEN" "Directories created"
}

generate_ssl_certificates() {
    local cert_dir="${PROJECT_DIR}/frontend/ssl"
    
    if [ ! -f "${cert_dir}/cert.pem" ] || [ ! -f "${cert_dir}/key.pem" ]; then
        print_msg "$YELLOW" "Generating self-signed SSL certificates..."
        mkdir -p "$cert_dir"
        
        openssl req -x509 -newkey rsa:4096 -keyout "${cert_dir}/key.pem" \
            -out "${cert_dir}/cert.pem" -days 365 -nodes \
            -subj "/C=BJ/ST=CotoNou/L=Cotonou/O=SGDRA/CN=localhost" 2>/dev/null || true
        
        chmod 600 "${cert_dir}/key.pem"
        print_msg "$GREEN" "SSL certificates generated"
    fi
}

start() {
    print_msg "$BLUE" "Starting SGDRA production environment..."
    
    check_requirements
    create_directories
    generate_ssl_certificates
    
    # Load environment file
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    
    # Start containers
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    print_msg "$GREEN" "SGDRA started successfully"
    print_msg "$BLUE" "Waiting for services to be ready..."
    sleep 10
    
    docker-compose -f "$COMPOSE_FILE" ps
}

stop() {
    print_msg "$BLUE" "Stopping SGDRA production environment..."
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        docker-compose -f "$COMPOSE_FILE" down
        print_msg "$GREEN" "SGDRA stopped successfully"
    else
        print_msg "$YELLOW" "Services are not running"
    fi
}

restart() {
    print_msg "$BLUE" "Restarting SGDRA production environment..."
    stop
    sleep 5
    start
}

show_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        print_msg "$BLUE" "Showing logs for all services (use Ctrl+C to exit)..."
        docker-compose -f "$COMPOSE_FILE" logs -f
    else
        print_msg "$BLUE" "Showing logs for $service..."
        docker-compose -f "$COMPOSE_FILE" logs -f "$service"
    fi
}

update() {
    print_msg "$BLUE" "Updating SGDRA..."
    
    # Pull latest code
    git pull origin main
    
    # Load environment
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    
    # Rebuild images
    print_msg "$BLUE" "Rebuilding Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Restart services
    stop
    sleep 5
    start
    
    print_msg "$GREEN" "SGDRA updated successfully"
}

backup() {
    print_msg "$BLUE" "Creating backup..."
    
    local backup_dir="${PROJECT_DIR}/backups/$(date +'%Y%m%d_%H%M%S')"
    mkdir -p "$backup_dir"
    
    # Backup database
    print_msg "$BLUE" "Backing up database..."
    docker-compose -f "$COMPOSE_FILE" exec -T mysql mysqldump -uroot -p"${MYSQL_ROOT_PASSWORD}" \
        "${MYSQL_DATABASE}" > "${backup_dir}/database.sql"
    
    # Backup media files
    print_msg "$BLUE" "Backing up media files..."
    tar -czf "${backup_dir}/media.tar.gz" -C "${PROJECT_DIR}" backend/media 2>/dev/null || true
    
    print_msg "$GREEN" "Backup created: $backup_dir"
}

status() {
    echo ""
    print_msg "$BLUE" "SGDRA Production Status:"
    echo ""
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
}

health_check() {
    print_msg "$BLUE" "Running health checks..."
    echo ""
    
    # Check if containers are running
    print_msg "$BLUE" "Container Status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    print_msg "$BLUE" "Service Health:"
    
    # Backend health
    if curl -sf http://localhost:8000/health/ > /dev/null; then
        print_msg "$GREEN" "✓ Backend service is healthy"
    else
        print_msg "$RED" "✗ Backend service is not responding"
    fi
    
    # Database health
    if docker-compose -f "$COMPOSE_FILE" exec -T mysql mysqladmin -uroot -p"${MYSQL_ROOT_PASSWORD}" ping > /dev/null 2>&1; then
        print_msg "$GREEN" "✓ Database is healthy"
    else
        print_msg "$RED" "✗ Database is not responding"
    fi
    
    # Redis health
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_msg "$GREEN" "✓ Redis is healthy"
    else
        print_msg "$RED" "✗ Redis is not responding"
    fi
    
    echo ""
}

# Main logic
case "${1:-}" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        show_logs "$2"
        ;;
    update)
        update
        ;;
    backup)
        backup
        ;;
    status)
        status
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs|update|backup|status|health} [service]"
        echo ""
        echo "Commands:"
        echo "  start              - Start all services"
        echo "  stop               - Stop all services"
        echo "  restart            - Restart all services"
        echo "  logs [service]     - Show logs (optionally for specific service)"
        echo "  update             - Update and redeploy"
        echo "  backup             - Create a backup"
        echo "  status             - Show service status"
        echo "  health             - Run health checks"
        exit 1
        ;;
esac
