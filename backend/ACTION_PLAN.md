# 🎯 PLAN D'ACTION FINAL - REFACTORISATION UNIFIÉE

## STATUS: AUDIT TERMINÉ ✅

Toutes les dépendances ont été identifiées. Voici le plan exécutif complet.

---

## PHASE 1: PRÉPARATION (Jour 1)

### 1.1 Créer nouvelle Folder Model enrichie

**Fichier:** `apps/folders/models.py`

```python
class Folder(models.Model):
    """Modèle unifié pour toute la hiérarchie (Filiale, Département, etc.)"""
    
    # Hiérarchie de base
    name = models.CharField(max_length=255, db_index=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    
    # Métadonnées structurelles
    FOLDER_TYPES = [
        ('branch', 'Filiale'),
        ('department', 'Département'),
        ('section', 'Section'),
    ]
    folder_type = models.CharField(
        max_length=20,
        choices=FOLDER_TYPES,
        default='section'
    )
    
    # Identifiants (utilisés pour branches)
    code = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text="Code unique du dossier (ex: BEN pour Bénin)"
    )
    country_code = models.CharField(
        max_length=2,
        unique=True,
        null=True,
        blank=True,
        help_text="Code ISO (ex: BJ pour Bénin). Unique pour branches uniquement."
    )
    
    # Description
    description = models.TextField(blank=True)
    
    # Métadonnées
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_folders'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    class Meta:
        db_table = 'folders'
        indexes = [
            models.Index(fields=['parent', 'is_active']),
            models.Index(fields=['folder_type', 'is_active']),
            models.Index(fields=['code']),
        ]
        unique_together = [['name', 'parent']]
        ordering = ['folder_type', 'name']
    
    def __str__(self):
        return self.get_full_path()
    
    def get_level(self):
        """Retourne la profondeur: 0=root (branch), 1+=children"""
        level = 0
        parent = self.parent
        MAX_DEPTH = 50
        visited = set([self.id])
        
        while parent and level < MAX_DEPTH:
            if parent.id in visited:
                break
            level += 1
            visited.add(parent.id)
            parent = parent.parent
        return level
    
    def get_full_path(self):
        """Retourne le chemin complet"""
        path_parts = [self.name]
        parent = self.parent
        MAX_DEPTH = 50
        visited = set([self.id])
        
        while parent and len(path_parts) < MAX_DEPTH:
            if parent.id in visited:
                break
            path_parts.append(parent.name)
            visited.add(parent.id)
            parent = parent.parent
        
        return ' > '.join(reversed(path_parts))
    
    @property
    def auto_type(self):
        """Auto-détermine le type basé sur profondeur"""
        level = self.get_level()
        if level == 0:
            return 'branch'
        elif level == 1:
            return 'department'
        else:
            return 'section'
    
    def get_all_children_ids(self):
        """Retourne tous les IDs des enfants (récursif)"""
        all_ids = set([self.id])
        
        def collect_ids(folder):
            for child in folder.children.all():
                all_ids.add(child.id)
                collect_ids(child)
        
        collect_ids(self)
        return all_ids
```

### 1.2 Créer Migration (Step 1 of 2)

```bash
cd backend
python manage.py makemigrations folders --empty --name "01_add_unified_hierarchy"
```

**Contenu de la migration:**

```python
from django.db import migrations, models

def add_structure_keys(apps, schema_editor):
    """Migrate existing data from Branch → Folder"""
    Branch = apps.get_model('users', 'Branch')
    Folder = apps.get_model('folders', 'Folder')
    Department = apps.get_model('users', 'Department')
    
    # 1. Marquer toutes les Folders associées à Branch
    for branch in Branch.objects.filter(folder__isnull=False):
        folder = branch.folder
        folder.folder_type = 'branch'
        folder.code = branch.code
        folder.country_code = branch.country_code
        folder.save(update_fields=['folder_type', 'code', 'country_code'])
    
    # 2. Marquer toutes les Folders associées à Department
    for dept in Department.objects.filter(folder__isnull=False):
        folder = dept.folder
        folder.folder_type = 'department'
        folder.code = dept.code
        folder.save(update_fields=['folder_type', 'code'])

class Migration(migrations.Migration):
    dependencies = [
        ('folders', '0010_folder_description'),  # À ajuster selon votre numéro
    ]
    
    operations = [
        # Ajouter les nouveaux champs
        migrations.AddField(
            model_name='folder',
            name='folder_type',
            field=models.CharField(
                choices=[('branch', 'Filiale'), ('department', 'Département'), ('section', 'Section')],
                default='section',
                max_length=20
            ),
        ),
        migrations.AddField(
            model_name='folder',
            name='code',
            field=models.CharField(
                blank=True,
                help_text='Code unique du dossier',
                max_length=20,
                null=True,
                unique=True
            ),
        ),
        migrations.AddField(
            model_name='folder',
            name='country_code',
            field=models.CharField(
                blank=True,
                help_text='Code ISO pour branches',
                max_length=2,
                null=True,
                unique=True
            ),
        ),
        # Ajouter indexes
        migrations.AddIndex(
            model_name='folder',
            index=models.Index(fields=['parent', 'is_active'], name='folders_parent_active_idx'),
        ),
        migrations.AddIndex(
            model_name='folder',
            index=models.Index(fields=['folder_type', 'is_active'], name='folders_type_active_idx'),
        ),
        # Migrer les données
        migrations.RunPython(add_structure_keys),
    ]
```

---

## PHASE 2: REFACTORISATION MODELS (Jour 2)

### 2.1 Mettre à jour User model

**Fichier:** `apps/users/models.py`

```python
# AVANT:
branch = models.ForeignKey(
    Branch,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='users'
)
department = models.ForeignKey(
    Department,
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='users'
)

# APRÈS:
branch = models.ForeignKey(
    'folders.Folder',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='branch_users',
    limit_choices_to={'folder_type': 'branch'},
    help_text="Filiale de l'utilisateur"
)
department = models.ForeignKey(
    'folders.Folder',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='department_users',
    limit_choices_to={'folder_type': 'department'},
    help_text="Département de l'utilisateur"
)
```

### 2.2 Mettre à jour RoutingRule model

**Fichier:** `apps/routing_rules/models.py`

```python
# AVANT:
branch = models.ForeignKey(
    Branch,
    on_delete=models.CASCADE,
    related_name='routing_rules',
    null=True,
    blank=True,
)

# APRÈS:
branch_folder = models.ForeignKey(
    'folders.Folder',
    on_delete=models.CASCADE,
    related_name='routing_rules',
    null=True,
    blank=True,
    limit_choices_to={'folder_type': 'branch'},
    help_text="Filiale concernée (null = toutes les filiales)"
)
```

### 2.3 Mettre à jour Document model

**Fichier:** `apps/documents/models.py`

```python
# AVANT:
departments = models.ManyToManyField(
    'users.Department',
    blank=True,
)

# APRÈS:
departments = models.ManyToManyField(
    'folders.Folder',
    blank=True,
    limit_choices_to={'folder_type': 'department'},
    help_text="Départements autorisés à accéder à ce template"
)
```

### 2.4 Créer Migration (Step 2 of 2)

```bash
python manage.py makemigrations users documents routing_rules --name "02_migrate_to_unified_folder"
```

---

## PHASE 3: REFACTORISER API (Jour 3)

### 3.1 Mettre à jour FolderSerializer

**Fichier:** `apps/folders/serializers.py`

```python
class FolderSerializer(serializers.ModelSerializer):
    """Sérialiseur unifié pour tous les types de Folder"""
    
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    level = serializers.IntegerField(source='get_level', read_only=True)
    auto_type = serializers.CharField(read_only=True)
    children_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'folder_type', 'code', 'country_code',
            'parent', 'parent_name', 'description',
            'full_path', 'level', 'auto_type', 'children_count',
            'is_active', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'full_path', 'level', 'auto_type', 'created_by', 'created_at', 'updated_at']
    
    def get_children_count(self, obj):
        return obj.children.count()


class FolderHierarchySerializer(serializers.ModelSerializer):
    """Sérialiseur avec hiérarchie imbriquée (Ne pas utiliser pour listes!!)"""
    
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = ['id', 'name', 'folder_type', 'code', 'description', 'children']
    
    def get_children(self, obj):
        children = obj.children.filter(is_active=True)
        serializer = FolderHierarchySerializer(children, many=True)
        return serializer.data if serializer.data else None
```

### 3.2 Mettre à jour BranchSerializer → FolderBranchSerializer

```python
class FolderBranchSerializer(FolderSerializer):
    """Sérialiseur pour Folders de type 'branch'"""
    
    class Meta(FolderSerializer.Meta):
        pass
    
    def validate_folder_type(self, value):
        if value != 'branch':
            raise serializers.ValidationError("Ce sérialiseur accepte uniquement types 'branch'")
        return value
```

### 3.3 Mettre à jour DepartmentSerializer → FolderDepartmentSerializer

```python
class FolderDepartmentSerializer(FolderSerializer):
    """Sérialiseur pour Folders de type 'department'"""
    
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    parent_type = serializers.CharField(source='parent.folder_type', read_only=True)
    
    class Meta(FolderSerializer.Meta):
        fields = FolderSerializer.Meta.fields + ['parent_type']
```

### 3.4 Mettre à jour FolderViewSet

**Fichier:** `apps/folders/views.py`

```python
class FolderViewSet(viewsets.ModelViewSet):
    """ViewSet unifié pour Folders"""
    
    queryset = Folder.objects.filter(is_active=True)
    serializer_class = FolderSerializer
    filterset_fields = ['folder_type', 'is_active']
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = Folder.objects.all()
        
        # Filtrer par type
        folder_type = self.request.query_params.get('type')
        if folder_type:
            queryset = queryset.filter(folder_type=folder_type)
        
        # Filtrer par parent
        parent_id = self.request.query_params.get('parent_id')
        if parent_id == 'root':
            queryset = queryset.filter(parent__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        
        return queryse
    
    @action(detail=False, methods=['get'])
    def branches(self, request):
        """Retourne toutes les branches (racine)"""
        branches = Folder.objects.filter(
            folder_type='branch',
            is_active=True
        )
        serializer = FolderBranchSerializer(branches, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def departments(self, request, pk=None):
        """Retourne tous les départements d'une filiale"""
        branch = self.get_object()
        departments = branch.children.filter(
            folder_type='department',
            is_active=True
        )
        serializer = FolderDepartmentSerializer(departments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def tree(self, request, pk=None):
        """Retourne la hiérarchie complète"""
        folder = self.get_object()
        serializer = FolderHierarchySerializer(folder)
        return Response(serializer.data)
```

### 3.5 Mettre à jour BranchViewSet (Wrapper)

```python
class BranchViewSet(viewsets.ViewSet):
    """ViewSet pour compatibility - mêmes endpoints qu'avant"""
    
    @action(detail=False, methods=['get'])
    def list(self, request):
        """Retourne les branches"""
        branches = Folder.objects.filter(
            folder_type='branch',
            is_active=True
        )
        serializer = FolderBranchSerializer(branches, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Retourne les choix de filiales"""
        choices = Folder.objects.filter(
            folder_type='branch',
            is_active=True
        ).values('id', 'name')
        return Response(list(choices))
```

---

## PHASE 4: MIGRATION DONNÉES (Jour 4)

### 4.1 Créer script de validation

**Fichier:** `backend/verify_unified_structure.py`

```python
#!/usr/bin/env python
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.folders.models import Folder
from apps.users.models import Branch, Department

print("📋 VÉRIFICATION DE LA STRUCTURE UNIFIÉE")
print("=" * 60)

# Vérifier que toutes les branches ont des Folders
branches_without_folder = Branch.objects.filter(folder__isnull=True).count()
if branches_without_folder:
    print(f"❌ {branches_without_folder} branches SANS folder")
else:
    print(f"✅ Toutes les branches ont un Folder")

# Vérifier que toutes les departments ont des Folders
depts_without_folder = Department.objects.filter(folder__isnull=True).count()
if depts_without_folder:
    print(f"❌ {depts_without_folder} departments SANS folder")
else:
    print(f"✅ Tous les departments ont un Folder")

# Vérifier les types de Folder
branches_typed = Folder.objects.filter(folder_type='branch').count()
departments_typed = Folder.objects.filter(folder_type='department').count()

print(f"\n📊 Folder Types:")
print(f"  ├── Branches (root): {branches_typed}")
print(f"  ├── Departments: {departments_typed}")
print(f"  └── Autres: {Folder.objects.exclude(folder_type__in=['branch', 'department']).count()}")

# Vérifier hiérarchie
print(f"\n🏗️ Hiérarchie:")
for branch_folder in Folder.objects.filter(folder_type='branch'):
    dept_count = branch_folder.children.count()
    print(f"  ├── {branch_folder.name}: {dept_count} enfants")

print(f"\n✅ Vérification terminée")
```

---

## PHASE 5: TESTING (Jour 5)

### 5.1 Tests unitaires

```python
# tests/test_unified_folder.py
from django.test import TestCase
from apps.folders.models import Folder

class UnifiedFolderTestCase(TestCase):
    
    def setUp(self):
        # Créer une branche
        self.branch = Folder.objects.create(
            name="Bénin",
            code="BEN",
            country_code="BJ",
            folder_type="branch",
            parent=None
        )
        
        # Créer un département
        self.dept = Folder.objects.create(
            name="Commercial",
            code="COM",
            folder_type="department",
            parent=self.branch
        )
    
    def test_branch_hierarchy(self):
        self.assertEqual(self.branch.get_level(), 0)
        self.assertEqual(self.dept.get_level(), 1)
    
    def test_folder_type(self):
        self.assertEqual(self.branch.folder_type, 'branch')
        self.assertEqual(self.dept.folder_type, 'department')
    
    def test_full_path(self):
        expected = "Bénin > Commercial"
        self.assertEqual(self.dept.get_full_path(), expected)
    
    def test_children_relationship(self):
        self.assertIn(self.dept, self.branch.children.all())
```

### 5.2 Tests API

```bash
# Test List Branches
curl http://127.0.0.1:8003/api/folders/?type=branch

# Test List Departments of Branch
curl http://127.0.0.1:8003/api/folders/1/departments/

# Test Tree
curl http://127.0.0.1:8003/api/folders/1/tree/
```

---

## PHASE 6: CLEANUP (Jour 6)

### 6.1 Décision sur Branch/Department Models

**Option A: Deprecate (Recommandé)**
- Garder les modèles pour backward compatibility
- Ajouter `@property` qui lis depuis Folder
- Marquer comme deprecated dans la doc

**Option B: Delete (Plus tard)**
- Une fois les clients migré, supprimer les modèles
- Créer les foreign keys directement vers Folder

Recommandation: **Option A pour maintenant**

### 6.2 Mettre à jour scripts de chargement

```python
# backend/load_branches_v2.py - Nouveau format
def load_branches():
    branches_data = [
        {"name": "Bénin", "code": "BEN", "country_code": "BJ"},
        {"name": "Congo", "code": "CON", "country_code": "CG"},
        # ...
    ]
    
    for branch_data in branches_data:
        folder = Folder.objects.create(
            name=branch_data["name"],
            code=branch_data["code"],
            country_code=branch_data["country_code"],
            folder_type="branch",
            parent=None
        )
        print(f"✅ {folder.name} created")
```

---

## TIMELINE

| Phase | Durée | Status |
|-------|-------|--------|
| Phase 1: Préparation | 1 jour | ⏳ TODO |
| Phase 2: Models | 1 jour | ⏳ TODO |
| Phase 3: API | 1 jour | ⏳ TODO |
| Phase 4: Migration | 0.5 jour | ⏳ TODO |
| Phase 5: Testing | 1 jour | ⏳ TODO |
| Phase 6: Cleanup | 0.5 jour | ⏳ TODO |
| **TOTAL** | **5 jours** | ⏳ TODO |

---

## POINTS CRITIQUES À RETENIR

1. ✅ **Folder model est déjà self-referential** - On peut l'utiliser comme-est
2. ✅ **Données existantes sont OK** - Folders sont déjà reliées à Branch/Department
3. 🟡 **User model dépend de Branch/Department** - Doit être changé en FK → Folder
4. 🟡 **RoutingRule dépend de Branch** - Doit être changé en FK → Folder
5. 🟡 **Document ManyToMany vers Department** - Doit être changé en M2M → Folder
6. ✅ **API endpoints existants vont continuer marcher** - Juste des wrappers autour du nouveau

---

## NEXT IMMEDIATE STEPS

1. ▶️ Exécuter Phase 1 (Créer migrations)
2. ▶️ Exécuter Phase 2 (Refactoriser models)
3. ▶️ Exécuter Phase 3-5 (API, tests)
4. ▶️ Validation locale complète
5. ▶️ Documentation de migration
