#!/bin/bash

# SGDRA Remote Deployment Script - Deploy from Local to Server
# Usage: ./deploy-to-server.sh [deploy|logs|status|restart|stop|start]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
LOCAL_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REMOTE_USER="erpgmc"
REMOTE_HOST="10.0.5.18"
REMOTE_PROJECT_DIR="/srv/sgdra"
BRANCH="${BRANCH:-main}"

# Functions
print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}[$(date +'%Y-%m-%d %H:%M:%S')] ${msg}${NC}"
}

print_local() {
    local msg=$1
    echo -e "${BLUE}[LOCAL]${NC} ${msg}"
}

print_remote() {
    local msg=$1
    echo -e "${YELLOW}[REMOTE]${NC} ${msg}"
}

check_ssh() {
    if ! ssh -o BatchMode=yes -o ConnectTimeout=5 "${REMOTE_USER}@${REMOTE_HOST}" echo "SSH OK" &> /dev/null; then
        print_msg "$RED" "Cannot connect to ${REMOTE_USER}@${REMOTE_HOST}"
        print_msg "$YELLOW" "Make sure you can SSH without password or use ssh-key authentication"
        exit 1
    fi
    print_msg "$GREEN" "SSH connection verified"
}

check_remote_setup() {
    print_msg "$BLUE" "Checking remote setup..."
    
    ssh "${REMOTE_USER}@${REMOTE_HOST}" << 'EOF'
        if [ ! -d "/srv/sgdra" ]; then
            echo "ERROR: /srv/sgdra not found on remote server"
            exit 1
        fi
        
        if [ ! -f "/srv/sgdra/deploy.sh" ]; then
            echo "ERROR: deploy.sh not found on remote server"
            exit 1
        fi
        
        echo "Remote setup OK"
EOF
    
    print_msg "$GREEN" "Remote setup verified"
}

sync_code() {
    print_msg "$BLUE" "Syncing code to remote server..."
    
    # Exclude unnecessary directories
    rsync -avz \
        --exclude='.git' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='.env.production.local' \
        --exclude='backend/media' \
        --exclude='backend/logs' \
        --exclude='backend/staticfiles' \
        --exclude='node_modules' \
        --exclude='.node_modules' \
        --exclude='venv' \
        --exclude='.venv' \
        --exclude='*.log' \
        --exclude='.DS_Store' \
        --filter=':- .gitignore' \
        "${LOCAL_PROJECT_DIR}/" \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PROJECT_DIR}/"
    
    print_msg "$GREEN" "Code synced successfully"
}

deploy() {
    print_msg "$BLUE" "Starting remote deployment..."
    
    check_ssh
    check_remote_setup
    
    # Create backup before deployment
    print_msg "$YELLOW" "Creating backup before deployment..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh backup" || print_msg "$YELLOW" "Backup skipped (services might not be running)"
    
    # Sync code
    sync_code
    
    # Update remote environment if not exists
    print_msg "$BLUE" "Setting up remote environment..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" << EOFCMD
        cd ${REMOTE_PROJECT_DIR}
        
        # Create .env.production.local if it doesn't exist
        if [ ! -f ".env.production.local" ]; then
            print_msg "$BLUE" "Creating .env.production.local on remote..."
            cp .env.production .env.production.local
            echo "⚠️  IMPORTANT: Edit .env.production.local on the server:"
            echo "   nano ${REMOTE_PROJECT_DIR}/.env.production.local"
        fi
        
        # Ensure scripts are executable
        chmod +x deploy.sh pre-check.sh
EOFCMD
    
    # Run pre-check on remote
    print_msg "$BLUE" "Running pre-deployment checks on remote..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./pre-check.sh"
    
    # Ask for confirmation
    print_msg "$YELLOW" "Ready to deploy on remote server: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PROJECT_DIR}"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_msg "$YELLOW" "Deployment cancelled"
        exit 0
    fi
    
    # Start/restart services on remote
    print_msg "$BLUE" "Starting services on remote server..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh start"
    
    # Check health
    print_msg "$BLUE" "Checking service health..."
    sleep 5
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh health"
    
    print_msg "$GREEN" "✓ Deployment completed successfully!"
    print_msg "$YELLOW" "Access your application at: https://10.0.5.18"
}

get_logs() {
    local service=$1
    print_msg "$BLUE" "Fetching logs from remote server..."
    
    if [ -z "$service" ]; then
        ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh logs"
    else
        ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh logs $service"
    fi
}

get_status() {
    print_msg "$BLUE" "Getting status from remote server..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh status"
}

restart_services() {
    print_msg "$BLUE" "Restarting services on remote server..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh restart"
}

stop_services() {
    print_msg "$BLUE" "Stopping services on remote server..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh stop"
}

start_services() {
    print_msg "$BLUE" "Starting services on remote server..."
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_PROJECT_DIR} && ./deploy.sh start"
}

# Main logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    logs)
        get_logs "$2"
        ;;
    status)
        get_status
        ;;
    restart)
        restart_services
        ;;
    stop)
        stop_services
        ;;
    start)
        start_services
        ;;
    *)
        echo "Usage: $0 {deploy|logs|status|restart|stop|start} [service]"
        echo ""
        echo "Commands:"
        echo "  deploy              - Deploy code and start services (default)"
        echo "  logs [service]      - Show logs from remote"
        echo "  status              - Show service status"
        echo "  restart             - Restart all services"
        echo "  stop                - Stop all services"
        echo "  start               - Start all services"
        echo ""
        echo "Configuration:"
        echo "  Remote User: ${REMOTE_USER}"
        echo "  Remote Host: ${REMOTE_HOST}"
        echo "  Remote Project: ${REMOTE_PROJECT_DIR}"
        exit 1
        ;;
esac
