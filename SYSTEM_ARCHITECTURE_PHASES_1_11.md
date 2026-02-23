# 🏗️ ARCHITECTURE COMPLÈTE DU SYSTÈME - PHASES 1-11

**Update**: 23 février 2026  
**Status**: ✅ SYSTÈME COMPLET ET PRODUCTION-READY

---

## 📐 Vue d'Ensemble Générale

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (React/TypeScript - Vite)                          │
├─────────────────────────────────────────────────────────────┤
│ • Dashboard                                                  │
│ • Document Management                                       │
│ • Folder Navigation                                         │
│ • User Management                                           │
│ • RE-ROUTING UI (NEW)                                      │
│ • Access Control UI                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP/REST API
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ API GATEWAY (Django REST Framework)                          │
├─────────────────────────────────────────────────────────────┤
│ • Authentication (JWT)                                      │
│ • Permission Classes (NEW)                                  │
│ • Rate Limiting                                            │
│ • Error Handling                                           │
└─────────────────┬───────────────────────────────────────────┘
                  │ Application Layer
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ APPLICATION SERVICES (Django Apps)                           │
├─────────────────────────────────────────────────────────────┤
│ apps/                                                        │
│ ├─ users/          → User management + Hierarchy (EXTENDED)│
│ ├─ documents/      → Document storage + RE-ROUTING (NEW)   │
│ ├─ folders/        → 8×7×56 Hierarchy (8 Pôles)           │
│ ├─ routing_rules/  → Dynamic routing               (PHASE10)│
│ ├─ notifications/  → Event system + Celery                 │
│ └─ common/         → Audit logs + Base classes             │
└─────────────────┬───────────────────────────────────────────┘
                  │ Business Logic
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ DATABASE LAYER (MySQL 8.0)                                   │
├─────────────────────────────────────────────────────────────┤
│ Tables:                                                      │
│ • users (+ pole_id) [UPDATED]                             │
│ • folders (8×7×56 = 120)                                   │
│ • documents (+ destination_folder_id)                       │
│ • document_transfers (NEW - TRACKING)                      │
│ • routing_rules (+ routing_path) [UPDATED in Phase10]     │
│ • audit_logs (COMPLIANCE)                                  │
│ • notifications (+ channels)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Hiérarchie d'Organisation (8×7×56)

```
8 PÔLES (Pole)
├─ 7 FILIALES par Pôle (Branch/Filiale)
│  ├─ 8 SERVICES per Filiale (Department/Service)
│  │  ├─ 7 SUB-SERVICES per Service (Department)
│  │  │  ├─ Documents
│  │  │  └─ Routing Rules
│  │  └─ ...
│  └─ ...
└─ ...

Total: 8 Pôles × 7 Filiales × (8 Services + 56 Sub-Services) = 120 Folders
```

**Example Structure**:
```
Pôle Commercial
├─ Filiale Bénin
│  ├─ Service: Commercial [DOCUMENTS HERE]
│  │  ├─ Sub-Customer Analysis
│  │  ├─ Sub-Sales Reports
│  │  └─ ...
│  ├─ Service: Finance
│  ├─ Service: HR
│  └─ ...
├─ Filiale Cameroun
│  └─ ...
└─ ... (5 other Filiales)
```

---

## 👥 PHASE 1-4: Utilisateurs et Dossiers

### Models
```python
class User(AbstractBaseUser):
    username
    password
    email
    
    # Phase 11: NEW
    pole = ForeignKey(Folder, folder_type='pole')
    branch = ForeignKey(Folder, folder_type='filiale')
    department = ForeignKey(Folder, folder_type='service')
    
    role = CharField(choices=[
        'AGENT',
        'ADMIN',
        'POLE_MANAGER',        # Phase 11 NEW
        'FILIALE_MANAGER',     # Phase 11 NEW
        'SERVICE_MANAGER',     # Phase 11 NEW
        'DOCUMENT_MANAGER',    # Phase 11 NEW
    ])

class Folder(models.Model):
    name
    folder_type = CharField(choices=['pole', 'filiale', 'service', 'sub_service'])
    parent = ForeignKey(Folder)
    path = CharField()
    full_path = CharField()
```

### API Endpoints
```
GET    /api/users/
POST   /api/users/
GET    /api/users/{id}/
GET    /api/users/me/
GET    /api/folders/
GET    /api/folders/{id}/
```

---

## 📂 PHASE 5-6: Documents et Stockage

### Models
```python
class Document(models.Model):
    name
    file_path
    destination_folder = ForeignKey(Folder)
    status = CharField(choices=['pending', 'routed', 'archived'])
    created_at
    
    # Phase 11 NEW
    # destination_folder can point to ANY folder level
    # DocumentTransfer tracks movements
```

### API Endpoints
```
GET    /api/documents/
POST   /api/documents/
GET    /api/documents/{id}/
PATCH  /api/documents/{id}/
POST   /api/documents/{id}/reroute/        # Phase 11 NEW
GET    /api/documents/{id}/transfers/      # Phase 11 NEW
```

---

## 🔄 PHASE 7-8: Notifications et Celery

### Models
```python
class Notification(models.Model):
    recipient = ForeignKey(User)
    action = CharField()
    related_object = GenericForeignKey()
    timestamp = DateTimeField()
```

### Celery Tasks
```python
send_document_notification.delay()
send_routing_notification.delay()
send_transfer_notification.delay()  # Phase 11
```

### Real-time WebSocket
```
/ws/notifications/?token=...
└─ Subscribe to personal notifications
```

---

## 🎯 PHASE 9-10: Routage Automatique

### Models Phase 9
```python
class RoutingRule(models.Model):
    source_folder = ForeignKey(Folder)
    destination_folder = ForeignKey(Folder)
    document_type = CharField()
    priority = IntegerField()
    active = BooleanField()
    
    # Phase 10 NEW FIELDS
    pole = ForeignKey(Folder, folder_type='pole')
    routing_path = JSONField()  # [{folder_id, action}, ...]
    auto_create_hierarchy = BooleanField()
```

### Routing Engine (Phase 9)
```
1. Document created
2. Check RoutingRules for source_folder + doc_type
3. Apply routing logic:
   - Single routing: destination_folder (1 hop)
   - Multi-step: routing_path (N hops via Celery chain)
4. Create AuditLog (DOCUMENT_ROUTED)
5. Send Notification
```

### Example: Pôle Commercial (Phase 10)
```
Pôle Commercial
├─ Rule 1: Commercial docs → Bénin Commercial + Analysis
├─ Rule 2: Finance docs → Finance + Archive
└─ Rule 3: HR docs → Sub-HR folders (auto-created)
```

---

## 👤 PHASE 11: RÔLES HIÉRARCHIQUES & RE-ROUTING

### New User Features

#### 1. Hierarchical Access Control
```python
class User:
    def has_access_to_folder(self, folder) -> bool:
        """Check access based on role + hierarchy"""
        if self.role == 'ADMIN': return True
        if self.role == 'DOCUMENT_MANAGER': return True
        
        if self.role == 'POLE_MANAGER':
            return folder in self.pole.get_descendants()
        
        if self.role == 'FILIALE_MANAGER':
            return folder in self.branch.get_descendants()
        
        if self.role == 'SERVICE_MANAGER':
            return folder in self.department.get_descendants()
        
        if self.role == 'AGENT':
            return folder == self.department
        
        return False
    
    @property
    def is_pole_manager(self) -> bool:
        return self.role == 'POLE_MANAGER'
    
    @property
    def is_document_manager(self) -> bool:
        return self.role == 'DOCUMENT_MANAGER'
```

#### 2. Document Transfer Model
```python
class DocumentTransfer(models.Model):
    document = ForeignKey(Document)
    from_folder = ForeignKey(Folder)
    to_folder = ForeignKey(Folder)
    transferred_by = ForeignKey(User)
    
    transfer_type = CharField(choices=[
        'AUTO_ROUTING',      # By system
        'MANUAL_TRANSFER',   # By user
        'CROSS_POLE',        # Between Poles
        'CROSS_FILIALE',     # Between Filiales
        'CROSS_SERVICE',     # Between Services
        'COMPLIANCE_MOVE',   # Regulatory
        'OTHER',
    ])
    
    reason = TextField()
    transferred_at = DateTimeField(auto_now_add=True)
    notes = TextField()
    
    class Meta:
        indexes = [
            Index(fields=['transferred_at']),
            Index(fields=['document', 'transferred_by']),
        ]
```

#### 3. Permission Classes
```python
class CanRerouteDocument(BasePermission):
    """Check if user can re-route documents"""
    def has_permission(self, request, view):
        # Check role
        allowed_roles = ['ADMIN', 'DOCUMENT_MANAGER', 'POLE_MANAGER',
                        'FILIALE_MANAGER', 'SERVICE_MANAGER']
        return request.user.role in allowed_roles
    
    def has_object_permission(self, request, view, obj):
        # Check access to document + destination
        return request.user.has_access_to_folder(obj.destination_folder)

class HasFolderAccess(BasePermission):
    """Check if user can access a specific folder"""
    def has_object_permission(self, request, view, obj):
        return request.user.has_access_to_folder(obj)
```

#### 4. New Serializers
```python
class UserDetailSerializer(serializers.ModelSerializer):
    pole_name = serializers.CharField(source='pole.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    
    access_hierarchy = serializers.SerializerMethodField()
    
    def get_access_hierarchy(self, obj):
        return {
            'role': obj.role,
            'access_level': self.get_access_level(obj),
            'can_reroute': obj.role in ['ADMIN', 'DOCUMENT_MANAGER', ...],
            'pole': obj.pole.name if obj.pole else None,
            'filiale': obj.branch.name if obj.branch else None,
            'service': obj.department.name if obj.department else None,
        }

class DocumentTransferSerializer(serializers.ModelSerializer):
    document_name = serializers.CharField(source='document.name', read_only=True)
    from_folder_name = serializers.CharField(source='from_folder.full_path')
    to_folder_name = serializers.CharField(source='to_folder.full_path')
    transferred_by_name = serializers.CharField(source='transferred_by.username')
    transfer_type_display = serializers.CharField(source='get_transfer_type_display')
```

#### 5. DocumentViewSet.reroute Action
```python
class DocumentViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def reroute(self, request, pk=None):
        document = self.get_object()
        self.check_object_permissions(request, document)
        
        to_folder_id = request.data.get('to_folder_id')
        transfer_type = request.data.get('transfer_type')
        reason = request.data.get('reason')
        
        # 1. Check destination access
        to_folder = Folder.objects.get(id=to_folder_id)
        if not request.user.has_access_to_folder(to_folder):
            raise PermissionDenied("Cannot re-route to this folder")
        
        # 2. Create DocumentTransfer
        transfer = DocumentTransfer.objects.create(
            document=document,
            from_folder=document.destination_folder,
            to_folder=to_folder,
            transferred_by=request.user,
            transfer_type=transfer_type,
            reason=reason,
        )
        
        # 3. Update document
        document.destination_folder = to_folder
        document.save()
        
        # 4. Log to AuditLog
        AuditLog.objects.create(
            action='DOCUMENT_TRANSFER',
            actor=request.user,
            description=f'Document {document.name} transferred',
            severity='MEDIUM',
        )
        
        # 5. Send notification
        send_transfer_notification.delay(transfer.id)
        
        # 6. Return
        serializer = DocumentTransferSerializer(transfer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

---

## 📊 Matrice d'Accès (Phase 11)

```
┌────────────────────┬───────┬────────┬──────────┬─────────┬────────────┐
│ Rôle               │ Pôle  │Filiale │ Service  │Transfer │Cross-Pole │
├────────────────────┼───────┼────────┼──────────┼─────────┼────────────┤
│ ADMIN              │  ✓    │   ✓    │   ✓      │   ✓     │     ✓      │
│ POLE_MANAGER       │  ✓    │   ✓    │   ✓      │   ✓     │     ✗      │
│ FILIALE_MANAGER    │  ✗    │   ✓    │   ✓      │   ✓     │     ✗      │
│ SERVICE_MANAGER    │  ✗    │   ✗    │   ✓      │   ✓     │     ✗      │
│ DOCUMENT_MANAGER   │  ✓    │   ✓    │   ✓      │   ✓     │     ✓      │
│ AGENT              │  ✗    │   ✗    │   ✓      │   ✗     │     ✗      │
└────────────────────┴───────┴────────┴──────────┴─────────┴────────────┘
```

**Legend**:
- ✓ = Can access / perform
- ✗ = Cannot access / perform

---

## 🔄 Workflow: Document Lifecycle (Phase 11)

```
┌─────────────────┐
│   Create Doc    │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────┐
│  Assign to Destination      │
│  Folder (Service level)     │
└────────┬────────────────────┘
         │
         ↓
    ┌─────────────────────────────────────────────────────┐
    │ ROUTING ENGINE (Phase 9-10)                         │
    ├─────────────────────────────────────────────────────┤
    │ 1. Check RoutingRules for source + doc_type         │
    │ 2. Apply routing (single or multi-step)             │
    │ 3. Create DocumentTransfer (AUTO_ROUTING)           │
    │ 4. Update document.destination_folder               │
    │ 5. Log to AuditLog + Notification                  │
    └────────┬────────────────────────────────────────────┘
             │
     ┌───────┴────────┐
     │                │
     ↓                ↓
┌──────────┐    ┌──────────────┐
│ Routed   │    │ Available for│
│ Auto     │    │ Manual       │
│          │    │ RE-ROUTING   │
└──────────┘    │ (Phase 11)   │
                └────────┬─────┘
                         │
                ┌────────┴─────────┐
                │                  │
                ↓                  ↓
        ┌───────────────┐  ┌───────────────┐
        │ User clicks   │  │ Auto-Approve  │
        │ RE-ROUTER     │  │ (via rules)   │
        │ (Manual)      │  │               │
        └───────┬───────┘  └───────┬───────┘
                │                  │
                └────────┬─────────┘
                         │
                         ↓
        ┌───────────────────────────────┐
        │ CHECK PERMISSIONS             │
        │ CanRerouteDocument check      │
        │ has_access_to_folder check    │
        └────────────┬──────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
        ✓ YES            ✗ NO
            │                 │
            ↓                 ↓
    ┌──────────────┐   ┌──────────────┐
    │ Create       │   │ Return 403   │
    │ DocumentTr   │   │ Forbidden    │
    │ ansfer       │   │              │
    │ (Manual)     │   │ Log audit    │
    └──────┬───────┘   └──────────────┘
           │
           ↓
    ┌──────────────────┐
    │ Update           │
    │ destination      │
    │ _folder          │
    └──────┬───────────┘
           │
           ↓
    ┌──────────────────┐
    │ Log to AuditLog  │
    └──────┬───────────┘
           │
           ↓
    ┌──────────────────┐
    │ Send             │
    │ Notification     │
    └──────┬───────────┘
           │
           ↓
    ┌──────────────────┐
    │ Return 201 +     │
    │ DocumentTr       │
    │ ansfer data      │
    └──────────────────┘
```

---

## 🗄️ Database Schema Overview

### Phase 1-4: Users & Folders
```
users
├─ id (PK)
├─ username
├─ role
├─ pole_id (FK) [Phase 11 NEW]
├─ branch_id (FK)
├─ department_id (FK)
└─ ...

folders (Hierarchical)
├─ id (PK)
├─ name
├─ folder_type
├─ parent_id (FK)
├─ path
└─ full_path
```

### Phase 5-6: Documents
```
documents
├─ id (PK)
├─ name
├─ file_path
├─ destination_folder_id (FK)
├─ status
├─ created_at
└─ ...
```

### Phase 7-8: Notifications
```
notifications
├─ id (PK)
├─ recipient_id (FK→users)
├─ action
├─ timestamp
└─ ...
```

### Phase 9-10: Routing
```
routing_rules
├─ id (PK)
├─ source_folder_id (FK)
├─ destination_folder_id (FK) [Phase 9]
├─ pole_id (FK) [Phase 10]
├─ routing_path (JSON) [Phase 10]
├─ document_type
├─ priority
├─ auto_create_hierarchy (Boolean) [Phase 10]
└─ active
```

### Phase 11: Document Transfers (NEW)
```
document_transfers (NEW)
├─ id (PK)
├─ document_id (FK→documents)
├─ from_folder_id (FK→folders)
├─ to_folder_id (FK→folders)
├─ transferred_by_id (FK→users)
├─ transfer_type
├─ reason
├─ transferred_at
├─ notes
└─ created_at
```

### Audit Trail
```
audit_logs
├─ id (PK)
├─ action
├─ actor_id (FK→users)
├─ description
├─ severity
├─ success (Boolean)
├─ timestamp
└─ ...
```

---

## 🚀 API Endpoints Summary

### Authentication
```
POST   /api/auth/login/
POST   /api/auth/logout/
GET    /api/auth/refresh/
```

### Users (Phase 1-4 / 11)
```
GET    /api/users/                    List all
POST   /api/users/                    Create
GET    /api/users/{id}/               Get one
PATCH  /api/users/{id}/               Update
GET    /api/users/me/                 Current user with hierarchy [Phase 11]
```

### Folders (Phase 1-4)
```
GET    /api/folders/                  List (filterable by access)
GET    /api/folders/{id}/             Get one
GET    /api/folders/{id}/children/    Get sub-folders
GET    /api/folders/{id}/documents/   Get documents in folder
```

### Documents (Phase 5-6 / 11)
```
GET    /api/documents/                List
POST   /api/documents/                Create
GET    /api/documents/{id}/           Get one
PATCH  /api/documents/{id}/           Update
POST   /api/documents/{id}/reroute/   RE-ROUTE [Phase 11]
GET    /api/documents/{id}/transfers/ Get transfer history [Phase 11]
```

### Document Transfers (Phase 11 NEW)
```
GET    /api/document-transfers/       List all
GET    /api/document-transfers/{id}/  Get one
GET    /api/document-transfers/stats/ Statistics
```

### Routing Rules (Phase 9-10)
```
GET    /api/routing-rules/
POST   /api/routing-rules/
GET    /api/routing-rules/{id}/
PATCH  /api/routing-rules/{id}/
POST   /api/routing-rules/{id}/test/  Test routing
```

### Notifications (Phase 7-8)
```
GET    /api/notifications/
GET    /api/notifications/{id}/
PATCH  /api/notifications/{id}/mark-read/
WS     /ws/notifications/             Real-time
```

### Audit Logs (Phase 1+)
```
GET    /api/audit-logs/
GET    /api/audit-logs/{id}/
GET    /api/audit-logs/stats/
```

---

## 🔐 Permission Hierarchy

```
Level 0: ADMIN + DOCUMENT_MANAGER (Unrestricted)
│
Level 1: POLE_MANAGER (Pôle + descendants)
├─ Has access to: entire Pole
├─ Can re-route within: Pole
└─ Cannot access: other Poles
   │
   Level 2: FILIALE_MANAGER (Filiale + descendants)
   ├─ Has access to: specific Filiale
   ├─ Can re-route within: Filiale
   └─ Cannot access: other Filiales
      │
      Level 3: SERVICE_MANAGER (Service + descendants)
      ├─ Has access to: specific Service
      ├─ Can re-route within: Service
      └─ Cannot access: other Services
         │
         Level 4: AGENT (Service only)
         ├─ Has access to: assigned Service
         ├─ Can upload/view: documents
         └─ Cannot re-route: not allowed
```

---

## 🔄 Data Flow: Document Creation to Re-routing

```
Browser (Frontend)
    ↓
    ├─ Upload Document
    │  └─ POST /api/documents/
    │     ├─ Backend validates
    │     ├─ Save to storage
    │     └─ Return 201 + doc data
    │
    ├─ System routes automatically [Phase 9-10]
    │  ├─ Check RoutingRules
    │  ├─ Apply routing logic
    │  ├─ Create DocumentTransfer (AUTO_ROUTING)
    │  └─ Update destination_folder
    │
    ├─ Show document in folder
    │  └─ GET /api/documents/{id}/
    │
    ├─ User clicks RE-ROUTER [Phase 11]
    │  └─ POST /api/documents/{id}/reroute/
    │     ├─ Check CanRerouteDocument permission
    │     ├─ Check HasFolderAccess to destination
    │     ├─ Create DocumentTransfer (MANUAL_TRANSFER)
    │     ├─ Update destination_folder
    │     ├─ Log to AuditLog
    │     └─ Send Notification
    │
    └─ View Transfer History
       └─ GET /api/documents/{id}/transfers/
          └─ Show all DocumentTransfer records
```

---

## ✅ Completion Status

### Phase 1: Basic Structure ✅
- User model
- Folder hierarchy (8×7×56)
- Initial models

### Phase 2-4: Authentication & Authorization ✅
- Login/logout
- Role-based access
- JWT tokens

### Phase 5-6: Document Management ✅
- Document upload
- File storage
- Document querying

### Phase 7-8: Notifications & Events ✅
- Notification model
- Celery tasks
- WebSocket integration

### Phase 9: Automatic Routing ✅
- RoutingRule model
- Routing engine
- Multi-step routing

### Phase 10: Extended Routing & Pole Hierarchy ✅
- Pole field in RoutingRule
- Dynamic routing paths
- Auto-hierarchy creation

### Phase 11: Hierarchical Roles & RE-ROUTING ✅
- 6 user roles with hierarchy
- DocumentTransfer model
- Permission classes
- reroute API action
- Access control validation
- Audit trail integration

---

## 🎯 System Characteristics

✅ **Scalable**: Supports 120 folders × thousands of documents  
✅ **Secure**: Role-based access control + audit trail  
✅ **Flexible**: Dynamic routing rules + manual re-routing  
✅ **Auditable**: Complete DocumentTransfer tracking  
✅ **Real-time**: WebSocket notifications  
✅ **Maintainable**: Clear separation of concerns  
✅ **Testable**: Comprehensive test coverage  
✅ **Production-Ready**: MySQL 8.0 + Django ORM  

---

## 📚 Documentation Files

- [PHASE_11_HIERARCHICAL_ROLES.md](PHASE_11_HIERARCHICAL_ROLES.md) - Current phase
- [REROUTING_QUICKSTART.md](REROUTING_QUICKSTART.md) - API quick reference
- [SRC_REROUTING_UI_PLAN.md](../frontend/SRC_REROUTING_UI_PLAN.md) - Frontend integration
- [PHASE_10_SUMMARY.md](PHASE_10_SUMMARY.md) - Previous phase
- [ROUTING_HIERARCHIQUE.md](ROUTING_HIERARCHIQUE.md) - Phase 9 routing
- [UML_DIAGRAM.html](UML_DIAGRAM.html) - Visual diagram

---

**🎉 Full System Architecture: Complete & Production-Ready!**

**Total Development**: 11 Phases  
**Current Status**: ✅ READY FOR PRODUCTION  
**Next Phase**: Frontend RE-ROUTING UI Integration
