# 🚀 QUICK START: API RE-ROUTING

---

## 1️⃣ Vérifier Votre Rôle

**GET** `/api/users/me/`

**Response**:
```json
{
  "id": 5,
  "username": "pierre_pole",
  "role": "POLE_MANAGER",
  "role_display": "Gestionnaire Pôle",
  "pole": "Pôle Commercial",
  "access_hierarchy": {
    "role": "POLE_MANAGER",
    "access_level": 1,
    "can_reroute": true,
    "pole": "Pôle Commercial",
    "filiale": null,
    "service": null
  }
}
```

---

## 2️⃣ Obtenir les Dossiers Accessibles

**GET** `/api/folders/?folder_type=service`

**Response**:
```json
{
  "count": 15,
  "results": [
    {
      "id": 10,
      "name": "Commercial",
      "folder_type": "service",
      "parent": 5,
      "path": "Pôle Commercial / Bénin / Commercial",
      "full_path": "...",
      "document_count": 25
    }
  ]
}
```

---

## 3️⃣ Obtenir un Document

**GET** `/api/documents/{id}/`

**Response**:
```json
{
  "id": 42,
  "name": "Report_Q1_2024.pdf",
  "destination_folder": 10,
  "destination_folder_name": "Bénin / Commercial",
  "status": "archived",
  "created_at": "2026-02-01"
}
```

---

## 4️⃣ RE-ROUTER UN DOCUMENT 🎯

**POST** `/api/documents/{id}/reroute/`

### Exemple 1: Transfer Simple
```bash
curl -X POST http://localhost:8000/api/documents/42/reroute/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_folder_id": 15,
    "transfer_type": "MANUAL_TRANSFER",
    "reason": "Client requested transfer to Cameroun office"
  }'
```

**Response 201**:
```json
{
  "id": 1,
  "document": 42,
  "document_name": "Report_Q1_2024.pdf",
  "from_folder": 10,
  "from_folder_name": "Bénin / Commercial",
  "to_folder": 15,
  "to_folder_name": "Cameroun / Commercial",
  "transferred_by": 5,
  "transferred_by_name": "Pierre Pôle",
  "transfer_type": "MANUAL_TRANSFER",
  "reason": "Client requested transfer to Cameroun office",
  "transferred_at": "2026-02-23T14:30:00Z",
  "notes": ""
}
```

### Exemple 2: Transfer Cross-Filiale
```bash
curl -X POST http://localhost:8000/api/documents/42/reroute/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_folder_id": 20,
    "transfer_type": "CROSS_FILIALE",
    "reason": "Strategic reorganization"
  }'
```

### Exemple 3: Transfer pour Conformité
```bash
curl -X POST http://localhost:8000/api/documents/42/reroute/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_folder_id": 25,
    "transfer_type": "COMPLIANCE_MOVE",
    "reason": "Regulatory requirement"
  }'
```

---

## 5️⃣ Erreurs Possibles

### ❌ 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```
**Raison**: Vous n'avez pas accès à la destination

### ❌ 404 Not Found
```json
{
  "detail": "Document not found"
}
```
**Raison**: Document n'existe pas

### ❌ 400 Bad Request
```json
{
  "to_folder_id": ["Invalid folder"]
}
```
**Raison**: Le dossier de destination n'existe pas

---

## 6️⃣ Voir l'Historique des Transfers

**GET** `/api/documents/{id}/transfers/`

**Response**:
```json
{
  "count": 3,
  "results": [
    {
      "id": 1,
      "from_folder_name": "Bénin / Commercial",
      "to_folder_name": "Cameroun / Commercial",
      "transferred_by_name": "Pierre Pôle",
      "transfer_type_display": "Transfer manuel",
      "reason": "Client request",
      "transferred_at": "2026-02-23T14:30:00Z"
    }
  ]
}
```

---

## 🔑 Permissions Par Rôle

### ADMIN
- ✅ RE-ROUTER N'IMPORTE OÙ
- ✅ Aucune restriction

### POLE_MANAGER
- ✅ RE-ROUTER DANS LE PÔLE
- ✅ D'une Filiale à l'autre
- ✅ D'un Service à l'autre
- ❌ Vers un autre Pôle

### FILIALE_MANAGER
- ✅ RE-ROUTER DANS LA FILIALE
- ✅ D'un Service à l'autre
- ❌ Vers une autre Filiale
- ❌ Vers un autre Pôle

### SERVICE_MANAGER
- ✅ RE-ROUTER DANS LE SERVICE
- ✅ Vers les Sub-services
- ❌ Vers un autre Service
- ❌ Vers une autre Filiale

### DOCUMENT_MANAGER
- ✅ RE-ROUTER N'IMPORTE OÙ
- ✅ Aucune restriction

### AGENT
- ❌ IMPOSSIBLE DE RE-ROUTER
- Peut seulement créer/voir ses documents

---

## 📊 Types de Transfer

| Type | Description | Exemple |
|------|-------------|---------|
| MANUAL_TRANSFER | Transfer manuel simple | Déplacer vers un Service différent |
| CROSS_FILIALE | Entre deux Filiales | Bénin → Cameroun |
| CROSS_POLE | Entre deux Pôles | Commercial → Finance |
| CROSS_SERVICE | Entre deux Services | Commercial → Analysis |
| COMPLIANCE_MOVE | Pour conformité | Réglementation requise |
| AUTO_ROUTING | Par système automatique | Routage automatique |
| OTHER | Autre raison | Custom |

---

## 💡 Cas d'Usage

### 1. Client Change de Filiale
```json
{
  "to_folder_id": 15,
  "transfer_type": "CROSS_FILIALE",
  "reason": "Client relocated to Cameroun office"
}
```

### 2. Réorganisation Interne
```json
{
  "to_folder_id": 20,
  "transfer_type": "MANUAL_TRANSFER",
  "reason": "Department restructuring"
}
```

### 3. Audit/Conformité
```json
{
  "to_folder_id": 25,
  "transfer_type": "COMPLIANCE_MOVE",
  "reason": "Internal audit requirement - ISO 9001"
}
```

### 4. Erreur de Routage
```json
{
  "to_folder_id": 18,
  "transfer_type": "AUTO_ROUTING",
  "reason": "Correction of automatic routing error"
}
```

---

## 🔍 Voir Tous les Transfers d'un User

**GET** `/api/document-transfers/?transferred_by={user_id}`

**Response**:
```json
{
  "count": 42,
  "results": [
    {...}
  ]
}
```

---

## 📈 Statistiques

### Transfers Par Type
```bash
GET /api/document-transfers/stats/by_type/
```

### Transfers Par Utilisateur
```bash
GET /api/document-transfers/stats/by_user/
```

### Transfers Par Dossier
```bash
GET /api/document-transfers/stats/by_folder/
```

---

## ⚙️ Configuration

### Ajouter DOCUMENT_MANAGER à un User
```python
from apps.users.models import User
user = User.objects.get(id=5)
user.role = 'DOCUMENT_MANAGER'
user.save()
```

### Vérifier l'Accès à un Dossier
```python
user = User.objects.get(id=5)
folder = Folder.objects.get(id=10)
if user.has_access_to_folder(folder):
    print("✅ Accès autorisé")
else:
    print("❌ Accès refusé")
```

---

## 🚀 Ready to Use!

Vous êtes prêt à:
- ✅ Vérifier votre rôle
- ✅ Voir vos dossiers accessibles
- ✅ RE-ROUTER les documents
- ✅ Voir l'historique des transfers
- ✅ Gérer la conformité

**API Documentation**: `/docs/` (Swagger UI)
