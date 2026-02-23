# 🚀 SGDRA Frontend - Plan de Mise à Jour Complet

**Date**: 23 février 2026  
**Version**: 2.0.0  
**Status**: EN COURS ⚙️

---

## 📋 Vue d'ensemble

Ce document détaille toutes les fonctionnalités à mettre à jour et ajouter au frontend pour synchroniser avec le backend production-ready.

---

## ✅ Fonctionnalités Existantes

### ✓ Authentification
- [x] Login/Register
- [x] JWT tokens (access + refresh)
- [x] Protected routes
- [x] Role-based access control

### ✓ Dashboard
- [x] Agent dashboard
- [x] Admin dashboard
- [x] Real-time statistics

### ✓ Gestion des documents
- [x] Upload documents
- [x] List documents
- [x] Document details view
- [x] Search & filter
- [x] Download files

### ✓ Workflow d'approbation
- [x] Submit for validation
- [x] Validate (for VALIDATEUR role)
- [x] Approve/Reject (for APPROBATEUR role)

### ✓ Notifications
- [x] In-app notifications
- [x] WebSocket real-time updates
- [x] Notification preferences
- [x] Mark as read

### ✓ Admin Management
- [x] Users management
- [x] Branches management
- [x] Departments management
- [x] Document types
- [x] Routing rules

---

## ❌ Fonctionnalités Manquantes

### 1. **Hiérarchie organisationnelle complète** ⭐ CRITIQUE
**Status**: Partiellement implémentée
**Priorité**: P0 (Critique)

**Manque**:
- [ ] Visualisation arborescente Pôle → Filiale → Service
- [ ] API pour récupérer tous les niveaux hiérarchiques
- [ ] Composant "FolderTree" pour explorer la hiérarchie
- [ ] Gestion complète des Pôles (Create, Update, Delete)
- [ ] Afficher le full_path des documents (ex: "Bénin / RH / Congés")

**À implémenter**:
```typescript
// Service: folderService.ts
- getHierarchy() // Tous les pôles avec filiales et services
- getFolderTree() // Structure arborescente
- getPolesWithStats() // Pôles avec counts
- getServicesByFiliale(filialeId)
- createFolder(data)
- updateFolder(id, data)
- deleteFolder(id) // Avec cascade control
```

**Composants**:
```typescript
- FolderTree.tsx // Affiche hiérarchie interactive
- FolderBrowser.tsx // Sélectionner dossier destination
- HierarchyViewer.tsx // Visualiser structure
```

---

### 2. **Validation des documents avancée** ⭐ CRITIQUE
**Status**: Basique seulement
**Priorité**: P0 (Critique)

**Manque**:
- [ ] Validation Excel complète (colonnes, types, etc.)
- [ ] Affichage des erreurs de validation détaillées
- [ ] Preview du fichier avant upload
- [ ] Validation côté client vs serveur
- [ ] Indicateur d'avancement de validation
- [ ] Résultats de validation avec détails

**À implémenter**:
```typescript
// Service: validationService.ts (NEW)
- validateExcelStructure(file) // Colonnes, feuilles
- validateExcelContent(file) // Types, valeurs
- validatePdfContent(file) // Texte extrait
- parseExcelPreview(file) // Affichage preview

// Service: documentService.ts
- getValidationResult(documentId) // Détail validation
```

**Composants**:
```typescript
- FilePreview.tsx // Preview Excel/PDF
- ValidationErrorsDisplay.tsx // Affiche erreurs
- ValidationProgress.tsx // Indicateur progress
- ValidationResultsModal.tsx // Modal détail
```

---

### 3. **Spécifications de type de document par département** ⭐ IMPORTANT
**Status**: Inexistant
**Priorité**: P1

**Manque**:
- [ ] Interface pour configurer types doc par département
- [ ] Mapping Document Type ↔ Département ↔ Dossier
- [ ] Validation que type doc = autorisé pour département
- [ ] UI pour gérer file type requirements (extensions, taille, etc.)
- [ ] Testing que upload respecte specs

**À implémenter**:
```typescript
// Service: documentTypeService.ts (UPGRADE)
- getDocumentTypesByDepartment(deptId)
- createDepartmentDocumentType(data)
- updateDepartmentDocumentType(id, data)
- deleteDepartmentDocumentType(id)
- getFileTypes() // Extensions autorisées par type

// Service: fileTypeService.ts (NEW)
- getFileTypeConfigurations()
- createFileTypeConfig(data)
- validateFileAgainstConfig(file, configId)
```

**Composants**:
```typescript
- DepartmentDocumentTypeManager.tsx // CRUD types par dept
- FileTypeConfigurationUI.tsx // Configurer validations
- DepartmentDocumentTypeList.tsx
```

---

### 4. **Classification automatique par date** ⭐ IMPORTANT
**Status**: Inexistant
**Priorité**: P1

**Manque**:
- [ ] Afficher structure Année/Mois automatique
- [ ] Visualiser où doc sera classé avant upload
- [ ] Interface pour modifier classification
- [ ] Historique des classifications

**À implémenter**:
```typescript
// Afficher organisation physique:
// Department/
//   └── 2026/
//       └── Février/
//           ├── Document1.pdf
//           ├── Document2.xlsx
```

**Composants**:
```typescript
- DocumentClassificationTree.tsx // Visualise structure
- ClassificationPreview.tsx // Avant/après upload
```

---

### 5. **Re-routing de documents** ⭐ IMPORTANT
**Status**: Partiellement documenté (plan existe)
**Priorité**: P1

**Manque**:
- [ ] Modal de re-routing (DocumentRerouteModal.tsx)
- [ ] Historique des transfers
- [ ] Audit trail du re-routing
- [ ] Interface pour transférer documents
- [ ] Validation des permissions

**À implémenter**:
```typescript
// Service: documentTransferService.ts (NEW)
- transferDocument(documentId, transferData)
- getTransferHistory(documentId)
- getTransferAuditTrail()
- getTransferStatistics()

// Service: documentService.ts (UPGRADE)
- rerouteDocument(documentId, targetFolder, reason)
```

**Composants** (du plan):
```typescript
- DocumentRerouteModal.tsx
- DocumentTransferHistory.tsx
- DocumentTransferAuditTrail.tsx
- DocumentTransferStats.tsx
```

---

### 6. **Gestion des tâches en attente** ⭐ IMPORTANT
**Status**: Basique
**Priorité**: P1

**Manque**:
- [ ] Tableau "Mes tâches à reviewer"
- [ ] Filtrer par rôle (à valider, à approuver)
- [ ] Quick approve/reject depuis la liste
- [ ] Bulk actions (approuver plusieurs)
- [ ] Notifications intelligentes

**À implémenter**:
```typescript
// Service: tasksService.ts (NEW)
- getPendingTasks(userId)
- getTasksByStatus(status)
- getTasksAssignedToMe()
- approveBulk(taskIds)
- rejectBulk(taskIds, reason)

// Service: documentService.ts (UPGRADE)
- bulkApprove(documentIds, notes)
- bulkReject(documentIds, reason)
```

**Composants**:
```typescript
- TasksQueue.tsx // Upgrade existant
- TaskQuickActions.tsx // Approve/reject rapide
- BulkActionToolbar.tsx // Actions multi-sélection
- TaskFilters.tsx // Filtrer par type, priorité
```

---

### 7. **Notifications avancées** ⭐ IMPORTANT
**Status**: Basique seulement
**Priorité**: P1

**Manque**:
- [ ] Groupment des notifications
- [ ] Digest quotidien par email
- [ ] Notifications par priorité (URGENT, HIGH, etc.)
- [ ] Gestion des quiet hours avec UI
- [ ] Test de notification
- [ ] Historique détaillé

**À implémenter**:
```typescript
// Service: notificationService.ts (UPGRADE)
- getNotificationsByPriority(priority)
- sendTestNotification()
- getNotificationHistory(filters)
- getDigestPreview()

// Préférences UI complètes
- quiet_hours_enabled toggle
- quiet_start, quiet_end time pickers
- frequency selector
- channel selector
- Priority-based rules
```

**Composants**:
```typescript
- NotificationPreferencesAdvanced.tsx // Upgrade
- NotificationPriorityFilter.tsx
- DigestPreview.tsx
- QuietHoursConfig.tsx
```

---

### 8. **Rapport et Statistiques** ⭐ IMPORTANT
**Status**: Basique
**Priorité**: P1

**Manque**:
- [ ] Graphiques avancés (Recharts, Chart.js)
- [ ] Export données (CSV, PDF, Excel)
- [ ] Statistiques par département
- [ ] Rapport d'approbation/rejet
- [ ] KPIs en temps réel
- [ ] Comparaison périodes

**À implémenter**:
```typescript
// Service: reportsService.ts (UPGRADE)
- getDocumentStatistics(filters)
- getApprovalRates()
- getRejectionReasons()
- getProcessingTimes()
- getStatisticsByDepartment()
- exportToCSV(data)
- exportToPDF(data)
- exportToExcel(data)
```

**Composants**:
```typescript
- StatisticsChart.tsx // Graphiques Recharts
- ApprovalRateCard.tsx
- ProcessingTimeChart.tsx
- DepartmentComparison.tsx
- ExportForm.tsx
```

---

### 9. **Audit trail complet** ⭐ IMPORTANT
**Status**: Basique
**Priorité**: P1

**Manque**:
- [ ] Historique complet de chaque document
- [ ] Qui a fait quoi, quand
- [ ] Timestamps précis
- [ ] Filters avancés (date, user, action)
- [ ] Export audit trail
- [ ] Annotations utilisateur

**À implémenter**:
```typescript
// Service: auditService.ts (NEW)
- getAuditTrail(documentId)
- getAuditsByUser(userId, filters)
- getAuditStatistics()
- exportAuditLog()

// Service: documentService.ts (UPGRADE)
- getDocumentHistory(documentId) // Timeline
- getDocumentComments(documentId) // Commentaires
- addComment(documentId, text)
```

**Composants**:
```typescript
- AuditTrailTimeline.tsx // Timeline des actions
- DocumentComments.tsx // Section commentaires
- AuditFilters.tsx
- AuditExportDialog.tsx
```

---

### 10. **Gestion des utilisateurs avancée** ⭐ IMPORTANT
**Status**: Basique
**Priorité**: P1

**Manque**:
- [ ] Assigner utilisateur à branche/département
- [ ] Gérer les rôles hiérarchiques (POLE_MANAGER, etc.)
- [ ] Bulk import users (CSV)
- [ ] Déactiver/Réactiver utilisateurs
- [ ] Audit des permissions
- [ ] History des changements

**À implémenter**:
```typescript
// Service: userService.ts (UPGRADE)
- assignUserToBranch(userId, branchId)
- assignUserToDepartment(userId, deptId)
- setUserRole(userId, role)
- bulkImportUsers(csvFile)
- bulkUpdateRoles(updates)
- getPermissionMatrix()
- getUserChangeHistory(userId)

// Service: permissionService.ts (NEW)
- canUserApprove(userId, documentId)
- canUserValidate(userId, documentId)
- canUserRoute(userId)
```

**Composants**:
```typescript
- UserRoleAssignment.tsx // Assigner rôles
- BranchDepartmentAssignment.tsx // Assigner branches
- BulkUserImport.tsx // Import CSV
- PermissionMatrix.tsx // Visualiser permissions
- UserAudit.tsx // Historique user
```

---

### 11. **Modèles de documents (Templates)** ⭐ IMPORTANT
**Status**: Existe mais basique
**Priorité**: P2

**Manque**:
- [ ] Créer templates Excel/PDF
- [ ] Galerie de templates
- [ ] Upload et download templates
- [ ] Validation template structure
- [ ] Versioning des templates
- [ ] Preview en ligne des templates

**À implémenter**:
```typescript
// Service: templateService.ts (UPGRADE)
- getTemplates()
- createTemplate(data)
- updateTemplate(id, data)
- downloadTemplate(id)
- validateTemplate(file)
- getTemplateVersions(templateId)
- previewTemplate(templateId)
```

**Composants**:
```typescript
- TemplateGallery.tsx // Galerie templates
- TemplateUploadForm.tsx
- TemplatePreview.tsx
- TemplateVersionHistory.tsx
```

---

### 12. **Interface responsive et UX** ⭐ IMPORTANT
**Status**: Partiellement
**Priorité**: P2

**Manque**:
- [ ] Optimiser pour mobile
- [ ] Sidebar responsive
- [ ] Modals adaptatifs
- [ ] Touches tactiles optimisées
- [ ] Dark mode
- [ ] Accessibilité (a11y)

**À implémenter**:
```typescript
- useMediaQuery hook // Responsive queries
- MobileMenu.tsx // Menu mobile
- MobileNavigation.tsx
- DarkModeToggle.tsx
- AccessibilityUtilities.ts
```

---

### 13. **Recherche et filtrage avancés** ⭐ IMPORTANT
**Status**: Basique
**Priorité**: P2

**Manque**:
- [ ] Filtres multi-critères
- [ ] Recherche fulltext
- [ ] Sauvegarde des filtres (saved searches)
- [ ] Filtres par date (date range picker)
- [ ] Filtres par département/branche
- [ ] Faceted search

**À implémenter**:
```typescript
// Service: searchService.ts (NEW)
- advancedSearch(filters)
- getSavedSearches()
- saveSearch(name, filters)
- deleteSearch(searchId)
- exportSearchResults(searchId)

// Filters
- date range
- department
- status
- document_type
- assigned_to
- priority
```

**Composants**:
```typescript
- AdvancedSearchForm.tsx
- SearchFilters.tsx
- SavedSearches.tsx
- FilterChips.tsx
```

---

### 14. **Performance et optimisation** ⭐ IMPORTANT
**Status**: À améliorer
**Priorité**: P2

**Manque**:
- [ ] Virtualisation des listes (react-window)
- [ ] Lazy loading des images/documents
- [ ] Pagination optimisée
- [ ] Caching intelligent
- [ ] Request debouncing/throttling
- [ ] Code splitting

**À implémenter**:
```typescript
- useLazyLoad hook
- useDebounceSearch hook
- useInfiniteScroll hook
- useRequestCache hook
- VirtualizedList.tsx
```

---

### 15. **Error handling et feedback** ⭐ IMPORTANT
**Status**: Basique
**Priorité**: P2

**Manque**:
- [ ] Toast notifications élégantes
- [ ] Modals d'erreur informatifs
- [ ] Retry logic
- [ ] Offline mode detection
- [ ] Network error handling
- [ ] Form validation errors détaillées

**À implémenter**:
```typescript
// Service: errorService.ts (UPGRADE)
- handleError(error) // Centralisé
- showUserFriendlyError(error)
- getErrorMessage(code)
- retryFailedRequests()

// Composants
- ErrorBoundary.tsx // FallBack
- ErrorToast.tsx // Erreurs inline
- OfflineIndicator.tsx
- NetworkErrorModal.tsx
```

---

## 🔄 Plan de Migration Phase par Phase

### **PHASE 1** (Semaine 1): Hiérarchie organisationnelle
```
✓ Folder service complète
✓ FolderTree component
✓ FolderBrowser component
✓ Update all selectors (branche, department, dossier)
✓ Display full_path on documents
```

**Fichiers à créer**:
- `src/services/folderService.ts` (upgrade)
- `src/components/folders/FolderTree.tsx` (new)
- `src/components/folders/FolderBrowser.tsx` (new)

---

### **PHASE 2** (Semaine 1-2): Validation documents avancée
```
✓ ValidationService new
✓ FilePreview component
✓ ValidationErrors display
✓ Server-side validation integration
✓ Preview before upload
```

**Fichiers à créer**:
- `src/services/validationService.ts` (new)
- `src/components/documents/FilePreview.tsx` (new)
- `src/components/documents/ValidationErrorsDisplay.tsx` (new)

---

### **PHASE 3** (Semaine 2): Re-routing
```
✓ DocumentRerouteModal (du plan)
✓ TransferHistory
✓ transferService
✓ Update DocumentDetail page
```

**Fichiers à créer**:
- `src/services/documentTransferService.ts` (new)
- `src/components/documents/DocumentRerouteModal.tsx` (new)
- `src/components/documents/DocumentTransferHistory.tsx` (new)

---

### **PHASE 4** (Semaine 2-3): Tâches et approvals
```
✓ TasksQueue upgrade
✓ Bulk actions
✓ Quick approve/reject
✓ Task filters
```

**Fichiers à créer**:
- `src/services/tasksService.ts` (new)
- `src/components/tasks/TaskQuickActions.tsx` (new)
- `src/components/tasks/BulkActionToolbar.tsx` (new)

---

### **PHASE 5** (Semaine 3): Notifications avancées
```
✓ Notification preferences upgrade
✓ Priority filtering
✓ Quiet hours UI
✓ Notification history
```

**Fichiers à créer**:
- Upgrade `src/components/notifications/`
- `src/components/notifications/NotificationPreferencesAdvanced.tsx`
- `src/components/notifications/QuietHoursConfig.tsx`

---

### **PHASE 6** (Semaine 3-4): Rapports et stats
```
✓ Charts advanced
✓ Export functionality
✓ Filters
✓ KPIs dashboard
```

**Fichiers à créer**:
- `src/services/reportsService.ts` (upgrade)
- `src/components/reports/StatisticsChart.tsx`
- `src/components/reports/ExportForm.tsx`

---

### **PHASE 7** (Semaine 4): Audit trail
```
✓ AuditService new
✓ Timeline component
✓ Comments system
✓ Export audit log
```

**Fichiers à créer**:
- `src/services/auditService.ts` (new)
- `src/components/audit/AuditTrailTimeline.tsx`
- `src/components/documents/DocumentComments.tsx`

---

### **PHASE 8** (Semaine 4-5): User management avancée
```
✓ Bulk import users
✓ Role assignment
✓ Permission matrix
✓ User audit history
```

**Fichiers à créer**:
- `src/services/userService.ts` (upgrade)
- `src/components/admin/BulkUserImport.tsx`
- `src/components/admin/PermissionMatrix.tsx`

---

## 📊 Tableau Récapitulatif

| Fonctionnalité | Status | Priorité | Effort | Phase |
|---|---|---|---|---|
| Hiérarchie complète | ❌ | P0 | M | 1 |
| Validation Excel | ⚠️ | P0 | M | 2 |
| Document types/Dept | ❌ | P1 | S | 2 |
| Classification auto | ❌ | P1 | S | 1 |
| Re-routing | ⚠️ | P1 | M | 3 |
| Tâches en attente | ⚠️ | P1 | S | 4 |
| Notifications avancées | ⚠️ | P1 | S | 5 |
| Rapports/Stats | ⚠️ | P1 | M | 6 |
| Audit trail | ⚠️ | P1 | M | 7 |
| User management | ⚠️ | P1 | M | 8 |
| Templates | ⚠️ | P2 | S | 9 |
| Responsive UX | ⚠️ | P2 | M | 10 |
| Recherche avancée | ⚠️ | P2 | M | 10 |
| Performance | ⚠️ | P2 | L | 11 |
| Error handling | ⚠️ | P2 | S | 12 |

**Légende**: S=Small (1-3h) | M=Medium (4-8h) | L=Large (1-2 jours)

---

## 🎯 Checklist d'implémentation

### Types & Interfaces à mettre à jour
- [ ] `types/document.ts` - Ajouter DocumentTransfer, ValidationResult
- [ ] `types/folder.ts` - Update Folder avec full_path, level
- [ ] `types/notification.ts` - Ajouter priority, metadata
- [ ] `types/user.ts` - Ajouter rôles hiérarchiques
- [ ] `types/index.ts` - Exporter tous les nouveaux types

### Services à créer/mettre à jour
- [ ] `services/folderService.ts` - Upgrade
- [ ] `services/validationService.ts` - New
- [ ] `services/documentTransferService.ts` - New
- [ ] `services/tasksService.ts` - New
- [ ] `services/auditService.ts` - New
- [ ] `services/searchService.ts` - New
- [ ] `services/reportsService.ts` - Upgrade
- [ ] `services/notificationService.ts` - Upgrade
- [ ] `services/userService.ts` - Upgrade

### Hooks personnalisés à créer
- [ ] `hooks/useFolderTree.ts`
- [ ] `hooks/useDebounceSearch.ts`
- [ ] `hooks/useLazyLoad.ts`
- [ ] `hooks/useMediaQuery.ts`
- [ ] `hooks/useRequestCache.ts`

### Composants à créer
- [ ] `components/folders/FolderTree.tsx`
- [ ] `components/folders/FolderBrowser.tsx`
- [ ] `components/documents/FilePreview.tsx`
- [ ] `components/documents/ValidationErrorsDisplay.tsx`
- [ ] `components/documents/DocumentRerouteModal.tsx`
- [ ] `components/documents/DocumentTransferHistory.tsx`
- [ ] `components/documents/DocumentComments.tsx`
- [ ] `components/tasks/BulkActionToolbar.tsx`
- [ ] `components/tasks/TaskQuickActions.tsx`
- [ ] `components/audit/AuditTrailTimeline.tsx`
- [ ] `components/reports/StatisticsChart.tsx`
- [ ] `components/common/ErrorBoundary.tsx`

### Pages à mettre à jour
- [ ] `pages/agent/Documents.tsx` - Ajouter filters, re-routing
- [ ] `pages/agent/Tasks.tsx` - Upgrade UI
- [ ] `pages/admin/Folders.tsx` - Hierarchical view
- [ ] `pages/admin/Users.tsx` - Bulk import, role assignment
- [ ] `pages/admin/Reports.tsx` - Advanced charts
- [ ] `pages/admin/AuditLogs.tsx` - Create new

### Configuration à mettre à jour
- [ ] `utils/constants.ts` - Ajouter nouveaux endpoints
- [ ] `.env.example` - Nouveaux vars si besoin
- [ ] `tailwind.config.js` - Custom colors/spacing
- [ ] `tsconfig.json` - Path aliases si besoin

---

## 🚀 Prochaines étapes

1. ✅ **Analyse complète** (aujourd'hui) - DONE
2. ⏳ **Implémenter PHASE 1**: Hiérarchie (demain-jour 3)
3. ⏳ **Implémenter PHASE 2-3**: Validation + Re-routing (jour 4-7)
4. ⏳ **Implémenter PHASE 4-5**: Tâches + Notifs (jour 8-10)
5. ⏳ **Implémenter PHASE 6-8**: Stats + Audit + Users (jour 11-15)
6. ⏳ **Polish & Testing**: (jour 16-20)
7. ⏳ **Deployment**: Production (jour 21)

---

## 📝 Notes

- Tous les endpoints API existent déjà au backend
- Focus sur UX/design et user experience
- Tests à implémenter progressivement
- Responsive design prioritaire
- Performance optimization en dernier

---

**Document créé**: 23 février 2026  
**Prochaine révision**: Après implém PHASE 1
