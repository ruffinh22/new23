#!/bin/bash

# Pre-Deployment Checklist for SGDRA

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SGDRA Pre-Deployment Checklist${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# System Checks
echo -e "${BLUE}[1] System Requirements${NC}"
command -v docker &> /dev/null && check_pass "Docker installed" || check_fail "Docker not found"
command -v docker-compose &> /dev/null && check_pass "Docker Compose installed" || check_fail "Docker Compose not found"
command -v git &> /dev/null && check_pass "Git installed" || check_fail "Git not found"
command -v openssl &> /dev/null && check_pass "OpenSSL installed" || check_fail "OpenSSL not found"

# Docker Checks
echo ""
echo -e "${BLUE}[2] Docker Configuration${NC}"
docker info &> /dev/null && check_pass "Docker daemon running" || check_fail "Docker daemon not running"
docker-compose version &> /dev/null || check_fail "Docker Compose version check failed"

# File Checks
echo ""
echo -e "${BLUE}[3] Project Files${NC}"
[ -f "docker-compose.prod.yml" ] && check_pass "docker-compose.prod.yml exists" || check_fail "docker-compose.prod.yml not found"
[ -f ".env.production" ] && check_pass ".env.production exists" || check_fail ".env.production not found"
[ -f "Dockerfile" ] && check_pass "Dockerfile exists" || check_fail "Dockerfile not found"
[ -f "deploy.sh" ] && check_pass "deploy.sh exists" || check_fail "deploy.sh not found"
[ -f "backend/requirements.txt" ] && check_pass "backend/requirements.txt exists" || check_fail "backend/requirements.txt not found"

# Environment Checks
echo ""
echo -e "${BLUE}[4] Environment Configuration${NC}"

if [ -f ".env.production" ]; then
    grep -q "SECRET_KEY=" .env.production && check_pass "SECRET_KEY configured" || check_fail "SECRET_KEY not configured"
    grep -q "DEBUG=False" .env.production && check_pass "DEBUG disabled" || check_warn "DEBUG not disabled"
    grep -q "MYSQL_ROOT_PASSWORD=" .env.production && check_pass "Database password set" || check_fail "Database password not set"
    grep -q "ALLOWED_HOSTS=" .env.production && check_pass "ALLOWED_HOSTS configured" || check_fail "ALLOWED_HOSTS not configured"
else
    check_fail "Environment file not found"
fi

# SSL Certificates
echo ""
echo -e "${BLUE}[5] SSL Configuration${NC}"
[ -f "frontend/ssl/cert.pem" ] && check_pass "SSL certificate exists" || check_warn "SSL certificate not found (will be auto-generated)"
[ -f "frontend/ssl/key.pem" ] && check_pass "SSL key exists" || check_warn "SSL key not found (will be auto-generated)"

# Directory Permissions
echo ""
echo -e "${BLUE}[6] Directory Permissions${NC}"
[ -w "." ] && check_pass "Project directory writable" || check_fail "Project directory not writable"
[ -d "backend/media" ] && [ -w "backend/media" ] && check_pass "Media directory writable" || check_warn "Media directory permission issue"
[ -d "backend/logs" ] && [ -w "backend/logs" ] && check_pass "Logs directory writable" || check_warn "Logs directory permission issue"

# System Resources
echo ""
echo -e "${BLUE}[7] System Resources${NC}"

# Check CPU
CPU_CORES=$(nproc 2>/dev/null || echo "unknown")
if [ "$CPU_CORES" != "unknown" ] && [ "$CPU_CORES" -ge 4 ]; then
    check_pass "CPU cores: $CPU_CORES (sufficient)"
elif [ "$CPU_CORES" != "unknown" ]; then
    check_warn "CPU cores: $CPU_CORES (less than recommended 4)"
fi

# Check RAM
if command -v free &> /dev/null; then
    RAM_GB=$(free -g | awk '/^Mem:/ {print $2}')
    if [ "$RAM_GB" -ge 8 ]; then
        check_pass "RAM: ${RAM_GB}GB (sufficient)"
    else
        check_warn "RAM: ${RAM_GB}GB (less than recommended 8GB)"
    fi
fi

# Check Disk Space
DISK_GB=$(df . | awk 'NR==2 {print $4}' | awk '{print $1/1024/1024}')
if (( $(echo "$DISK_GB >= 50" | bc -l) )); then
    check_pass "Disk space: ~${DISK_GB%.*}GB (sufficient)"
else
    check_warn "Disk space: ~${DISK_GB%.*}GB (less than recommended 50GB)"
fi

# Network Checks
echo ""
echo -e "${BLUE}[8] Network Configuration${NC}"
ping -c 1 8.8.8.8 &> /dev/null && check_pass "Internet connectivity" || check_fail "No internet connection"
if command -v curl &> /dev/null; then
    curl -s https://www.google.com &> /dev/null && check_pass "HTTPS connectivity" || check_fail "HTTPS connectivity issue"
fi

# Final Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo -e "Warnings: ${YELLOW}$WARN${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ System is ready for deployment!${NC}"
    exit 0
else
    echo -e "${RED}✗ Please fix the failed checks before deploying${NC}"
    exit 1
fi
