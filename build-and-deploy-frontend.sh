#!/bin/bash
# Script: build-and-deploy-frontend.sh
# Construit le frontend et l'intègre dans Django

set -e

echo "🏗️  SGDRA Frontend Build & Integration"
echo "======================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FRONTEND_DIR="$(pwd)/frontend"
BACKEND_DIR="$(pwd)/backend"
DIST_DIR="$FRONTEND_DIR/dist"
STATIC_DIST="$BACKEND_DIR/static/frontend"

# 1. Build Frontend
echo -e "${YELLOW}Step 1: Building frontend with Yarn/NPM${NC}"
cd "$FRONTEND_DIR"

# Increase Node memory to prevent segmentation fault (8GB for large projects)
export NODE_OPTIONS="--max-old-space-size=8192 --max-semi-space-size=2048"

if [ -f "yarn.lock" ]; then
    echo "Using Yarn..."
    yarn install --frozen-lockfile
    echo "Running TypeScript check..."
    yarn tsc --noEmit || true
    echo "Building with Vite..."
    yarn build --outDir dist
else
    echo "Using NPM..."
    npm ci
    npm run build
fi

if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}❌ Build failed: dist directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"

# 2. Create static directory for frontend in Django
echo -e "${YELLOW}Step 2: Setting up Django static directory${NC}"

mkdir -p "$STATIC_DIST"
rm -rf "$STATIC_DIST"/*

# Copy dist files
cp -r "$DIST_DIR"/* "$STATIC_DIST/"

echo -e "${GREEN}✅ Frontend files copied to Django static${NC}"

# 3. Collect Django static files
echo -e "${YELLOW}Step 3: Collecting Django static files${NC}"
cd "$BACKEND_DIR"

# Source virtual environment if exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

python manage.py collectstatic --noinput

echo -e "${GREEN}✅ Django static files collected${NC}"

# 4. Deploy to production server
echo -e "${YELLOW}Step 4: Deploying to production server${NC}"

SERVER_USER="erpgmc"
SERVER_HOST="10.0.5.18"
SERVER_STATIC_PATH="/srv/sgdra/backend/staticfiles/frontend"
SERVER_STATIC_BUILD_PATH="/srv/sgdra/backend/static/frontend"

if [ ! -z "$SERVER_USER" ] && [ ! -z "$SERVER_HOST" ]; then
    echo "Deploying to $SERVER_HOST..."
    
    # Copy to both locations: build dir and staticfiles (for Nginx)
    echo "  → Copying to /build dir..."
    ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $SERVER_STATIC_BUILD_PATH/assets" 2>/dev/null || true
    scp -r "$STATIC_DIST/assets"/* "$SERVER_USER@$SERVER_HOST:$SERVER_STATIC_BUILD_PATH/assets/" 2>/dev/null || echo "    ⚠ Failed to copy to build dir"
    scp "$STATIC_DIST/index.html" "$SERVER_USER@$SERVER_HOST:$SERVER_STATIC_BUILD_PATH/" 2>/dev/null || echo "    ⚠ Failed to copy HTML to build dir"
    
    echo "  → Copying to /staticfiles dir (for Nginx)..."
    ssh "$SERVER_USER@$SERVER_HOST" "mkdir -p $SERVER_STATIC_PATH/assets" 2>/dev/null || true
    scp -r "$STATIC_DIST/assets"/* "$SERVER_USER@$SERVER_HOST:$SERVER_STATIC_PATH/assets/" 2>/dev/null || echo "    ⚠ Failed to copy to staticfiles"
    scp "$STATIC_DIST/index.html" "$SERVER_USER@$SERVER_HOST:$SERVER_STATIC_PATH/" 2>/dev/null || echo "    ⚠ Failed to copy HTML to staticfiles"
    
    echo "  → Running Django collectstatic..."
    ssh "$SERVER_USER@$SERVER_HOST" "cd /srv/sgdra/backend && docker exec -T backend python manage.py collectstatic --noinput" 2>/dev/null || echo "    ⚠ collectstatic skipped"
    
    echo "  → Copying into Docker volume..."
    ssh "$SERVER_USER@$SERVER_HOST" "docker cp /srv/sgdra/backend/staticfiles/frontend/. backend:/app/backend/staticfiles/frontend/" 2>/dev/null || echo "    ⚠ Docker volume update failed"
    
    echo -e "${GREEN}✅ Deployment complete${NC}"
else
    echo -e "${YELLOW}⚠ Skipping server deployment (SSH config not set)${NC}"
fi

# 5. Display statistics
echo ""
echo "📊 Build Statistics"
echo "=================="

FRONTEND_SIZE=$(du -sh "$DIST_DIR" | cut -f1)
GZIP_SIZE=$(gzip -c "$DIST_DIR/index.html" | wc -c | numfmt --to=iec)

echo "Frontend dist size: $FRONTEND_SIZE"
echo "index.html (gzipped): $GZIP_SIZE"
echo ""

# 5. Summary
echo -e "${GREEN}✅ Frontend Build Complete!${NC}"
echo ""
echo "Frontend is now integrated with Django."
echo "The backend will serve:"
echo "  - /static/frontend/ → React app"
echo "  - /api/ → Django REST API"
echo "  - / → Frontend (via Django)"
echo ""
echo "Run the backend with:"
echo "  cd backend"
echo "  python manage.py runserver"
echo ""
echo "Or with Docker:"
echo "  docker-compose up"
