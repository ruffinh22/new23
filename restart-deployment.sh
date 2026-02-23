#!/bin/bash

# Smart Docker Compose Restart Script
# Deploys with proper startup sequence and health checks

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env.production"
LOG_FILE="${PROJECT_DIR}/logs/deploy.log"

print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}[$(date +'%H:%M:%S')] ${msg}${NC}" | tee -a "$LOG_FILE"
}

mkdir -p "${PROJECT_DIR}/logs"

print_msg "$BLUE" "🚀 SGDRA Smart Deployment Script"
print_msg "$BLUE" "======================================"

# Check requirements
print_msg "$BLUE" "📋 Checking requirements..."
[[ -f "$ENV_FILE" ]] || { print_msg "$RED" "❌ .env.production not found"; exit 1; }
command -v docker &> /dev/null || { print_msg "$RED" "❌ Docker not installed"; exit 1; }
print_msg "$GREEN" "✅ All requirements met"

# Step 1: Down everything
print_msg "$YELLOW" "Step 1: Stopping all containers..."
docker-compose -f "$COMPOSE_FILE" down 2>&1 | tee -a "$LOG_FILE" || true
sleep 3

# Step 2: Start infrastructure
print_msg "$YELLOW" "Step 2: Starting infrastructure (MySQL, Redis)..."
docker-compose -f "$COMPOSE_FILE" up -d mysql redis 2>&1 | tee -a "$LOG_FILE"

# Step 3: Wait for MySQL
print_msg "$YELLOW" "Step 3: Waiting for MySQL to be ready..."
MYSQL_READY=0
for i in {1..60}; do
    if docker exec sgdra-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
        print_msg "$GREEN" "✅ MySQL is healthy (attempt $i/60)"
        MYSQL_READY=1
        break
    fi
    [ $((i % 10)) -eq 0 ] && print_msg "$YELLOW" "⏳ Waiting for MySQL... (attempt $i/60)"
    sleep 1
done

if [ $MYSQL_READY -eq 0 ]; then
    print_msg "$RED" "❌ MySQL failed to start within 60 seconds"
    docker-compose -f "$COMPOSE_FILE" logs mysql | tail -30 | tee -a "$LOG_FILE"
    exit 1
fi

# Step 4: Start backend
print_msg "$YELLOW" "Step 4: Starting backend..."
docker-compose -f "$COMPOSE_FILE" up -d backend 2>&1 | tee -a "$LOG_FILE"

# Step 5: Wait for backend
print_msg "$YELLOW" "Step 5: Waiting for backend to be healthy..."
BACKEND_READY=0
for i in {1..60}; do
    if curl -sf http://127.0.0.1:8000/health/ > /dev/null 2>&1; then
        print_msg "$GREEN" "✅ Backend is healthy (attempt $i/60)"
        BACKEND_READY=1
        break
    fi
    [ $((i % 10)) -eq 0 ] && print_msg "$YELLOW" "⏳ Waiting for backend... (attempt $i/60)"
    sleep 1
done

if [ $BACKEND_READY -eq 0 ]; then
    print_msg "$RED" "❌ Backend failed to start within 60 seconds"
    docker-compose -f "$COMPOSE_FILE" logs backend | tail -50 | tee -a "$LOG_FILE"
    exit 1
fi

# Step 6: Start remaining services
print_msg "$YELLOW" "Step 6: Starting remaining services (celery, nginx)..."
docker-compose -f "$COMPOSE_FILE" up -d 2>&1 | tee -a "$LOG_FILE"

# Step 7: Wait for everything
sleep 5

# Step 8: Show status
print_msg "$BLUE" "======================================"
print_msg "$BLUE" "📊 Final Service Status:"
echo ""
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep sgdra | tee -a "$LOG_FILE"

echo ""
print_msg "$BLUE" "🔗 Access Points:"
print_msg "$GREEN" "   Frontend: http://10.0.5.18:8081"
print_msg "$GREEN" "   API: http://10.0.5.18:8081/api/"
print_msg "$GREEN" "   Admin: http://10.0.5.18:8081/admin/"
print_msg "$GREEN" "   Health: http://10.0.5.18:8081/health/"

echo ""
print_msg "$GREEN" "✅ Deployment complete!"
print_msg "$BLUE" "======================================"

# Useful commands
echo ""
echo "Useful commands:"
echo "  docker-compose -f $COMPOSE_FILE logs -f backend          # Watch backend logs"
echo "  docker-compose -f $COMPOSE_FILE ps                       # Service status"
echo "  docker-compose -f $COMPOSE_FILE down                     # Stop all services"
