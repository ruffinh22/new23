#!/bin/bash

# SSH Port Forwarding Helper
# Creates a secure tunnel to access SGDRA through SSH

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_msg() {
    echo -e "${2}[SSH TUNNEL] ${1}${NC}"
}

SERVER_IP="10.0.5.18"
SERVER_USER="erpgmc"
LOCAL_PORT=8081
REMOTE_PORT=8081

print_msg "🔐 SSH Port Forwarding to SGDRA" "$BLUE"
print_msg "================================" "$BLUE"
echo ""

# Check SSH access
print_msg "Checking SSH access to $SERVER_USER@$SERVER_IP..." "$YELLOW"
if ssh -o ConnectTimeout=5 -o BatchMode=yes "$SERVER_USER@$SERVER_IP" "echo OK" > /dev/null 2>&1; then
    print_msg "✅ SSH connection verified" "$GREEN"
else
    print_msg "❌ Cannot connect via SSH" "$RED"
    echo ""
    echo "Please ensure:"
    echo "  1. SSH keys are configured: ssh-copy-id $SERVER_USER@$SERVER_IP"
    echo "  2. Or use password authentication"
    exit 1
fi
echo ""

print_msg "Creating tunnel: localhost:$LOCAL_PORT → $SERVER_IP:$REMOTE_PORT" "$BLUE"
print_msg "================================" "$BLUE"
echo ""

echo "To access SGDRA, use:"
echo "  http://localhost:$LOCAL_PORT"
echo ""
echo "Tunnel is ACTIVE - keep this window open!"
echo "Press Ctrl+C to close the tunnel"
echo ""

# Create the tunnel
ssh -L $LOCAL_PORT:$SERVER_IP:$REMOTE_PORT "$SERVER_USER@$SERVER_IP" -N

# Cleanup
print_msg "Tunnel closed" "$YELLOW"
