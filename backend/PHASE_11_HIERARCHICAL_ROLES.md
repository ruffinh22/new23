# 🎯 PHASE 11: SYSTÈME DE RÔLES HIÉRARCHIQUES ET RE-ROUTING DE DOCUMENTS

**Date**: 23 février 2026  
**Status**: ✅ IMPLÉMENTÉ ET TESTÉ

---

## 📋 Résumé

Implémentation complète d'un système de rôles hiérarchiques avec support pour le re-routing de documents entre Pôles, Filiales et Services.

---

## 🎯 Nouveaux Rôles Utilisateur (6 rôles)

### 1. **ADMIN** 🔑
- **Accès**: Complet à tout
- **Pouvoirs**:
  - Voir/modifier tous les documents
  - Re-router partout
  - Gérer tous les utilisateurs
  - Accès à l'admin Django

### 2. **POLE_MANAGER** (Gestionnaire Pôle)
- **Accès**: Pôle entier
  - ✓ Pôle spécifié en `pole` field
  - ✓ Toutes les Filiales du Pôle
  - ✓ Tous les Services de chaque Filiale
  - ✓ Tous les Sub-services
- **Pouvoirs**:
  - Re-router les documents au sein du Pôle
  - Voir les statistiques du Pôle
  - Gérer les utilisateurs du Pôle

### 3. **FILIALE_MANAGER** (Gestionnaire Filiale)
- **Accès**: Filiale spécifique
  - ✗ Le Pôle
  - ✓ Filiale spécifiée en `branch` field
  - ✓ Tous les Services de la Filiale
  - ✓ Tous les Sub-services
- **Pouvoirs**:
  - Re-router les documents dans la Filiale
  - Voir les statistiques de la Filiale
  - Gérer les utilisateurs de la Filiale

### 4. **SERVICE_MANAGER** (Gestionnaire Service)
- **Accès**: Service spécifique uniquement
  - ✗ Le Pôle
  - ✗ La Filiale
  - ✓ Service spécifié en `department` field
  - ✓ Tous les Sub-services du Service
- **Pouvoirs**:
  - Re-router les documents dans les Sub-services
  - Voir les statistiques du Service
  - Gérer les utilisateurs du Service

### 5. **DOCUMENT_MANAGER** (Gestionnaire Document)
- **Accès**: Partout (re-routing global)
  - ✓ TOUS les Pôles
  - ✓ TOUTES les Filiales
  - ✓ TOUS les Services
- **Pouvoirs**:
  - Re-router un document n'importe où
  - Tracer l'historique des transferts
  - Gérer la conformité des documents

### 6. **AGENT** (Agent)
- **Accès**: Service d'affectation uniquement
  - ✗ Autres Pôles
  - ✗ Autres Filiales
  - ✗ Autres Services
  - ✓ Service spécifié en `department` field
- **Pouvoirs**:
  - Créer des documents
  - Voir ses propres documents
  - Upload de fichiers

---

## 🔑 Hiérarchie d'Accès

```
ADMIN (0)              → Accès complet
    ↓
POLE_MANAGER (1)       → Pôle + Filiales + Services
    ↓
FILIALE_MANAGER (2)    → Filiale + Services
    ↓
SERVICE_MANAGER (3)    → Service + Sub-services
    ↓
AGENT (4)              → Service uniquement
    
DOCUMENT_MANAGER       → Accès global (re-routing)
```

---

## 📊 Tableau d'Accès

| Rôle | Pôle | Filiale | Service | Re-routing | Access Level |
|------|------|---------|---------|------------|--------------|
| ADMIN | ✓ | ✓ | ✓ | ✓ | 0 |
| POLE_MANAGER | ✓ | ✓ | ✓ | ✓ | 1 |
| FILIALE_MANAGER | ✗ | ✓ | ✓ | ✓ | 2 |
| SERVICE_MANAGER | ✗ | ✗ | ✓ | ✓ | 3 |
| DOCUMENT_MANAGER | ✓ | ✓ | ✓ | ✓ | 0 |
| AGENT | ✗ | ✗ | ✓ | ✗ | 4 |

---

## 📄 Re-Routing de Documents

### Concept
Permet de déplacer un document vers un autre dossier:
- D'une Filiale à une autre (**CROSS_FILIALE**)
- D'un Pôle à un autre (**CROSS_POLE**)
- D'un Service à un autre (**CROSS_SERVICE**)
- Pour conformité (**COMPLIANCE_MOVE**)

### Types de Transfer
```python
TRANSFER_TYPES = [
    ('AUTO_ROUTING', 'Routage automatique'),
    ('MANUAL_TRANSFER', 'Transfer manuel'),
    ('CROSS_POLE', 'Transfer entre Pôles'),
    ('CROSS_FILIALE', 'Transfer entre Filiales'),
    ('CROSS_SERVICE', 'Transfer entre Services'),
    ('COMPLIANCE_MOVE', 'Mouvement pour conformité'),
    ('OTHER', 'Autre raison'),
]
```

### API Endpoint

**POST** `/api/documents/{id}/reroute/`

**Permissions**:
- Authentifié
- CanRerouteDocument (vérifie le rôle et l'accès)

**Payload**:
```json
{
  "to_folder_id": 123,
  "transfer_type": "MANUAL_TRANSFER",
  "reason": "Raison du transfert"
}
```

**Response**:
```json
{
  "id": 1,
  "document": 42,
  "document_name": "Report_2024.pdf",
  "from_folder": 10,
  "from_folder_name": "Bénin / Commercial",
  "to_folder": 20,
  "to_folder_name": "Cameroun / Commercial",
  "transferred_by": 5,
  "transferred_by_name": "Pierre Pôle",
  "transfer_type": "MANUAL_TRANSFER",
  "transfer_type_display": "Transfer manuel",
  "reason": "Client needs updated version",
  "transferred_at": "2026-02-23T14:30:00Z",
  "notes": ""
}
```

---

## 🗄️ Modèles de Base de Données

### User (Modifié)
```python
class User(AbstractBaseUser, PermissionsMixin):
    # Nouveaux champs
    pole = ForeignKey(Folder, folder_type='pole', null=True, blank=True)
    branch = ForeignKey(Folder, folder_type='filiale', null=True, blank=True)
    department = ForeignKey(Folder, folder_type='service', null=True, blank=True)
    
    # Nouveau rôle
    role = CharField(
        max_length=20,
        choices=[
            ('AGENT', '...'),
            ('ADMIN', '...'),
            ('POLE_MANAGER', '...'),
            ('FILIALE_MANAGER', '...'),
            ('SERVICE_MANAGER', '...'),
            ('DOCUMENT_MANAGER', '...'),
        ]
    )
    
    # Méthodes
    def has_access_to_folder(self, folder) -> bool:
        """Vérifie l'accès selon le rôle et la hiérarchie"""
        ...
```

### DocumentTransfer (Nouveau)
```python
class DocumentTransfer(models.Model):
    document = ForeignKey(Document, on_delete=models.CASCADE)
    from_folder = ForeignKey(Folder, null=True, blank=True)
    to_folder = ForeignKey(Folder, null=True, blank=True)
    transferred_by = ForeignKey(User, null=True)
    
    transfer_type = CharField(max_length=20, choices=TRANSFER_TYPES)
    reason = TextField(blank=True)
    transferred_at = DateTimeField(auto_now_add=True)
    notes = TextField(blank=True)
```

---

## 🔐 Permissions Personnalisées

### CanRerouteDocument
Vérifie:
- L'utilisateur a le droit de re-router (rôle)
- L'utilisateur a accès au document actuel
- L'utilisateur a accès à la destination

```python
class CanRerouteDocument(permissions.BasePermission):
    def has_permission(self, request, view):
        """Vérifie le rôle"""
        allowed_roles = ['ADMIN', 'DOCUMENT_MANAGER', 'POLE_MANAGER', 
                        'FILIALE_MANAGER', 'SERVICE_MANAGER']
        return request.user.role in allowed_roles
    
    def has_object_permission(self, request, view, obj):
        """Vérifie l'accès spécifique"""
        ...
```

### HasFolderAccess
Vérifie l'accès à un dossier selon la hiérarchie.

---

## 📝 Sérialiseurs

### UserDetailSerializer (Nouveau)
Retourne:
- Tous les détails de l'utilisateur
- Accès hiérarchique complet
- Rôle et permissions

### DocumentTransferSerializer (Nouveau)
Retourne:
- Détails du transfer
- Dossier source/destination
- Utilisateur qui l'a effectué
- Raison et historique

---

## 🚀 Migration

```bash
# 1. Appliquer la migration users
python manage.py migrate users
# Response: Applied users.0002_add_pole_hierarchy ✓

# 2. Appliquer la migration documents
python manage.py migrate documents
# Response: Applied documents.0003_add_document_transfer ✓
```

**Changements**:
- Colonne `pole_id` ajoutée à `users` table
- Colonne `role` agrandie (max_length: 10 → 20)
- Table `document_transfers` créée

---

## 🧪 Test du Système

**Exécution de la démo**:
```bash
python manage.py shell < demo_hierarchical_roles.py
```

**Résultats**:
- ✅ 6 utilisateurs créés avec leurs rôles
- ✅ Accès hiérarchique vérifié
- ✅ Permissions correctement appliquées
- ✅ Re-routing ready

---

## 📊 Scénarios d'Utilisation

### Scénario 1: POLE_MANAGER
```
Pierre (POL001) - Gestionnaire Pôle Commercial
├─ Peut voir les documents de:
│  ├─ Pôle Commercial (où il est assigné)
│  ├─ Bénin (filiale du pôle)
│  ├─ Cameroun (filiale du pôle)
│  ├─ Tous les Services
│  └─ Tous les Sub-services
├─ Peut re-router:
│  ├─ De Bénin → Cameroun ✓
│  ├─ De Commercial → Finance ✗ (autre pôle)
│  └─ De Service1 → Service2 ✓
└─ Accès Level: 1
```

### Scénario 2: FILIALE_MANAGER
```
Fabrice (FIL001) - Gestionnaire Filiale Bénin
├─ Peut voir les documents de:
│  ├─ Bénin (sa filiale)
│  ├─ Commercial (service de Bénin)
│  └─ Tous les Sub-services
├─ Peut re-router:
│  ├─ De Service1 → Service2 ✓
│  ├─ De Bénin → Cameroun ✗ (autre filiale)
│  └─ De Commercial → Analysis ✓
└─ Accès Level: 2
```

### Scénario 3: DOCUMENT_MANAGER
```
Dominique (DOC001) - Gestionnaire Document
├─ Peut re-router n'importe quel document:
│  ├─ De Bénin → Cameroun ✓
│  ├─ De Commercial → Finance ✓
│  ├─ De Pôle Commercial → Pôle Finance ✓
│  └─ Partout ✓
└─ Accès Level: 0 (complet)
```

---

## 🔍 Audit et Traçabilité

### DocumentTransfer Log
Chaque transfer enregistre:
```
- **Qui**: User.id + User.name
- **Quoi**: Document.id + Document.name
- **Où**: Dossier source → dossier destination
- **Pourquoi**: Raison du transfer
- **Quand**: Timestamp exact
```

### AuditLog Integration
```python
AuditLog.objects.create(
    action='DOCUMENT_TRANSFER',
    actor=request.user,
    description='Document X transféré de Folder A vers Folder B',
    severity='MEDIUM',
    success=True
)
```

---

## ✅ Checklist Complète

### Modèles
- ✅ User: 6 rôles implémentés
- ✅ User: Champ `pole` ajouté
- ✅ User: Méthode `has_access_to_folder()` implémentée
- ✅ DocumentTransfer: Nouveau modèle créé
- ✅ Migrations: Appliquées avec succès

### API
- ✅ UserDetailSerializer créé
- ✅ DocumentTransferSerializer créé
- ✅ Action `reroute` ajoutée au DocumentViewSet
- ✅ CanRerouteDocument permission créée
- ✅ HasFolderAccess permission créée

### Permissions
- ✅ Hiérarchie d'accès implémentée
- ✅ Contrôle des rôles
- ✅ Vérification des destinations
- ✅ Re-routing autorisé/bloqué selon les règles

### Tests
- ✅ Démo complète exécutée
- ✅ 6 utilisateurs testés
- ✅ Accès vérifié pour chaque rôle
- ✅ Re-routing fonctionnel

---

## 🚀 Prochaines Étapes (Phase 12)

1. **Frontend Integration**
   - UI pour re-router les documents
   - Afficher l'accès hiérarchique
   - Historique des transfers

2. **Notifications**
   - Notifier quand un document est transféré
   - Alerter les responsables

3. **Analytics**
   - Statistiques de transfer par pôle/filiale/service
   - Audit trail complet
   - Rapports de conformité

4. **Optimisations**
   - Caching des permissions
   - Pagination des transfers
   - Recherche avancée

---

## 📚 Documentation

- [ROUTING_HIERARCHIQUE.md](ROUTING_HIERARCHIQUE.md) - Routage automatique
- [PHASE_10_SUMMARY.md](PHASE_10_SUMMARY.md) - Phase 10 complète
- [API_STRUCTURE_FINAL.md](API_STRUCTURE_FINAL.md) - Structure API

---

**🎉 Phase 11 Complète!**
