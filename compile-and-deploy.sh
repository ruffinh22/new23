#!/bin/bash

# SGDRA Complete Build & Deploy Script
# Compilation complète : Frontend + Backend Docker

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BACKEND_DIR="$PROJECT_DIR/backend"

print_msg() {
    echo -e "${2}[$(date +'%H:%M:%S')] ${1}${NC}"
}

# ==================== MAIN SCRIPT ====================

print_msg "🚀 SGDRA Compilation & Deployment" "$BLUE"
print_msg "=================================" "$BLUE"

# Step 1: Build Frontend
print_msg "📦 STEP 1: Compiling Frontend..." "$YELLOW"
cd "$FRONTEND_DIR"

export NODE_OPTIONS="--max-old-space-size=8192 --max-semi-space-size=2048"

if [ -f "yarn.lock" ]; then
    print_msg "Using Yarn..." "$BLUE"
    yarn install --frozen-lockfile
    yarn build --outDir dist
else
    print_msg "Using NPM..." "$BLUE"
    npm ci
    npm run build
fi

if [ ! -d "$FRONTEND_DIR/dist" ]; then
    print_msg "❌ Frontend build failed!" "$RED"
    exit 1
fi

print_msg "✅ Frontend compiled successfully" "$GREEN"

# Step 2: Copy frontend to Django static
print_msg "📂 STEP 2: Integrating frontend with backend..." "$YELLOW"
STATIC_DIST="$BACKEND_DIR/static/frontend"
rm -rf "$STATIC_DIST"
mkdir -p "$STATIC_DIST"
cp -r "$FRONTEND_DIR/dist/"* "$STATIC_DIST/"
print_msg "✅ Frontend integrated into Django static files" "$GREEN"

# Step 3: Build Docker image
print_msg "🐳 STEP 3: Building Docker image..." "$YELLOW"
cd "$PROJECT_DIR"

IMAGE_NAME="sgdra-backend"
IMAGE_TAG="latest"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

docker build \
    -t "$IMAGE_NAME:$IMAGE_TAG" \
    -t "$IMAGE_NAME:$TIMESTAMP" \
    -f Dockerfile \
    . 2>&1

if [ $? -ne 0 ]; then
    print_msg "❌ Docker build failed!" "$RED"
    exit 1
fi

print_msg "✅ Docker image built successfully" "$GREEN"
print_msg "   Images: $IMAGE_NAME:$IMAGE_TAG and $IMAGE_NAME:$TIMESTAMP" "$GREEN"

# Step 4: Display info and next steps
print_msg "=================================" "$BLUE"
print_msg "✨ Compilation terminée !" "$GREEN"
print_msg "=================================" "$BLUE"

echo ""
echo "Options de déploiement :"
echo ""
echo "  1️⃣  Déploiement LOCAL avec docker-compose :"
echo "     docker-compose -f docker-compose.prod.yml --env-file .env.production up -d"
echo ""
echo "  2️⃣  Déploiement SUR LE SERVEUR 10.0.5.18 :"
echo "     ./deploy-to-server.sh"
echo ""
echo "  3️⃣  Vérifier les logs :"
echo "     docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f"
echo ""
echo "  4️⃣  Arrêter les conteneurs :"
echo "     docker-compose -f docker-compose.prod.yml down"
echo ""

print_msg "Images disponibles :" "$BLUE"
docker images --filter "reference=sgdra-backend*" --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.Created}}"
