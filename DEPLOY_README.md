# Configuration de Déploiement Production - SGDRA

## Fichiers de Configuration Créés

### 📋 Documentation
- **`DEPLOYMENT.md`** - Guide complet de déploiement (lire d'abord!)
- **`OPERATIONS.md`** - Procédures opérationnelles quotidiennes
- **`README.md`** (ce fichier) - Vue d'ensemble de la structure

### ⚙️ Configuration Docker
- **`docker-compose.prod.yml`** - Configuration Docker pour production
  - MySQL 8.0 (optimisé pour la production)
  - Redis 7 (cache et broker Celery)
  - Backend Django (Gunicorn)
  - Celery Worker (traitement des tâches)
  - Celery Beat (tâches planifiées)
  - Nginx (reverse proxy et SSL)

- **`frontend/nginx-production.conf`** - Configuration Nginx production
  - Reverse proxy vers le backend
  - Gestion des certificats SSL/TLS
  - Compression Gzip
  - Headers de sécurité
  - Rate limiting
  - Cache statique

### 🔑 Variables d'Environnement
- **`.env.production`** - Variables de configuration production
  - À adapter selon votre environnement
  - À ne PAS commiter en git!
  - Copier à `.env.production.local` pour vos modifications

### 🚀 Scripts de Déploiement
- **`deploy.sh`** - Script principal de gestion des services
  ```bash
  ./deploy.sh start        # Démarrer les services
  ./deploy.sh stop         # Arrêter les services
  ./deploy.sh restart      # Redémarrer
  ./deploy.sh logs         # Voir les logs
  ./deploy.sh status       # Statut des services
  ./deploy.sh health       # Vérification santé
  ./deploy.sh backup       # Créer une sauvegarde
  ./deploy.sh update       # Mettre à jour le code
  ```

- **`pre-check.sh`** - Vérification pré-déploiement
  ```bash
  ./pre-check.sh           # Valider l'environnement système
  ```

---

## Structure des Répertoires

```
/srv/sgdra/
├── backend/                      # Code Django
│   ├── config/
│   ├── apps/
│   ├── media/                    # Fichiers uploadés
│   ├── staticfiles/              # Fichiers statiques compilés
│   ├── logs/                     # Logs applicatifs
│   ├── requirements.txt
│   └── manage.py
│
├── frontend/                     # Configuration Frontend
│   ├── nginx-production.conf     # Configuration Nginx
│   └── ssl/                      # Certificats SSL
│       ├── cert.pem
│       └── key.pem
│
├── backups/                      # Sauvegardes (créé automatiquement)
│   └── 20260212_150000/
│       ├── database.sql
│       └── media.tar.gz
│
├── docker-compose.prod.yml       # Configuration Docker
├── .env.production               # Variables d'environnement (TEMPLATE)
├── .env.production.local         # Variables d'environnement (LOCAL - À ADAPTER)
├── deploy.sh                     # Script de déploiement
├── pre-check.sh                  # Vérification pré-déploiement
│
├── DEPLOYMENT.md                 # Guide de déploiement détaillé
├── OPERATIONS.md                 # Procédures d'opération
└── README.md                     # Ce fichier
```

---

## Étapes d'Installation Rapide

### 1. Préparation du Serveur (SSH sur 10.0.5.18)
```bash
ssh erpgmc@10.0.5.18        # Mot de passe: toor
su                           # Mot de passe: 20ERP@GMC2024
apt-get update && apt-get upgrade -y
```

### 2. Installation de Docker
```bash
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose
usermod -aG docker erpgmc
```

### 3. Préparation du Projet
```bash
mkdir -p /srv/sgdra
cd /srv/sgdra
git clone <your-repo> .
# ou copier les fichiers manuellement
```

### 4. Configuration
```bash
cp .env.production .env.production.local
nano .env.production.local    # Adapter les variables
chmod +x deploy.sh pre-check.sh
```

### 5. Vérification Pré-Déploiement
```bash
./pre-check.sh   # Doit retourner "ready for deployment"
```

### 6. Déploiement
```bash
./deploy.sh start
./deploy.sh health   # Vérifier que tout fonctionne
```

---

## Variables d'Environnement Importantes

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SECRET_KEY` | Clé secrète Django | `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | Mode debug Django | `False` (production) |
| `ALLOWED_HOSTS` | Domaines autorisés | `10.0.5.18,yourdomain.com` |
| `MYSQL_ROOT_PASSWORD` | Mot de passe root MySQL | `<strong_password>` |
| `MYSQL_PASSWORD` | Mot de passe utilisateur DB | `<strong_password>` |
| `SECURE_SSL_REDIRECT` | Force HTTPS | `True` |
| `SENTRY_DSN` | URL Sentry (opt.) | `https://key@sentry.io/...` |

---

## Ports Utilisés

| Service | Port | Accès |
|---------|------|-------|
| Nginx (HTTP) | 80 | Public |
| Nginx (HTTPS) | 443 | Public |
| Gunicorn (backend) | 8000 | Interne (via Nginx) |
| MySQL | 3306 | Interne (127.0.0.1 uniquement) |
| Redis | 6379 | Interne (127.0.0.1 uniquement) |

---

## Certificats SSL

### Auto-signés (développement)
Générés automatiquement au démarrage (valides 365 jours)

### Let's Encrypt (production - RECOMMANDÉ)
```bash
sudo apt-get install certbot
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem frontend/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem frontend/ssl/key.pem
./deploy.sh restart
```

---

## Commission Volumes Docker Persistants

| Volume | Contenu | Point de Montage |
|--------|---------|------------------|
| `mysql_data` | Base de données MySQL | `/var/lib/mysql` |
| `redis_data` | Cache Redis | `/data` |
| `backend_logs` | Logs Django | `/app/backend/logs` |
| `backend_media` | Fichiers uploadés | `/app/backend/media` |
| `backend_staticfiles` | Fichiers statiques | `/app/backend/staticfiles` |
| `celery_beat_schedule` | Calendrier Celery Beat | `/app/backend/celery_beat_schedule` |

---

## Commandes Utiles

### Monitoring
```bash
# Voir l'utilisation des ressources
docker stats

# Afficher les logs
./deploy.sh logs [service]

# Vérifier la santé
./deploy.sh health
```

### Opérations
```bash
# Créer un super-utilisateur
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Appliquer les migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collecter les fichiers statiques
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Maintenance
```bash
# Sauvegarde
./deploy.sh backup

# Nettoyage des sessions anciennes
docker-compose -f docker-compose.prod.yml exec backend python manage.py clearsessions

# Vider le cache Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

---

## Dépannage

### Le backend ne démarre pas
```bash
./deploy.sh logs backend   # Voir les erreurs
./deploy.sh restart        # Essayer de redémarrer
```

### Performance lente
```bash
./deploy.sh health         # Vérifier la santé
docker stats               # Voir l'utilisation des ressources
./deploy.sh logs mysql     # Vérifier les erreurs BD
```

### Certificat SSL expiré
```bash
# Renouveler
sudo certbot renew --standalone
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem frontend/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem frontend/ssl/key.pem
./deploy.sh restart
```

---

## Checklist de Déploiement

- [ ] Docker et Docker Compose installés
- [ ] Instructions SSL configurées
- [ ] Variables d'environnement adaptées
- [ ] Pre-check script réussi
- [ ] Services démarrés avec succès
- [ ] Health check réussi
- [ ] Accès à l'API et l'admin
- [ ] Sauvegardes automatiques configurées
- [ ] Monitoring mis en place

---

## Contacts et Support

Pour plus de détails:
- Consulter `DEPLOYMENT.md` pour le guide complet
- Consulter `OPERATIONS.md` pour les procédures
- Vérifier les logs: `./deploy.sh logs`
- Tester la santé: `./deploy.sh health`

---

## Ressources Externes

- [Docker Documentation](https://docs.docker.com/)
- [Django Documentation](https://docs.djangoproject.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Celery Documentation](https://docs.celeryproject.io/)
- [Let's Encrypt](https://letsencrypt.org/)

---

**Date de création**: 2026-02-12  
**Dernière mise à jour**: 2026-02-12  
**Version**: 1.0.0  
**Maintaineur**: DevOps Team
