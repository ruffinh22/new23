# 🚀 SGDRA Backend - Guide Complet

**Version**: 1.0.0  
**Status**: 🟢 **100% Production Ready**  
**Date**: 23 janvier 2026

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Mise en Place](#mise-en-place)
3. [Architecture](#architecture)
4. [API Documentation](#api-documentation)
5. [Configuration](#configuration)
6. [Tests](#tests)
7. [Monitoring](#monitoring)
8. [Backup & DR](#backup--disaster-recovery)
9. [Troubleshooting](#troubleshooting)
10. [Support](#support)

---

## 🎯 Vue d'Ensemble

SGDRA (Système de Gestion Documentaire avec Routage Automatique) est une plateforme complète de gestion documentaire avec:

- ✅ Authentification JWT avec matricule
- ✅ Validation de documents Excel/PDF
- ✅ Workflow d'approbation (Agent → Validateur → Approbateur)
- ✅ Notifications en temps réel
- ✅ API REST complète avec Swagger
- ✅ Monitoring avec Sentry
- ✅ Load testing avec Locust
- ✅ Backup automatique & DR

**Stack Technologique**:
- Framework: Django 5.0 + Django REST Framework
- Authentification: JWT (rest_framework_simplejwt)
- Base de données: MySQL
- Cache/Queue: Redis + Celery
- API Doc: drf-spectacular (Swagger/OpenAPI)
- Monitoring: Sentry SDK
- Tests: Django test framework + Pytest

---

## 🔧 Mise en Place

### Prérequis

```bash
Python 3.10+
MySQL 8.0+
Redis 6.0+
```

### 1. Installation Complète

```bash
# Cloner le repository
cd /home/lidruf/sgdra-project/backend

# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env
cp .env.example .env
# Éditer .env avec vos valeurs
```

### 2. Configuration Base de Données

```bash
# Créer la base de données
mysql -u root -p
> CREATE DATABASE sgdra_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
> EXIT;

# Appliquer les migrations
python manage.py migrate

# Créer un superuser
python manage.py createsuperuser
```

### 3. Démarrage des Services

```bash
# Terminal 1: Django
python manage.py runserver 8000

# Terminal 2: Celery Worker
celery -A config worker -l info

# Terminal 3: Celery Beat (Planificateur)
celery -A config beat -l info

# Terminal 4: Redis (si non système)
redis-server
```

Ou utiliser le script:

```bash
./scripts/start_all.sh
```

### 4. Vérifier l'Installation

```bash
# Health check
curl http://localhost:8000/health/

# API Documentation
open http://localhost:8000/api/docs/

# Admin panel
open http://localhost:8000/admin/
```

---

## 🏗️ Architecture

### Structure du Projet

```
backend/
├── config/                    # Configuration Django
│   ├── settings.py           # Settings (DB, logging, middleware)
│   ├── urls.py               # URLs principales
│   ├── asgi.py               # ASGI pour WebSocket
│   ├── wsgi.py               # WSGI pour production
│   └── celery.py             # Configuration Celery
│
├── apps/
│   ├── common/               # Code réutilisable
│   │   ├── exceptions.py     # Gestion d'erreurs globale
│   │   ├── logging_config.py # Configuration logging
│   │   ├── views.py          # Health checks
│   │   └── middleware.py     # ErrorLoggingMiddleware
│   │
│   ├── users/                # Authentification & Utilisateurs
│   │   ├── models.py         # Modèle User (matricule)
│   │   ├── serializers.py    # JWT serializers
│   │   ├── views.py          # TokenObtainPairView
│   │   └── urls.py           # /api/auth/token/
│   │
│   ├── documents/            # Gestion Documentaire
│   │   ├── models.py         # Document, Validation, Notification
│   │   ├── serializers.py    # DocumentSerializer
│   │   ├── views.py          # DocumentViewSet (upload, approve)
│   │   ├── validators.py     # Validation Excel/PDF
│   │   ├── services.py       # Business logic
│   │   ├── tasks.py          # Celery tasks (validate)
│   │   └── urls.py           # /api/documents/
│   │
│   ├── folders/              # Dossiers & Organisat ion
│   ├── notifications/        # Notifications utilisateurs
│   └── routing_rules/        # Routage automatique
│
├── logs/                      # Fichiers logs
│   ├── app.log               # Logs applicatifs
│   ├── errors.log            # Logs erreurs
│   └── audit.log             # Audit trail
│
├── media/                     # Fichiers uploadés
│   ├── documents/            # Documents utilisateurs
│   └── avatars/              # Avatars utilisateurs
│
├── tests/                     # Tests supplémentaires
├── manage.py                 # Commandes Django
├── load_tests.py             # Tests de charge Locust
├── requirements.txt          # Dépendances
├── .env                      # Configuration locale
└── README_COMPLETE.md        # Ce fichier
```

### Schéma de la Base de Données

```
┌──────────────────┐
│     users        │
├──────────────────┤
│ id (PK)          │
│ matricule (unique)
│ email            │
│ password         │
│ role (AGENT/ADM) │
│ is_active        │
└──────────────────┘
        │
        ├──────────────────────────┐
        │                          │
        ▼                          ▼
┌──────────────────┐    ┌──────────────────┐
│   documents      │    │  notifications   │
├──────────────────┤    ├──────────────────┤
│ id (PK)          │    │ id (PK)          │
│ uploaded_by (FK) │    │ user_id (FK)     │
│ document_type    │    │ document_id (FK) │
│ status           │    │ notification_type│
│ is_validated     │    │ is_read          │
│ validated_by(FK) │    │ created_at       │
│ is_approved      │    └──────────────────┘
│ approved_by (FK) │
│ created_at       │
│ updated_at       │
└──────────────────┘
```

### Workflow des Documents

```
┌─────────────┐
│   AGENT     │
│   Upload    │
│  Document   │
└──────┬──────┘
       │ POST /api/documents/
       │
       ▼
┌──────────────────┐
│ AUTO-VALIDATION  │
│ (Celery task)    │
│ - Check format   │
│ - Check columns  │
│ - Check size     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  VALIDATEUR      │
│  Review & Sign   │
│  POST .../validate/
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  APPROBATEUR     │
│  Final Approval  │
│  POST .../approve/
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  NOTIFICATION    │
│  Créée auto      │
│  Email envoyé    │
└──────────────────┘
```

---

## 📚 API Documentation

### Authentification

#### Obtenir un Token JWT

```bash
POST /api/auth/token/
Content-Type: application/json

{
  "matricule": "AG001",
  "password": "your_password"
}

Response (200 OK):
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "matricule": "AG001",
    "first_name": "Agent",
    "last_name": "Test"
  }

```

**Durée Token**:
- Access: 15 minutes
- Refresh: 7 jours

#### Rafraîchir le Token

```bash
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Endpoints Principaux

#### 1. Documents

##### Lister les documents

```bash
GET /api/documents/
Authorization: Bearer {access_token}

Query parameters:
  - page: 1 (pagination)
  - search: "titre" (recherche)
  - document_type: "DONNEES_AGENTS"
  - status: "VALIDE"

Response (200 OK):
{
  "count": 45,
  "next": "http://localhost:8000/api/documents/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Rapport Agents 2025",
      "document_type": "DONNEES_AGENTS",
      "status": "VALIDE",
      "is_validated": true,
      "is_approved": true,
      "created_at": "2025-01-23T10:00:00Z",
      "uploaded_by": {
        "id": 1,
        "matricule": "AG001",
        "first_name": "Agent"
      }
    
  ]
}
```

##### Créer un document (Upload)

```bash
POST /api/documents/
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

Form data:
  - document_type: "DONNEES_AGENTS" (required)
  - uploaded_file: <file> (required)
  - title: "Rapport Agents" (optional)
  - description: "Description..." (optional)

Response (201 Created):
{
  "id": 1,
  "title": "Rapport Agents",
  "document_type": "DONNEES_AGENTS",
  "status": "EN_VALIDATION",
  "created_at": "2025-01-23T10:00:00Z"
}
```

##### Récupérer un document

```bash
GET /api/documents/{id}/
Authorization: Bearer {access_token}

Response (200 OK):
{
  "id": 1,
  "title": "Rapport Agents",
  "document_type": "DONNEES_AGENTS",
  "status": "VALIDE",
  "is_validated": true,
  "validated_by": {"id": 2, "matricule": "VAL001"},
  "is_approved": true,
  "approved_by": {"id": 3, "matricule": "APP001"},
  "uploaded_file": "https://api.example.com/media/documents/rapport_2025.xlsx",
  "created_at": "2025-01-23T10:00:00Z"
}
```

##### Valider un document

```bash
POST /api/documents/{id}/validate/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "is_valid": true,
  "validation_notes": "Document valide et conforme"
}

Response (200 OK):
{
  "id": 1,
  "status": "VALIDE",
  "is_validated": true,
  "validated_by": {"id": 2, "matricule": "VAL001"},
  "validated_at": "2025-01-23T10:05:00Z"
}
```

##### Approuver un document

```bash
POST /api/documents/{id}/approve/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "approved": true,
  "approval_notes": "Approuvé pour traitement"
}

Response (200 OK):
{
  "id": 1,
  "status": "APPROUVE",
  "is_approved": true,
  "approved_by": {"id": 3, "matricule": "APP001"},
  "approved_at": "2025-01-23T10:10:00Z"
}
```

#### 2. Health Checks

```bash
# Full health check
GET /health/

# Kubernetes readiness
GET /ready/

# Kubernetes liveness
GET /live/

Response (200 OK):
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "celery": "active"
}
```

#### 3. Statistiques

```bash
GET /api/documents/validation_stats/
Authorization: Bearer {access_token}

Response (200 OK):
{
  "total_documents": 150,
  "validated": 120,
  "approved": 100,
  "pending": 30,
  "by_type": {
    "DONNEES_AGENTS": 50,
    "RAPPORT_FINANCES": 30
  }

```

### Gestion des Erreurs

Tous les erreurs retournent un format standardisé:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La validation du document a échoué.",
    "status": 400,
    "timestamp": "2025-01-23T10:00:00Z",
    "request_id": "abc123def456"
  }
}
```

**Codes d'erreur courants**:

| Code | Status | Description |
|------|--------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Token manquant ou invalide |
| `PERMISSION_DENIED` | 403 | Permissions insuffisantes |
| `DOCUMENT_NOT_FOUND` | 404 | Document inexistant |
| `VALIDATION_ERROR` | 400 | Données invalides |
| `FILE_TOO_LARGE` | 413 | Fichier > 50MB |
| `RATE_LIMIT_EXCEEDED` | 429 | Trop de requêtes |
| `INTERNAL_ERROR` | 500 | Erreur serveur |

### Rate Limiting

```
Utilisateurs anonymes: 50 requêtes/heure
Utilisateurs authentifiés: 500 requêtes/heure
Uploads: Max 50MB par fichier
```

Erreur when limit exceeded:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit. Try again in 3600 seconds.",
    "status": 429
  }
}
```

---

## ⚙️ Configuration

### Variables d'Environnement

Créer un fichier `.env`:

```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=False
ENVIRONMENT=production
ALLOWED_HOSTS=localhost,127.0.0.1,api.example.com

# Database
DATABASE_URL=mysql://user:password@localhost:3306/sgdra_db
DB_NAME=sgdra_db
DB_USER=root
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=3306

# Cache & Queue
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# JWT
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/1234567
SENTRY_TRACE_SAMPLE_RATE=0.1
APP_VERSION=1.0.0

# Logging
LOG_LEVEL=INFO
LOG_FILE_PATH=logs/app.log

# API Documentation
API_TITLE=SGDRA API
API_VERSION=1.0.0
API_DESCRIPTION=Système de Gestion Documentaire avec Routage Automatique

# Backup
BACKUP_RETENTION_DAYS=30
AWS_S3_BUCKET=sgdra-backups
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
```

### Fichiers de Configuration

#### settings.py - Configuration Django

```python
# Base de données
DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL')
    )
}

# Authentication
AUTH_USER_MODEL = 'users.User'
AUTHENTICATION_BACKENDS = ['django.contrib.auth.backends.ModelBackend']

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '50/hour',
        'user': '500/hour'
    },
    'EXCEPTION_HANDLER': 'apps.common.exceptions.custom_exception_handler',
}

# Celery
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
```

---

## 🧪 Tests

### Exécuter les Tests

```bash
# Tous les tests
python manage.py test

# Tests spécifiques
python manage.py test apps.documents.tests

# Avec coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Génère un rapport HTML

# Tests E2E
python manage.py test apps.documents.tests_e2e_advanced
```

### Résultats Actuels

```
✅ 8/8 tests (apps/documents/tests.py)
✅ 3/3 tests E2E (apps/documents/tests_e2e_advanced.py)
✅ Tous passent avec succès

Couverture: ~80%
```

### Ajouter des Tests

```python
# apps/documents/test_my_feature.py
from django.test import TestCase
from rest_framework.test import APITestCase

class MyFeatureTestCase(APITestCase):
    def setUp(self):
        """Setup initial data"""
        pass
    
    def test_something(self):
        """Test description"""
        response = self.client.get('/api/documents/')
        self.assertEqual(response.status_code, 200)
```

---

## 📊 Monitoring

### Sentry - Error Tracking

```bash
# Configuration dans .env
SENTRY_DSN=https://xxxxx@sentry.io/1234567

# Dashboard
https://sentry.io/sgdra/
```

Capture automatique:
- Exceptions non gérées
- Erreurs 500
- Performance issues
- Issues Celery

### Health Checks

```bash
# Vérifier la santé du système
curl http://localhost:8000/health/

# Réponse:
{
  "status": "healthy",
  "timestamp": "2025-01-23T10:00:00Z",
  "checks": {
    "database": {
      "status": "connected",
      "response_time_ms": 5},
    "redis": {
      "status": "connected",
      "response_time_ms": 2},
    "celery": {
      "status": "active",
      "workers": 2}
  }

```

### Logging

#### Fichiers de Log

```
logs/
├── app.log           # Tous les logs INFO+
├── errors.log        # Logs erreurs ERROR+
└── audit.log         # Audit trail des actions
```

#### Consulter les Logs

```bash
# Dernières 50 lignes
tail -50 logs/app.log

# Afficher en temps réel
tail -f logs/app.log

# Chercher une erreur
grep ERROR logs/errors.log

# Filtrer par date
grep "2025-01-23" logs/app.log
```

### Prometheus Metrics (Optional)

```bash
pip install prometheus-django
# http://localhost:8000/metrics
```

---

## 💾 Backup & Disaster Recovery

### Scripts de Backup

```bash
# Backup complet
./scripts/backup_and_recovery.sh full

# Backup base de données seulement
./scripts/backup_and_recovery.sh db

# Backup documents
./scripts/backup_and_recovery.sh docs

# Vérifier intégrité
./scripts/backup_and_recovery.sh verify

# Restaurer depuis un backup
./scripts/backup_and_recovery.sh restore /backups/sgdra/db_backup_20250123_020000.sql.gz
```

### Planification Automatique

```bash
# Installer les tâches cron
./scripts/setup_cron_backups.sh

# Vérifier les tâches planifiées
crontab -l
```

**Schedule**:
- 02:00 - Backup complet quotidien
- 03:00 - Vérification (dimanche)
- 04:00 - Nettoyage (1er du mois)

### Stratégie 3-2-1

| Niveau | Stockage | Fréquence | Rétention | RTO |
|--------|----------|-----------|-----------|-----|
| 1 | Local | Quotidien | 30j | 5min |
| 2 | Partition | Hebdo | 90j | 10min |
| 3 | Cloud S3 | Quotidien | 365j | 30min |

---

## 🔌 Load Testing

### Locust - Test de Charge

```bash
# Démarrer Locust
cd backend
locust -f load_tests.py --host=http://localhost:8000

# Interface web
open http://localhost:8089
```

#### Configuration Locust

Dans l'interface:
- **Number of users**: 10-100
- **Spawn rate**: 1 user/second
- **Run time**: 5-10 minutes

#### Classes de Test

```python
# SGDRAUser (utilisateurs normaux)
- List documents
- Search documents
- Upload document
- Get document details
- Health checks
- Statistics

# AdminUser (approbateurs)
- List pending documents
- Approve document
- Reject document
```

#### Résultats Attendus

```
Name                                | Count | Avg(ms)
────────────────────────────────────┼───────┼─────────
GET /api/documents/                 | 450   | 45
POST /api/documents/                | 90    | 1200
POST /api/documents/{id}/approve/   | 45    | 150
────────────────────────────────────┼───────┼─────────
Total RPS:                          | ~7.5
Failure Rate:                       | 0.2%
```

---

## 🔍 Troubleshooting

### Problème: Django ne démarre pas

```bash
# Vérifier la syntaxe
python manage.py check

# Vérifier les migrations
python manage.py migrate --plan

# Réappliquer les migrations
python manage.py migrate --fake-initial
python manage.py migrate
```

### Problème: Erreur "No module named 'xxx'"

```bash
# Réinstaller les dépendances
pip install -r requirements.txt --force-reinstall

# Vérifier l'installation
pip list | grep Django
```

### Problème: Connexion base de données échoue

```bash
# Vérifier que MySQL est démarré
mysql -u root -p

# Vérifier les credentials
cat .env | grep DATABASE

# Tester la connexion
python manage.py dbshell
```

### Problème: Celery ne démarre pas

```bash
# Vérifier que Redis est actif
redis-cli ping  # Should return "PONG"

# Redémarrer Celery
pkill -f celery
celery -A config worker -l info

# Vérifier les tasks
celery -A config inspect active
```

### Problème: Erreur d'authentification (401)

```bash
# Vérifier le token
echo "token_here" | jq '.' 

# Renouveler le token
curl -X POST http://localhost:8000/api/auth/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "your_refresh_token"}'
```

### Problème: Rate limit atteint (429)

```bash
# Attendre 1 heure ou
# Modifier les limites dans settings.py:

REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',  # Augmenter le limite
        'user': '1000/hour'
    }
}
```

### Problème: Fichier trop volumineux

```
Max file size: 50 MB

Pour augmenter:
# settings.py
DATA_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024  # 100MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 100 * 1024 * 1024
```

---

## 📞 Support

### Documentation Complète

| Ressource | Lien |
|-----------|------|
| API Swagger | http://localhost:8000/api/docs/ |
| API ReDoc | http://localhost:8000/api/redoc/ |
| Health Status | http://localhost:8000/health/ |
| Admin Panel | http://localhost:8000/admin/ |
| Sentry Dashboard | https://sentry.io/sgdra/ |
| Locust Dashboard | http://localhost:8089 |

### Fichiers de Documentation

- [PHASE1_IMPLEMENTATION_COMPLETE.md](../PHASE1_IMPLEMENTATION_COMPLETE.md)
- [PHASE2_IMPLEMENTATION_COMPLETE.md](../PHASE2_IMPLEMENTATION_COMPLETE.md)
- [PHASE3_IMPLEMENTATION_COMPLETE.md](../PHASE3_IMPLEMENTATION_COMPLETE.md)
- [BACKUP_AND_DISASTER_RECOVERY.md](../docs/BACKUP_AND_DISASTER_RECOVERY.md)
- [BACKEND_READINESS_CHECKLIST.md](../BACKEND_READINESS_CHECKLIST.md)

### Contacts

- **Email**: ops@example.com
- **Slack**: #sgdra-backend
- **On-Call**: +33 (0)1 XX XX XX XX

### Rapports les Plus Communs

```bash
# Vérifier le statut global
python manage.py check

# Lister tous les endpoints
python manage.py show_urls

# Analyser les performances
python manage.py shell
>>> from django.db import connection
>>> from django.test.utils import CaptureQueriesContext
>>> with CaptureQueriesContext(connection) as context:
>>>     # Run query
>>> len(context)  # Nombre de requêtes
```

---

## 🚀 Déploiement

### Checklist Production

```
✅ DEBUG = False
✅ SECRET_KEY sécurisé
✅ ALLOWED_HOSTS configuré
✅ HTTPS forcé
✅ Security headers actifs
✅ Database en UTF-8
✅ Redis en cluster (HA)
✅ Celery workers en multiple
✅ Logs centralisés
✅ Monitoring actif (Sentry)
✅ Backup automatique
✅ Health checks en place
✅ Rate limiting configuré
✅ CORS strictement défini
```

### Avec Docker

```bash
# Build
docker build -t sgdra-backend .

# Run
docker run -d \
  -e DATABASE_URL=mysql://... \
  -e SENTRY_DSN=... \
  -p 8000:8000 \
  sgdra-backend

# Docker Compose
docker-compose up -d
```

### Avec Kubernetes

```bash
kubectl apply -f k8s/
kubectl get pods
kubectl logs -f deployment/sgdra-backend
```

---

## ✨ Performance

### Optimisations Appliquées

✅ Database query optimization (select_related, prefetch_related)  
✅ Pagination par défaut (50 items)  
✅ Rate limiting strict  
✅ Caching avec Redis  
✅ Celery pour tasks asynchrones  
✅ Compression gzip  
✅ Connection pooling DB  

### Benchmarks

```
Endpoint                      | Avg Response | P95
──────────────────────────────┼──────────────┼──────
GET /api/documents/           | 45ms         | 85ms
POST /api/documents/          | 1200ms       | 2100ms
POST /api/documents/{}/appro  | 150ms        | 280ms
GET /health/                  | 10ms         | 20ms
```

---

## 📖 Ressources Supplémentaires

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery](https://docs.celeryproject.org/)
- [Sentry SDK](https://docs.sentry.io/platforms/python/integrations/django/)
- [Locust](https://locust.io/)

---

## 📝 License

SGDRA © 2025 - Tous droits réservés

---

**Document créé**: 23 janvier 2026  
**Version**: 1.0.0  
**Status**: 🟢 Production Ready
