# 🏗️ PLAN COMPLET DE RESTRUCTURATION - FOLDER HIERARCHY UNIFIÉE

## EXECUTIVE SUMMARY

Transformer une architecture **à 3 modèles redondants** (Folder, Branch, Department) en une **hiérarchie unifiée** basée sur le modèle Folder avec types.

### Problèmes Actuels
```
❌ ARCHITECTURE ACTUELLE (Problématique)
├── Folder (hiérarchie autonome)
├── Branch (OneToOne → Folder) → Crée une relation "fantôme"
└── Department (FK → Branch + OneToOne → Folder) → Redondant + limité à 2 niveaux

PROBLÈMES:
1. Trois modèles font la même chose (représenter organisation)
2. Relationen redondantes: Dept → Branch → Folder
3. Impossible d'avoir sous-départements (3e niveau)
4. Code dupliqué dans serializers et viewsets
5. Logique métier éclatée entre 3 modèles
```

### Architecture Cible
```
✅ ARCHITECTURE NOUVELLE (Unifiée)
Folder (avec type structurel implicite par hiérarchie)
├── parent = ForeignKey('self') ← Hiérarchie unique
├── type = CharField(choices=['branch', 'department', 'sub-department']) ← Metadata
└── level = Auto-calculé par profondeur

BÉNÉFICES:
1. UN modèle = UNE source de vérité
2. N niveaux de hiérarchie infinis  
3. Pas de redondance
4. Code plus simple et maintenable
5. API plus cohérente
```

---

## PHASE 1: AUDIT COMPLET

### 1.1 État Actuel de la Base de Données

**Tables Concernées:**
- `folders` (109 colonnes + relations)
- `branches` (~8 colonnes)
- `departments` (~9 colonnes)

**Données Actuelles:**
```
7 Branches (Filiales):
├── Bénin
├── Congo
├── Côte d'Ivoire
├── Cameroun
├── Guinée Équatoriale
├── Guinée
└── Guinée-Bissau

9 Departments (par Filiale):
├── Commercial
├── Direction
├── Finance
├── Logistique
├── Technique
├── Administration
├── Informatique
├── Ressources Humaines
└── Finance (duplicate)

= 63 relations Branch ↔ Folder (7 branches)
= 63 relations Department ↔ Folder ↔ Branch (9 depts × 7 branches)
```

### 1.2 Modèles à Analyser

**Folder (apps/folders/models.py)**
```python
✓ Déjà hierarchique (parent FK)
✓ self-referential
✓ Meta: unique_together=['name', 'parent']
✓ get_full_path() implemented
⚠️ Missing: get_level(), get_type()
⚠️ Missing: folder_type field
```

**Branch (apps/users/models.py)**
```python
- name (unique)
- code (unique)
- country_code (unique ISO-2)
- folder (OneToOne → folders.Folder)
- Problema: OneToOne crée relation "fictive"
Données: 7 records
```

**Department (apps/users/models.py)**
```python
- branch (FK)
- name
- code (unique + branch)
- folder (OneToOne → folders.Folder)
- Problema: Deux ForeignKeys = redondance
Données: 63 records
```

### 1.3 Usages Actuels à Tracker

**Serializers:**
- `apps/users/serializers.py`: BranchSerializer, DepartmentSerializer
- `apps/folders/serializers.py`: FolderSerializer

**Views/Viewsets:**
- `apps/users/viewsets.py`: BranchViewSet, DepartmentViewSet (search + grep needed)
- `apps/folders/viewsets.py`: FolderViewSet (search needed)

**Scripts de Chargement:**
- `backend/load_branches.py` (should be updated/removed)
- `backend/load_departments.py` (should be updated/removed)

**Admin Django:**
- `apps/users/admin.py`: BranchAdmin, DepartmentAdmin (need update)
- `apps/folders/admin.py`: FolderAdmin (need enhancement)

**Relations dans d'autres apps:**
- `apps/documents/models.py`: Peut avoir FK vers Branch/Department
- `apps/routing_rules/models.py`: Peut avoir FK vers Branch/Department
- `apps/notifications/models.py`: Peut avoir FK vers Branch/Department

---

## PHASE 2: DESIGN ARCHITECTURE NOUVELLE

### 2.1 Nouveau Modèle Folder Enrichi

```python
class Folder(models.Model):
    """Modèle unifié représentant Filiale, Département, Sous-département, etc."""
    
    # Hiérarchie
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    
    # Métadonnées structurelles
    folder_type = models.CharField(
        max_length=20,
        choices=[
            ('branch', 'Filiale'),
            ('department', 'Département'),
            ('sub_department', 'Sous-département'),
            ('section', 'Section'),
        ],
        default='section',
        help_text='Type de dossier basé sur hiérarchie'
    )
    
    # Metadata
    code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    country_code = models.CharField(max_length=2, null=True, blank=True)  # Pour branches uniquement
    description = models.TextField(blank=True)
    
    # Ref utilisateur créateur
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'folders'
        unique_together = [['name', 'parent']]
        ordering = ['name']
    
    def get_level(self):
        """Retourne la profondeur: 0=branch, 1=department, 2+=sub"""
        level = 0
        parent = self.parent
        while parent:
            level += 1
            parent = parent.parent
        return level
    
    @property
    def auto_type(self):
        """Auto-détermine le type basé sur profondeur"""
        level = self.get_level()
        if level == 0:
            return 'branch'
        elif level == 1:
            return 'department'
        else:
            return f'sub_department_l{level}'
```

### 2.2 Migration Données

**Strategy:**
1. S'assurer que chaque Branch.folder existe et est à racine (parent=NULL)
2. S'assurer que chaque Department.folder a Branch.folder comme parent
3. Ajouter code + country_code aux Folder racine depuis Branch
4. Une fois vérifiés: Supprimer les contraintes OneToOne
5. Droper les colonnes folder dans Branch/Department
6. Garder les modèles Branch/Department pour compatibilité (deprecated but maintained)

---

## PHASE 3: IMPLÉMENTATION

### 3.1 Steps de Création Migration

```bash
# 1. Créer migration vide
python manage.py makemigrations folders --empty --name "add_folder_type_and_consolidate"

# 2. Remplir la migration avec:
#    - Ajouter folder_type à Folder
#    - Ajouter code à Folder (nullable)
#    - Ajouter country_code à Folder (nullable)
#    - Migrate les données depuis Branch/Department
#    - Renommer colonnes
#    - Ajouter unique_constraint sur code

# 3. Créer deuxième migration pour supprimer colonnes Branch/Department.folder
```

### 3.2 Fichiers à Modifier

**Modèles:**
- [ ] `apps/folders/models.py`: Ajouter folder_type, code, country_code
- [ ] `apps/documents/models.py`: Remplacer FK vers Branch/Department par FK→Folder (si applicable)
- [ ] `apps/routing_rules/models.py`: Idem
- [ ] `apps/notifications/models.py`: Idem

**Serializers:**
- [ ] `apps/folders/serializers.py`: Ajouter auto_type, code, country_code
- [ ] `apps/users/serializers.py`: Créer BranchSerializerV2, DepartmentSerializerV2 qui lisent Folder

**Views/Viewsets:**
- [ ] Créer FolderViewSet avec filtrage par type
- [ ] Mettre à jour BranchViewSet pour lister Folder(type='branch')
- [ ] Mettre à jour DepartmentViewSet pour lister Folder(type='department')
- [ ] Ajouter permissions/filtering appropriés

**Admin:**
- [ ] `apps/users/admin.py`: Ajouter type au BranchAdmin/DepartmentAdmin
- [ ] `apps/folders/admin.py`: Enhancer FolderAdmin avec type selection

**Scripts:**
- [ ] Mettre à jour `load_branches.py`
- [ ] Mettre à jour `load_departments.py`
- [ ] Créer `verify_structure.py` pour valider post-migration

---

## PHASE 4: TESTING STRATEGY

### 4.1 Tests Unitaires
- Test Folder self-referential hierarchy
- Test auto_type calculation
- Test unique_constraint name+parent
- Test code uniqueness pour branches uniquement

### 4.2 Tests d'Intégration
- Branch API endpoints (list, create, update, delete)
- Department API endpoints (list, create, filter by branch)
- Folder API endpoints (list, hierarchy query)
- Document routing avec new structure

### 4.3 Tests Manuels
- Créer filiale via API
- Créer département sous filiale
- Créer sous-département sous département
- Lister hiérarchie complète
- Vérifier droits d'accès par département

---

## ACTIONS IMMÉDIATES

### Now (Phase 1):
1. ✅ Audit complet des usages (Branch/Department references)
2. ✅ Trouver tous les FK vers Branch/Department
3. ✅ Lister tous les serializers et viewsets affectés

### Next (Phase 2-3):
1. Créer migrations Django
2. Ajouter champs à Folder
3. Migrer données
4. Mettre à jour tous les modèles affectés
5. Mettre à jour serializers et viewsets
6. Tester API endpoints

### Final (Phase 4):
1. Valider avec load_branches/departments
2. Tests complets de l'application
3. Documentation d'utilisation

---

## RÉFÉRENCES CRITIQUES

### Fichiers Clés:
- [Folder Model](../apps/folders/models.py)
- [Branch/Department Models](../apps/users/models.py)
- [Folder Serializer](../apps/folders/serializers.py)
- [Branch/Department Serializers](../apps/users/serializers.py)
