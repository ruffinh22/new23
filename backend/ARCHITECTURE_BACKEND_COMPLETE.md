# 🏗️ SGDRA - Architecture Complète du Backend

**Date**: 23 février 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture générale](#architecture-générale)
3. [Stack technologique](#stack-technologique)
4. [Structure de la base de données](#structure-de-la-base-de-données)
5. [Modules principaux](#modules-principaux)
6. [Workflow complet d'un document](#workflow-complet-dun-document)
7. [API REST](#api-rest)
8. [Authentification et permissions](#authentification-et-permissions)
9. [Tâches asynchrones (Celery)](#tâches-asynchrones-celery)
10. [Notifications en temps réel](#notifications-en-temps-réel)
11. [Configuration](#configuration)
12. [Déploiement](#déploiement)

---

## 🎯 Vue d'ensemble

**SGDRA** (Système de Gestion Documentaire avec Routage Automatique) est une plateforme complète de gestion documentaire conçue pour:

✅ **Gestion centralisée** des documents Excel/PDF  
✅ **Validation automatique** basée sur des spécifications  
✅ **Routage intelligent** vers les bons départements/utilisateurs  
✅ **Workflow d'approbation** (Agent → Validateur → Approbateur)  
✅ **Notifications en temps réel** via WebSocket  
✅ **API REST complète** avec documentation Swagger  
✅ **Monitoring et logging** avancés  

---

## 🏛️ Architecture générale

```
┌─────────────────────────────────────────────────────────┐
│                 FRONTEND (React/Vue)                    │
│         Interface Web + Dashboard Dashboard             │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/WebSocket
                 ▼
┌─────────────────────────────────────────────────────────┐
│           API GATEWAY & DJANGO REST                     │
│    - Authentication (JWT)                               │
│    - API Endpoints                                      │
│    - Validation de requête                              │
└────────┬──────────────────────────────────┬─────────────┘
         │                                  │
    HTTP │                            WebSocket
         ▼                                  ▼
    ┌─────────┐                   ┌──────────────┐
    │ Django  │                   │  Django      │
    │ REST    │                   │ Channels +   │
    │ Framework                   │ Websocket    │
    └────┬────┘                   └──────┬───────┘
         │                               │
         └───────────┬───────────────────┘
                     ▼
        ┌────────────────────────────┐
        │   MODULES MÉTIER           │
        │                            │
        │ • Users (Authentification) │
        │ • Documents (Validation)   │
        │ • Folders (Hiérarchie)     │
        │ • Routing (Routage)        │
        │ • Notifications           │
        └────────┬───────────────────┘
                 │
         ┌───────┴───────┬─────────────┐
         ▼               ▼             ▼
    ┌─────────┐    ┌──────────┐  ┌──────────┐
    │ Database│    │  Cache   │  │  Queue   │
    │ MySQL   │    │  Redis   │  │  Celery  │
    └─────────┘    └──────────┘  └──────────┘
```

---

## 🛠️ Stack technologique

| Composant | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Backend Framework** | Django | 5.0 | Framework web Python |
| **API REST** | Django REST Framework | 3.14+ | API REST avec ViewSets |
| **Authentification** | JWT (simplejwt) | 5.3+ | Tokens JWT avec refresh |
| **Base de données** | MySQL | 8.0+ | Données relationnelles |
| **Cache/Queue** | Redis | 6.0+ | Cache et queue de tâches |
| **Tâches async** | Celery | 5.3+ | Traitement asynchrone |
| **Planificateur** | Django Celery Beat | 2.5+ | Tâches planifiées |
| **WebSocket** | Django Channels | 4.0+ | Notifications temps réel |
| **API Doc** | drf-spectacular | 0.27+ | Swagger/OpenAPI |
| **Monitoring** | Sentry SDK | 1.40+ | Error tracking |
| **Tests** | Pytest/Django Test | - | Suites de tests |

---

## 🗄️ Structure de la base de données

### Hiérarchie organisationnelle

La base de données utilise une **structure hiérarchique flexible** pour représenter l'organisation:

```
Pôles (Level 0)
├── Filiales (Level 1) [Pays]
│   └── Services (Level 2) [Département]
│       └── Sous-services (Level 3+) [Sections]
```

**Exemple réel:**
```
Pôle Administration
├── Filiale Bénin
│   ├── Service RH
│   │   └── Sous-service Paies
│   └── Service IT
└── Filiale Congo
    ├── Service RH
    └── Service Finance
```

### Modèles principaux

#### 1. **Folder** (Dossiers)
```python
Folder
├── name: CharField(255)           # Nom du dossier
├── parent: ForeignKey(Folder)     # Référence père (hiérarchie)
├── folder_type: CharField         # 'pole'|'filiale'|'service'|'sub_service'
├── code: CharField(20, unique)    # Code unique (BEN, POL_ADM, etc.)
├── country_code: CharField(2)     # Code ISO-2
├── description: TextField
├── created_by: ForeignKey(User)
├── created_at/updated_at: DateTime
└── is_active: Boolean
```

**Méthodes principales:**
- `get_full_path()` - Chemin complet: "Pôle Admin / Bénin / RH"
- `get_level()` - Niveau de profondeur
- `get_ancestors()` - Tous les parents
- `auto_type` - Type autoDéterminé par niveau

#### 2. **User** (Utilisateurs)
```python
User (AbstractBaseUser)
├── matricule: CharField(20, unique)    # Identifiant unique
├── email: EmailField(unique)
├── first_name, last_name: CharField
├── branch: ForeignKey(Branch)          # Filiale
├── department: ForeignKey(Department)  # Département
│
├── role: CharField                     # AGENT|ADMIN|POLE_MANAGER|etc
├── is_active, is_staff, is_superuser: Boolean
│
├── permissions_by_role: Dict           # Permissions dynamiques
├── can_approve_documents: Boolean
├── can_validate_documents: Boolean
├── can_route_documents: Boolean
├── is_pole_manager: Boolean
├── is_filiale_manager: Boolean
├── is_service_manager: Boolean
│
├── created_at, updated_at: DateTime
└── last_login: DateTime
```

**Rôles disponibles:**
- `AGENT` - Upload documents
- `VALIDATEUR` - Valide les documents
- `APPROBATEUR` - Approuve/Rejette
- `ADMIN` - Administre le système
- `POLE_MANAGER` - Gère un pôle
- `FILIALE_MANAGER` - Gère une filiale
- `SERVICE_MANAGER` - Gère un service

#### 3. **Document** (Modèle principal)
```python
Document
├── title: CharField(255)
├── description: TextField
├── file: FileField()                    # Document physique
├── document_type: CharField             # IMPORTANT, BUDGET, RAPPORT, etc.
│
├── agent: ForeignKey(User)              # Qui a uploadé
├── folder: ForeignKey(Folder)           # Où est classé (Année/Mois)
├── specification: ForeignKey(DocumentSpecification)
│
├── # Workflow d'approbation
├── created_at, updated_at: DateTime
├── submitted_at: DateTime               # Quand a été soumis
├── validated_at: DateTime               # Quand a été validé
├── approved_at: DateTime                # Quand a été approuvé
│
├── # Status du document
├── status: CharField                    # DRAFT|PENDING|VALIDATED|APPROVED|REJECTED
├── validation_status: CharField         # PENDING|PASSED|FAILED|WARNING
├── approval_status: CharField           # PENDING|APPROVED|REJECTED
│
├── # Routage
├── routing_rule_applied: ForeignKey(RoutingRule)
├── assigned_to: ForeignKey(User)        # À qui est assigné
├── assignment_reason: CharField         # Raison de l'assignment
│
├── # Métadonnées
├── file_size_kb: Integer
├── file_format: CharField               # pdf, xlsx, docx, etc.
├── excel_metadata: JSONField()          # Metadata Excel
│
└── rejection_reason: TextField          # Si rejeté
```

#### 4. **DocumentSpecification** (Règles de validation)
```python
DocumentSpecification
├── document_type: CharField(30, unique) # BUDGET, CONGE, etc.
├── display_name: CharField(100)
├── description: TextField
│
├── # Formats autorisés
├── allowed_formats: CharField           # "pdf,xlsx,xlsm,csv"
├── max_file_size_mb: Integer
│
├── # Validation Excel spécifique
├── requires_excel: Boolean
├── excel_sheet_name: CharField          # Nom feuille requise
├── required_columns: JSONField()        # ['Col1', 'Col2', 'Col3']
├── max_rows: Integer
│
├── is_active, requires_validation: Boolean
└── created_at, updated_at: DateTime
```

#### 5. **RoutingRule** (Règles de routage)
```python
RoutingRule
├── name: CharField(255)
├── description: TextField
│
├── # Conditions de déclenchement
├── document_type: CharField             # Type doc à router
├── department: ForeignKey(Department)
├── folder: ForeignKey(Folder)
│
├── # Destination
├── target_folder: ForeignKey(Folder)    # Où classer
├── target_user: ForeignKey(User)        # À qui assigner (optionnel)
├── target_department: ForeignKey(Department)
│
├── # Configuration
├── priority: Integer                    # Ordre d'exécution
├── is_active: Boolean
├── auto_apply: Boolean                  # S'applique automatiquement?
│
├── # Actions post-routage
├── notify_target_user: Boolean
├── require_signature: Boolean
├── require_approval: Boolean
│
├── # Metadata
├── execution_count: Integer
├── last_executed_at: DateTime
└── created_at, updated_at: DateTime
```

#### 6. **Notification** (Notifications)
```python
Notification
├── recipient: ForeignKey(User)
├── notification_type: CharField         # DOCUMENT_UPLOADED, APPROVED, etc.
├── priority: CharField                  # LOW|NORMAL|HIGH|URGENT
├── title, message: CharField/TextField
│
├── document: ForeignKey(Document, nullable)
├── metadata: JSONField()                # {"actor": "Admin1", "reason": "..."}
│
├── # Status
├── is_read: Boolean
├── read_at: DateTime
│
├── # Canaux
├── sent_via_email: Boolean
├── sent_via_websocket: Boolean
├── sent_via_in_app: Boolean
│
└── created_at: DateTime
```

#### 7. **NotificationPreference** (Préférences utilisateur)
```python
NotificationPreference
├── user: OneToOneField(User)
├── channel: CharField                   # IN_APP|EMAIL|BOTH|NONE
├── frequency: CharField                 # IMMEDIATE|DIGEST_DAILY|NEVER
├── quiet_hours_enabled: Boolean         # Pas de notif de 22h à 8h
├── quiet_start, quiet_end: TimeField
└── created_at, updated_at: DateTime
```

---

## 📦 Modules principaux

### 1. **Module Users** (`apps/users/`)

**Responsabilités:**
- Gestion des utilisateurs
- Authentification JWT
- Assignation des branches/départements
- Gestion des rôles et permissions

**Fichiers clés:**
- `models.py` - Modèles User, Branch, Department
- `serializers.py` - Sérialisation des données
- `views.py` - ViewSet pour l'API
- `permissions.py` - Vérification des permissions
- `signals.py` - Signaux (création de profil, etc.)

**API Endpoints:**
```
GET    /api/users/                      # Lister les utilisateurs
GET    /api/users/{id}/                 # Détail utilisateur
POST   /api/users/                      # Créer utilisateur
PATCH  /api/users/{id}/                 # Modifier utilisateur
DELETE /api/users/{id}/                 # Supprimer utilisateur

GET    /api/users/me/                   # Mon profil
PUT    /api/users/me/change-password/   # Changer mot de passe

GET    /api/branches/                   # Lister les filiales
GET    /api/departments/                # Lister les départements
```

**Authentification JWT:**
```python
Flux:
1. Login: POST /auth/login/ + (matricule, password)
2. Backend retourne: {access_token, refresh_token}
3. Requests: Header Authorization: Bearer {access_token}
4. Si token expiré: POST /auth/refresh/ + {refresh_token}
```

---

### 2. **Module Folders** (`apps/folders/`)

**Responsabilités:**
- Gestion de l'hiérarchie organisationnelle
- Structure Pôle → Filiale → Service → Sous-service
- Classement documentaire

**Modèles:**
- `Folder` - Dossier hiérarchique unique et flexible

**API Endpoints:**
```
GET    /api/folders/poles/                    # Tous les pôles
GET    /api/folders/poles/{id}/               # Un pôle
GET    /api/folders/poles/{id}/filiales/      # Filiales du pôle

GET    /api/folders/filiales/                 # Toutes les filiales
GET    /api/folders/filiales/{id}/            # Une filiale
GET    /api/folders/filiales/{id}/services/   # Services de la filiale
GET    /api/folders/filiales/by_pole/         # Groupé par pôle
GET    /api/folders/filiales/by_country/      # Groupé par pays

GET    /api/folders/services/                 # Tous les services
GET    /api/folders/services/{id}/            # Un service
GET    /api/folders/services/by_filiale/      # Groupé par filiale
```

**Exemple de réponse:**
```json
{
  "id": 180,
  "name": "Bénin",
  "code": "BEN",
  "country_code": "BJ",
  "folder_type": "filiale",
  "parent": 179,
  "full_path": "Pôle Administration / Bénin",
  "level": 1,
  "children_count": 1,
  "is_active": true
}
```

---

### 3. **Module Documents** (`apps/documents/`)

**Responsabilités:**
- Upload et gestion des documents
- Validation des fichiers
- Workflow de validation/approbation
- Historique des documents

**Fichiers clés:**
- `models.py` - Document, DocumentSpecification, ValidationResult
- `views.py` - ViewSet complet
- `serializers.py` - Sérialisation
- `validators.py` - Logique de validation
- `file_upload_validator.py` - Validation des fichiers
- `services.py` - Services métier
- `tasks.py` - Tâches Celery

**Modèles:**
- `Document` - Document principal
- `DocumentSpecification` - Règles de validation
- `DocumentValidationResult` - Résultat de validation
- `FileTypeConfiguration` - Configuration par type de fichier

**Validation:**
```python
# 1. Validation du fichier
✓ Extension autorisée (pdf, xlsx, xls, docx, etc.)
✓ Taille < max_file_size_mb
✓ Format valide (non corrompu)

# 2. Validation du contenu (Excel)
✓ Feuille requise existe
✓ Colonnes requises existent
✓ Nombre de lignes < max_rows
✓ Types de données corrects
✓ Pas de cellules vides obligatoires

# 3. Logique métier
✓ Type de document autorisé
✓ Utilisateur est agent autorisé
✓ Document pas en doublon
```

**API Endpoints:**
```
POST   /api/documents/                      # Créer/uploader document
GET    /api/documents/                      # Lister mes documents
GET    /api/documents/{id}/                 # Détail document
PATCH  /api/documents/{id}/                 # Modifier document

GET    /api/documents/{id}/download/        # Télécharger fichier
POST   /api/documents/{id}/submit/          # Soumettre pour validation
POST   /api/documents/{id}/validate/        # Valider (si VALIDATEUR)
POST   /api/documents/{id}/approve/         # Approuver (si APPROBATEUR)
POST   /api/documents/{id}/reject/          # Rejeter + raison

GET    /api/documents/specifications/       # Types de documents
GET    /api/documents/specifications/{id}/  # Spécification document
```

**Cycle de vie du document:**
```
1. DRAFT (Brouillon)
   └─ Agent crée doc localement

2. PENDING (En attente de validation)
   └─ Agent soumet doc
   └─ Validation auto-lancée

3. VALIDATED (Validé)
   └─ Si validation OK ✓
   └─ Document classé automatiquement
   └─ Routage appliqué

4. APPROVED/REJECTED
   └─ Approbateur approve ou rejette
   └─ Notification envoyée à agent

5. ARCHIVED
   └─ Document archivé après période
```

---

### 4. **Module Folders (Suite)** - Classement automatique

**Classement intelligent par date:**
```
Structure créée automatiquement:
Dossier Destination
└── 2026 (Année)
    └── Février (Mois)
        └── Documents du mois
```

**Service DocumentService:**
```python
# Organise doc dans Année/Mois
month_folder = DocumentService.organize_document_folder(
    folder=department_folder,
    created_at=timezone.now()
)

# Document créé dans: 
# Department → 2026 → Février → Document.pdf
```

---

### 5. **Module Routing** (`apps/routing_rules/`)

**Responsabilités:**
- Définir les règles d'automatisation
- Router automatiquement les documents
- Assigner à bon utilisateur/département

**Modèles:**
- `RoutingRule` - Règle de routage
- `DepartmentDocumentType` - Mapping type doc/département

**Règles de routage:**
```python
# Conditions
IF (document_type == 'BUDGET') 
   AND (department == 'Finance')
   
# Actions
THEN:
  - Route vers département Finance
  - Classé dans Dossier Finance/Budgets
  - Assigné à chef Finance
  - Notification envoyée
  - Signature requise? OUI
```

**API Endpoints:**
```
GET    /api/routing-rules/                  # Lister règles
POST   /api/routing-rules/                  # Créer règle
GET    /api/routing-rules/{id}/             # Détail règle
PATCH  /api/routing-rules/{id}/             # Modifier règle
DELETE /api/routing-rules/{id}/             # Supprimer règle

GET    /api/routing-rules/{id}/execute/     # Exécuter manuellement
GET    /api/routing-rules/audit/            # Historique routages
```

---

### 6. **Module Notifications** (`apps/notifications/`)

**Responsabilités:**
- Créer et gérer notifications
- Envoyer via email/WebSocket
- Gérer préférences utilisateur

**Modèles:**
- `Notification` - Notification simple
- `NotificationPreference` - Préférences utilisateur

**Types de notifications:**
```
- DOCUMENT_UPLOADED: Doc uploadé
- DOCUMENT_VALIDATED: Doc validé
- DOCUMENT_APPROVED: Doc approuvé
- DOCUMENT_REJECTED: Doc rejeté (+ raison)
- ROUTING: Doc routé
- MENTION: Utilisateur mentionné
- SYSTEM: Alerte système
```

**Canaux:**
- **In-App**: Via WebSocket (temps réel)
- **Email**: Via Celery async
- **Push**: Optional (future)

**Préférences:**
```
- Channel: IN_APP | EMAIL | BOTH | NONE
- Frequency: IMMEDIATE | DIGEST_DAILY | NEVER
- Quiet hours: Ne pas notifier 22h-8h
```

**API Endpoints:**
```
GET    /api/notifications/                 # Mes notifications
GET    /api/notifications/unread/          # Non lues uniquement
PATCH  /api/notifications/{id}/read/       # Marquer comme lu
DELETE /api/notifications/{id}/            # Supprimer

PATCH  /api/notification-preferences/     # Mettre à jour prefs
GET    /api/notification-preferences/     # Mes prefs
```

---

## 📊 Workflow complet d'un document

### 1. Upload et création

```
┌─────────────────────────────────┐
│ AGENT                            │
│ 1. Clique "Uploader document"   │
│ 2. Choisit fichier (PDF/Excel)  │
│ 3. Renseigne informations       │
│ 4. Clique "Soumettre"           │
└──────────────┬──────────────────┘
               │
               ▼
      ┌────────────────────────────┐
      │ API POST /api/documents/   │
      │ avec JWT token             │
      │ multipart/form-data        │
      └────────────┬───────────────┘
                   │
     ┌─────────────┴──────────────┐
     ▼                            ▼
┌──────────────────┐      ┌──────────────────┐
│ VALIDATION       │      │ SIGNAL           │
│ - Extension?     │      │ django.db.signal │
│ - Taille?        │      │ post_save        │
│ - Format?        │      │ crée profil      │
│ - Colonnes?      │      │ d'un nouvel user │
└────────┬─────────┘      └──────────────────┘
         │
    ✓ OK │                    X ERREUR
         │                    │
    ┌─────────────────────────────┴──────────────┐
    │  SIGNAL post_save(Document)                │
    │  - Crée structure Année/Mois si besoin     │
    │  - Organise document dans Année/Mois       │
    │  - Applique routage automatique            │
    │  - Lance validation async (Celery)         │
    └─────┬──────────────────────────────────────┘
          │
          ▼
    ┌──────────────────────────────────────┐
    │ CELERY TASK (validate_document)      │
    │ - Lance validation complète          │
    │ - Teste Excel si nécessaire          │
    │ - Crée DocumentValidationResult      │
    │ - Envoie email de confirmation       │
    │ - Notifie validateur si requis       │
    └──────────┬───────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
 ✓ PASSED             ✗ FAILED
 Status:Validated     Rejection reason
 Notif: Validateur   Email à agent
        approuve?
```

### 2. Validation et approbation

```
┌─────────────────────────────────┐
│ VALIDATEUR (si requis)           │
│ Reçoit notification              │
│ Ouvre dashboard SGDRA            │
│ Vérifie document                 │
│ Accepte ou rejette               │
└──────────────┬──────────────────┘
               │ PATCH /api/documents/{id}/validate/
               ▼
    ┌──────────────────────────┐
    │ Document.validation_status │
    │ = PASSED/FAILED          │
    └──────────────┬───────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
    ▼                             ▼
 PASSED                         FAILED
 Status: VALIDATED          Status: REJECTED
 Signal:                     Signal:
 - Applique routage          - Email à agent
 - Assigne doc              - Raison rejet
 - Notif APPROBATEUR        - Permet re-upload
                             │
┌────────────────────────────┘
│
├─ Optionnel: APPROBATEUR requis?
│  YES: Approbateur doit approuver
│       POST /api/documents/{id}/approve/
│       → Document.approval_status = APPROVED
│
└─ NO: Skip approbation
     Document classé définitivement
     Archivé
```

### 3. Routage automatique

```
┌─────────────────────────────┐
│ Signal: post_save Document  │
│ (validation OK)             │
└──────────────┬──────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Chercher RoutingRules    │
    │ WHERE:                   │
    │ - document_type matche   │
    │ - is_active = TRUE       │
    │ - auto_apply = TRUE      │
    └──────────────┬───────────┘
                   │
    ┌──────────────┴──────────────┬──────────────┐
    │                             │              │
    ▼                             ▼              ▼
 RÈGLE 1 TROUVÉE          RÈGLE 2 TROUVÉE    PAS DE RÈGLE
 Budget → Finance         RH → HR Dept       Document
 │                        │                  classé dans:
 ├─ target_folder →      ├─ target_folder →  Dossier par
 │  Finance/Budgets      │  RH/Congés        défaut
 │                       │                   │
 ├─ target_user →        ├─ target_user →    └─ Status: DRAFT
 │  Chef Finance         │  Manager RH       Attent upload
 │                       │                   
 ├─ Notif: OUI           └─ Notif: OUI      
 │ Email à Chef Finance        Email Manager
 │
 └─ Document.assigned_to = Chef Finance
    Document.status = ASSIGNED
    Document.assignment_reason = "Budget"
```

### 4. Cycle complet

```
Timeline exemple: Fiche de paie (EXCEL)

t=0s    AGENT upload feuille de paies
        Status: DRAFT → PENDING

t=1s    Signal détecte upload
        Crée: 2026/Février/paies.xlsx
        Signal lance Celery task

t=5s    Celery: Validation Excel
        ✓ Feuille "Paies" trouvée
        ✓ Colonnes: ID, Nom, Salaire, OK ✓
        ✓ 100 lignes < 10000 max ✓
        Status: PENDING → VALIDATED

t=10s   Signal: Validation OK
        RoutingRule match: 
        "Tous RH docs → Service RH → Manager RH"
        └─ Assigné à Manager RH
        └─ Classé: RH/Paies/2026/Février/
        └─ Email Manager RH
        Status: VALIDATED → ASSIGNED

t=12s   APPROBATEUR (Manager RH) reçoit email
        Ouvre SGDRA

t=30s   APPROBATEUR click "Approuver"
        POST /api/documents/{id}/approve/
        Status: ASSIGNED → APPROVED

t=35s   Signal: Document approuvé
        Notif AGENT: "Votre fiche paie approuvée!"
        Document archivé
        Status: APPROVED → ARCHIVED

t=45s   Tâche Celery: Email confirmation
        À AGENT: "Document approuvé, classé dossier RH"
```

---

## 🌐 API REST

### Structure générale

**Base URL:** `http://localhost:8000/api/`

**Authentification:** Tokens JWT
```
Header: Authorization: Bearer {access_token}
```

**Format de réponse:**
```json
{
  "count": 42,
  "next": "http://localhost:8000/api/documents/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Budget 2026",
      "status": "APPROVED",
      ...
    }
  ]
}
```

### Endpoints principaux

#### Authentification

```bash
# 1. Login
POST /auth/login/
Body: {
  "matricule": "MAT001",
  "password": "secure_password"
}
Response: {
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "matricule": "MAT001",
    "email": "user@example.com",
    "role": "AGENT"
  }
}

# 2. Refresh token
POST /auth/refresh/
Body: {
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
Response: {
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

# 3. Mon profil
GET /users/me/
Response: {User complet}

# 4. Changer mot de passe
PUT /users/me/change-password/
Body: {
  "old_password": "old",
  "new_password": "new",
  "new_password_confirm": "new"
}
```

#### Documents - Cycle complet

```bash
# 1. Créer et uploader
POST /documents/
Content-Type: multipart/form-data
Body: {
  "title": "Fiche de paie",
  "description": "Février 2026",
  "file": <binary_file>,
  "document_type": "PAIE",
  "folder": 5  # ID du dossier destination (optionnel)
}
Response: {
  "id": 42,
  "title": "Fiche de paie",
  "status": "PENDING",
  "validation_status": "PENDING",
  "approval_status": "PENDING",
  "file": "/api/documents/42/download/",
  ...
}

# 2. Lister mes documents
GET /documents/
GET /documents/?status=APPROVED
GET /documents/?document_type=PAIE
Response: Paginated list

# 3. Détail document
GET /documents/42/
Response: {Document complet avec historique}

# 4. Télécharger fichier
GET /documents/42/download/
Response: <binary_file>

# 5. Soumettre pour approbation
POST /documents/42/submit/
Body: {}  # vide
Response: {
  "id": 42,
  "status": "PENDING",
  "message": "Document soumis pour validation"
}

# 6. Valider (si VALIDATEUR)
POST /documents/42/validate/
Body: {
  "notes": "Validation OK"
}
Response: {
  "validation_status": "PASSED",
  "validation_result": {...}
}

# 7. Approuver (si APPROBATEUR)
POST /documents/42/approve/
Body: {
  "notes": "Approuvé"
}
Response: {
  "approval_status": "APPROVED",
  "status": "APPROVED"
}

# 8. Rejeter
POST /documents/42/reject/
Body: {
  "rejection_reason": "Données incohérentes",
  "rejection_details": "..."
}
Response: {
  "approval_status": "REJECTED",
  "rejection_reason": "..."
}
```

#### Spécifications de documents

```bash
# Lister types de doc
GET /documents/specifications/
Response: [{
  "id": 1,
  "document_type": "PAIE",
  "display_name": "Fiche de paie",
  "allowed_formats": "xlsx,xlsm,csv",
  "requires_excel": true,
  "excel_sheet_name": "Paies",
  "required_columns": ["ID", "Nom", "Salaire"],
  "max_file_size_mb": 50,
  "max_rows": 10000
}]

# Détail spec
GET /documents/specifications/1/
Response: {Id 1, tous les détails}

# Spécification par type
GET /documents/specifications/by_type/?type=PAIE
Response: {Spécification PAIE}
```

#### Hiérarchie organisationnelle

```bash
# Pôles
GET /folders/poles/
Response: [{
  "id": 179,
  "name": "Pôle Administration",
  "code": "POL_ADM",
  "folder_type": "pole",
  "level": 0,
  "filiales_count": 7
}]

# Filiales d'un pôle
GET /folders/poles/179/filiales/
Response: [{
  "id": 180,
  "name": "Bénin",
  "code": "BEN",
  "country_code": "BJ",
  "parent": 179,
  "services_count": 1
}]

# Services d'une filiale
GET /folders/filiales/180/services/
Response: [{
  "id": 181,
  "name": "RH",
  "parent": 180,
  "level": 2
}]

# Agroupé par pays
GET /folders/filiales/by_country/
Response: [{
  "country_code": "BJ",
  "filiales": [{...}]
}]
```

#### Notifications

```bash
# Mes notifications
GET /notifications/
Response: Paginated list

# Non lues
GET /notifications/unread/
Response: Notifications non lues

# Marquer comme lu
PATCH /notifications/42/read/
Response: {"is_read": true}

# Supprimer
DELETE /notifications/42/
Response: 204 No Content

# Préférences
GET /notification-preferences/
Response: {
  "channel": "BOTH",
  "frequency": "IMMEDIATE",
  "quiet_hours_enabled": true,
  "quiet_start": "22:00:00",
  "quiet_end": "08:00:00"
}

# Mettre à jour prefs
PATCH /notification-preferences/
Body: {
  "channel": "EMAIL",
  "frequency": "DIGEST_DAILY"
}
```

#### Routage

```bash
# Lister règles
GET /routing-rules/
Response: Rules list

# Créer règle
POST /routing-rules/
Body: {
  "name": "Budget vers Finance",
  "document_type": "BUDGET",
  "department": 5,
  "target_user": 10,
  "priority": 1,
  "auto_apply": true,
  "notify_target_user": true
}
Response: {Created rule}

# Exécuter manuellement
POST /routing-rules/1/execute/
Body: {"document_id": 42}
Response: {"status": "success", "routed_to": "..."}

# Audit/historique
GET /routing-rules/audit/
Response: List of executions
```

---

## 🔐 Authentification et permissions

### JWT Tokens

**Access Token:**
- Durée: 15 minutes
- Usage: Authentification des requests
- Rechargement: Automatique via refresh_token

**Refresh Token:**
- Durée: 30 jours
- Usage: Obtenir nouveau access_token
- Rotation: Automatique

### Système de permissions

**Rôles Django (standard):**
- `is_staff` - Accès admin Django
- `is_superuser` - Admin complet
- `is_active` - Compte actif

**Rôles métier (custom):**
```python
ROLE_CHOICES = [
    ('AGENT', 'Crée documents'),
    ('VALIDATEUR', 'Valide documents'),
    ('APPROBATEUR', 'Approuve documents'),
    ('ADMIN', 'Admin système'),
    ('POLE_MANAGER', 'Gère pôle'),
    ('FILIALE_MANAGER', 'Gère filiale'),
    ('SERVICE_MANAGER', 'Gère service'),
]
```

**Permissions par rôle:**

| Rôle | Documents | Validation | Approbation | Admin |
|------|-----------|-----------|------------|-------|
| AGENT | Upload | - | - | - |
| VALIDATEUR | View All | Validate | - | - |
| APPROBATEUR | View All | - | Approve | - |
| SERVICE_MANAGER | All | Validate | Approve | Department |
| FILIALE_MANAGER | All | Validate | Approve | Filiale |
| POLE_MANAGER | All | Validate | Approve | Pôle |
| ADMIN | All | All | All | ✓ Complet |

**Vérification dans les views:**
```python
class DocumentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        
        if user.role == 'ADMIN':
            return Document.objects.all()  # Tout
        elif user.role in ['VALIDATEUR', 'APPROBATEUR']:
            return Document.objects.filter(status__in=['PENDING', 'VALIDATED'])
        else:
            return Document.objects.filter(agent=user)  # Mes docs
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        doc = self.get_object()
        
        # Vérifier permission
        if not request.user.can_approve_documents:
            return Response(
                {'error': 'Vous n\'avez pas permission'},
                status=403
            )
        
        # Approuver
        doc.approval_status = 'APPROVED'
        doc.save()
        
        # Notifier
        notify_user(request.user, f"Document {doc.title} approuvé")
        
        return Response({'status': 'approved'})
```

---

## ⚙️ Tâches asynchrones (Celery)

### Architecture

```
┌──────────────┐
│ Django App   │
│ POST /docs   │
└──────┬───────┘
       │ Lancela tâche → Task ID
       ▼
┌──────────────────┐
│ Celery Broker    │
│ (Redis Queue)    │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ Celery Worker        │
│ (Process async)      │
│ - Valide document    │
│ - Envoie email       │
│ - Crée routing       │
└──────┬───────────────┘
       │ Résultat
       ▼
┌──────────────────────┐
│ Result Backend       │
│ (Redis Store)        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Django App           │
│ GET /tasks/{id}      │
│ Status: COMPLETED    │
└──────────────────────┘
```

### Tâches principales

#### 1. Validation de document

```python
@app.task(bind=True, max_retries=3)
def validate_document(self, document_id):
    """Valide un document en arrière-plan."""
    try:
        document = Document.objects.get(id=document_id)
        
        # 1. Valider le fichier
        validator = ValidationService()
        result = validator.validate_file(
            document.file,
            document.specification
        )
        
        # 2. Créer résultat
        DocumentValidationResult.objects.create(
            document=document,
            status='PASSED' if result.is_valid else 'FAILED',
            errors=result.errors,
            warnings=result.warnings
        )
        
        # 3. Mettre à jour statut
        document.validation_status = 'PASSED' if result.is_valid else 'FAILED'
        document.save()
        
        # 4. Si OK, activer routage
        if result.is_valid:
            apply_routing_rules.delay(document_id)
        
        # 5. Envoyer email
        send_validation_email.delay(document_id)
        
        return {'status': 'success', 'document_id': document_id}
        
    except Exception as exc:
        # Retry après 60 secondes
        raise self.retry(exc=exc, countdown=60)
```

#### 2. Envoi d'emails

```python
@app.task(max_retries=3)
def send_email_task(user_id, subject, template, context=None):
    """Envoie un email async."""
    try:
        user = User.objects.get(id=user_id)
        
        # Rendre le template
        from django.template.loader import render_to_string
        html_message = render_to_string(f'emails/{template}.html', context)
        
        # Envoyer email
        from django.core.mail import send_mail
        send_mail(
            subject=subject,
            message="See HTML",
            from_email='noreply@sgdra.com',
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        return {'status': 'sent', 'to': user.email}
        
    except Exception as exc:
        raise send_email_task.retry(exc=exc, countdown=60)
```

#### 3. Routage automatique

```python
@app.task
def apply_routing_rules(document_id):
    """Applique les règles de routage au document."""
    document = Document.objects.get(id=document_id)
    
    # Chercher règles applicables
    rules = RoutingRule.objects.filter(
        document_type=document.document_type,
        auto_apply=True,
        is_active=True
    ).order_by('priority')
    
    for rule in rules:
        # Appliquer règle
        document.routing_rule_applied = rule
        document.assigned_to = rule.target_user
        document.status = 'ASSIGNED'
        document.save()
        
        # Notifier utilisateur
        if rule.notify_target_user:
            send_notification_task.delay(
                user_id=rule.target_user.id,
                message=f"Document {document.title} assigné",
                
notification_type='ROUTING'
            )
        
        break  # Première règle applicable
    
    return {'status': 'routed'}
```

#### 4. Nettoyage des fichiers temporaires

```python
@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    """Configure les tâches planifiées."""
    
    # Chaque jour à 2h du matin
    sender.add_periodic_task(
        crontab(hour=2, minute=0),
        cleanup_old_files.s(),
        name='cleanup-old-files'
    )
    
    # Envoyer résumés notifications chaque jour à 9h
    sender.add_periodic_task(
        crontab(hour=9, minute=0),
        send_daily_digest.s(),
        name='send-daily-digest'
    )

@app.task
def cleanup_old_files():
    """Nettoie fichiers temporaires > 7 jours."""
    from datetime import timedelta
    from django.utils import timezone
    import os
    
    cutoff_date = timezone.now() - timedelta(days=7)
    
    # Fichiers temporaires
    temp_docs = Document.objects.filter(
        created_at__lt=cutoff_date,
        status='DRAFT'  # Non soumis
    )
    
    for doc in temp_docs:
        if doc.file and os.path.exists(doc.file.path):
            os.remove(doc.file.path)
        doc.delete()
    
    return f"Cleanup: {temp_docs.count()} fichiers tempssupprimés"
```

### Configuration Celery

```python
# config/celery.py
from celery import Celery
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('sgdra')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

# Configuration
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
```

### Démarrage

```bash
# Terminal 1: Django
python manage.py runserver

# Terminal 2: Celery Worker
celery -A config worker -l info

# Terminal 3: Celery Beat (Scheduler)
celery -A config beat -l info
```

---

## 📢 Notifications en temps réel

### WebSocket avec Django Channels

**Architecture:**
```
Browser
  │ (WebSocket)
  ▼
/ws/notifications/
  │
  ▼
channels.layers (Redis)
  │
  ▼
NotificationConsumer
  │ (async)
  ├─ connect() - Connexion
  ├─ disconnect() - Déconnexion
  ├─ receive() - Reçoit message
  └─ send_notification() - Envoie à client
```

**Consumer:**
```python
# apps/notifications/consumers.py
from channels.generic.websocket import AsyncWebsocketConsumer
import json
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async

from .models import Notification

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Group name: notif_{user_id}
        self.room_group_name = f'notif_{self.user.id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'chat_message')
        
        if message_type == 'mark_as_read':
            notif_id = data.get('notification_id')
            await self.mark_notification_read(notif_id)
    
    async def notification_created(self, event):
        """Reçoit du group_send."""
        message = event['message']
        
        await self.send(text_data=json.dumps({
            'type': 'notification_created',
            'notification': message
        }))
    
    @database_sync_to_async
    def mark_notification_read(self, notif_id):
        try:
            notif = Notification.objects.get(id=notif_id, recipient=self.user)
            notif.is_read = True
            notif.save()
        except Notification.DoesNotExist:
            pass
```

**Signaux pour envoyer notifications:**
```python
# apps/notifications/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import json

from .models import Notification
from .serializers import NotificationSerializer

@receiver(post_save, sender=Notification)
def notification_created(sender, instance, created, **kwargs):
    """Envoie notification via WebSocket."""
    if not created:
        return
    
    # Sérialiser notification
    serializer = NotificationSerializer(instance)
    
    # Envoyer à WebSocket group
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'notif_{instance.recipient.id}',
        {
            'type': 'notification_created',
            'message': serializer.data
        }
    )
    
    # Optionnellement: Envoyer email
    if instance.recipient.notification_preference.channel in ['EMAIL', 'BOTH']:
        send_notification_email.delay(instance.id)
```

**Configuration dans settings.py:**
```python
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('localhost', 6379)],
            "expiry": 10,
        },
    },
}
```

**Configuration de routage:**
```python
# config/routing.py
from django.urls import re_path
from apps.notifications.consumers import NotificationConsumer

websocket_urlpatterns = [
    re_path(r'ws/notifications/$', NotificationConsumer.as_asgi()),
]
```

### Client (Frontend)

```javascript
// React example
useEffect(() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/notifications/`;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'notification_created') {
      // Afficher notification
      showNotification(data.notification);
      
      // Mettre à jour state
      setNotifications([data.notification, ...notifications]);
    }
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };
  
  return () => ws.close();
}, []);
```

---

## ⚙️ Configuration

### Fichier .env

```env
# ========== DJANGO ==========
DEBUG=False
ENVIRONMENT=production
SECRET_KEY=your-secret-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# ========== DATABASE ==========
DATABASE_URL=mysql://user:password@localhost:3306/sgdra_db

# ========== MAIL ==========
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# ========== REDIS & CELERY ==========
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# ========== JWT TOKENS ==========
SIMPLE_JWT_ACCESS_TOKEN_LIFETIME=900  # 15 minutes
SIMPLE_JWT_REFRESH_TOKEN_LIFETIME=2592000  # 30 days

# ========== CORS ==========
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# ========== FILE UPLOAD ==========
MAX_UPLOAD_SIZE=52428800  # 50MB
MEDIA_ROOT=/path/to/media
MEDIA_URL=/media/

# ========== SENTRY MONITORING ==========
SENTRY_DSN=https://key@sentry.io/project-id

# ========== LOGGING ==========
LOG_LEVEL=INFO
```

### Commandes de gestion

```bash
# Migrations
python manage.py makemigrations
python manage.py migrate

# Créer utilisateurs
python manage.py createsuperuser
python manage.py shell < load_test_users.py

# Charger données initiales
python manage.py load_branches
python manage.py load_departments
python manage.py load_document_specifications
python manage.py load_routing_rules

# Tester
python manage.py test
pytest tests/

# Collecte static files
python manage.py collectstatic
```

---

## 🚀 Déploiement

### Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: sgdra_db
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      - DATABASE_URL=mysql://root:root_password@db:3306/sgdra_db
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  celery_worker:
    build: ./backend
    command: celery -A config worker -l info
    environment:
      - DATABASE_URL=mysql://root:root_password@db:3306/sgdra_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery_beat:
    build: ./backend
    command: celery -A config beat -l info
    environment:
      - DATABASE_URL=mysql://root:root_password@db:3306/sgdra_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

volumes:
  mysql_data:
```

**Lancement:**
```bash
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py load_branches
```

### Production Checklist

- [ ] DEBUG=False dans .env
- [ ] SECRET_KEY aléatoire généré
- [ ] ALLOWED_HOSTS configuré correctement
- [ ] Database backups configurés
- [ ] Redis persistance configurée
- [ ] HTTPS activé + certificats SSL
- [ ] Email backend testé
- [ ] Monitoring (Sentry) configuré
- [ ] Logs centralisés configurés
- [ ] Rate limiting activé
- [ ] CORS restrictif configuré
- [ ] Static/Media files servis via CDN
- [ ] Backup automatique planifié
- [ ] Health checks configurés

---

## 📝 Résumé

SGDRA est un système complet de gestion documentaire construitsur:

1. **Django REST Framework** pour l'API REST robuste
2. **JWT** pour l'authentification sans état
3. **Celery + Redis** pour les tâches asynchrones
4. **Django Channels** pour les WebSocket temps réel
5. **MySQL** pour la persistence des données
6. **Système de rôles** pour les permissions granulaires
7. **Validation intelligente** pour les fichiers
8. **Routage automatique** selon règles métier
9. **Notifications multi-canal** aux utilisateurs

Le workflow complet automatisé:
```
Upload → Validation → Classification → Routage → Approbation → Archive
```

Tous les services communiquent via une API REST bien documentée (Swagger),
permettant une intégration facile avec d'autres systèmes.

---

**Document créé**: 23 février 2026  
**Version**: 1.0.0  
**Prochaines mises à jour**: Feature releases, performance tuning
