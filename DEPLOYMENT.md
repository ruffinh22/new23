# Guide de Déploiement SGDRA - Production

## Table des matières
1. [Prérequis](#prérequis)
2. [Préparation du serveur](#préparation-du-serveur)
3. [Configuration](#configuration)
4. [Déploiement](#déploiement)
5. [Post-déploiement](#post-déploiement)
6. [Maintenance](#maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prérequis

### Serveur
- **IP**: 10.0.5.18
- **Utilisateur**: erpgmc
- **Accès root** disponible
- **OS**: Linux (Ubuntu 20.04+ recommandé)
- **Ressources minimales**:
  - CPU: 4 cores
  - RAM: 8GB
  - Disque: 50GB (extensible)

### Logiciels requis
- Docker (v20.0+)
- Docker Compose (v2.0+)
- Git
- OpenSSL (pour les certificats SSL)
- curl ou wget

---

## Préparation du serveur

### 1. Connexion SSH
```bash
ssh erpgmc@10.0.5.18
# Mot de passe: toor

# Obtenir les accès root
su
# Mot de passe: 20ERP@GMC2024
```

### 2. Mise à jour du système
```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl wget git net-tools
```

### 3. Installation de Docker
```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Vérifier l'installation
docker --version
docker-compose --version

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker erpgmc
# Reconnecter pour appliquer les changements
```

### 4. Préparation du répertoire
```bash
# Créer le répertoire du projet
sudo mkdir -p /srv/sgdra
sudo chown -R erpgmc:erpgmc /srv/sgdra

cd /srv/sgdra

# Cloner le reposit repository
git clone https://github.com/yourorg/sgdra.git .
# Ou si vous avez déjà le code localement, copier-le
```

---

## Configuration

### 1. Fichier d'environnement
```bash
# Copier le fichier de configuration
cp .env.production .env.production.local

# Éditer les variables sensibles
nano .env.production.local
```

**Variables importantes à modifier**:
```env
# Sécurité
SECRET_KEY=<générer une clé aléatoire>
DEBUG=False

# Base de données
MYSQL_ROOT_PASSWORD=<mot_de_passe_sécurisé>
MYSQL_PASSWORD=<mot_de_passe_utilisateur>

# Domaine
ALLOWED_HOSTS=10.0.5.18,yourdomain.com
CORS_ALLOWED_ORIGINS=https://10.0.5.18,https://yourdomain.com

# Email
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=<mot_de_passe_app>

# Sentry (optionnel)
SENTRY_DSN=<votre_sentry_dsn>
```

### 2. Générer une clé Django sécurisée
```bash
python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Certificats SSL
```bash
# Les certificats auto-signés seront générés automatiquement
# Pour les certificats Let's Encrypt, voir ci-dessous

# Certificats Let's Encrypt (recommandé)
sudo apt-get install -y certbot python3-certbot-nginx

sudo certbot certonly --standalone -d yourdomain.com

# Copier les certificats
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem frontend/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem frontend/ssl/key.pem
sudo chown erpgmc:erpgmc frontend/ssl/*
```

---

## Déploiement

### 1. Rendre le script exécutable
```bash
chmod +x deploy.sh
```

### 2. Vérifier les prérequis
```bash
./deploy.sh health
```

### 3. Démarrer les services
```bash
# Démarrage complet
./deploy.sh start

# Vérifier le statut
./deploy.sh status

# Vérifier les logs
./deploy.sh logs
```

### 4. Vérifier l'accès
```bash
# API Backend
curl -k https://localhost/api/

# Admin Django
curl -k https://localhost/admin/

# Health check
curl -k https://localhost/health/
```

---

## Post-déploiement

### 1. Créer un administrateur
```bash
docker-compose -f docker-compose.prod.yml exec -it backend python manage.py createsuperuser
```

### 2. Charger les données initiales (optionnel)
```bash
docker-compose -f docker-compose.prod.yml exec -it backend python manage.py loaddata initial_data.json
```

### 3. Configurer les permissions
```bash
# Configurer les permissions des répertoires
sudo chown -R 1000:1000 backend/media
sudo chmod -R 755 backend/media
```

### 4. Configurer le firewall
```bash
# UFW (si utilisé)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 5. Configuration de la sauvegarde automatique
```bash
# Ajouter une tâche cron pour les sauvegardes
crontab -e

# Ajouter la ligne:
0 2 * * * /srv/sgdra/deploy.sh backup
```

---

## Maintenance

### Logs
```bash
# Afficher les logs en temps réel
./deploy.sh logs

# Logs d'un service spécifique
./deploy.sh logs backend
./deploy.sh logs mysql
./deploy.sh logs redis
./deploy.sh logs nginx
```

### Sauvegarde
```bash
# Créer une sauvegarde manuelle
./deploy.sh backup

# Les sauvegardes sont stockées dans ./backups/
```

### Mise à jour
```bash
# Mettre à jour le code et redéployer
./deploy.sh update
```

### Redémarrage
```bash
# Redémarrer tous les services
./deploy.sh restart

# Redémarrer un service spécifique
docker-compose -f docker-compose.prod.yml restart backend
```

### Monitorer la performance
```bash
# Utilisation des conteneurs
docker stats

# Logs d'erreur
docker-compose -f docker-compose.prod.yml logs --tail=100 backend

# Inspection du service
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell
```

---

## Troubleshooting

### Problème: Les conteneurs ne démarrent pas
```bash
# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs

# Arrêter et redémarrer
./deploy.sh stop
./deploy.sh start

# Forcer la reconstruction
docker-compose -f docker-compose.prod.yml build --no-cache
./deploy.sh start
```

### Problème: Erreur de base de données
```bash
# Vérifier la connexion MySQL
docker-compose -f docker-compose.prod.yml exec mysql mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "SELECT 1"

# Vérifier les migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate --check

# Appliquer les migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### Problème: Erreur de mémoire
```bash
# Augmenter les limites de mémoire dans docker-compose.prod.yml
# Ajouter sous chaque service:
deploy:
  resources:
    limits:
      memory: 2G
```

### Problème: Certificat SSL invalide
```bash
# Regénérer les certificats
rm -rf frontend/ssl/*
./deploy.sh start
```

### Problème: Port déjà en utilisation
```bash
# Trouver le processus utilisant le port
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :8000

# Arrêter le processus
sudo kill -9 <PID>
```

### Problème: Permission refusée
```bash
# Corriger les permissions
sudo chown -R $(whoami):$(whoami) .
chmod +x deploy.sh
```

---

## Commandes utiles

```bash
# Afficher le statut
./deploy.sh status

# Vérifier la santé
./deploy.sh health

# Afficher les logs
./deploy.sh logs [service]

# Arrêter les services
./deploy.sh stop

# Redémarrer les services
./deploy.sh restart

# Créer une sauvegarde
./deploy.sh backup

# Mettre à jour
./deploy.sh update

# Exécuter une commande Django
docker-compose -f docker-compose.prod.yml exec backend python manage.py <command>

# Accéder au shell Django
docker-compose -f docker-compose.prod.yml exec backend python manage.py shell

# Consulter les logs en direct
docker-compose -f docker-compose.prod.yml logs -f backend

# Inspecter un conteneur
docker inspect sgdra-backend

# Nettoyer les ressources inutilisées
docker system prune -a
```

---

## Support

Pour tout problème, consultez:
- Les logs Docker
- La documentation Django
- La documentation Docker Compose
- Le code source du projet

---

**Dernière mise à jour**: 2026-02-12
**Version**: 1.0.0
