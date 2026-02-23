# 📋 AUDIT COMPLET DES DÉPENDANCES

## 1. MODÈLES ET RELATIONS

### Branch Model (apps/users/models.py, lignes 21-51)
```
Utilisation:
├── ✅ OneToOneField → Folder (folder)
├── FK origin: RoutingRule.branch
├── FK origin: Department.branch
├── FK origin: User.branch (à vérifier)
└── FK origin: Document.? (à vérifier)
```

### Department Model (apps/users/models.py, lignes 63-89)
```
Utilisation:
├── ✅ ForeignKey → Branch (branch)
├── ✅ OneToOneField → Folder (folder)
├── FK origin: User.department (à vérifier)
└── FK origin: Document.? (à vérifier)
```

### RoutingRule Model (apps/routing_rules/models.py, lignes 100-154)
```python
branch = models.ForeignKey(
    Branch,
    on_delete=models.CASCADE,
    related_name='routing_rules',
    null=True,
    blank=True,
)

🔴 CRITIQUE: Utilisé dans matches() method
  └─ Accédé comme: document.agent.branch
  └─ Comparaison: if self.branch and document.agent.branch != self.branch
  └─ Condition check: if self.branch (peut être NULL)
```

---

## 2. SERIALIZERS

### BranchSerializer (apps/users/serializers.py, lignes 15-31)
```python
Fields:
├── id
├── name
├── code
├── country_code
├── description
├── folder (PK)
├── folder_name (source='folder.name', read_only)
├── departments_count (SerializerMethodField)
├── is_active
├── created_at
├── updated_at

Meta.read_only_fields: ['id', 'folder', 'created_at', 'updated_at']

PROBLÈME: folder est read_only mais dépend de Branch existence
```

### DepartmentSerializer (apps/users/serializers.py, lignes 34-49)
```python
Fields:
├── id
├── name
├── code
├── description
├── folder
├── folder_name
├── branch
├── branch_name
├── users_count (SerializerMethodField)
├── is_active
├── created_at
├── updated_at

Meta.read_only_fields: ['id', 'folder', 'created_at', 'updated_at']

PROBLÈME: Dépend de Branch pour branch_name
```

### FolderSerializer (apps/folders/serializers.py, lignes 5-24)
```python
Fields:
├── id
├── name
├── parent
├── parent_name (source='parent.name', read_only)
├── description
├── full_path (source='get_full_path', read_only)
├── level (source='get_level', read_only)
├── children_count (SerializerMethodField)
├── is_active
├── created_by
├── created_by_name
├── created_at
├── updated_at

Meta.read_only_fields: ['id', 'created_by', 'created_at', 'updated_at']

✅ PRÊT pour unification - pas de dépendances Branch/Department
```

---

## 3. VIEWSETS

### BranchViewSet (apps/users/views.py, lignes 25-50)
```python
class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    
    Actions:
    ├── list (AllowAny)
    ├── retrieve (AllowAny)
    ├── create (IsAdminUser)
    ├── update (IsAdminUser)
    ├── destroy (IsAdminUser)
    ├── choices (AllowAny) - Custom action, retourne Branch.objects.filter(is_active=True)
    └── departments (GET) - Custom action, retourne branch.departments.all()

DÉPENDANCES:
├── BranchSerializer
├── Branch.departments (related)
└── Permissions

À FAIRE:
├── Convertir en FolderViewSet filtré par type='branch'
├── Adapter actions pour lire depuis Folder hierarchy
└── Mettre à jour permissions
```

### DepartmentViewSet (apps/users/views.py, lignes 53-82)
```python
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    
    Serializers:
    ├── DepartmentDetailSerializer (retrieve)
    └── DepartmentSerializer (autres)
    
    Actions:
    ├── list (AllowAny)
    ├── retrieve (AllowAny)
    ├── create (IsAdminUser)
    ├── update (IsAdminUser)
    ├── destroy (IsAdminUser)
    ├── choices (AllowAny) - Retourne Department.objects.filter(is_active=True)
    └── users (GET) - Retourne department.users.all()

DÉPENDANCES:
├── DepartmentSerializer
├── DepartmentDetailSerializer
├── Department.users (related)
└── Permissions

À FAIRE:
├── Convertir en FolderViewSet filtré par type='department'
├── Adapter pour hiérarchie (parent filtering)
└── Mettre à jour permissions
```

### UserViewSet (apps/users/views.py, lignes 85-180)
```python
Usages de Branch/Department:
├── UserCreateSerializer (à vérifier)
├── UserDetailSerializer (à vérifier)
└── User model fields (user.branch, user.department) - À confirmer

À FAIRE: Verifier si fields branch/department dans User model
```

---

## 4. SCRIPTS DE CHARGEMENT

### load_branches.py
```
À EXAMINER:
├── Crée Branch instances
├── Lie à Folder
└── Charge depuis données

À FAIRE: Mettre à jour pour créer Folder(type='branch')
```

### load_departments.py
```
À EXAMINER:
├── Crée Department instances
├── Lie à Branch + Folder
└── Charge depuis données

À FAIRE: Mettre à jour pour créer Folder(type='department') sous parent Folder
```

---

## 5. ADMIN DJANGO

### à inspecter: apps/users/admin.py
```
À FAIRE:
├── BranchAdmin - DOIT être mis à jour
├── DepartmentAdmin - DOIT être mis à jour
└── Possibles: inlines, filters, list_display
```

### à inspecter: apps/folders/admin.py
```
À FAIRE:
├── FolderAdmin - Ajouter folder_type display
├── Ajouter code field
└── Ajouter country_code field (pour branches)
```

---

## 6. FRONTEND (React/Vite)

À EXPLORER (pas encore analysé):
```
├── API calls vers /branches/
├── API calls vers /departments/
├── Selects/dropdowns utilisant Branch/Department
└── Forms créant Branch/Department
```

---

## 7. TESTS

À CHERCHER:
```
├── tests/test_*.py files
├── Tests pour Branch endpoints
├── Tests pour Department endpoints
└── Tests pour routing avec Branch
```

---

## ACTIONS IMMÉDIATES - AUDIT PHASE

### [ ] 1. Vérifier User model
```bash
grep -n "branch\|department" apps/users/models.py | grep -i "ForeignKey\|CharField"
```

### [ ] 2. Inspecter load_branches.py + load_departments.py
```bash
cat backend/load_branches.py
cat backend/load_departments.py
```

### [ ] 3. Lire admin.py complet
```bash
cat apps/users/admin.py | head -100
cat apps/folders/admin.py
```

### [ ] 4. Chercher les usages dans documents app
```bash
grep -n "branch\|department" apps/documents/models.py
```

### [ ] 5. Chercher usages dans frontend
```bash
grep -r "branches\|departments" src/ 2>/dev/null | head -20
```

### [ ] 6. Chercher usages dans routing_rules app
```bash
grep -n "branch" apps/routing_rules/views.py
```

---

## RÉSUMÉ DES IMPACTS

| Composant | Statut | Impact |
|-----------|--------|--------|
| **Modèles** | 🔴 CRITIQUE | Branch + Department doivent être supprimés/refactorisés |
| **Serializers** | 🟡 MOYEN | Adaptation pour lire depuis Folder |
| **Viewsets** | 🟡 MOYEN | Convertir à filtres sur Folder |
| **RoutingRule** | 🔴 CRITIQUE | Remplacer FK Branch → FK Folder |
| **User model** | 🟡 MOYEN | À déterminer (branch + department fields?) |
| **Scripts** | 🟡 MOYEN | Mettre à jour logique création |
| **Admin** | 🟢 FAIBLE | Enhancements cosmétiques |
| **Frontend** | 🟡 MOYEN | Adapter les appels API |
| **Tests** | 🟡 MOYEN | Adapter aux nouveaux endpoints |

---

## NEXT STEPS

1. ✅ AUDIT - Documenter toutes les dépendances (CURRENT)
2. ⏳ IMPLEMENTATION - Exécuter les commandes d'audit ci-dessus
3. ⏳ DESIGN - Finaliser le plan d'implémentation
4. ⏳ MIGRATIONS - Créer les migrations Django
5. ⏳ CODING - Refactoriser models, serializers, viewsets
6. ⏳ TESTING - Tests complets
7. ⏳ VALIDATION - Déploiement local
