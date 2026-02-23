#!/bin/bash

# Deploy to Remote Server
# Pushes the Docker image and deploys it on 10.0.5.18

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER_IP="10.0.5.18"
SERVER_USER="erpgmc"
SERVER_PATH="/srv/sgdra"
IMAGE_NAME="sgdra-backend"
IMAGE_TAG="latest"

print_msg() {
    echo -e "${2}[$(date +'%H:%M:%S')] ${1}${NC}"
}

print_msg "🚀 Deploying to $SERVER_IP..." "$BLUE"
print_msg "=================================" "$BLUE"

# Step 1: Check connection
print_msg "📝 Step 1: Checking SSH connection..." "$YELLOW"
if ! ssh -o ConnectTimeout=5 "$SERVER_USER@$SERVER_IP" "echo 'SSH OK'"; then
    print_msg "❌ Cannot connect to server!" "$RED"
    exit 1
fi
print_msg "✅ SSH connection OK" "$GREEN"

# Step 2: Save image as tar
print_msg "💾 Step 2: Exporting Docker image..." "$YELLOW"
EXPORT_FILE="sgdra-backend-latest.tar"
docker save "$IMAGE_NAME:$IMAGE_TAG" -o "$EXPORT_FILE"
print_msg "✅ Image exported: $EXPORT_FILE" "$GREEN"

# Step 3: Transfer to server
print_msg "📤 Step 3: Transferring image to server..." "$YELLOW"
scp -v "$EXPORT_FILE" "$SERVER_USER@$SERVER_IP:$SERVER_PATH/" || {
    print_msg "❌ Transfer failed!" "$RED"
    rm "$EXPORT_FILE"
    exit 1
}
print_msg "✅ Image transferred" "$GREEN"

# Step 4: Load and start on server
print_msg "🐳 Step 4: Loading image on server..." "$YELLOW"
ssh "$SERVER_USER@$SERVER_IP" << 'REMOTE_SCRIPT'
    set -e
    echo "Loading Docker image..."
    docker load -i /srv/sgdra/sgdra-backend-latest.tar
    echo "Image loaded successfully!"
    
    cd /srv/sgdra
    echo "Stopping old containers..."
    docker-compose -f docker-compose.prod.yml down || true
    
    echo "Starting new containers..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    echo "Waiting for services..."
    sleep 10
    
    echo "Checking container status..."
    docker-compose -f docker-compose.prod.yml ps
    
    echo "✅ Deployment complete!"
REMOTE_SCRIPT

print_msg "✅ Deployment successful!" "$GREEN"

# Step 5: Cleanup
print_msg "🧹 Step 5: Cleaning up..." "$YELLOW"
rm "$EXPORT_FILE"
ssh "$SERVER_USER@$SERVER_IP" "rm -f $SERVER_PATH/sgdra-backend-latest.tar"

print_msg "=================================" "$BLUE"
print_msg "✨ All done!" "$GREEN"
print_msg "Access the application at: https://$SERVER_IP" "$GREEN"

echo ""
echo "Useful commands:"
echo "  - SSH to server: ssh $SERVER_USER@$SERVER_IP"
echo "  - Check logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Stop: docker-compose -f docker-compose.prod.yml down"
