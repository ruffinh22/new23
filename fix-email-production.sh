#!/bin/bash
# Fix Email Configuration on Production Server
# Usage: ssh erpgmc@10.0.5.18 < fix-email-production.sh

set -e

echo "🔧 SGDRA Email Configuration Fix"
echo "================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_PATH=/srv/sgdra/backend

cd $BACKEND_PATH

echo -e "${YELLOW}📋 Current EMAIL Configuration:${NC}"
grep -E "EMAIL_BACKEND|EMAIL_HOST|EMAIL_PORT|EMAIL_HOST_USER|EMAIL_HOST_PASSWORD|DEFAULT_FROM_EMAIL" .env || echo "Not found"

echo ""
echo -e "${YELLOW}🔑 Before continuing, you need:${NC}"
echo "1. A Gmail account with App Password from: https://myaccount.google.com/apppasswords"
echo "2. OR credentials from your SMTP provider (SendGrid, Mailgun, etc.)"
echo ""

# Backup current .env
echo -e "${YELLOW}💾 Creating backup...${NC}"
cp .env .env.backup.$(date +%s)
echo -e "${GREEN}✅ Backup created${NC}"

echo ""
echo -e "${YELLOW}📝 Updating .env with SMTP configuration...${NC}"

# Update the .env file with proper SMTP settings
cat >> .env << 'EOF'

# ==== SMTP EMAIL CONFIGURATION (Updated) ====
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
# Replace with your actual Gmail address and app password
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx
DEFAULT_FROM_EMAIL=your-email@gmail.com
EOF

echo -e "${YELLOW}⚠️  IMPORTANT: Edit the file manually to add your actual credentials:${NC}"
echo ""
echo "SSH into the server and run:"
echo "  nano .env"
echo ""
echo "Find these lines and replace with REAL values:"
echo "  EMAIL_HOST_USER=your-actual-email@gmail.com"
echo "  EMAIL_HOST_PASSWORD=your-16-char-app-password"
echo ""

# Restart containers
echo -e "${YELLOW}🔄 Restarting Docker containers...${NC}"

docker restart sgdra-backend 2>/dev/null && echo -e "${GREEN}✅ Backend restarted${NC}" || echo -e "${RED}⚠️ Backend restart failed${NC}"
docker restart sgdra-celery 2>/dev/null && echo -e "${GREEN}✅ Celery restarted${NC}" || echo -e "${RED}⚠️ Celery restart failed${NC}"
docker restart sgdra-celery-beat 2>/dev/null && echo -e "${GREEN}✅ Celery Beat restarted${NC}" || echo -e "${RED}⚠️ Celery Beat restart failed${NC}"

echo ""
echo -e "${GREEN}✅ Configuration updated${NC}"
echo ""
echo "NEXT STEPS:"
echo "1. Edit /srv/sgdra/backend/.env with your real SMTP credentials"
echo "2. Test email sending with:"
echo "   docker exec -it sgdra-backend python manage.py test_email"
echo "3. Check if previously failed emails recover (status auto-changes to SENT if they had valid credentials)"
