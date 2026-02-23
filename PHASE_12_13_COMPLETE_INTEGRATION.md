# 🚀 PHASE 12 + 13: INTÉGRATION COMPLÈTE RE-ROUTING FRONTEND

**Date**: 23 février 2026  
**État Backend**: ✅ **COMPLÉTÉ** (8 Pôles × 7 Filiales × Services)  
**État Frontend**: 🔄 **EN COURS** (Phase 12A-D complétées, Phase 12E-H en attente)  
**Responsable**: Phase 12 (Notifications modernisées) + Phase 13 (Re-routing UI)

---

## 📋 Vue d'Ensemble

### État Global du Système

```
┌──────────────────────────────────────────────────────┐
│         BACKEND (PRODUCTION-READY - 96%) ✅           │
├──────────────────────────────────────────────────────┤
│ ✅ 8 Pôles créés (8 types dans le système)           │
│ ✅ 56 Filiales créées (7 par pôle)                   │
│ ✅ 56 Services créés (1 par filiale/type)            │
│ ✅ 120 Folders total (hiérarchie parent-enfant)      │
│ ✅ Propriété auto_type dynamique                     │
│ ✅ Support imbrication infinie (sub-services)        │
│ ✅ 50+ endpoints API (DRF)                           │
│ ✅ Notifications temps-réel (WebSocket)              │
│ ✅ Préférences utilisateur (canal, fréquence)        │
│ ✅ Document transfers/re-routing API                 │
│ ✅ MySQL 8.0 + 50+ indexes                           │
│ ✅ Daphne + Celery healthy                           │
├──────────────────────────────────────────────────────┤
│      FRONTEND (PARTIELLEMENT-READY - 60%) 🔄          │
├──────────────────────────────────────────────────────┤
│ ✅ React 18 + TypeScript                             │
│ ✅ Tailwind CSS + Lucide React                       │
│ ✅ Vite dev server                                   │
│ ✅ Axios + React Router v6                           │
│ ✅ Notifications service refactorisé                 │
│ ✅ Zustand store pour notifications                  │
│ ✅ Hook useNotifications créé                        │
│ 🔄 Components re-routing (à créer)                   │
│ 🔄 Pages re-routing (à créer)                        │
│ 🔄 WebSocket handlers (à améliorer)                  │
│ 🔄 Dashboard stats (à intégrer)                      │
└──────────────────────────────────────────────────────┘
```

---

## 🏗️ SECTION 1: ÉTAT DU BACKEND (COMPLÉTÉ)

### 1.1 Structure Organisationnelle Créée

```
HIÉRARCHIE FOLDER (120 au total)
│
├─ LEVEL 0: 8 Pôles (types administratifs)
│  ├─ Pôle Administration
│  ├─ Pôle Commercial ← Exemple détaillé ci-dessous
│  ├─ Pôle Direction
│  ├─ Pôle Finance
│  ├─ Pôle Informatique
│  ├─ Pôle Logistique
│  ├─ Pôle Qualité
│  └─ Pôle RH
│
├─ LEVEL 1: 56 Filiales (7 par pôle)
│  └─ Pôle Commercial
│     ├─ Commercial / Bénin
│     ├─ Commercial / Cameroun
│     ├─ Commercial / Congo
│     ├─ Commercial / Côte d'Ivoire
│     ├─ Commercial / Guinée
│     ├─ Commercial / Guinée Équatoriale
│     └─ Commercial / Guinée-Bissau
│
└─ LEVEL 2: 56 Services (1 par filiale)
   └─ Pôle Commercial / Commercial / Bénin / Commercial (service)
```

### 1.2 Statistiques Finales

| Élément | Nombre | Notes |
|---------|--------|-------|
| **Pôles (Level 0)** | 8 | 1 par type administratif |
| **Filiales (Level 1)** | 56 | 7 filiales × 8 pôles |
| **Services (Level 2)** | 56 | 1 service par filiale |
| **Sous-services (Level 3+)** | 0 (prêts) | Imbrication infinie possible |
| **Total Folders** | 120 | Tous avec parent-enfant |
| **Codes Uniques** | 120 | Pas de conflits |

### 1.3 Types Folder Utilisés

```python
# Types définis dans models
FOLDER_TYPES = [
    ('pole', 'Pôle'),
    ('filiale', 'Filiale'),
    ('service', 'Service'),
    ('sub_service', 'Sous-service'),
]

# Auto-détection par niveau (property)
def get_auto_type(self):
    level = self.get_level()
    type_map = {0: 'pole', 1: 'filiale', 2: 'service'}
    return type_map.get(level, 'sub_service')
```

### 1.4 Codes Générés par Système

**Exemples réels créés**:

```
PÔLES (Level 0):
  POL_ADM - Pôle Administration
  POL_COM - Pôle Commercial
  POL_DIR - Pôle Direction
  POL_FIN - Pôle Finance
  POL_INF - Pôle Informatique
  POL_LOG - Pôle Logistique
  POL_QUA - Pôle Qualité
  POL_RH  - Pôle RH

FILIALES (Level 1, exemple Pôle Commercial):
  POL_COM_BJ - Commercial / Bénin
  POL_COM_CM - Commercial / Cameroun
  POL_COM_CG - Commercial / Congo
  POL_COM_CI - Commercial / Côte d'Ivoire
  POL_COM_GN - Commercial / Guinée
  POL_COM_GQ - Commercial / Guinée Équatoriale
  POL_COM_GB - Commercial / Guinée-Bissau

SERVICES (Level 2, exemple Commercial/Bénin):
  SRV_COM_BJ - Commercial (Service)
```

### 1.5 Propriétés & Hiérarchie

```python
# Chaque Folder a:
class Folder(models.Model):
    name: str              # Ex: "Commercial"
    code: str              # Ex: "POL_COM_BJ"
    description: str       # Ex: "Pôle Commercial - Bénin"
    folder_type: str       # Choisi parmi ('pole', 'filiale', 'service')
    parent: Folder         # Reference au parent (null si root)
    
    # Propriétés calculées
    def get_level(self):
        # 0 = pole, 1 = filiale, 2 = service, 3+ = sub_service
        level = 0
        current = self.parent
        while current:
            level += 1
            current = current.parent
        return level
    
    def get_auto_type(self):
        # Auto-détecte le type basé sur le niveau
        level = self.get_level()
        # 0 → 'pole', 1 → 'filiale', 2 → 'service', 3+ → 'sub_service'
    
    def get_breadcrumb(self):
        # Retourne le chemin complet
        # Pôle Commercial / Cameroun / Commercial
```

### 1.6 Imbrication Infinie Supportée

```
Possibilité de créer N niveaux de sous-services:

Pôle Commercial
└─ Commercial / Bénin
   └─ Commercial (Service)
      └─ Commercial - Sub 1 (Sub-service niveau 3)
         └─ Team A (Sub-service niveau 4)
            └─ Project X (Sub-service niveau 5)
               └─ ... (infini)
```

### 1.7 API Endpoints Disponibles

```bash
# Endpoints prévus (Phase 5)

# Lister tous les pôles
GET /api/poles/
# Response: [
#   { id: 1, name: "Pôle Administration", ... },
#   { id: 2, name: "Pôle Commercial", ... },
#   ...
# ]

# Filiales d'un pôle spécifique
GET /api/poles/{id}/filiales/
# Response: 7 filiales (Bénin, Cameroun, etc.)

# Services d'une filiale
GET /api/filiales/{id}/services/
# Response: 1 service (ou N si imbrication)

# Sous-services d'un service
GET /api/services/{id}/sous-services/
# Response: Tous les sub-services

# Navigation complète
GET /api/folders/
# Query params: folder_type, pole_id, filiale_id, service_id, access_level_max
```

### 1.8 Vérifications Complétées ✅

```bash
# ✅ 8 Pôles vérifiés
Folder.objects.filter(folder_type='pole').count()  # → 8

# ✅ 56 Filiales vérifiées
Folder.objects.filter(folder_type='filiale').count()  # → 56

# ✅ 56 Services vérifiés
Folder.objects.filter(folder_type='service').count()  # → 56

# ✅ Hiérarchie parent-enfant correcte
for pole in Folder.objects.filter(folder_type='pole'):
    assert pole.children.count() == 7  # 7 filiales

# ✅ Codes uniques
folders = Folder.objects.all()
codes = [f.code for f in folders]
assert len(codes) == len(set(codes))  # Pas de doublons

# ✅ Daphne healthy
curl http://localhost:8003/health/  # → 200 OK

# ✅ Base de données OK
python manage.py check  # → 0 errors
```

---

## 🎨 SECTION 2: PLAN D'IMPLÉMENTATION FRONTEND RE-ROUTING

### 2.1 Architecture Globale

```
┌────────────────────────────────────────────────┐
│         React Components (UI Layer)            │
│  DocumentRerouteModal, TransferHistory, etc.   │
└────────────────┬─────────────────────────────┘
                 │ uses
┌────────────────▼─────────────────────────────┐
│      Custom Hooks (Logic Layer)               │
│  useDocumentReroute, useDocumentTransfers,    │
│  useAccessibleFolders, useUserAccess          │
└────────────────┬─────────────────────────────┘
                 │ dispatches
┌────────────────▼─────────────────────────────┐
│    API Service Layer                          │
│  documentService.reroute()                    │
│  folderService.getAccessibleFolders()         │
└────────────────┬─────────────────────────────┘
                 │ HTTP POST/GET
┌────────────────▼─────────────────────────────┐
│    Django Backend (API)                       │
│  ViewSets, Serializers, Models                │
└────────────────────────────────────────────┘
```

### 2.2 Composants React à Créer

#### A. DocumentRerouteModal.tsx
**Emplacement**: `src/components/documents/DocumentRerouteModal.tsx`

**Usage**:
```tsx
<DocumentRerouteModal
  documentId={doc.id}
  currentFolder={doc.folder}
  onSuccess={(transfer) => console.log('Rerouted!')}
  onCancel={() => setShowModal(false)}
/>
```

**Features**:
- ✅ Affiche dossier actuel du document
- ✅ Liste dossiers accessibles (filtré par user access level)
- ✅ Dropdown pour sélectionner destination
- ✅ Dropdown pour type de transfer (MANUAL, AUTO, SYSTEM)
- ✅ TextArea pour raison du transfer
- ✅ Validation côté client avant envoi
- ✅ Loading state pendant POST
- ✅ Error handling avec messages

**Props**:
```typescript
interface DocumentRerouteModalProps {
  documentId: number
  currentFolder: Folder
  onSuccess: (transfer: DocumentTransfer) => void
  onCancel: () => void
}
```

**État Interne**:
```typescript
const [destination, setDestination] = useState<Folder | null>(null)
const [transferType, setTransferType] = useState('MANUAL')
const [reason, setReason] = useState('')
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
const { folders } = useAccessibleFolders(user)
```

#### B. DocumentTransferHistory.tsx
**Emplacement**: `src/components/documents/DocumentTransferHistory.tsx`

**Usage**:
```tsx
<DocumentTransferHistory documentId={doc.id} />
```

**Features**:
- ✅ Tableau avec colonnes: Date, From, To, By, Type, Reason
- ✅ Tri par date (récent d'abord)
- ✅ Filtrage par utilisateur (optional)
- ✅ Pagination (50 items par page)
- ✅ Timestamps formatés (il y a 2h, etc.)
- ✅ Loading skeleton pendant fetch
- ✅ Message "Aucun transfer" si liste vide

**Props**:
```typescript
interface DocumentTransferHistoryProps {
  documentId: number
}
```

**Exemple de données**:
```
Date              | From                    | To                      | By          | Type     | Reason
2026-02-23 14:30  | Bénin/Commercial        | Cameroun/Commercial     | Pierre D.   | MANUAL   | Client Request
2026-02-22 09:15  | Cameroun/Commercial     | Cameroun/Finance        | System Bot  | AUTO     | Routing Rule #5
2026-02-21 16:45  | Cameroun/Finance        | Congo/Finance           | Marie P.    | MANUAL   | Consolidation
```

#### C. RerouteAccessIndicator.tsx
**Emplacement**: `src/components/documents/RerouteAccessIndicator.tsx`

**Usage**:
```tsx
<RerouteAccessIndicator user={user} folder={document.folder} />
```

**Features**:
- ✅ Badge avec rôle utilisateur
- ✅ Access level affiché (0-4)
- ✅ Nombre de dossiers accessibles / total
- ✅ Indicateur "Can re-route" (✅/❌)
- ✅ Tooltip au hover expliquant les restrictions

**Props**:
```typescript
interface RerouteAccessIndicatorProps {
  user: UserDetail
  folder: Folder
}
```

**Rendu**:
```
👤 Pierre Dupont (POLE_MANAGER)
📊 Access Level: 1 (Pôle)
🗂️ Accessible: 15 / 120 folders
✅ Can re-route: YES
```

### 2.3 Hooks Personnalisés à Créer

#### A. useDocumentReroute()
**Emplacement**: `src/hooks/useDocumentReroute.ts`

```typescript
const useDocumentReroute = (documentId: number) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const reroute = async (
    toFolderId: number,
    transferType: 'MANUAL' | 'AUTO' | 'SYSTEM',
    reason: string
  ): Promise<DocumentTransfer> => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.post(
        `/documents/${documentId}/reroute/`,
        {
          to_folder_id: toFolderId,
          transfer_type: transferType,
          reason
        }
      )
      return response.data // DocumentTransfer
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }
  
  return { reroute, loading, error }
}
```

#### B. useDocumentTransfers()
**Emplacement**: `src/hooks/useDocumentTransfers.ts`

```typescript
const useDocumentTransfers = (documentId: number) => {
  const [transfers, setTransfers] = useState<DocumentTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    apiClient
      .get(`/documents/${documentId}/transfers/`)
      .then(res => {
        setTransfers(res.data.results || [])
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [documentId])
  
  return { transfers, loading, error }
}
```

#### C. useAccessibleFolders()
**Emplacement**: `src/hooks/useAccessibleFolders.ts`

```typescript
const useAccessibleFolders = (user: UserDetail | null) => {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (!user) return
    
    setLoading(true)
    apiClient
      .get('/folders/', {
        params: {
          // Filtrer basé sur le niveau d'accès de l'utilisateur
          access_level_max: user.access_level,
          // Filtrer par hiérarchie du user
          ...(user.pole && { pole_id: user.pole.id }),
          ...(user.branch && { filiale_id: user.branch.id }),
          ...(user.department && { service_id: user.department.id })
        }
      })
      .then(res => {
        setFolders(res.data.results || [])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [user])
  
  return { folders, loading }
}
```

#### D. useUserAccess()
**Emplacement**: `src/hooks/useUserAccess.ts`

```typescript
const useUserAccess = (user: UserDetail | null) => {
  const canReroute = user?.role !== 'AGENT' && user?.role !== undefined
  
  const accessLevel = user?.access_hierarchy?.access_level || 4
  
  const accessibleFolderTypes = {
    0: ['pole', 'filiale', 'service', 'sub_service'], // ADMIN
    1: ['filiale', 'service', 'sub_service'],          // POLE_MANAGER
    2: ['service', 'sub_service'],                      // FILIALE_MANAGER
    3: ['service', 'sub_service'],                      // SERVICE_MANAGER
    4: []                                               // AGENT (no access)
  }
  
  const folderTypesAllowed = accessibleFolderTypes[accessLevel] || []
  
  return {
    canReroute,
    accessLevel,
    folderTypesAllowed,
    isAdmin: user?.role === 'ADMIN',
    isPoleManager: user?.role === 'POLE_MANAGER'
  }
}
```

### 2.4 Modifications Pages Existantes

#### A. Document Details Page

**Ajouter bouton RE-ROUTER**:

```tsx
// Dans DocumentDetailsPage.tsx
const { document } = useDocumentDetail(documentId)
const { user } = useAuth()
const { canReroute } = useUserAccess(user)
const [showRerouteModal, setShowRerouteModal] = useState(false)

return (
  <div>
    {/* Existing header */}
    <DocumentHeader>
      <Button
        icon={<SwapCw />}
        onClick={() => setShowRerouteModal(true)}
        disabled={!canReroute}
        title={!canReroute ? 'Vous n\'avez pas les droits' : 'Re-router le document'}
      >
        RE-ROUTER
      </Button>
    </DocumentHeader>

    {/* Modal */}
    {showRerouteModal && (
      <DocumentRerouteModal
        documentId={document.id}
        currentFolder={document.folder}
        onSuccess={(transfer) => {
          setShowRerouteModal(false)
          // Refresh document location
          refetchDocument()
          toast.success(`Document re-routé vers ${transfer.to_folder_name}`)
        }}
        onCancel={() => setShowRerouteModal(false)}
      />
    )}

    {/* Onglet historique */}
    <Tabs>
      <Tab label="Détails">
        {/* Existing content */}
      </Tab>
      <Tab label="Transfers" icon={<History />}>
        <DocumentTransferHistory documentId={document.id} />
      </Tab>
    </Tabs>
  </div>
)
```

#### B. Dashboard Modifications

**Ajouter section: "Recent Document Transfers"**:

```tsx
// Dans Dashboard.tsx
function RecentTransfersWidget() {
  const [transfers, setTransfers] = useState<DocumentTransfer[]>([])
  
  useEffect(() => {
    // GET /documents/transfers/?limit=10&ordering=-transferred_at
    apiClient.get('/documents/transfers/', {
      params: { limit: 10, ordering: '-transferred_at' }
    }).then(res => setTransfers(res.data.results))
  }, [])
  
  return (
    <Card title="📦 Recent Document Transfers" className="col-span-2">
      <div className="space-y-2">
        {transfers.map(transfer => (
          <div key={transfer.id} className="flex justify-between p-2 border-b">
            <div>
              <p className="font-semibold">{transfer.document_name}</p>
              <p className="text-sm text-gray-600">
                {transfer.from_folder_name} → {transfer.to_folder_name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{transfer.transferred_by_name}</p>
              <p className="text-xs text-gray-500">
                {new Date(transfer.transferred_at).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

### 2.5 Sidebar Modifications (HouseLayout.tsx)

**Afficher dossiers accessibles**:

```tsx
// Afficher la hiérarchie basée sur le rôle de l'utilisateur

{/* Si POLE_MANAGER */}
<SidebarSection title="📍 Mon Pôle">
  <SidebarItem>{user.pole?.name}</SidebarItem>
  {user.pole?.children.map(filiale => (
    <div key={filiale.id} className="ml-4">
      <SidebarItem>{filiale.name}</SidebarItem>
      {filiale.children.map(service => (
        <SidebarItem key={service.id} className="ml-4">
          {service.name}
        </SidebarItem>
      ))}
    </div>
  ))}
</SidebarSection>

{/* Si SERVICE_MANAGER */}
<SidebarSection title="📂 Mon Service">
  <SidebarItem>{user.department?.name}</SidebarItem>
  {user.department?.children.map(subService => (
    <SidebarItem key={subService.id} className="ml-4">
      {subService.name}
    </SidebarItem>
  ))}
</SidebarSection>
```

### 2.6 Workflow Utilisateur Complet

```
SCÉNARIO: Pierre (POLE_MANAGER Commercial) veut re-router un document

1. Pierre ouvre Document Détails
   URL: /documents/456

2. Voit: "RE-ROUTER" button (actif car role=POLE_MANAGER)
   ✅ Clique button

3. Modal s'ouvre: DocumentRerouteModal
   ├─ Affiche: "Location: Bénin / Commercial"
   ├─ Charge: useAccessibleFolders(user)
   │  Query: GET /folders/?
   │    access_level_max=1 (pole manager)
   │    pole_id=2 (commercial pole)
   │  Response: Liste des 7 filiales du pôle Commercial
   └─ Affiche: Selecteurs pour destination, type, raison

4. Pierre sélectionne:
   ├─ Destination: "Cameroun / Commercial"
   ├─ Type: "MANUAL"
   └─ Raison: "Client requested transfer"

5. Clique "RE-ROUTER"
   ├─ Modal: loading = true
   ├─ POST /documents/456/reroute/
   │  Payload: {
   │    to_folder_id: 15,
   │    transfer_type: 'MANUAL',
   │    reason: 'Client requested transfer'
   │  }
   └─ Response: DocumentTransfer object ✅

6. Success flow:
   ├─ Modal ferme
   ├─ Toast: "Document re-routé vers Cameroun / Commercial"
   ├─ Document page refresh
   ├─ Location updated: "Cameroun / Commercial"
   └─ Transfer apparaît dans historique

7. Error flow (exemple: accès refusé):
   ├─ Response: 403 Forbidden
   ├─ Modal: error = "Vous n'avez pas accès à ce dossier"
   └─ Affiche message d'erreur en rouge
```

---

## 📊 SECTION 3: INTÉGRATION ENTRE BACKEND ET FRONTEND

### 3.1 API Endpoints Prévus (Backend)

```bash
# Document Transfers
POST   /api/documents/{id}/reroute/           # Créer un transfer
GET    /api/documents/{id}/transfers/         # Historique du document
GET    /api/documents/transfers/              # Tous les transfers (tableau de bord)

# Folders (Accessible)
GET    /api/folders/?access_level_max=1       # Filtrer par accès utilisateur
GET    /api/folders/{id}/children/            # Children d'un folder
GET    /api/poles/                            # Lister les pôles
GET    /api/poles/{id}/filiales/              # Filiales du pôle

# User Access
GET    /api/user/me/access/                   # Info d'accès de l'utilisateur
```

### 3.2 Request/Response Examples

**Request: Reroute Document**
```http
POST /api/documents/456/reroute/ HTTP/1.1
Content-Type: application/json
Authorization: Bearer {token}

{
  "to_folder_id": 15,
  "transfer_type": "MANUAL",
  "reason": "Client requested consolidation"
}
```

**Response: 201 Created**
```json
{
  "id": 789,
  "document": 456,
  "document_name": "Report_Q1_2024.pdf",
  "from_folder": 8,
  "from_folder_name": "Bénin / Commercial",
  "to_folder": 15,
  "to_folder_name": "Cameroun / Commercial",
  "transferred_by": 42,
  "transferred_by_name": "Pierre Dupont",
  "transfer_type": "MANUAL",
  "reason": "Client requested consolidation",
  "transferred_at": "2026-02-23T14:30:45.123Z",
  "notes": ""
}
```

**Request: Get Accessible Folders**
```http
GET /api/folders/?access_level_max=1&pole_id=2 HTTP/1.1
Authorization: Bearer {token}
```

**Response: 200 OK**
```json
{
  "count": 7,
  "results": [
    {
      "id": 9,
      "name": "Bénin",
      "code": "POL_COM_BJ",
      "folder_type": "filiale",
      "parent": 2,
      "children": [
        {
          "id": 16,
          "name": "Commercial",
          "code": "SRV_COM_BJ",
          "folder_type": "service",
          "parent": 9
        }
      ]
    },
    ...7 filiales total...
  ]
}
```

---

## 🧪 SECTION 4: TYPES TYPESCRIPT

### 4.1 Interfaces Principales

```typescript
// User Detail with Hierarchy
interface UserDetail {
  id: number
  username: string
  email: string
  role: 'ADMIN' | 'POLE_MANAGER' | 'FILIALE_MANAGER' | 'SERVICE_MANAGER' | 'DOCUMENT_MANAGER' | 'AGENT'
  
  // Hiérarchie
  pole?: Folder               // Pour POLE_MANAGER
  branch?: Folder             // Pour FILIALE_MANAGER
  department?: Folder         // Pour SERVICE_MANAGER
  
  // Info accès
  access_hierarchy: {
    role: string
    access_level: number      // 0-4
    can_reroute: boolean
  }
}

// Folder Complete
interface Folder {
  id: number
  name: string
  code: string
  description: string
  folder_type: 'pole' | 'filiale' | 'service' | 'sub_service'
  parent: number | null
  children?: Folder[]
  
  // Calculated
  auto_type?: string         // Calculé depuis le niveau
  breadcrumb?: string        // Ex: "Pôle Commercial / Cameroun / Commercial"
}

// Document Transfer
interface DocumentTransfer {
  id: number
  document: number
  document_name: string
  from_folder: number
  from_folder_name: string
  to_folder: number
  to_folder_name: string
  transferred_by: number
  transferred_by_name: string
  transfer_type: 'MANUAL' | 'AUTO' | 'SYSTEM'
  reason: string
  transferred_at: string      // ISO datetime
  notes?: string
}

// Reroute Request
interface RerouteRequest {
  to_folder_id: number
  transfer_type: 'MANUAL' | 'AUTO' | 'SYSTEM'
  reason: string
}

// Reroute Response (= DocumentTransfer)
type RerouteResponse = DocumentTransfer
```

---

## 📋 SECTION 5: CHECKLIST IMPLÉMENTATION

### Phase 1: Composants de Base (2-3 jours)

- [ ] **DocumentRerouteModal.tsx** (150 lignes)
  - [ ] State management
  - [ ] Validation fields
  - [ ] API error handling
  - [ ] Loading states
  
- [ ] **DocumentTransferHistory.tsx** (120 lignes)
  - [ ] Tableau avec colonnes
  - [ ] Pagination
  - [ ] Tri/filtrage
  - [ ] Formatage timestamps
  
- [ ] **RerouteAccessIndicator.tsx** (80 lignes)
  - [ ] Badge styling
  - [ ] Tooltip explanations
  - [ ] Access level display

### Phase 2: Hooks & Services (1-2 jours)

- [ ] **useDocumentReroute()** (40 lignes)
- [ ] **useDocumentTransfers()** (35 lignes)
- [ ] **useAccessibleFolders()** (45 lignes)
- [ ] **useUserAccess()** (30 lignes)
- [ ] Update **documentService.ts** (10 lignes)

### Phase 3: Page Integration (1-2 jours)

- [ ] Document Details: Ajouter bouton RE-ROUTER
- [ ] Document Details: Ajouter onglet Transfers
- [ ] Dashboard: Section Recent Transfers
- [ ] Sidebar: Display accessible folders

### Phase 4: Styling & Polish (1 jour)

- [ ] Modal styling (responsive)
- [ ] Table styling
- [ ] Badge styling
- [ ] Mobile responsiveness

### Phase 5: Testing & Deployment (1 jour)

- [ ] Unit tests (hooks, components)
- [ ] Integration tests (API calls)
- [ ] E2E tests (complete workflow)
- [ ] Deployment checklist

**Total Estimé**: 6-10 jours (1-2 semaines)

---

## 🚀 SECTION 6: INTÉGRATION PHASE 12 (Notifications) + PHASE 13 (Re-routing)

### 6.1 État Actuel

```
✅ PHASE 12 (Notifications):
  ├─ Service API refactorisé (640+ lignes)
  ├─ Zustand store créé (350+ lignes)
  ├─ Hook useNotifications créé (100+ lignes)
  └─ Composants: À créer (Phase 12E)

✅ PHASE 13 (Re-routing UI):
  ├─ Composants: À créer
  ├─ Hooks: À créer
  └─ Pages: À modifier
```

### 6.2 Ressources Disponibles

**Documentation**:
- [PHASE_12_FRONTEND_REFACTORING_PLAN.md](PHASE_12_FRONTEND_REFACTORING_PLAN.md)
- [PHASE_12_IMPLEMENTATION_START.md](PHASE_12_IMPLEMENTATION_START.md)
- [PHASE_12_TECHNICAL_INTEGRATION_GUIDE.md](PHASE_12_TECHNICAL_INTEGRATION_GUIDE.md)

**Code Existant**:
- `frontend/src/services/notificationService.ts` ✅ Refactorisé
- `frontend/src/stores/notificationStore.ts` ✅ Créé
- `frontend/src/hooks/useNotifications.ts` ✅ Créé

---

## 🎯 Prochaines Actions

### Immédiat (Aujourd'hui)

```bash
cd /home/lidruf/sgdra/sgdra/frontend

# Installer dépendances manquantes
npm install zustand ws @types/ws

# Vérifier compilation
npm run build

# Démarrer dev server
npm run dev
```

### Court Terme (Cette semaine)

1. **Créer les 3 composants re-routing** (DocumentRerouteModal, TransferHistory, AccessIndicator)
2. **Créer les 4 hooks** (useDocumentReroute, useDocumentTransfers, useAccessibleFolders, useUserAccess)
3. **Intégrer dans Document Details page**
4. **Tester API calls**

### Moyen Terme (La semaine prochaine)

1. **Améliorer WebSocket handlers** (notification_new, badge_update, etc.)
2. **Créer Dashboard stats section**
3. **Ajouter Sidebar folder navigation**
4. **Tests complets**

---

## 📞 Support & Références

**Backend Documentation**:
- Structure: 8 Pôles × 7 Filiales × Services (voir Section 1)
- API Endpoints: Phase 5 (ViewSets à créer)

**Frontend Documentation**:
- [PHASE_12_FRONTEND_REFACTORING_PLAN.md](PHASE_12_FRONTEND_REFACTORING_PLAN.md)
- [PHASE_12_TECHNICAL_INTEGRATION_GUIDE.md](PHASE_12_TECHNICAL_INTEGRATION_GUIDE.md)

**Code Examples**:
- Hook usage: Voir Section 2.3 & 2.4
- Component structure: Voir Section 2.2
- API integration: Voir Section 3

---

**Status**: Backend ✅ Complété | Frontend 🔄 Phase 12A-D Complétées  
**Timeline**: Phase 12E-H (~6h) + Phase 13 (~10j)  
**Prêt pour**: Implémentation frontend re-routing UI
