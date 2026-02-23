#!/bin/bash

# Generate SSL Certificates for Nginx
# Run this on the remote server to enable HTTPS

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/srv/sgdra"
SSL_DIR="$PROJECT_DIR/frontend/ssl"

print_msg() {
    echo -e "${2}[$(date +'%H:%M:%S')] ${1}${NC}"
}

print_msg "🔐 SSL Certificate Generation" "$BLUE"
print_msg "===============================" "$BLUE"

# Create SSL directory if it doesn't exist
print_msg "📁 Creating SSL directory..." "$YELLOW"
mkdir -p "$SSL_DIR"

# Generate self-signed certificate
print_msg "🔑 Generating self-signed SSL certificate..." "$YELLOW"
openssl req -x509 \
    -newkey rsa:4096 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -days 365 \
    -nodes \
    -subj "/C=BJ/ST=Cotonou/L=Cotonou/O=SGDRA/CN=10.0.5.18" \
    2>&1 | grep -v "^depth" || true

chmod 600 "$SSL_DIR/key.pem"
chmod 644 "$SSL_DIR/cert.pem"

print_msg "✅ SSL certificates generated:" "$GREEN"
print_msg "   Key: $SSL_DIR/key.pem" "$GREEN"
print_msg "   Cert: $SSL_DIR/cert.pem" "$GREEN"

# Verify certificates
print_msg "🔍 Verifying certificates..." "$YELLOW"
openssl verify "$SSL_DIR/cert.pem" 2>&1 || echo "Self-signed certificate (OK)"

print_msg "📋 Certificate Details:" "$BLUE"
openssl x509 -in "$SSL_DIR/cert.pem" -text -noout 2>&1 | grep -E "Subject:|CN =|Not Valid|Public-Key:" | head -4

# Restart nginx to load new certificates
print_msg "🔄 Restarting nginx with new certificates..." "$YELLOW"
cd "$PROJECT_DIR"
docker-compose -f docker-compose.prod.yml restart nginx

sleep 3

# Verify nginx is running
if docker ps | grep -q "sgdra-nginx.*Up"; then
    print_msg "✅ Nginx restarted successfully!" "$GREEN"
else
    print_msg "❌ Nginx failed to start" "$RED"
    docker-compose -f docker-compose.prod.yml logs nginx | tail -20
    exit 1
fi

print_msg "===============================" "$BLUE"
print_msg "✅ HTTPS is now available!" "$GREEN"
print_msg "   URL: https://10.0.5.18:8443" "$GREEN"
print_msg "   (Note: self-signed certificate)" "$YELLOW"
print_msg "===============================" "$BLUE"

echo ""
echo "⚠️  Certificate is self-signed for testing"
echo "   For production, use Let's Encrypt via Certbot"
echo ""
echo "Next steps:"
echo "  1. Access the app: https://10.0.5.18:8443"
echo "  2. Accept the cert warning in your browser"
echo "  3. For production, install a real certificate via Certbot"
