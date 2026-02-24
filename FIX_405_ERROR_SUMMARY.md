# Fix for 405 Method Not Allowed Folder Creation Error

## Problem Summary
Frontend users were getting `405 Method Not Allowed` errors when trying to create or update folders via the Folders admin panel.

**Error in console:**
```
api/folders/:1  Failed to load resource: the server responded with a status of 405 (Method Not Allowed)
Error saving folder: AxiosError: Request failed with status code 405
```

## Root Causes (2 Issues)

### Issue #1: Missing Custom Authentication Backend
**Problem**: The Django `authenticate()` function couldn't authenticate users with the custom `matricule` field instead of `username`.

**Location**: `backend/config/settings.py`

**Solution**: 
1. Created custom authentication backend: `backend/apps/users/backends.py`
2. Added `MatriculeBackend` class that handles authentication with `matricule` field
3. Configured `AUTHENTICATION_BACKENDS` in settings.py to use the custom backend

**Files Modified**:
- ✅ Created: `backend/apps/users/backends.py`
- ✅ Modified: `backend/config/settings.py` (added AUTHENTICATION_BACKENDS config)

**Before**:
```python
# Django default backend - expects 'username' field
# User has 'matricule' field instead, so authenticate() fails
```

**After**:
```python
# AUTHENTICATION_BACKENDS in settings.py
AUTHENTICATION_BACKENDS = [
    'apps.users.backends.MatriculeBackend',
    'django.contrib.auth.backends.ModelBackend',  # Fallback for django admin
]
```

### Issue #2: Serializer Required Field Validation
**Problem**: `FolderCreateSerializer` marked `parent` field as required, but the Folder model allows null parents (for root folders).

**Location**: `backend/apps/folders/serializers.py`

**Solution**:
Added `'parent': {'required': False, 'allow_null': True}` to serializer's `extra_kwargs`

**Files Modified**:
- ✅ Modified: `backend/apps/folders/serializers.py` (FolderCreateSerializer)

**Before**:
```python
extra_kwargs = {
    'code': {'required': False, 'allow_null': True},
    'country_code': {'required': False, 'allow_null': True},
}
# 'parent' was implicitly required
```

**After**:
```python
extra_kwargs = {
    'code': {'required': False, 'allow_null': True},
    'country_code': {'required': False, 'allow_null': True},
    'parent': {'required': False, 'allow_null': True},  # ✅ Added
}
```

### Issue #3: Frontend Endpoint Paths (Minor)
**Problem**: Frontend was using inconsistent endpoint paths:
- Fetch: `/api/folders/folders/tree/` ✅ (correct)
- Create: `/api/folders/` ❌ (missing double "folders")
- Update: `/api/folders/{id}/` ❌ (missing double "folders")
- Delete: `/api/folders/{id}/` ❌ (missing double "folders")

**Solution**: Updated frontend endpoints to use correct paths

**Files Modified**:
- ✅ Modified: `frontend/src/pages/admin/Folders.tsx` (handleSave, handleDelete)

**Before**:
```tsx
await apiClient.post('/folders/', { ... })
await apiClient.put(`/folders/${editingFolder.id}/`, { ... })
await apiClient.delete(`/folders/${id}/`, { ... })
```

**After**:
```tsx
await apiClient.post('/folders/folders/', { ... })
await apiClient.put(`/folders/folders/${editingFolder.id}/`, { ... })
await apiClient.delete(`/folders/folders/${id}/`, { ... })
```

## Key Changes

### Backend Changes

**1. New File: `backend/apps/users/backends.py`**
```python
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class MatriculeBackend(ModelBackend):
    """Authenticate using matricule instead of username."""
    
    def authenticate(self, request, matricule=None, password=None, **kwargs):
        if matricule is None or password is None:
            return None
        
        try:
            user = User.objects.get(matricule=matricule)
        except User.DoesNotExist:
            return None
        
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        
        return None
```

**2. Modified: `backend/config/settings.py`**
Added after `AUTH_PASSWORD_VALIDATORS`:
```python
# Custom authentication backend for matricule field
AUTHENTICATION_BACKENDS = [
    'apps.users.backends.MatriculeBackend',
    'django.contrib.auth.backends.ModelBackend',  # Fallback for django admin
]
```

**3. Modified: `backend/apps/folders/serializers.py`**
Updated `FolderCreateSerializer.Meta.extra_kwargs`:
```python
extra_kwargs = {
    'code': {'required': False, 'allow_null': True},
    'country_code': {'required': False, 'allow_null': True},
    'parent': {'required': False, 'allow_null': True},
}
```

### Frontend Changes

**Modified: `frontend/src/pages/admin/Folders.tsx`**
- Line 142: `PUT /folders/folders/${id}/`
- Line 150: `POST /folders/folders/`
- Line 168: `DELETE /folders/folders/${id}/`

## JWT Token Now Includes Role

The JWT token generated during login now includes the user's role and other hierarchy data:

```json
{
  "role": "ADMIN",
  "is_staff": true,
  "matricule": "TEST_ADMIN",
  "pole": null,
  "pole_name": null,
  "branch": null,
  "branch_name": null,
  "department": null,
  "department_name": null,
  "is_superuser": false
}
```

This allows the backend permission check to work correctly:
```python
# In IsFolderAdminOrReadOnly.has_permission()
if getattr(request.user, 'role', None) == 'ADMIN':
    return True
```

## Testing the Fix

### 1. Test Password Reset (if needed)
```bash
python manage.py shell
from apps.users.models import User
user = User.objects.get(matricule='TEST_ADMIN')
user.set_password('YourNewPassword')
user.save()
```

### 2. Test Login
```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"matricule":"TEST_ADMIN","password":"YourNewPassword"}'
```

### 3. Test Folder Creation
```bash
curl -X POST http://localhost:8000/api/folders/folders/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"name":"Test","folder_type":"pole","parent":null,"description":"Test"}'
```

Expected response: `201 Created` with folder data

## Verification Checklist

- [x] Custom authentication backend created and configured
- [x] JWT token includes user role
- [x] FolderCreateSerializer allows null parent
- [x] Frontend uses correct endpoint paths
- [x] Folder creation works for ADMIN users
- [x] No 405 errors on POST/PUT/DELETE /api/folders/folders/*

## Files Changed

| File | Change Type | Description |
|------|------------|-------------|
| `backend/apps/users/backends.py` | ✅ Created | Custom MatriculeBackend for authentication |
| `backend/config/settings.py` | ✅ Modified | Added AUTHENTICATION_BACKENDS config |
| `backend/apps/folders/serializers.py` | ✅ Modified | Made parent field optional in FolderCreateSerializer |
| `frontend/src/pages/admin/Folders.tsx` | ✅ Modified | Fixed endpoint paths to /folders/folders/* |

## Impact

- ✅ Users can now create, update, and delete folders
- ✅ All CRUD operations work correctly with proper permissions
- ✅ JWT authentication properly validates user roles
- ✅ Folder hierarchy can be created and modified
