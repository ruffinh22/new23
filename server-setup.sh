#!/bin/bash

# SGDRA - Setup initial du serveur
# À exécuter UNE FOIS comme root ou avec sudo

set -e

echo "=========================================="
echo "SGDRA - Setup du Serveur"
echo "=========================================="

# Créer le répertoire
echo "Création de /srv/sgdra..."
mkdir -p /srv/sgdra

# Définir les permissions
echo "Configuration des permissions..."
chown -R erpgmc:erpgmc /srv/sgdra
chmod 755 /srv/sgdra

# Vérifier
echo "Vérification..."
ls -la /srv/sgdra

echo ""
echo "✓ Setup terminé!"
echo ""
echo "Prochaines étapes:"
echo "  1. cd /srv/sgdra"
echo "  2. cp .env.production .env.production.local"
echo "  3. nano .env.production.local"
echo "  4. ./pre-check.sh"
