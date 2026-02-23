# 🎨 FRONTEND INTEGRATION: RE-ROUTING UI

---

## 📋 Vue d'Ensemble

Intégrer le système de re-routing dans le frontend React/TypeScript.

---

## 📦 Composants à Créer

### 1. DocumentRerouteModal
**Emplacement**: `src/components/documents/DocumentRerouteModal.tsx`

**Props**:
```typescript
interface DocumentRerouteModalProps {
  documentId: number;
  currentFolder: Folder;
  onSuccess: (transfer: DocumentTransfer) => void;
  onCancel: () => void;
}
```

**Fonctionnalités**:
- ✅ Afficher le dossier actuel
- ✅ Sélectionner le dossier de destination
- ✅ Choisir le type de transfer
- ✅ Entrer la raison
- ✅ Afficher les dossiers accessibles
- ✅ Bouton "Re-router"

**UI**:
```
┌─────────────────────────────────┐
│ RE-ROUTER LE DOCUMENT           │
├─────────────────────────────────┤
│ Document: Report_Q1_2024.pdf    │
│ Location: Bénin / Commercial    │
├─────────────────────────────────┤
│ Destination: [Dropdown ▼]       │
│ Type: [Dropdown ▼]              │
│ Reason: [TextArea]              │
├─────────────────────────────────┤
│ [Cancel]  [Re-route]            │
└─────────────────────────────────┘
```

### 2. DocumentTransferHistory
**Emplacement**: `src/components/documents/DocumentTransferHistory.tsx`

**Props**:
```typescript
interface DocumentTransferHistoryProps {
  documentId: number;
}
```

**Fonctionnalités**:
- ✅ Afficher l'historique complet des transfers
- ✅ Afficher la trace d'audit : qui, quand, d'où à où
- ✅ Trier par date (descendant par défaut)
- ✅ Filtrer par utilisateur / type de transfer
- ✅ Afficher raison et notes pour chaque transfer
- ✅ Pagination pour la performance (120+ documents × transfers)

**Table**:
```
| Date | From | To | By | Type | Reason |
|------|------|----|----|------|--------|
| 2026-02-23 14:32 | POL_COM/Bénin/Comm | POL_COM/Cameroun/Comm | Pierre Dupont | Manual | Client Request |
| 2026-02-22 09:15 | POL_COM/Cameroun/Comm | POL_COM/Cameroun/Ana | System | Auto | Routing Rule #3 |
| 2026-02-20 16:45 | POL_COM/Bénin/An | POL_FIN/Bénin/Acc | Marie Martin | Approval | Dir Approval |
```

### 3. RerouteAccessIndicator
**Emplacement**: `src/components/documents/RerouteAccessIndicator.tsx`

**Props**:
```typescript
interface RerouteAccessIndicatorProps {
  user: UserDetail;
  folder: Folder;
}
```

**Affiche**:
- ✅ User role avec label : ADMIN, POLE_MANAGER, FILIALE_MANAGER, SERVICE_MANAGER, DOCUMENT_MANAGER, AGENT
- ✅ Access level (0-4) et hiérarchie accessible
- ✅ Accessible folders : calcul selon rôle (ex : POLE_MANAGER → 7×7=49 folders)
- ✅ Re-routing capability avec raison si non autorisé

**Badge**:
```
👤 Pierre Dupont | POLE_MANAGER
📊 Access Level: 1 | Max: 4
🗂️ Folders Accessible: 49/120 (POL_COM Pôle only)
✅ Can re-route: Yes
└─ To: Any POL_COM filiale + all Services + Sub-services
```

---

## 🎨 Page Document Détails (Modification)

### Ajouter Bouton Re-router

**Location**: Document details page - intégré avec Phase 12 hooks

```tsx
import { useUserStore } from '@/stores/userStore';
import { useNotifications } from '@/hooks/useNotifications';
import { useDocumentReroute } from '@/hooks/useDocumentReroute';

export function DocumentDetail() {
  const user = useUserStore((s) => s.user);
  const [showRerouteModal, setShowRerouteModal] = useState(false);
  const { reroute, loading } = useDocumentReroute(document.id);
  
  const canReroute = user?.access_hierarchy?.can_reroute;

  return (
    <>
      <DocumentHeader document={document}>
        <Button 
          variant="secondary"
          icon={<ArrowRightLeft className="w-4 h-4" />}
          onClick={() => setShowRerouteModal(true)}
          disabled={!canReroute || loading}
          title={!canReroute ? "Vous n'avez pas accès au re-routing" : ""}
        >
          RE-ROUTER
        </Button>
      </DocumentHeader>

      {showRerouteModal && (
        <DocumentRerouteModal
          documentId={document.id}
          currentFolder={document.folder}
          onSuccess={() => {
            setShowRerouteModal(false);
            // Toast + refetch via Phase 12 notification system
          }}
          onCancel={() => setShowRerouteModal(false)}
        />
      )}
    </>
  );
}
```

### Ajouter Onglet Historique

```tsx
<Tabs>
  <Tab label="Détails" icon={<FileText className="w-4 h-4" />}>
    <DocumentDetailsView document={document} />
  </Tab>
  
  <Tab label="Versions" icon={<Clock className="w-4 h-4" />}>
    <DocumentVersionsView documentId={document.id} />
  </Tab>
  
  <Tab label="Transfers" icon={<SwapHorizontal className="w-4 h-4" />}>
    <DocumentTransferHistory documentId={document.id} />
  </Tab>
  
  <Tab label="Sharing" icon={<Share2 className="w-4 h-4" />}>
    <DocumentSharingView documentId={document.id} />
  </Tab>
</Tabs>
```

---

## 📊 Tableau de Bord (Dashboard)

### Section 1: Folders Accessibles (Sidebar - HouseLayout.tsx)

Afficher l'arborescence complète selon l'accès :

```
Structure Backend:
├─ 📍 PÔLE (Level 0)
│  ├─ 🌍 FILIALE (Level 1) × 7
│  │  ├─ 📂 SERVICE (Level 2) × 1
│  │  │  ├─ 📁 Sub-Service (Level 3+)
│  │  │  └─ 📁 Sub-Service

Exemple - POLE_MANAGER (POL_COM):
├─ 📍 POL_COM (Commercial)
│  ├─ 🌍 Bénin → 📂 Commercial (+ 3 subfolders)
│  ├─ 🌍 Cameroun → 📂 Commercial (+ 2 subfolders)
│  ├─ 🌍 Congo → 📂 Commercial
│  ├─ 🌍 Côte d'Ivoire → 📂 Commercial (+ 1 subfolder)
│  ├─ 🌍 Guinée → 📂 Commercial
│  ├─ 🌍 Guinée Équatoriale → 📂 Commercial
│  └─ 🌍 Guinée-Bissau → 📂 Commercial

Exemple - SERVICE_MANAGER (Commercial/Bénin):
├─ 📂 Commercial (Bénin)
│  ├─ 📁 Analysis (Sub-Service)
│  ├─ 📁 Operations (Sub-Service)
│  └─ 📁 Reporting (Sub-Service)

Exemple - AGENT (read-only):
├─ 📂 Current Service (view only)
│  └─ 📄 Documents in Service
```

### Section 2: Documents with Pending Transfers (Dashboard Body)

Afficher:
- Documents transférés récemment
- Qui a transféré (par quel rôle)
- Vers quel dossier (avec hiérarchie)
- Timestamp du transfer
- Statut : ✅ Completed / ⏳ Pending / ❌ Failed

```
📦 Recent Document Transfers (Last 7 days)

1. ✅ Report_Q1_2024.pdf
   POL_COM/Bénin/Commercial → POL_COM/Cameroun/Commercial
   Transferred by Pierre Dupont (POLE_MANAGER) • 2h ago
   Reason: Client Request

2. ⏳ Invoice_2024_Final.pdf
   POL_FIN/Bénin/Accounting → POL_FIN/Cameroun/Accounting
   Transferred by System (AUTO ROUTING) • 1d ago
   Reason: Routing Rule #2 - Central Finance

3. ✅ Personnel_Records.pdf
   POL_RH/Bénin/HR → POL_RH/Cameroun/HR
   Transferred by Marie Martin (FILIALE_MANAGER) • 3d ago
   Reason: Staff Consolidation
```

### Section 3: Transfer Statistics

Afficher métriques :
- Total transfers (all time + this month)
- Transfer types distribution (Manual/Auto/Approval/Routing)
- Top 5 most transferred documents
- Top 5 busiest folders (in/out)

```
📊 Transfer Statistics (This Month)

Total Transfers: 247
├─ Manual: 124 (50%)
├─ Auto: 89 (36%)
├─ Approval: 28 (11%)
└─ Routing: 6 (2%)

🏆 Top Busiest Folders:
1. POL_COM/Bénin/Commercial: 45 transfers (in: 23, out: 22)
2. POL_FIN/Bénin/Accounting: 38 transfers (in: 20, out: 18)
3. POL_RH/Cameroun/HR: 31 transfers (in: 15, out: 16)
```

---

## 🔐 Vérifications d'Accès Frontend

### Access Control by Role

**ADMIN** (Level 0)
- ✅ See all 8 Pôles
- ✅ See all 56 Filiales
- ✅ See all 56 Services
- ✅ See all Sub-services (infinite)
- ✅ Can re-route anywhere

**POLE_MANAGER** (Level 1)
- ✅ See own Pôle + all sub-levels (7 Filiales × 7 each)
- ✅ Can reroute within own Pôle (49 folders accessible)
- ✅ Cannot transfer to other Pôles

**FILIALE_MANAGER** (Level 2)
- ✅ See own Filiale + all Services
- ✅ Can reroute within own Filiale
- ✅ Cannot transfer to other Filiales

**SERVICE_MANAGER** (Level 3)
- ✅ See own Service + Sub-services
- ✅ Can reroute within own Service hierarchy
- ✅ Limited to single service tree

**DOCUMENT_MANAGER** (Level 4)
- ✅ See all folders (like ADMIN)
- ✅ Can reroute anywhere
- ✅ No hierarchical restrictions

**AGENT** (Level -1)
- ✅ View documents only
- ❌ Cannot re-route
- ❌ Cannot access folder navigation

### HouseLayout.tsx - Sidebar Navigation

```tsx
import { useFolderHierarchy } from '@/hooks/useFolderHierarchy';
import { useUserStore } from '@/stores/userStore';

export function HouseSidebar() {
  const user = useUserStore((s) => s.user);
  const { poles, filiales, services } = useFolderHierarchy(user);

  // Filter based on access level
  if (user?.role === 'ADMIN' || user?.role === 'DOCUMENT_MANAGER') {
    return <AllPolesView poles={poles} />; // Show all 8 Pôles
  }
  
  if (user?.role === 'POLE_MANAGER') {
    return <PoleDetailView pole={user.pole} filiales={filiales} />; // Show 7 Filiales
  }
  
  if (user?.role === 'FILIALE_MANAGER') {
    return <FilialeDetailView filiale={user.branch} services={services} />; // Show Services
  }
  
  if (user?.role === 'SERVICE_MANAGER') {
    return <ServiceDetailView service={user.department} subservices={services} />; // Show Sub-services
  }
  
  return <AgentView />; // Read-only view
}

// POLE_MANAGER View:
// ├─ 📍 POL_COM (Commercial) [edit access]
// │  ├─ 🌍 Bénin [expand]
// │  │  └─ 📂 Commercial [click to view]
// │  ├─ 🌍 Cameroun
// │  │  └─ 📂 Commercial
// │  ├─ 🌍 Congo
// │  │  └─ 📂 Commercial
// │  ├─ 🌍 Côte d'Ivoire
// │  │  └─ 📂 Commercial
// │  ├─ 🌍 Guinée
// │  │  └─ 📂 Commercial
// │  ├─ 🌍 Guinée Équatoriale
// │  │  └─ 📂 Commercial
// │  └─ 🌍 Guinée-Bissau
// │     └─ 📂 Commercial
```

---

## 📞 API Hooks & Integration

### 1. useDocumentReroute Hook

**Location**: `src/hooks/useDocumentReroute.ts`

```typescript
import { useState } from 'react';
import { apiClient } from '@/services/apiClient';

interface ReroutePayload {
  to_folder_id: number;
  transfer_type: 'Manual' | 'Approval' | 'Routing' | 'Auto';
  reason: string;
  notes?: string;
}

export function useDocumentReroute(documentId: number) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const reroute = async (payload: ReroutePayload) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.post(
        `/api/documents/${documentId}/reroute/`,
        payload
      );
      // Trigger notification via Phase 12 system
      return response.data; // DocumentTransfer object
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message;
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { reroute, loading, error };
}
```

### 2. useDocumentTransfers Hook

**Location**: `src/hooks/useDocumentTransfers.ts`

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';

export function useDocumentTransfers(documentId: number) {
  const [transfers, setTransfers] = useState<DocumentTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const response = await apiClient.get(
          `/api/documents/${documentId}/transfers/`
        );
        setTransfers(response.data.results || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransfers();
  }, [documentId]);
  
  return { transfers, loading, error };
}
```

### 3. useAccessibleFolders Hook

**Location**: `src/hooks/useAccessibleFolders.ts`

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';
import { useUserStore } from '@/stores/userStore';

export function useAccessibleFolders() {
  const user = useUserStore((s) => s.user);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchFolders = async () => {
      try {
        const params: any = {
          // Filter based on user access level
          access_level_max: user.access_hierarchy?.access_level || 0,
        };
        
        // Add hierarchical filters
        if (user.role === 'POLE_MANAGER') {
          params.pole_id = user.pole?.id;
        } else if (user.role === 'FILIALE_MANAGER') {
          params.filiale_id = user.branch?.id;
        } else if (user.role === 'SERVICE_MANAGER') {
          params.service_id = user.department?.id;
        }
        // ADMIN & DOCUMENT_MANAGER get all folders
        
        const response = await apiClient.get('/api/folders/', { params });
        setFolders(response.data.results || []);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFolders();
  }, [user]);
  
  return { folders, loading };
}
```

### 4. useFolderHierarchy Hook

**Location**: `src/hooks/useFolderHierarchy.ts`

```typescript
import { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';

export function useFolderHierarchy(user: UserDetail | null) {
  const [poles, setPoles] = useState<Folder[]>([]);
  const [filiales, setFiliales] = useState<Folder[]>([]);
  const [services, setServices] = useState<Folder[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    const loadHierarchy = async () => {
      try {
        // Load Pôles (level 0)
        const polesRes = await apiClient.get('/api/poles/');
        setPoles(polesRes.data.results || []);
        
        // Load accessible Filiales (level 1)
        if (user.pole) {
          const filialesRes = await apiClient.get(
            `/api/poles/${user.pole.id}/filiales/`
          );
          setFiliales(filialesRes.data.results || []);
        }
        
        // Load accessible Services (level 2)
        if (user.branch) {
          const servicesRes = await apiClient.get(
            `/api/filiales/${user.branch.id}/services/`
          );
          setServices(servicesRes.data.results || []);
        }
      } catch (err) {
        console.error('Error loading hierarchy:', err);
      }
    };
    
    loadHierarchy();
  }, [user]);
  
  return { poles, filiales, services };
}
```

---

## 🎯 Workflow Utilisateur

### Scénario 1: Re-router un Document (POLE_MANAGER)

```
1. Pierre Dupont (POLE_MANAGER, POL_COM) ouvre document
   📄 Report_Q1.pdf | Location: POL_COM/Bénin/Commercial
   ↓
2. Clique sur "RE-ROUTER" button
   ↓
3. Modal s'ouvre
   ├─ Current: POL_COM / Bénin / Commercial
   ├─ Accessible destinations loaded: /api/folders/?pole_id=POL_COM
   ├─ Shows 49 folders (7 Filiales × 7 levels deep)
   └─ Examples: POL_COM/Cameroun/Commercial, POL_COM/Congo/Commercial, etc.
   ↓
4. Pierre selects:
   ├─ Destination: POL_COM/Cameroun/Commercial
   ├─ Type: Manual
   └─ Reason: "Client consolidation - consolidating to regional hub"
   ↓
5. Clique "RE-ROUTER"
   ├─ POST /api/documents/{doc_id}/reroute/
   └─ Payload: {to_folder_id: 45, transfer_type: 'Manual', reason: '...'}
   ↓
6. Response ✅ DocumentTransfer créé
   ├─ API returns: { id: 789, document: 123, from_folder: 7, to_folder: 45, ... }
   └─ Status: 201 Created
   ↓
7. Modal ferme + UI updates
   ├─ 🎉 Toast: "Document transféré avec succès vers POL_COM/Cameroun/Commercial"
   ├─ Historique onglet MàJ (new transfer appears)
   ├─ Document location updated in header
   └─ Timestamp & audit trail recorded
```

### Scénario 2: Access Denied - AGENT Cannot Re-route

```
1. Agent Jean (AGENT role) ouvre document
   ↓
2. "RE-ROUTER" button DISABLED
   ├─ Title: "Vous n'avez pas la permission de re-router documents"
   └─ Icon: 🔒
   ↓
3. Transfer History visible (read-only)
   └─ Shows who transferred this document before
```

### Scénario 3: Auto-routing by System (Transfer API)

```
DocumentTransfer created with:
├─ transfer_type: 'Routing'
├─ transferred_by: System (API request)
├─ reason: 'Auto-routing rule: Finance documents → POL_FIN'
└─ Status: Auto-transferred

Appears in:
├─ Transfer History with "System" as user
└─ Dashboard statistics under "Auto: 36%"
```

---

## 🔔 Notifications & Integration with Phase 12

### WebSocket Real-time Updates

Integration with Phase 12 notification system via `useNotifications` hook:

```typescript
import { useNotifications } from '@/hooks/useNotifications';

export function DocumentDetail() {
  const { subscribeToTransfers, unsubscribe } = useNotifications();
  
  useEffect(() => {
    // Subscribe to document transfer events
    const handler = (transfer: DocumentTransfer) => {
      console.log('Document transferred:', transfer);
      // Update UI with new transfer
      setTransfers(prev => [transfer, ...prev]);
      
      // Show toast notification
      toast.info(
        `Document transferred to ${transfer.to_folder_name} by ${transfer.transferred_by_name}`
      );
    };
    
    subscribeToTransfers(documentId, handler);
    
    return () => unsubscribe(documentId);
  }, [documentId]);
}
```

### Toast Notifications

```typescript
// Success - Document transferred
toast.success(
  '✅ Document transféré vers POL_COM/Cameroun/Commercial',
  { autoClose: 3000 }
);

// Error - Access denied
toast.error(
  "❌ Vous n'avez pas accès à ce dossier de destination",
  { autoClose: 5000 }
);

// Error - Invalid transfer
toast.error(
  '❌ Impossible de transférer vers le même dossier',
  { autoClose: 5000 }
);

// Info - Approval required
toast.info(
  '⏳ Transfer en attente d\'approbation du Directeur',
  { autoClose: 3000 }
);

// Info - Auto-routing
toast.info(
  '🤖 Document auto-routé selon règle #2',
  { autoClose: 3000 }
);
```

### Notification Store Integration

Update `notificationStore.ts` to include transfer notifications:

```typescript
// notificationStore.ts
interface RerouteNotification {
  id: string;
  type: 'transfer' | 'transfer_rejected' | 'approval_required';
  documentId: number;
  documentName: string;
  fromFolder: string;
  toFolder: string;
  transferType: 'Manual' | 'Approval' | 'Routing' | 'Auto';
  timestamp: string;
  read: boolean;
}

export const useNotificationStore = create((set) => ({
  // ... existing code ...
  
  // Add reroute notification
  addRerouteNotification: (notification: RerouteNotification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),
  
  // Filter transfers
  getTransferNotifications: () =>
    get().notifications.filter(n => n.type === 'transfer'),
}));
```

---

## 📱 Mobile Responsiveness

### RerouteModal Mobile
- Full-screen sur mobile
- Dropdown convertir en picker
- Raison sur plusieurs lignes

### TransferHistory Mobile
- Horizontal scroll table
- Collapse de certaines colonnes
- Timeline view alternative

---

## 🧪 Tests

### Unit Tests

```typescript
describe('DocumentRerouteModal', () => {
  it('should show error when folder not accessible', () => { ... });
  it('should call API on reroute click', () => { ... });
  it('should filter folders by user access level', () => { ... });
});
```

### Integration Tests

```typescript
describe('Document Rerouting Flow', () => {
  it('POLE_MANAGER should see all Pole folders', () => { ... });
  it('FILIALE_MANAGER should see only Filiale folders', () => { ... });
  it('DOCUMENT_MANAGER should see all folders', () => { ... });
});
```

---

## 📊 Types TypeScript

```typescript
// User Detail with Access
interface UserDetail {
  id: number;
  username: string;
  role: 'ADMIN' | 'POLE_MANAGER' | 'FILIALE_MANAGER' | 'SERVICE_MANAGER' | 'DOCUMENT_MANAGER' | 'AGENT';
  pole?: Folder;
  pole_id?: number;
  branch?: Folder;
  branch_id?: number;
  department?: Folder;
  department_id?: number;
  access_hierarchy: {
    role: string;
    access_level: number; // 0-4
    can_reroute: boolean;
    can_create_folders: boolean;
    can_delete_documents: boolean;
    can_manage_users: boolean;
  };
}

// Folder (8 Pôles, 56 Filiales, 56 Services, infinite sub-services)
interface Folder {
  id: number;
  name: string;
  type: 'POLE' | 'FILIALE' | 'SERVICE' | 'SUBSERVICE';
  level: number; // 0-4
  parent_id?: number;
  children_count: number;
  documents_count: number;
  full_path?: string; // "POL_COM/Bénin/Commercial"
  created_at: string;
  updated_at: string;
}

// Document Transfer
interface DocumentTransfer {
  id: number;
  document_id: number;
  document_name: string;
  from_folder_id: number;
  from_folder_name: string;
  to_folder_id: number;
  to_folder_name: string;
  transferred_by_id: number;
  transferred_by_name: string;
  transfer_type: 'Manual' | 'Approval' | 'Routing' | 'Auto';
  transfer_type_display: string;
  reason: string;
  notes?: string;
  transferred_at: string;
  status?: 'completed' | 'pending' | 'rejected';
}

// Reroute Request
interface ReroutePayload {
  to_folder_id: number;
  transfer_type: 'Manual' | 'Approval' | 'Routing' | 'Auto';
  reason: string; // 500 chars max
  notes?: string;
}

// API Responses
interface FolderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Folder[];
}

interface DocumentTransferListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DocumentTransfer[];
}
```

---

## 📋 Checklist Implémentation

### Composants de Base
- [ ] DocumentRerouteModal
- [ ] DocumentTransferHistory
- [ ] RerouteAccessIndicator

### Hooks
- [ ] useDocumentReroute
- [ ] useDocumentTransfers
- [ ] useAccessibleFolders
- [ ] useUserAccess

### Pages/Sections
- [ ] Document Details - Ajouter bouton RE-ROUTER
- [ ] Document Details - Ajouter onglet Transfers
- [ ] Dashboard - Section Recent Transfers
- [ ] Sidebar - Afficher dossiers accessibles

### Styling
- [ ] Modal styling
- [ ] Table styling
- [ ] Badge styling
- [ ] Responsive design

### Features
- [ ] Filtrage des dossiers par accès
- [ ] Validation permissions côté client
- [ ] Error handling
- [ ] Loading states
- [ ] Success messages

### Tests
- [ ] Unit tests (composants)
- [ ] Integration tests (API)
- [ ] E2E tests (workflows)

---

## 🎨 Design System

Utiliser le design system existant:
- Buttons, Modals, Tables du système
- Colors: Primary, Secondary, Success, Error
- Spacing: 8px grid
- Icons: Lucide React

---

## 🚀 Priorités

### Phase 1 (MVP)
- [ ] DocumentRerouteModal
- [ ] Afficher dans Document Details
- [ ] useDocumentReroute hook

### Phase 2
- [ ] DocumentTransferHistory
- [ ] Validation d'accès
- [ ] Notifications

### Phase 3
- [ ] Dashboard section
- [ ] Analytics
- [ ] Audit trail

---

**Prêt pour l'implémentation frontend! 🎨**
