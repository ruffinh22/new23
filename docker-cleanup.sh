#!/bin/bash

# Script pour nettoyer et relancer Docker
# À exécuter après l'installation de Docker

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  SGDRA - Nettoyage et Redémarrage Docker                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"

cd /srv/sgdra

echo ""
echo "[1] Arrêt des services Docker..."
docker-compose -f docker-compose.prod.yml down --remove-orphans -v 2>/dev/null || true

echo "[2] Suppression des conteneurs restants..."
docker ps -a --format "{{.Names}}" | grep sgdra | xargs -r docker rm -f 2>/dev/null || true

echo "[3] Suppression des réseaux orphelins..."
docker network prune -f 2>/dev/null || true

echo "[4] Nettoyage des volumes inutilisés..."
docker volume prune -f 2>/dev/null || true

echo "[5] Attente de 5 secondes..."
sleep 5

echo "[6] Redémarrage des services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production.local up -d 2>&1

echo ""
echo "[7] Vérification du statut..."
sleep 5
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "[8] Vérification de la santé..."
docker-compose -f docker-compose.prod.yml ps -a

echo ""
echo "✓ Réparation terminée!"
