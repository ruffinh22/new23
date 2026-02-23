# 🔧 VERIFICATION & MAINTENANCE COMMANDS

**Phase 11 System Verification & Deployment Checklist**

---

## ✅ Vérification Pré-Déploiement

### 1. Vérifier la Santé du Système

```bash
# Backend health
cd backend/
python manage.py check
# Expected: System check identified no issues (0 silenced)

# Frontend health (if available)
cd ../frontend/
npm run build
# Expected: Build success
```

### 2. Vérifier les Migrations

```bash
cd backend/

# List all migrations
python manage.py showmigrations

# Expected output includes:
# users
#  [X] 0001_initial
#  [X] 0002_add_pole_hierarchy    ← Phase 11
# documents
#  [X] 0001_initial
#  [X] 0002_document_transfer     ← Phase 11 (might be 0003)
#  [X] 0003_add_document_transfer  ← Depends on your version
```

### 3. Vérifier la Base de Données

```bash
cd backend/

# Check if pole column exists
python manage.py shell
>>> from django.db import connection
>>> cursor = connection.cursor()
>>> cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users_user'")
>>> columns = [row[0] for row in cursor.fetchall()]
>>> print('pole_id' in columns)
True  # Should be True
>>> exit()

# Or use dbshell
python manage.py dbshell
mysql> DESCRIBE users_user;
mysql> SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users_user' AND COLUMN_NAME='pole_id';
# Should show: pole_id
mysql> exit;
```

### 4. Vérifier les Tables de Transfer

```bash
cd backend/
python manage.py shell

>>> from django.db import connection
>>> cursor = connection.cursor()
>>> cursor.execute("SHOW TABLES")
>>> tables = [row[0] for row in cursor.fetchall()]
>>> 'documents_documenttransfer' in tables
True  # Should be True
>>> exit()
```

### 5. Run Tests

```bash
cd backend/

# Run Phase 11 specific tests
python manage.py test apps.users.tests -v 2
python manage.py test apps.documents.tests -v 2

# Run all tests
python manage.py test -v 2

# Expected: All tests pass ✅
```

---

## 🚀 Deployment Steps

### Step 1: Backup Database

```bash
# Backup current database
mysqldump -u root -p sgdra_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### Step 2: Pull Latest Code

```bash
cd /path/to/sgdra

# Pull from git
git pull origin main

# Check for changes
git log --oneline -5
```

### Step 3: Install/Update Dependencies

```bash
cd backend/

# Install Python dependencies
pip install -r requirements.txt

# Verify installations
pip list | grep django
pip list | grep celery
pip list | grep drf
```

### Step 4: Run Migrations

```bash
cd backend/

# Apply migrations
python manage.py migrate

# Expected output:
# Running migrations:
#   No migrations to apply.
# or
#   Applying users.0002_add_pole_hierarchy... OK
#   Applying documents.0003_add_document_transfer... OK
```

### Step 5: Collect Static Files

```bash
cd backend/

# Collect static files
python manage.py collectstatic --noinput

# Expected: "... static files copied to ..."
```

### Step 6: Restart Services

```bash
# Restart Django/Daphne
sudo systemctl restart sgdra-django

# Restart Celery
sudo systemctl restart sgdra-celery

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status sgdra-django
sudo systemctl status sgdra-celery
sudo systemctl status nginx
```

### Step 7: Verify Deployment

```bash
# Test API
curl -X GET http://localhost:8000/api/users/me/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: User details with new 'pole' field ✅
```

---

## 📊 Data Verification Commands

### 1. Check User Roles

```bash
cd backend/
python manage.py shell

>>> from apps.users.models import User
>>> 
>>> # Count users by role
>>> for role, display in User.ROLE_CHOICES:
...     count = User.objects.filter(role=role).count()
...     print(f"{display}: {count}")
...
ADMIN: 1
AGENT: 5
POLE_MANAGER: 2
FILIALE_MANAGER: 3
SERVICE_MANAGER: 4
DOCUMENT_MANAGER: 1

>>> exit()
```

### 2. Check User Hierarchy

```bash
cd backend/
python manage.py shell

>>> from apps.users.models import User
>>> from apps.folders.models import Folder
>>>
>>> # Check POLE_MANAGER user
>>> pm = User.objects.get(username='pierre_pole')
>>> print(f"Role: {pm.role}")
Role: POLE_MANAGER
>>> print(f"Pole: {pm.pole}")
Pole: Pôle Commercial
>>> print(f"Access to Bénin: {pm.has_access_to_folder(Folder.objects.get(name='Bénin'))}")
Access to Bénin: True
>>>
>>> # Check SERVICE_MANAGER user
>>> sm = User.objects.get(username='service_manager_user')
>>> print(f"Role: {sm.role}")
Role: SERVICE_MANAGER
>>> print(f"Service: {sm.department}")
Service: Commercial
>>> print(f"Access to Commercial: {sm.has_access_to_folder(sm.department)}")
Access to Commercial: True
>>> print(f"Access to Finance: {sm.has_access_to_folder(Folder.objects.get(name='Finance'))}")
Access to Finance: False
>>>
>>> exit()
```

### 3. Check Document Transfers

```bash
cd backend/
python manage.py shell

>>> from apps.documents.models import DocumentTransfer
>>>
>>> # List all transfers
>>> transfers = DocumentTransfer.objects.all()
>>> print(f"Total transfers: {transfers.count()}")
Total transfers: 5
>>>
>>> # Show transfer details
>>> for t in transfers[:3]:
...     print(f"\n{t.document.name}")
...     print(f"  From: {t.from_folder.full_path}")
...     print(f"  To: {t.to_folder.full_path}")
...     print(f"  Type: {t.get_transfer_type_display()}")
...     print(f"  By: {t.transferred_by.username}")
...
>>>
>>> exit()
```

### 4. Check Permissions

```bash
cd backend/
python manage.py shell

>>> from apps.users.models import User
>>> from apps.documents.permissions import CanRerouteDocument
>>> from rest_framework.request import Request
>>> from django.test import RequestFactory
>>>
>>> # Create mock request
>>> factory = RequestFactory()
>>> django_request = factory.post('/api/documents/1/reroute/')
>>> django_request.user = User.objects.get(username='pierre_pole')
>>> request = Request(django_request)
>>>
>>> # Check permission
>>> permission = CanRerouteDocument()
>>> allowed = permission.has_permission(request, None)
>>> print(f"Pierre can re-route: {allowed}")
Pierre can re-route: True
>>>
>>> exit()
```

---

## 🐛 Troubleshooting

### Issue 1: Migration Failed

**Error**: `django.db.utils.ProgrammingError: Unknown column 'pole_id'`

**Solution**:
```bash
cd backend/

# Check migration status
python manage.py showmigrations users | grep 0002

# If not applied, apply it
python manage.py migrate users 0002_add_pole_hierarchy

# If stuck, fake it (BE CAREFUL!)
python manage.py migrate users 0002_add_pole_hierarchy --fake

# Then verify
python manage.py dbshell
mysql> DESCRIBE users_user;
```

### Issue 2: Permission Denied on RE-ROUTER

**Error**: `403 Forbidden - You do not have permission`

**Solution**:
```bash
cd backend/
python manage.py shell

>>> from apps.users.models import User
>>> user = User.objects.get(username='problematic_user')
>>> print(f"Role: {user.role}")

# If role is AGENT:
>>> user.role = 'FILIALE_MANAGER'  # Change to appropriate role
>>> user.save()
>>> print(f"Updated role: {user.role}")

>>> exit()
```

### Issue 3: DocumentTransfer Table Missing

**Error**: `OperationalError: no such table: documents_documenttransfer`

**Solution**:
```bash
cd backend/

# Check migration status
python manage.py showmigrations documents | grep transfer

# If not applied, apply it
python manage.py migrate documents

# If table exists but migration not marked, fake it
python manage.py migrate documents --fake-initial
```

### Issue 4: Serializer Field Error

**Error**: `Serializer 'DocumentTransferSerializer' has invalid field 'Unknown'`

**Solution**:
```bash
cd backend/

# Check imports in serializers.py
grep -n "DocumentTransfer" apps/documents/serializers.py
grep -n "DocumentTransfer" apps/users/serializers.py

# Fix imports if needed
# Ensure DocumentTransferSerializer is in documents/serializers.py
# And imported correctly in views.py
```

---

## 📈 Performance Monitoring

### 1. Check Database Indexes

```bash
python manage.py shell

>>> from django.db import connection
>>> cursor = connection.cursor()
>>> 
>>> # Check indexes on document_transfers
>>> cursor.execute("SHOW INDEXES FROM documents_documenttransfer")
>>> for index in cursor.fetchall():
...     print(index)
...
>>> exit()
```

### 2. Monitor API Response Time

```bash
# Use curl with timing
curl -X GET http://localhost:8000/api/documents/ \
  -w "\nTime: %{time_total}s\n" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: <1s for typical queries
```

### 3. Check Celery Tasks

```bash
# If using Celery with Redis/RabbitMQ
python manage.py celery inspect active

# Check pending tasks
python manage.py celery inspect reserved

# Check worker status
python manage.py celery inspect stats
```

---

## 📋 Maintenance Tasks

### Daily Tasks

```bash
# Check for errors in logs
tail -20 /var/log/sgdra/django.log
tail -20 /var/log/sgdra/celery.log

# Check disk space
df -h /path/to/media

# Check database size
mysql -u root -p -e "SELECT table_name, ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb FROM information_schema.TABLES WHERE table_schema='sgdra_dev' ORDER BY size_mb DESC;"
```

### Weekly Tasks

```bash
# Backup database
mysqldump -u root -p sgdra_dev > backup_$(date +%Y%m%d).sql

# Archive old audit logs (older than 30 days)
python manage.py shell < archive_old_logs.py

# Cleanup temporary files
find /path/to/temp -type f -mtime +7 -delete
```

### Monthly Tasks

```bash
# Optimize database tables
mysql -u root -p -e "OPTIMIZE TABLE sgdra_dev.*;"

# Review and clean old document transfers
python manage.py shell < cleanup_old_transfers.py

# Generate audit report
python manage.py shell < generate_audit_report.py
```

---

## 🔍 Quick Diagnostics

### System Status Check

```bash
#!/bin/bash
# save as: check_system.sh

echo "=== SYSTEM STATUS ==="
echo "Django: $(python manage.py check 2>&1 | grep -c 'no issues')"
echo "Database: $(python manage.py dbshell -e 'SELECT 1' 2>&1 | grep -c '1')"
echo "Users: $(python manage.py shell -c 'from apps.users.models import User; print(User.objects.count())')"
echo "Documents: $(python manage.py shell -c 'from apps.documents.models import Document; print(Document.objects.count())')"
echo "Transfers: $(python manage.py shell -c 'from apps.documents.models import DocumentTransfer; print(DocumentTransfer.objects.count())')"
echo "Migrations: $(python manage.py showmigrations --plan 2>&1 | grep -c '\[X\]')"
```

### Run Diagnostic

```bash
chmod +x check_system.sh
./check_system.sh
```

---

## 🚨 Emergency Recovery

### If API is Down

```bash
# 1. Check if Django is running
ps aux | grep django

# 2. Check logs
tail -50 /var/log/sgdra/django.log

# 3. Restart services
sudo systemctl restart sgdra-django
sleep 5
curl http://localhost:8000/

# 4. If still down, restore from backup
mysql -u root -p sgdra_dev < backup_20260223.sql
```

### If Database is Corrupted

```bash
# 1. Make backup of current state
mysqldump -u root -p sgdra_dev > backup_corrupted.sql

# 2. Restore from last known good backup
mysql -u root -p sgdra_dev < backup_20260220.sql

# 3. Check integrity
python manage.py check

# 4. Re-apply recent migrations if needed
python manage.py migrate
```

---

## ✅ Post-Deployment Verification

```bash
# After deploying Phase 11, run these checks:

cd backend/

# 1. System check
python manage.py check
# ✅ Expected: System check identified no issues

# 2. Migration check
python manage.py showmigrations | grep -E "(users|documents)"
# ✅ Expected: [X] 0002_add_pole_hierarchy
# ✅ Expected: [X] 0003_add_document_transfer

# 3. Data check
python manage.py shell -c "
from apps.users.models import User
from apps.documents.models import DocumentTransfer
print(f'✅ Users: {User.objects.count()}')
print(f'✅ In different roles: {set(User.objects.values_list(\"role\", flat=True))}')
print(f'✅ Transfers tracked: {DocumentTransfer.objects.count()}')
"

# 4. API check
curl -s http://localhost:8000/api/ | python -m json.tool
# ✅ Expected: JSON with API endpoints including /document-transfers/

# 5. Permission check
python manage.py shell -c "
from apps.documents.permissions import CanRerouteDocument
from apps.users.models import User
from django.test import RequestFactory
from rest_framework.request import Request

factory = RequestFactory()
django_request = factory.post('/api/documents/1/reroute/')
django_request.user = User.objects.filter(role='POLE_MANAGER').first()
request = Request(django_request)
perm = CanRerouteDocument()
print(f'✅ POLE_MANAGER can re-route: {perm.has_permission(request, None)}')
"

echo "✅ ALL VERIFICATION CHECKS PASSED!"
```

---

## 📞 Support & Escalation

**System Health Issues**: Check logs and run diagnostics  
**Data Issues**: Check DatabaseIntegrity + restore backup if needed  
**Permission Issues**: Verify user roles and has_access_to_folder() method  
**Performance Issues**: Check indexes, database size, API response times  

---

**🎯 Maintenance Checklist Ready!**
