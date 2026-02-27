# 📋 SGDRA - Système de Gestion des Documents et Routage Automatique
**Version Finale - 27 Février 2026**

## 🎯 Vue d'ensemble

SGDRA est un système complet de gestion de documents avec routage automatique, conçu pour l'administration d'Afrique. Le système gère une hiérarchie organisationnelle (Pôles → Filiales → Services) avec autentification multi-rôles, gestion des quotas de stockage et audit complet.

---

## 🏗️ Architecture du Système

### Backend (Django)
- **Framework:** Django 3.x + Django REST Framework
- **Base de données:** MySQL 8.x
- **Files de traitement:** Celery + Redis
- **Authentification:** JWT
- **API:** RESTful avec 50+ endpoints documentés

### Frontend (React)
- **Framework:** React 18+ avec TypeScript
- **Styling:** Tailwind CSS + Lucide Icons
- **State Management:** Context API + custom hooks
- **Routing:** React Router v6

### Infrastructure
- **Containerisation:** Docker + Docker Compose
- **Reverse Proxy:** Nginx
- **Email SMTP:** OVH (ssl0.ovh.net:465)
- **Sauvegarde:** Automated daily (3h AM)

---

## 📦 Fonctionnalités Principales

### 1️⃣ Gestion Hiérarchique
- **Pôles** (ex: Dakar, Kaolack, Tambacounda)
- **Filiales** (ex: Santé, Education, Transport)
- **Services** (ex: Gestion Administrative, Support utilisateur)
- Permissions basées sur rôles et hiérarchie

### 2️⃣ Types de Documents & Classifications
- Types de documents customisables
- Validations et contrôles de conformité
- Templates réutilisables
- Historique de versioning

### 3️⃣ Routage Automatique
- Règles de routage basées sur critères
- Workflow automatique vers destinations
- Traçabilité complète des mouvements
- Intégrations externes (Slack, Teams, Zapier)

### 4️⃣ Gestion des Utilisateurs
- 5 rôles: Agent, Admin, Pôle Manager, Filiale Manager, Service Manager
- Import/export d'utilisateurs (CSV)
- Gestion des permissions granulaires
- Logs d'audit complets

### 5️⃣ Stockage & Quotas
- **Par utilisateur:** 5 GB
- **Par dossier:** 10 GB
- **Système total:** 100 GB
- Alertes à 80% de la limite

### 6️⃣ Calendrier & Événements
- Planning événementiel
- Notifications d'événements
- Visualisation hebdomadaire/mensuelle
- Événements publics et privés

### 7️⃣ Configuration Avancée (ADMIN only)
- ⚙️ Timezone: Africa/Dakar (configurable)
- 📅 Formats de dates: d/m/Y (français)
- ♻️ Rétention données: Logs 90j, Documents 5ans
- 📧 SMTP OVH pour notifications
- 📦 Sauvegardes automatiques quotidiennes
- 🔐 SSL/TLS avec certificats
- 🔍 Monitoring & alertes

---

## 👤 Rôles & Permissions

| Rôle | Dashboard | Documents | Admin | Settings | Config Avancée |
|------|-----------|-----------|-------|----------|----------------|
| **Agent** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **POLE_MANAGER** | ✅ | ✅ | ⚡ | ✅ | ✅ |
| **FILIALE_MANAGER** | ✅ | ✅ | ⚡ | ✅ | ✅ |
| **SERVICE_MANAGER** | ✅ | ✅ | ⚡ | ✅ | ✅ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ |

*(⚡ = Accès limité à sa hiérarchie)*

---

## 🗂️ Structure Répertoires

```
sgdra_broken/
├── backend/
│   ├── config/              # Paramètres Django
│   │   └── settings.py      # 700+ lignes (CONFIGURATION AVANCÉE incluse)
│   ├── apps/
│   │   ├── documents/       # Gestion des documents
│   │   ├── folders/         # Hiérarchie organisationnelle
│   │   ├── users/           # Authentification & utilisateurs
│   │   ├── scheduling/      # Calendrier & événements
│   │   ├── routing/         # Routage automatique
│   │   └── common/          # Audit & utilities
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── pages/           # Routes principales
│   │   │   ├── admin/       # Pages admin (Settings inclus)
│   │   │   ├── agent/       # Pages agent
│   │   │   └── common/      # Paramètres utilisateur
│   │   ├── components/      # Composants React réutilisables
│   │   └── contexts/        # État global (Auth, Notifications)
│   └── package.json
├── docker-compose.yml       # Configuration Docker
├── nginx.conf.prod          # Configuration reverse proxy
└── README_FINAL.md          # Ce fichier
```

---

## 🚀 Page Configuration Avancée (Nouvelle)

Accessible via menu admin: **Configuration Avancée** ⚙️

### Paramètres Affichables:
1. **🌍 Fuseaux Horaires** - Timezone système
2. **📅 Formats de Date** - d/m/Y, H:i:s (français)
3. **💾 Limites Stockage** - User/Folder/Total quotas
4. **♻️ Rétention Données** - 90j logs, 5ans documents
5. **📧 Email SMTP** - OVH ssl0.ovh.net:465
6. **🔗 Intégrations** - Slack, Teams, Zapier APIs
7. **🔐 SSL/TLS** - Certificats et sécurité
8. **📦 Backups** - Schedule 3h AM, 30j rétention

Tous les paramètres sont dans `/backend/config/settings.py` lignes 486-700+

---

## 🎨 Interface Utilisateur

### Pages Principales:
- ✅ **Dashboard** - Vue d'ensemble documentaire
- ✅ **Documents** - Gestion complète des documents
- ✅ **Schedule** - Calendrier événementiel
- ✅ **Reports** - Statistiques & analytiques
- ✅ **Templates** - Modèles de documents
- ✅ **Settings** - Paramètres utilisateur (compacte & épurée)
- ✅ **Configuration Avancée** - Système (admin only)
- ✅ **Guide SGDRA** - Documentation complète dans l'app

### Pages Admin:
- 👥 **Users** - Gestion utilisateurs + import/export
- 📁 **Folders** - Hiérarchie Pôles→Filiales→Services
- 📋 **Types de Documents** - Classification documentaire
- ⚙️ **File Type Config** - Validations & formats
- 🔀 **Routing Rules** - Règles d'automatisation
- 📋 **Templates** - Modèles de documents
- 🔒 **Audit Logs** - Traçabilité complète
- ⚙️ **Configuration Avancée** - Paramètres système (NOUVEAU)

---

## 📊 Améliorations Récentes (Session Finale)

### Frontend
✅ **Schedule.tsx** - Calendrier amélioré
- Grilles visibles (#cbd5e1, 1.5px)
- Typographie améliorée (font sizes, contrast)
- Suppression bouton "Nouvel événement"
- Style "Gestion événements" en blanc

✅ **Settings.tsx** - Page paramètres utilisateur refactorisée
- Design consolidé en 1 card unique
- Grille 2x2 pour 4 paramètres
- Descriptions courtes et claires
- Infos groupées en bas

✅ **AdvancedSettings.tsx** - NOUVELLE Page Configuration Avancée
- 8 catégories de paramètres
- Sidebar avec tabs de catégories
- Grille responsive
- Accessible aux 4 rôles managers + admin

✅ **TemplatesGuide.tsx** - Documentation alignée
- 7 étapes admin détaillées avec menu réel
- ÉTAPE 7: Configuration Avancée 6 subsections
- Checklist administrative complète

### Backend
✅ **settings.py** - Configuration Avancée implémentée
- 220+ lignes ajoutées (lignes 486-700+)
- 10 catégories de paramètres
- Timezone, Formats, Stockage, Rétention, Email, Intégrations, SSL, Backups, Monitoring

✅ **Migrations & Models** - Hiérarchie corrigée
- Schema Pôles→Filiales→Services validé
- Permissions basées hiérarchie
- Quotas par niveau

---

## 🔧 Configuration Système

### Timezone
```python
TIME_ZONE = 'Africa/Dakar'  # Configurable via env var
USE_TZ = True
```

### Format Date (Français)
```python
DATE_FORMAT = 'd/m/Y'
TIME_FORMAT = 'H:i:s'
DATETIME_FORMAT = 'd/m/Y H:i:s'
DECIMAL_SEPARATOR = ','
THOUSAND_SEPARATOR = ' '
```

### Limites Stockage
```python
MAX_UPLOAD_SIZE = 104857600  # 100MB par fichier
MAX_STORAGE_PER_USER_GB = 5
MAX_STORAGE_PER_FOLDER_GB = 10
MAX_STORAGE_TOTAL_GB = 100
```

### Rétention Données
```python
DATA_RETENTION_POLICY = {
    'audit_logs': 90,           # 90 jours
    'error_logs': 30,           # 30 jours
    'documents': 1825,          # 5 ans
    'deleted_documents': 90,    # 90 jours avant suppression permanente
    'sessions': 14,             # 14 jours
}
```

### Email (SMTP OVH)
```python
EMAIL_HOST = 'ssl0.ovh.net'
EMAIL_PORT = 465
EMAIL_USE_SSL = True
EMAIL_HOST_USER = [from env]
EMAIL_HOST_PASSWORD = [from env]
SEND_EMAILS_ASYNC = True  # Via Celery
EMAIL_BATCH_SIZE = 100
```

### Sauvegardes
```python
BACKUP_ENABLED = True
BACKUP_SCHEDULE = '0 3 * * *'  # 3h AM chaque jour
BACKUP_RETENTION_DAYS = 30     # Garde 30 jours
BACKUP_COMPRESS = True
BACKUP_PATH = '/backups/sgdra'
```

---

## 📋 Guide Utilisateur Rapide

### Pour un Agent:
1. Connexion avec identifiants
2. Accueil → Dashboard
3. Charger documents dans "Documents"
4. Consulter "Notifications" pour routage
5. Gérer "Planning" pour événements
6. "Paramètres" pour perso utilisateur

### Pour un Administrateur:
1. Accès menu "Administration" complet
2. **Users** - Importer/gérer utilisateurs
3. **Folders** - Créer hiérarchie Pôle→Filiale→Service
4. **Types de Documents** - Classifier documents
5. **Routing Rules** - Automatiser workflows
6. **Audit Logs** - Vérifier traces
7. **Configuration Avancée** - Gérer paramètres système

### Pour un Manager (Pôle/Filiale/Service):
1. Accès limité aux utilisateurs de sa branche
2. Gestion documents limités à sa hiérarchie
3. Visualisation Audit Logs de sa branche
4. Accès Configuration Avancée (lecture)
5. Reporting sur ses données

---

## 🔐 Sécurité

✅ **JWT Authentication** - Tokens sécurisés
✅ **HTTPS/SSL** - Certificats obligatoires
✅ **CSRF Protection** - Tokens CSRF sur forms
✅ **SQL Injection** - Paramètres bindés (ORM Django)
✅ **Rate Limiting** - Par endpoint
✅ **Audit Trail** - Logs complets de toutes actions
✅ **Password Hashing** - PBKDF2 + salt
✅ **File Upload Validation** - Types & tailles

---

## 📈 Monitoring & Alertes

### Seuils configurés:
- 🟡 **Stockage:** Alerte à 80%
- 🟡 **CPU:** Alerte à 80%
- 🟡 **Mémoire:** Alerte à 85%
- 🐢 **Requêtes lentes:** Log si > 500ms

### Logs disponibles:
- Sentry - Erreurs applicatives
- Django logs - Requêtes, errors, warnings
- Audit logs - Actions utilisateurs
- System logs - Infrastructure

---

## 📞 Support & Documentation

- **Guide Complet SGDRA** - Dans l'app, menu "Guide Complet SGDRA"
- **Templates d'utilisation** - Dans "Modèles"
- **Logs d'audit** - Admin → "Audit Logs"
- **FAQ système** - Voir TemplatesGuide.tsx

---

## ✅ Checklist Déploiement Final

- ✅ Frontend compilé et déployé
- ✅ Backend configuré et testé
- ✅ Database migrée et seed
- ✅ Utilisateurs initiaux créés
- ✅ SSL/TLS configuré
- ✅ Email SMTP testé
- ✅ Backups configurés
- ✅ Monitoring actif
- ✅ Audit logs fonctionnels
- ✅ Configuration Avancée visible et fonctionnelle

---

**Dernière mise à jour:** 27 Février 2026
**Statut:** ✅ Production Ready
**Version:** 1.0.0 Final
