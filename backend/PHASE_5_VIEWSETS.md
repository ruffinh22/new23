# 📋 PLAN: Phase 5 - Mise à Jour des ViewSets

## Objectif
Refactoriser les ViewSets pour exposer correctement la **nouvelle hiérarchie Pôle > Filiale > Service**.

---

## 🎯 Actions à Faire

### 1. Analyser ViewSets Actuels
**Fichier**: `apps/folders/views.py`

Identifier:
- `BranchViewSet` (expose les branches actuelles)
- `DepartmentViewSet` (expose les departments actuels)
- Autres endpoints qui utilisent ces types

### 2. Créer Nouveaux ViewSets

#### 2.1 PoleViewSet
```python
class PoleViewSet(viewsets.ModelViewSet):
    """API pour gérer les Pôles (racines)"""
    queryset = Folder.objects.filter(folder_type='pole')
    serializer_class = FolderPoleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    
    def get_queryset(self):
        # Retourner les pôles avec leurs filiales
        return Folder.objects.filter(folder_type='pole').prefetch_related('children')
```

#### 2.2 FilialeViewSet (Renommer BranchViewSet)
```python
class FilialeViewSet(viewsets.ModelViewSet):
    """API pour gérer les Filiales"""
    queryset = Folder.objects.filter(folder_type='filiale')
    serializer_class = FolderBranchSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['parent_id']
    ordering_fields = ['name']
    
    def get_queryset(self):
        # Filtrer par parent (pôle)
        parent_id = self.request.query_params.get('parent')
        qs = Folder.objects.filter(folder_type='filiale')
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        return qs
    
    @action(detail=True, methods=['get'])
    def services(self, request, pk=None):
        """Endpoint pour obtenir les services d'une filiale"""
        filiale = self.get_object()
        services = filiale.children.filter(folder_type='service')
        serializer = FolderServiceSerializer(services, many=True)
        return Response(serializer.data)
```

#### 2.3 ServiceViewSet (Renommer DepartmentViewSet)
```python
class ServiceViewSet(viewsets.ModelViewSet):
    """API pour gérer les Services"""
    queryset = Folder.objects.filter(folder_type='service')
    serializer_class = FolderServiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = ['parent_id', 'folder_type']
    ordering_fields = ['name', 'created_at']
    search_fields = ['name', 'code']
    
    def get_queryset(self):
        # Filtrer par parent (filiale)
        parent_id = self.request.query_params.get('parent')
        qs = Folder.objects.filter(folder_type='service')
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        return qs
    
    @action(detail=True, methods=['get'])
    def sous_services(self, request, pk=None):
        """Endpoint pour obtenir les sous-services"""
        service = self.get_object()
        sous_services = service.children.all()
        serializer = FolderServiceSerializer(sous_services, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def hierarchy(self, request, pk=None):
        """Endpoint pour obtenir le chemin complet"""
        service = self.get_object()
        return Response({
            'id': service.id,
            'name': service.name,
            'full_path': service.get_full_path(),
            'ancestors': [
                {'id': a.id, 'name': a.name, 'type': a.folder_type}
                for a in service.get_ancestors()
            ]
        })
```

### 3. Updating Routers
**Fichier**: `apps/folders/urls.py` ou `config/urls.py`

```python
from rest_framework.routers import DefaultRouter
from apps.folders.views import PoleViewSet, FilialeViewSet, ServiceViewSet

router = DefaultRouter()
router.register(r'poles', PoleViewSet, basename='pole')
router.register(r'filiales', FilialeViewSet, basename='filiale')
router.register(r'services', ServiceViewSet, basename='service')

urlpatterns = router.urls
```

### 4. Maintaining Backward Compatibility

**Option A**: Redirection des anciens endpoints
```python
class BranchViewSet(FilialeViewSet):
    """Legacy endpoint - redirects to FilialeViewSet"""
    pass

class DepartmentViewSet(ServiceViewSet):
    """Legacy endpoint - redirects to ServiceViewSet"""
    pass

router.register(r'branches', BranchViewSet, basename='branch')  # Deprecated
router.register(r'departments', DepartmentViewSet, basename='department')  # Deprecated
```

**Option B**: Déprécie les endpoints anciens
```python
@api_view(['GET'])
def deprecated_branches(request):
    return Response(
        {'error': 'Endpoint deprecated. Use /api/filiales/ instead'},
        status=status.HTTP_410_GONE
    )
```

### 5. Test APIs

#### 5.1 GET /api/poles/
```bash
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8003/api/poles/
# Retourne: [{"id": 1, "name": "Pôle Central", "folder_type": "pole", "filiales_count": 7}]
```

#### 5.2 GET /api/filiales/?parent=1
```bash
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8003/api/filiales/?parent=1
# Retourne: [
#   {"id": 2, "name": "Bénin", "folder_type": "filiale", "services_count": 8},
#   {"id": 3, "name": "Cameroun", "folder_type": "filiale", "services_count": 8},
#   ...
# ]
```

#### 5.3 GET /api/services/?parent=2
```bash
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8003/api/services/?parent=2
# Retourne: [
#   {"id": 10, "name": "Administration", "folder_type": "service", "sous_services_count": 0},
#   {"id": 11, "name": "Commercial", "folder_type": "service", "sous_services_count": 0},
#   ...
# ]
```

#### 5.4 GET /api/services/10/hierarchy/
```bash
curl -H "Authorization: Token YOUR_TOKEN" http://localhost:8003/api/services/10/hierarchy/
# Retourne: {
#   "id": 10,
#   "name": "Administration",
#   "full_path": "Pôle Central / Bénin / Administration",
#   "ancestors": [
#     {"id": 1, "name": "Pôle Central", "type": "pole"},
#     {"id": 2, "name": "Bénin", "type": "filiale"}
#   ]
# }
```

---

## 📦 Dépendances Requises

```python
# Vérifier que ces imports existent
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
```

---

## ⚠️ Points d'Attention

1. **Performance**: Utiliser `select_related()` et `prefetch_related()` pour éviter N+1 queries
2. **Permissions**: Vérifier que les ACLs utilisateur sont appliquées
3. **Filtering**: Supporter filtering par parent pour les hiérarchies
4. **Pagination**: Ajouter pagination si beaucoup de résultats
5. **Backward Compatibility**: Maintenir les anciens endpoints si possible

---

## 📝 Checklist

- [ ] Analyser ViewSets actuels
- [ ] Créer PoleViewSet
- [ ] Créer FilialeViewSet
- [ ] Créer ServiceViewSet
- [ ] Mettre à jour les routes
- [ ] Test unitaire pour chaque ViewSet
- [ ] Test API avec curl / Postman
- [ ] Vérifier les permissions
- [ ] Documenter les changements
- [ ] Merger et déployer

---

**Temps estimé**: 2-3 heures (include tests)
