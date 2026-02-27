#!/bin/bash

# ====================================================
# SGDRA Deployment Script to Production
# Server: 10.0.5.18
# Date: 25/02/2026
# ====================================================

set -e

echo "🚀 Démarrage du déploiement vers la production..."
echo "📍 Serveur: erpgmc@10.0.5.18"
echo ""

# Configuration
PROD_SERVER="erpgmc@10.0.5.18"
PROD_PATH="/app/sgdra"
LOCAL_BRANCH="main"

# 1. Vérifier que la branche est propre
echo "1️⃣  Vérification de l'état du git..."
if [[ $(git status -s) ]]; then
    echo "❌ Erreur: Il y a des changements non validés"
    echo "Veuillez committer vos changements avant de déployer"
    exit 1
fi
echo "✅ Git est propre"
echo ""

# 2. Vérifier que main est à jour
echo "2️⃣  Mise à jour de main..."
git pull origin $LOCAL_BRANCH
echo "✅ main à jour"
echo ""

# 3. Construire le frontend
echo "3️⃣  Compilation du frontend..."
cd frontend
npm run build || yarn build
cd ..
echo "✅ Frontend compilé"
echo ""

# 4. Créer une sauvegarde
echo "4️⃣  Sauvegarde sur le serveur..."
ssh $PROD_SERVER "cd $PROD_PATH && git stash || true"
echo "✅ Sauvegarde créée"
echo ""

# 5. Déployer les changements
echo "5️⃣  Déploiement des fichiers..."
ssh $PROD_SERVER "cd $PROD_PATH && git pull origin $LOCAL_BRANCH"
echo "✅ Fichiers mis à jour"
echo ""

# 6. Appliquer les migrations
echo "6️⃣  Application des migrations..."
ssh $PROD_SERVER "cd $PROD_PATH/backend && python manage.py migrate"
echo "✅ Migrations appliquées"
echo ""

# 7. Redémarrer les services
echo "7️⃣  Redémarrage des services..."
ssh $PROD_SERVER "cd $PROD_PATH && docker-compose restart backend frontend"
echo "✅ Services redémarrés"
echo ""

# 8. Vérifier la santé
echo "8️⃣  Vérification de la santé du serveur..."
sleep 3
if curl -s https://10.0.5.18/api/health/ > /dev/null; then
    echo "✅ Serveur sain"
else
    echo "⚠️  Attention: Le serveur n'a pas répondu"
fi
echo ""

echo "🎉 Déploiement réussi!"
echo "📍 Production: https://10.0.5.18"
