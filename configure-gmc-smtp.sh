#!/bin/bash
# ============================================================================
# Email Configuration Fix - GroupMediaContact SMTP Setup
# ============================================================================
# Usage: Fill in the variables below, then run this script on the production server
# ssh erpgmc@10.0.5.18 < configure-gmc-smtp.sh

set -e

# ============================================================================
# 🔐 CONFIGURATION SMTP GMC - OVH SSL
# ============================================================================
# Configuration réelle pour GroupMediaContact sur OVH
SMTP_HOST="ssl0.ovh.net"
SMTP_PORT="465"
SMTP_SECURE="ssl"                             # SSL (pas TLS)
SMTP_USER="app@groupmediacontact.com"
SMTP_PASSWORD="Medi@@20022"
FROM_EMAIL="app@groupmediacontact.com"
FROM_NAME="SUPPORT GMC"

# ============================================================================
# Pas de modification en dessous de cette ligne
# ============================================================================

BACKEND_PATH=/srv/sgdra/backend
PROD_ENV_FILE="$BACKEND_PATH/.env"

echo "═══════════════════════════════════════════════════════════════════════"
echo "📧 Configuration SMTP - GroupMediaContact OVH SSL"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Configuration à appliquer:"
echo "  Serveur: $SMTP_HOST"
echo "  Port: $SMTP_PORT (SSL)"
echo "  Username: $SMTP_USER"
echo "  From Email: $FROM_EMAIL"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Vérifier qu'on est sur le serveur de production
if [ ! -f "$PROD_ENV_FILE" ]; then
    echo -e "${RED}❌ Erreur: Fichier .env non trouvé à $PROD_ENV_FILE${NC}"
    echo "   Êtes-vous sûr d'être sur le serveur de production (10.0.5.18) ?"
    exit 1
fi

cd "$BACKEND_PATH"

# ============================================================================
# ÉTAPE 1: Backup de l'ancienne configuration
# ============================================================================
echo -e "${BLUE}💾 Étape 1: Backup de la configuration actuelle...${NC}"
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
cp "$PROD_ENV_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup créé: $BACKUP_FILE${NC}"
echo ""

# ============================================================================
# ÉTAPE 2: Supprimer les anciennes lignes EMAIL de .env
# ============================================================================
echo -e "${BLUE}🧹 Étape 2: Nettoyage des anciennes config EMAIL...${NC}"
# Créer un fichier temporaire sans les anciennes lignes EMAIL
grep -v "^EMAIL_" "$PROD_ENV_FILE" > "$PROD_ENV_FILE.tmp"
mv "$PROD_ENV_FILE.tmp" "$PROD_ENV_FILE"
echo -e "${GREEN}✅ Anciennes configurations supprimées${NC}"
echo ""

# ============================================================================
# ÉTAPE 3: Ajouter la nouvelle configuration SMTP
# ============================================================================
echo -e "${BLUE}⚙️  Étape 3: Configuration SMTP GMC...${NC}"

cat >> "$PROD_ENV_FILE" << EOF

# ============================================================================
# 📧 EMAIL CONFIGURATION - GroupMediaContact SMTP OVH (Updated $(date))
# ============================================================================
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=$SMTP_HOST
EMAIL_PORT=$SMTP_PORT
EMAIL_USE_SSL=True
EMAIL_USE_TLS=False
EMAIL_HOST_USER=$SMTP_USER
EMAIL_HOST_PASSWORD=$SMTP_PASSWORD
DEFAULT_FROM_EMAIL=$FROM_EMAIL
SERVER_EMAIL=$FROM_EMAIL

EOF

echo -e "${GREEN}✅ Configuration SMTP GMC ajoutée au .env${NC}"
echo ""

# ============================================================================
# ÉTAPE 4: Vérifier le fichier .env
# ============================================================================
echo -e "${BLUE}🔍 Étape 4: Vérification du fichier .env...${NC}"
echo "Nouvelles lignes EMAIL:"
grep "^EMAIL_\|^SERVER_EMAIL\|^DEFAULT_FROM_EMAIL" "$PROD_ENV_FILE"
echo ""

# ============================================================================
# ÉTAPE 5: Redémarrer les conteneurs Docker
# ============================================================================
echo -e "${BLUE}🔄 Étape 5: Redémarrage des conteneurs Docker...${NC}"

echo "  → Redémarrage du backend..."
docker restart sgdra-backend 2>/dev/null && \
    echo -e "    ${GREEN}✅ Backend redémarré${NC}" || \
    echo -e "    ${RED}⚠️  Erreur au redémarrage du backend${NC}"

echo "  → Redémarrage de Celery..."
docker restart sgdra-celery 2>/dev/null && \
    echo -e "    ${GREEN}✅ Celery redémarré${NC}" || \
    echo -e "    ${RED}⚠️  Erreur au redémarrage de Celery${NC}"

echo "  → Redémarrage de Celery Beat..."
docker restart sgdra-celery-beat 2>/dev/null && \
    echo -e "    ${GREEN}✅ Celery Beat redémarré${NC}" || \
    echo -e "    ${RED}⚠️  Erreur au redémarrage de Celery Beat${NC}"

echo ""

# ============================================================================
# ÉTAPE 6: Test de la configuration
# ============================================================================
echo -e "${BLUE}🧪 Étape 6: Test d'envoi d'email...${NC}"

docker exec -it sgdra-backend python manage.py shell <<'PYTHON_CODE'
from django.core.mail import send_mail
from django.conf import settings

try:
    # Tenter l'envoi d'un email de test
    result = send_mail(
        subject='✅ Test SGDRA - Configuration SMTP OK',
        message='Cet email confirme que la configuration SMTP fonctionne correctement sur le serveur de production.',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=['app@groupmediacontact.com'],
        fail_silently=False,
    )
    
    print(f'\n✅ EMAIL TEST ENVOYÉ AVEC SUCCÈS')
    print(f'   Destinataire: app@groupmediacontact.com')
    print(f'   Status: {result}')
except Exception as e:
    print(f'\n❌ ERREUR LORS DE L\'ENVOI: {str(e)}')
    print(f'\n   Vérifiez:')
    print(f'   1. Les identifiants SMTP sont corrects')
    print(f'   2. Le serveur SMTP est accessible')
    print(f'   3. Le port est correct (587 pour TLS, 465 pour SSL)')
PYTHON_CODE

echo ""

# ============================================================================
# RÉSUMÉ FINAL
# ============================================================================
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Configuration SMTP complétée !${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "📊 Résumé des actions:"
echo "  ✓ Backup créé: $BACKUP_FILE"
echo "  ✓ Configuration SMTP GMC appliquée"
echo "  ✓ Conteneurs Docker redémarrés"
echo "  ✓ Test d'envoi exécuté"
echo ""
echo "📋 Prochaines étapes:"
echo "  1. Vérifiez que le test d'email s'est bien envoyé"
echo "  2. Les emails programmés (statut SCHEDULED) seront automatiquement envoyés"
echo "  3. Les emails échoués (statut FAILED) ne vont PAS se réessayer automatiquement"
echo ""
echo "⚠️  Note importante:"
echo "   Les emails avec statut FAILED resteront bloqués. Vous devrez soit:"
echo "   - Les supprimer et les reprogrammer"
echo "   - Ou faire une mise à jour en base de données pour les reprogrammer"
echo ""
echo -e "${YELLOW}Pour plus d'aide, consultez: EMAIL_FIX_GUIDE.md${NC}"

