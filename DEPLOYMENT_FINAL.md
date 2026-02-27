# 🚀 DEPLOYMENT_FINAL - Guide Déploiement Production

**Version:** 1.0.0 Final | **Date:** 27 Février 2026 | **Status:** ✅ Production Ready

---

## 📋 Table des Matières

1. [Architecture Déploiement](#architecture-déploiement)
2. [Prérequis Infrastructure](#prérequis-infrastructure)
3. [Installation Initiale](#installation-initiale)
4. [Déploiement Backend](#déploiement-backend)
5. [Déploiement Frontend](#déploiement-frontend)
6. [Configuration Production](#configuration-production)
7. [Vérification & Tests](#vérification--tests)
8. [Opérations & Maintenance](#opérations--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Déploiement

```
┌─────────────────┐
│   Utilisateurs  │
└────────┬────────┘
         │ HTTPS
    ┌────▼────────────────┐
    │   Nginx             │
    │   (10.0.5.18:443)   │
    └────┬────────────────┘
         │
    ┌────┴──────┬──────────┐
    │            │          │
┌───▼──┐   ┌────▼────┐  ┌──▼─────┐
│React │   │ Django  │  │ Redis   │
│ SPA  │   │ API     │  │ Queue   │
└──────┘   └────┬────┘  └─────────┘
                │
            ┌───▼──────┐
            │ MySQL    │
            │ Database │
            └──────────┘
```

### Serveur de Production
- **IP:** 10.0.5.18
- **OS:** Linux (Ubuntu 20.04 LTS)
- **Docker:** Compose multi-conteneur
- **Stockage:** /srv/sgdra (volumes montés)

---

## 📦 Prérequis Infrastructure

### Serveur
- ✅ Ubuntu 20.04 LTS ou récent
- ✅ 4+ CPU cores
- ✅ 8GB+ RAM
- ✅ 100GB+ disque (dont 30GB backups)
- ✅ Docker + Docker Compose installés
- ✅ SSH access configuré

### Services Externes
- ✅ Email SMTP OVH (ssl0.ovh.net:465)
- ✅ Domaine avec DNS configuré
- ✅ Certificat SSL/TLS valide
- ✅ (Optionnel) S3/FTP pour backups distants

### Credentials à Préparer
```bash
# .env.production (à créer sur serveur)
DJANGO_SECRET_KEY=###############
ALLOWED_HOSTS=yourdomain.com,10.0.5.18
DATABASE_PASSWORD=###############
EMAIL_HOST_USER=noreply@domain.com
EMAIL_HOST_PASSWORD=###############
REDIS_PASSWORD=###############
AWS_ACCESS_KEY_ID=###############  # Si S3
AWS_SECRET_ACCESS_KEY=###############  # Si S3
```

---

## 🔧 Installation Initiale

### 1. Préparation Serveur

```bash
# SSH sur serveur
ssh erpgmc@10.0.5.18

# Créer structure répertoires
sudo mkdir -p /srv/sgdra/{backend,frontend,backups,logs,certs}
sudo chown -R erpgmc:erpgmc /srv/sgdra

# Cloner repository
cd /srv/sgdra
git clone https://github.com/yourepo/sgdra.git .

# Créer fichier .env.production
nano .env.production
# Ajouter credentials (voir section Credentials)
```

### 2. Certificat SSL/TLS

```bash
# Option A: Certbot (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d yourdomain.com

# Copier certificats
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /srv/sgdra/certs/sgdra.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /srv/sgdra/certs/sgdra.key
sudo chown erpgmc:erpgmc /srv/sgdra/certs/*

# Option B: Certificat auto-signé (développement)
openssl req -x509 -newkey rsa:4096 -keyout /srv/sgdra/certs/sgdra.key \
  -out /srv/sgdra/certs/sgdra.crt -days 365 -nodes
```

### 3. Configuration Docker Compose

```bash
# Modifier docker-compose.prod.yml pour environnement
sed -i 's|/path/to|/srv/sgdra|g' docker-compose.prod.yml

# Vérifier configuration
docker-compose -f docker-compose.prod.yml config
```

---

## 🚀 Déploiement Backend

### 1. Build & Démarrage

```bash
cd /srv/sgdra

# Build images
docker-compose -f docker-compose.prod.yml build

# Démarrer services
docker-compose -f docker-compose.prod.yml up -d

# Vérifier état
docker-compose -f docker-compose.prod.yml ps
```

### 2. Initialisation Base de Données

```bash
# Appliquer migrations
docker-compose -f docker-compose.prod.yml exec sgdra-backend python manage.py migrate

# Créer superuser
docker-compose -f docker-compose.prod.yml exec sgdra-backend python manage.py createsuperuser

# Charger données initiales
docker-compose -f docker-compose.prod.yml exec sgdra-backend python manage.py create_initial_users

# Vérifier logs
docker-compose -f docker-compose.prod.yml logs sgdra-backend
```

### 3. Tests Connectivité Backend

```bash
# Vérifier l'API répond
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://10.0.5.18/api/documents/

# Vérifier base de données
docker-compose -f docker-compose.prod.yml exec sgdra-mysql mysql -u root -p -e "SHOW DATABASES;"

# Vérifier Redis
docker-compose -f docker-compose.prod.yml exec sgdra-redis redis-cli PING
# Doit retourner: PONG
```

---

## 🎨 Déploiement Frontend

### 1. Build Production

```bash
cd /srv/sgdra/frontend

# Installer dépendances
npm install

# Build optimisé
npm run build

# Vérifier dist/ créé
ls -lah dist/
```

### 2. Déployer dans Nginx

```bash
# Copier vers serveur (depuis machine locale)
scp -r dist erpgmc@10.0.5.18:/srv/sgdra/

# Sur serveur, copier dans conteneur Nginx
docker cp /srv/sgdra/dist sgdra-nginx:/usr/share/nginx/html/

# Recharger Nginx
docker exec sgdra-nginx nginx -s reload

# Vérifier
docker logs sgdra-nginx | grep "reload"
```

### 3. Vérifier Frontend

```bash
# Test local
curl -s https://10.0.5.18/ | head -50

# Vérifier fichiers statiques chargent
curl -I https://10.0.5.18/static/css/main.xxx.css
# Doit retourner 200 OK
```

---

## ⚙️ Configuration Production

### 1. settings.py Backend

Les paramètres avancés sont **déjà** dans `/backend/config/settings.py` lignes 486-700+

Paramètres configurés:
- ✅ Timezone: Africa/Dakar
- ✅ Database: MySQL production
- ✅ Email SMTP: OVH ssl0.ovh.net:465
- ✅ Storage limits: 5GB user, 10GB folder, 100GB total
- ✅ Data retention: 90d logs, 5y documents
- ✅ SSL/TLS: Certificats
- ✅ Backups: Daily 3h AM, 30d retention
- ✅ Monitoring: Slow queries > 500ms

### 2. Environment Variables

```bash
# Vérifier .env.production présent
cat /srv/sgdra/.env.production

# Charger variables dans conteneur
docker-compose -f docker-compose.prod.yml exec sgdra-backend env | grep DJANGO
```

### 3. Nginx Configuration

```bash
# Vérifier config
docker exec sgdra-nginx nginx -t

# Config est dans: /etc/nginx/nginx.conf.prod
# Reverse proxy vers Django API
# Serve static files depuis /usr/share/nginx/html
# HTTPS obligatoire
```

### 4. Celery Task Queue

```bash
# Vérifier Celery worker tourne
docker-compose -f docker-compose.prod.yml logs sgdra-celery | tail -20

# Vérifier tasks en queue
docker-compose -f docker-compose.prod.yml exec sgdra-redis redis-cli LLEN celery

# Tasks configurées:
# - SEND_EMAILS_ASYNC: Envoi emails asynchrone
# - DATA_CLEANUP: Nettoyage données (2h AM)
# - BACKUP: Sauvegarde (3h AM)
```

---

## ✅ Vérification & Tests

### 1. Health Checks

```bash
# Backend health
curl -s https://10.0.5.18/api/health/ | jq

# Frontend accessible
curl -s -I https://10.0.5.18/ | head -1

# Database connectivity
docker-compose -f docker-compose.prod.yml exec sgdra-mysql mysql -u root -p -e "SELECT VERSION();"

# Redis working
docker-compose -f docker-compose.prod.yml exec sgdra-redis redis-cli PING
```

### 2. Vérification Fonctionnelle

```bash
# Authentification
curl -X POST https://10.0.5.18/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Lister documents
curl -H "Authorization: Bearer TOKEN" \
  https://10.0.5.18/api/documents/

# Créer document test
curl -X POST https://10.0.5.18/api/documents/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test document"}'
```

### 3. Performance Baseline

```bash
# Temps réponse API (doit être < 500ms)
time curl -s https://10.0.5.18/api/documents/ > /dev/null

# CPU/Memory usage
docker stats sgdra-backend sgdra-mysql

# Disk space
df -lh /srv/sgdra/
```

---

## 🛠️ Opérations & Maintenance

### Démarrage/Arrêt Services

```bash
# Démarrer (après redémarrage serveur)
cd /srv/sgdra
docker-compose -f docker-compose.prod.yml up -d

# Arrêter gracefully
docker-compose -f docker-compose.prod.yml down

# Redémarrer un service spécifique
docker-compose -f docker-compose.prod.yml restart sgdra-backend
```

### Visualiser Logs

```bash
# Logs backend (dernières 100 lignes)
docker-compose -f docker-compose.prod.yml logs -f sgdra-backend --tail=100

# Logs Nginx
docker-compose -f docker-compose.prod.yml logs -f sgdra-nginx

# Logs Celery
docker-compose -f docker-compose.prod.yml logs -f sgdra-celery

# Tous les logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Backups & Restauration

```bash
# Backup manuel
docker-compose -f docker-compose.prod.yml exec sgdra-backend \
  python manage.py dbbackup --noinput

# Liste backups
ls -lah /srv/sgdra/backups/

# Restaurer dernière sauvegarde
docker-compose -f docker-compose.prod.yml exec sgdra-backend \
  python manage.py dbrestore --noinput

# Backup files uploadés
tar -czf /srv/sgdra/backups/media_$(date +%Y%m%d).tar.gz \
  /srv/sgdra/backend/media/
```

### Updates & Patches

```bash
# Récupérer nouveautés
cd /srv/sgdra
git pull origin main

# Rebuilder images si changements backend
docker-compose -f docker-compose.prod.yml build sgdra-backend

# Appliquer migrations si nécessaire
docker-compose -f docker-compose.prod.yml exec sgdra-backend python manage.py migrate

# Redémarrer
docker-compose -f docker-compose.prod.yml up -d

# Vérifier
docker-compose -f docker-compose.prod.yml ps
```

### Monitorer Système

```bash
# CPU/Memory/Disk temps réel
watch docker stats sgdra-{backend,mysql,nginx,redis}

# Storage utilization
du -sh /srv/sgdra/*

# Logs d'erreurs
docker-compose -f docker-compose.prod.yml logs | grep ERROR

# Requêtes lentes base de données
docker-compose -f docker-compose.prod.yml exec sgdra-mysql \
  mysql -u root -p -e "SHOW PROCESSLIST;"
```

### Gestion Certifications SSL

```bash
# Renouveler certificat Let's Encrypt (avant 30j expiration)
sudo certbot renew --force-renewal

# Copier certifs mis à jour
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /srv/sgdra/certs/sgdra.crt
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /srv/sgdra/certs/sgdra.key

# Recharger Nginx
docker exec sgdra-nginx nginx -s reload
```

---

## 🔍 Troubleshooting

### Frontend ne charge pas

```bash
# Vérifier Nginx tourne
docker-compose -f docker-compose.prod.yml ps sgdra-nginx

# Vérifier fichiers dans nginx
docker exec sgdra-nginx ls -la /usr/share/nginx/html/

# Vérifier logs nginx
docker logs sgdra-nginx

# Solution: Re-copier dist/
docker cp /srv/sgdra/dist sgdra-nginx:/usr/share/nginx/html/
docker exec sgdra-nginx nginx -s reload
```

### Backend API retourne 500

```bash
# Vérifier logs backend
docker logs sgdra-backend --tail=50

# Vérifier database accessible
docker-compose exec sgdra-backend python manage.py shell
>>> import django
>>> django.setup()

# Vérifier migrations appliquées
docker-compose exec sgdra-backend python manage.py showmigrations

# Redémarrer backend
docker-compose restart sgdra-backend
```

### Email non envoyés

```bash
# Vérifier config SMTP
docker-compose exec sgdra-backend python manage.py shell
>>> from django.conf import settings
>>> print(settings.EMAIL_HOST, settings.EMAIL_PORT)

# Tester connexion SMTP
python3 << 'EOF'
import smtplib
server = smtplib.SMTP_SSL('ssl0.ovh.net', 465, timeout=10)
server.login('noreply@domain.com', 'PASSWORD')
print("SMTP OK")
EOF

# Vérifier Celery traite tasks
docker logs sgdra-celery | grep -i "task"
```

### Base de données pleine

```bash
# Vérifier taille
du -sh /var/lib/docker/volumes/sgdra_mysql-data/

# Limiter via retention policy
# Déjà configuré dans settings.py DATA_RETENTION_POLICY

# Forcer nettoyage ancien
docker-compose exec sgdra-backend \
  python manage.py cleanup_data --days_old=30

# Vérifier espace disque serveur
df -lh /
# Si < 10% free, nettoyer /srv/sgdra/backups/old_*
```

### Certificat SSL expiré

```bash
# Vérifier date expiration
openssl x509 -in /srv/sgdra/certs/sgdra.crt -noout -dates

# Si Let's Encrypt, renouveler
sudo certbot renew

# Si auto-signé, régénérer
openssl req -x509 -newkey rsa:4096 -keyout /srv/sgdra/certs/sgdra.key \
  -out /srv/sgdra/certs/sgdra.crt -days 365 -nodes

# Recharger
docker exec sgdra-nginx nginx -s reload
```

---

## 📞 Support Rapide

| Problème | Commande |
|----------|----------|
| Services down | `docker-compose -f docker-compose.prod.yml up -d` |
| Logs complets | `docker-compose -f docker-compose.prod.yml logs -f` |
| Santé système | `docker stats` |
| Espace disque | `df -lh /srv/sgdra` |
| Port occupé | `sudo lsof -i :80 :443 :3306 :6379` |
| Docker errors | `docker-compose -f docker-compose.prod.yml logs` |

---

## ✅ Checklist Déploiement

- [ ] Infrastructure préparée (CPU, RAM, disque)
- [ ] Credentials (.env.production) créés
- [ ] Certificats SSL/TLS en place
- [ ] Repository cloné dans /srv/sgdra
- [ ] Docker Compose démarré `up -d`
- [ ] Migrations appliquées `migrate`
- [ ] Users initiaux créés `create_initial_users`
- [ ] Frontend builté et copié
- [ ] Nginx reloadé
- [ ] Health checks passés (API + Frontend)
- [ ] Email test envoyé
- [ ] Backups planifiés et testés
- [ ] Logs monitoring activé
- [ ] Documenté pour équipe support

---

**Dernière mise à jour:** 27 Février 2026
**Status:** ✅ Production Ready
**Version:** 1.0.0 Final
