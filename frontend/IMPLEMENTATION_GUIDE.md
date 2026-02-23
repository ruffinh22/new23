# 🚀 Frontend Development Implementation Guide

**Date**: 23 février 2026  
**Version**: 2.0.0 Roadmap  
**Status**: Development Roadmap

---

## ✅ Étape 1: Configuration et Préparation

### 1.1 Mettre à jour les dépendances
```bash
cd frontend
yarn install
# ou npm install
```

### 1.2 Vérifier la configuration

```bash
# Vérifier .env configuration
cat .env.example > .env
# Éditer .env avec les bonnes URL:
# VITE_API_URL=http://localhost:8000/api
# VITE_WS_URL=http://localhost:8000
```

### 1.3 Démarrer en développement

```bash
# Terminal 1: Frontend
yarn dev

# Terminal 2: Backend (si besoin)
cd ../backend
python manage.py runserver

# Terminal 3: Celery (si besoin)
celery -A config worker -l info
```

---

## 🔄 Étape 2: Implémenter PHASE 1 - Hiérarchie Organisationnelle

### Services ✅ READY

**Fichiers créés/modifiés:**
- ✅ `src/services/folderService.ts` - COMPLÉTÉ

**Méthodes disponibles:**
```typescript
// Hiérarchie complète
await folderService.getPoles()           // 8 pôles
await folderService.getFiliales()        // 56 filiales
await folderService.getServices()        // 56 services
await folderService.getPolesWithStats()  // Avec counts
await folderService.getHierarchyTree()   // Arbre complet
await folderService.getServicesByFiliale(id)
await folderService.getFolderAncestors(id)
```

### Composants à créer

#### 2.1 FolderTree.tsx
**Emplacement**: `src/components/folders/FolderTree.tsx`

```typescript
interface FolderTreeProps {
  onSelect?: (folder: Folder) => void
  selectedFolderId?: number
  expandedFolderIds?: number[]
  onExpanded?: (folderId: number, expanded: boolean) => void
}

// Affiche structure hiérarchique interactive
// ├─ Pôle 1
//   ├─ Filiale 1.1
//   │  ├─ Service 1.1.1
//   │  └─ Service 1.1.2
//   └─ Filiale 1.2
// └─ Pôle 2
```

**Features:**
- [ ] Lazy load des enfants
- [ ] Icônes par type (pôle, filiale, service)
- [ ] Sélection avec highlight
- [ ] Expand/collapse avec animation
- [ ] Recherche fil filtre
- [ ] Compteurs d'éléments

**Utilisation:**
```typescript
import { FolderTree } from '@/components/folders/FolderTree'

<FolderTree
  onSelect={(folder) => console.log('Selected:', folder)}
  expandedFolderIds={[1, 2, 3]}
/>
```

#### 2.2 FolderBrowser.tsx
**Emplacement**: `src/components/folders/FolderBrowser.tsx`

```typescript
interface FolderBrowserProps {
  onSelect: (folder: Folder) => void
  enableMultiSelect?: boolean
  filterByType?: 'service' | 'filiale' | 'pole'
  excludeFolderIds?: number[]
}
```

**Features:**
- [ ] Modal/Drawer avec sélection
- [ ] Filtrer par type
- [ ] Recherche rapide
- [ ] Breadcrumb du chemin
- [ ] Preview des enfants
- [ ] Boutons Actions

**Utilisation:**
```typescript
<FolderBrowser
  onSelect={(folder) => setTargetFolder(folder)}
  filterByType="service"
/>
```

#### 2.3 HierarchyViewer.tsx
**Emplacement**: `src/components/hierarchy/HierarchyViewer.tsx`

```typescript
interface HierarchyViewerProps {
  viewType?: 'tree' | 'table' | 'cards'
  filters?: HierarchyFilters
  onFolderClick?: (folder: Folder) => void
}
```

**Features:**
- [ ] Vue arborescente
- [ ] Vue tableau avec statsaigus
- [ ] Vue cartes
- [ ] Filtres (actifs, count, type)
- [ ] Export structure
- [ ] Statistiques

### Mise à jour des pages existantes

#### 2.4 Upgrade: Folders Admin Page
**Fichier**: `src/pages/admin/Folders.tsx`

```typescript
// AVANT: Liste simple des dossiers
// APRÈS: Hierarchie interactive

// Changes:
- Ajouter FolderTree component
- Double-panel: tree + détail
- Create/Edit/Delete modal
- Bulk operations
- Tests d'intégrité hiérarchie
```

#### 2.5 Upgrade: Document Upload Form
**Fichier**: `src/components/documents/DocumentUploadForm.tsx`

```typescript
// Ajouter sélection hiérarchique

// Changes:
- FolderBrowser pour parent folder
- Auto-complétion basée sur dept
- Preview du full_path
- Suggestion des services disponibles
```

### Checklist PHASE 1

- [ ] Créer `FolderTree.tsx`
- [ ] Créer `FolderBrowser.tsx`
- [ ] Créer `HierarchyViewer.tsx`
- [ ] Upgrade `Folders.tsx` page
- [ ] Upgrade document upload form
- [ ] Update types (full_path, level)
- [ ] Tests e2e
- [ ] Déployer et tester

**Effort estimé**: 1-2 jours

---

## 🔄 Étape 3: Implémenter PHASE 2 - Validation Avancée

### Services ✅ READY

**Fichiers créés:**
- ✅ `src/services/validationService.ts` - COMPLÉTÉ

### Composants à créer

#### 3.1 FilePreview.tsx
**Emplacement**: `src/components/documents/FilePreview.tsx`

```typescript
interface FilePreviewProps {
  file: File | null
  onPreviewError?: (error: Error) => void
  maxRowsToShow?: number
}

// Affiche preview du fichier avant upload
// - Excel: Headers + 5 premières lignes
// - PDF: Première page
// - Word: Résumé texte
```

**Features:**
- [ ] Preview Excel avec headers
- [ ] Preview PDF (première page)
- [ ] Preview Word (texte extrait)
- [ ] Loading state
- [ ] Error handling
- [ ] Full screen view

#### 3.2 ValidationErrorsDisplay.tsx
**Emplacement**: `src/components/documents/ValidationErrorsDisplay.tsx`

```typescript
interface ValidationErrorsDisplayProps {
  result: ValidationResult | null
  onRetry?: () => void
  onClose?: () => void
}

// Affiche erreurs et warnings de validation
// Groupé par type (erreurs vs warnings)
// Liens vers les champs problématiques
```

**Features:**
- [ ] Groupage erreurs/warnings
- [ ] Icons par severity
- [ ] Détails expands
- [ ] Liens vers résolution
- [ ] Export détails
- [ ] Retry button

#### 3.3 ValidationProgress.tsx
**Emplacement**: `src/components/documents/ValidationProgress.tsx`

```typescript
interface ValidationProgressProps {
  isValidating: boolean
  progress?: number
  status?: string
}

// Affiche progression de validation
```

**Features:**
- [ ] Progress bar
- [ ] Status messages
- [ ] Estimé temps restant
- [ ] Cancel button

#### 3.4 ExcelPreviewTable.tsx
**Emplacement**: `src/components/documents/ExcelPreviewTable.tsx`

```typescript
interface ExcelPreviewTableProps {
  preview: ExcelPreview
  maxRows?: number
  onRowClick?: (row: any, index: number) => void
}

// Tableau interactif des données Excel
```

**Features:**
- [ ] Headers souligné
- [ ] Virtualised (react-window)
- [ ] Sortable columns
- [ ] Filtrage rapide
- [ ] Export CSV du preview
- [ ] Indicateur données vides

### Mise à jour des formulaires

#### 3.5 Upgrade: DocumentUploadForm.tsx
**Fichier**: `src/components/documents/DocumentUploadForm.tsx`

```typescript
// AVANT: Upload simple sans preview
// APRÈS: Full validation avec preview

// Changes:
- FilePreview avant upload
- ValidationProgress pendant
- ValidationErrors après validation
- Retry si échec
- Auto-attach specs de type doc
```

### Checklist PHASE 2

- [ ] Créer `FilePreview.tsx`
- [ ] Créer `ValidationErrorsDisplay.tsx`
- [ ] Créer `ValidationProgress.tsx`
- [ ] Créer `ExcelPreviewTable.tsx`
- [ ] Upgrade `DocumentUploadForm.tsx`
- [ ] Update `DocumentDetail.tsx` pour afficher résultat validation
- [ ] Tests validation Excel/PDF
- [ ] Déployer et tester

**Effort estimé**: 1-2 jours

---

## 🔄 Étape 4: Implémenter PHASE 3 - Re-routing

### Services ✅ READY

**Fichiers créés:**
- ✅ `src/services/documentTransferService.ts` - COMPLÉTÉ

### Composants à créer

#### 4.1 DocumentRerouteModal.tsx
**Emplacement**: `src/components/documents/DocumentRerouteModal.tsx`

```typescript
interface DocumentRerouteModalProps {
  isOpen: boolean
  documentId: number
  currentFolder: Folder
  onSuccess: (transfer: DocumentTransfer) => void
  onClose: () => void
}

// Modal pour re-router un document
```

**Features:**
- [ ] Afficher document courant
- [ ] FolderBrowser pour destination
- [ ] Type de transfer (REROUTE, MOVE, COPY, TEMP)
- [ ] Reason textfield
- [ ] Notes optionnelles
- [ ] Preview du changement
- [ ] Confirmation avant envoi

**UI Layout:**
```
┌─────────────────────────────────────┐
│ RE-ROUTER DOCUMENT                  │
├─────────────────────────────────────┤
│ Document: Budget_2024.xlsx          │
│ Location: Bénin / Finance / Budgets │
├─────────────────────────────────────┤
│ Nouvelle destination: [Browse...]   │
│ Type: ◉ Reroute ○ Move ○ Copy ○ Temp│
│ Raison: [Text]                      │
│ Notes: [TextArea]                   │
├─────────────────────────────────────┤
│ [Annuler]  [Re-router]              │
└─────────────────────────────────────┘
```

#### 4.2 DocumentTransferHistory.tsx
**Emplacement**: `src/components/documents/DocumentTransferHistory.tsx`

```typescript
interface DocumentTransferHistoryProps {
  documentId: number
}

// Timeline des transfers d'un document
```

**Features:**
- [ ] Timeline verticale
- [ ] Icons par type transfer
- [ ] Dates formatées
- [ ] User qui a transferé
- [ ] Commentaires de chaque transfer
- [ ] Undo button
- [ ] Export timeline

#### 4.3 DocumentTransferAuditTrail.tsx
**Emplacement**: `src/components/documents/DocumentTransferAuditTrail.tsx`

```typescript
interface DocumentTransferAuditTrailProps {
  documentId: number
  filters?: {
    startDate?: string
    endDate?: string
    userIds?: number[]
  }
}

// Détails complets du routage
```

**Features:**
- [ ] Table avec tous les impacts
- [ ] Colonnes: Date, Type, Par qui, De, Vers, Raison
- [ ] Filtres avancés
- [ ] Export CSV/PDF
- [ ] Recherche

### Mise à jour du DocumentDetail

#### 4.4 Upgrade: DocumentDetail.tsx
**Fichier**: `src/pages/agent/DocumentDetail.tsx`

```typescript
// AVANT: Infos doc + workflow simple
// APRÈS: Complet avec re-routing

// Changes:
- Ajouter onglet "Re-routing"
- Ajouter bouton "Re-router"
- DocumentTransferHistory dans onglet
- DocumentTransferAuditTrail dans admin
- Fast actions: Approve, Reject, Reroute
```

### Checklist PHASE 3

- [ ] Créer `DocumentRerouteModal.tsx`
- [ ] Créer `DocumentTransferHistory.tsx`
- [ ] Créer `DocumentTransferAuditTrail.tsx`
- [ ] Upgrade `DocumentDetail.tsx`
- [ ] Tests re-routing workflow
- [ ] Tests permissions re-routing
- [ ] Déployer et tester

**Effort estimé**: 1-2 jours

---

## 🔄 Étape 5: Implémenter PHASE 4 - Tâches Avancées

### Services ✅ READY

**Fichiers créés:**
- ✅ `src/services/tasksService.ts` - COMPLÉTÉ

### Composants à créer

#### 5.1 TaskQuickActions.tsx
**Emplacement**: `src/components/tasks/TaskQuickActions.tsx`

```typescript
interface TaskQuickActionsProps {
  task: Task
  onApprove?: () => void
  onReject?: () => void
  onReroute?: () => void
  compact?: boolean
}

// Boutons d'actions rapides sur tâche
```

**Features:**
- [ ] Approve button
- [ ] Reject button (avec raison)
- [ ] Reroute button
- [ ] Escalate button
- [ ] Différent loading states
- [ ] Tooltips

#### 5.2 BulkActionToolbar.tsx
**Emplacement**: `src/components/tasks/BulkActionToolbar.tsx`

```typescript
interface BulkActionToolbarProps {
  selectedCount: number
  selectedIds: number[]
  onApproveAll: () => void
  onRejectAll: (reason: string) => void
  onClearSelection: () => void
}

// Toolbar pour actions sur multiple tâches
```

**UI:**
```
Selected: 5 items | [Approve All] [Reject All] [Reroute All] [Clear]
```

#### 5.3 Upgrade: Tasks.tsx page
**Fichier**: `src/pages/agent/Tasks.tsx`

```typescript
// AVANT: Simple list de tâches
// APRÈS: Dashboard complet avec actions

// Changes:
- Stats: total, en attente, overdue
- Filtres: status, priorité, type, due date
- Multi-select avec bulk actions
- Quick approve/reject inline
- Drag-drop (optionnel)
- Notifications intégrées
```

**Features:**
- [ ] Cards vue ou liste vue
- [ ] Filtres avancés
- [ ] Tri par priorité
- [ ] Indicateurs visuels urgence
- [ ] Timer pour overdue
- [ ] Quick actions hover
- [ ] Statistics widget

### Checklist PHASE 4

- [ ] Créer `TaskQuickActions.tsx`
- [ ] Créer `BulkActionToolbar.tsx`
- [ ] Upgrade `Tasks.tsx` page
- [ ] Tests bulk operations
- [ ] Tests permissions tasks
- [ ] Déployer et tester

**Effort estimé**: 1-2 jours

---

## 📊 Plan de Déploiement

### Dev Environment
```bash
# Terminal 1: Frontend dev
cd frontend && yarn dev

# Terminal 2: Backend
cd backend && python manage.py runserver

# Test complet
# Go to http://localhost:5173
```

### QA Environment
```bash
# Build
yarn build

# Preview build
yarn preview

# Test production build
```

### Production Deployment
```bash
# Build optimisé
yarn build

# Check build size
du -h dist/

# Deploy to server
# (voir DEPLOYMENT_OPERATIONS.md)
```

---

## 🧪 Checklist de Testing

### Avant chaque phase

- [ ] Tests unitaires passent
- [ ] Pas d'erreurs console
- [ ] Pas de warning TypeScript
- [ ] Responsive design OK
- [ ] Performance acceptable

### Pour chaque fonctionnalité

- [ ] Cas nominal fonctionnne
- [ ] Cas erreur gérés
- [ ] Validation côté client OK
- [ ] Permissions vérifiées
- [ ] Pas de fuite mémoire

### Tests e2e (à ajouter)

```typescript
// tests/e2e/hierarchy.e2e.ts
describe('Document Hierarchy', () => {
  it('should display complete hierarchy tree', () => {
    // Cypress test
  })
})

// tests/e2e/validation.e2e.ts
describe('Document Validation', () => {
  it('should validate excel and show errors', () => {
    // Test validation phase
  })
})

// tests/e2e/rerouting.e2e.ts
describe('Document Re-routing', () => {
  it('should reroute document successfully', () => {
    // Test rerouting workflow
  })
})
```

---

## 📱 Responsive Design Checklist

- [ ] Tablet (768px):
  - [ ] Sidebar collapsible
  - [ ] Modals full-width
  - [ ] Tables scrollable
  
- [ ] Mobile (375px):
  - [ ] Touch-friendly buttons
  - [ ] Vertical layout
  - [ ] Bottom sheet modals
  - [ ] Hamburger menu

---

## 🚨 Common Issues & Fixes

| Problème | Solution |
|----------|----------|
| CORS errors | Vérifier CORS in settings.py |
| 401 Unauthorized | JWT token expiré, refresh |
| FilePreview vide | Vérifier headers Excel |
| Hierarchy lente | Ajouter caching, pagination |
| Modals pas responsive | Mobile-first design |

---

## 📞 Support & Contact

- Frontend issues: Slack #frontend
- Backend issues: Slack #backend
- Deployment: Slack #deployment

---

**Next Steps**: 
1. ✅ Start PHASE 1 tomorrow
2. ⏳ Complete PHASE 2-3 by end of week
3. ⏳ Polish and Deploy week after

