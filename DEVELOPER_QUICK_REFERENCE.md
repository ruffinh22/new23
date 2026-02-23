# 🚀 SGDRA Developer Quick Reference

**Purpose**: Fast onboarding guide for developers  
**Last Updated**: 2026-02-23  
**Status**: Production Ready ✅  

---

## 🏃 Quick Start (5 minutes)

### 1. Setup Environment
```bash
cd /home/lidruf/sgdra/sgdra

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (in new terminal)
cd frontend
npm install
npm run dev
```

### 2. Access
- API: http://localhost:8000/api/
- API Docs: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/admin/

---

## 📁 Project Structure

```
Backend Organization:
├── apps/
│   ├── users/ (LoginViewSet, UserViewSet, RoleViewSet)
│   ├── documents/ (DocumentViewSet, DocumentShareViewSet)
│   ├── folders/ (FolderViewSet, DepartmentViewSet)
│   ├── routing_rules/ (RoutingRuleViewSet)
│   ├── notifications/ (NotificationViewSet, NotificationConsumer)
│   └── common/ (Logger utility, AuditLog)
├── config/ (settings.py, celery.py, urls.py)
└── manage.py
```

---

## 🔐 Key Authentication

```python
# Get token
POST /api/auth/login/
{
  "username": "user@example.com",
  "password": "password"
}

# Use token
Header: Authorization: Bearer <token>

# Refresh
POST /api/auth/refresh/
{
  "refresh": "<refresh_token>"
}
```

---

## 📚 Common API Endpoints

### Users
```
GET    /api/users/                    # List users
POST   /api/users/                    # Create user
GET    /api/users/{id}/               # Get user
PATCH  /api/users/{id}/               # Update user
DELETE /api/users/{id}/               # Delete user
```

### Documents
```
GET    /api/documents/                # List documents
POST   /api/documents/                # Create/upload
GET    /api/documents/{id}/           # Get document
POST   /api/documents/{id}/approve/   # Approve
POST   /api/documents/{id}/reject/    # Reject
POST   /api/documents/{id}/transfer/  # Transfer
POST   /api/documents/{id}/share/     # Share document
```

### Notifications
```
GET    /api/notifications/            # List notifications
GET    /api/notifications/{id}/       # Get notification
POST   /api/notifications/{id}/mark-read/    # Mark read
DELETE /api/notifications/{id}/              # Delete/archive
GET    /api/notifications/unread-count/     # Unread count (TODO)
POST   /api/notifications/preferences/      # Update preferences (TODO)
```

### Routing
```
GET    /api/routing-rules/            # List rules
POST   /api/routing-rules/            # Create rule
PATCH  /api/routing-rules/{id}/       # Update rule
DELETE /api/routing-rules/{id}/       # Delete rule
```

---

## 🎯 Common Tasks

### Create Notification
```python
from apps.notifications.service_refactored import NotificationService

# Single notification
NotificationService.create_notification(
    recipient=user,
    notification_type='DOCUMENT_UPLOADED',
    title='New document uploaded',
    message='Document "Report 2026" uploaded',
    document=doc,
    priority='HIGH',
    metadata={'uploaded_by': 123, 'department': 'Finance'}
)

# Batch notifications
NotificationService.batch_create_notifications([
    {
        'recipient': user1,
        'notification_type': 'DOCUMENT_APPROVED',
        'title': 'Document approved',
        'message': '...',
        'document': doc1,
        'priority': 'NORMAL'
    },
    {
        'recipient': user2,
        'notification_type': 'DOCUMENT_APPROVED',
        'title': 'Document approved',
        'message': '...',
        'document': doc2,
        'priority': 'NORMAL'
    }
])
```

### Mark All Notifications as Read
```python
# Single API call (bulk update)
NotificationService.mark_all_as_read(user)
# Updates all unread → read in 1 query
```

### Route Document
```python
from apps.routing_rules.engine import RoutingEngine

RoutingEngine.apply_routing_rules(document)
# Applies all matching rules, creates routing entries
```

### Share Document
```python
from apps.documents.models import DocumentShare

share = DocumentShare.objects.create(
    document=doc,
    shared_by=current_user,
    shared_with=other_user,
    permission='VIEW',  # or 'EDIT', 'ADMIN'
    expires_at=timezone.now() + timedelta(days=30)
)
```

### Add User to Department
```python
from apps.users.models import User, Department

user = User.objects.get(id=1)
dept = Department.objects.get(id=5)
user.departments.add(dept)
```

---

## 🔗 WebSocket Integration

### Connect (JavaScript)
```javascript
const ws = new WebSocket('ws://localhost:8003/ws/notifications/');

ws.onopen = () => {
    console.log('Connected');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'notification_new') {
        // Single notification
        console.log('New notification:', data.data);
        updateUI(data.data);
    } else if (data.type === 'notification_batch') {
        // Multiple notifications
        console.log('Batch:', data.data);
        data.data.forEach(notif => updateUI(notif));
    } else if (data.type === 'notification_badge_update') {
        // Update badge count
        document.title = `${data.data.unread} notifications`;
    }
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    console.log('Disconnected');
};
```

### Send Commands
```javascript
// Mark single as read
ws.send(JSON.stringify({
    command: 'mark_as_read',
    notification_id: 123
}));

// Mark all as read (bulk)
ws.send(JSON.stringify({
    command: 'mark_all_as_read'
}));

// Archive notification
ws.send(JSON.stringify({
    command: 'archive',
    notification_id: 123
}));

// Get unread count
ws.send(JSON.stringify({
    command: 'get_unread'
}));

// Ping (keep connection alive)
ws.send(JSON.stringify({
    command: 'ping'
}));
```

---

## 📊 Database Queries (Optimized)

### Get User with Departments
```python
from django.db.models import Prefetch
from apps.users.models import User, Department

user = User.objects.prefetch_related(
    Prefetch('departments')
).get(id=1)
# 2 queries: User + Departments (not N+1)
```

### Get Documents with Related Data
```python
docs = Document.objects.select_related(
    'created_by',
    'department',
    'specification'
).filter(
    is_archived=False
).order_by('-created_at')[:100]
# 1 query with JOIN + pagination
```

### Search Documents
```python
from django.db.models import Q

docs = Document.objects.filter(
    Q(title__icontains='report') | 
    Q(description__icontains='report'),
    is_archived=False
).select_related('created_by', 'department')
```

---

## 🧪 Testing

### Unit Tests
```bash
# Run all tests
python manage.py test

# Run specific test file
python manage.py test apps.documents.tests_unit

# With coverage
coverage run --source='.' manage.py test
coverage report
```

### Manual Testing
```python
# Django shell
python manage.py shell

from apps.users.models import User
from apps.documents.models import Document

user = User.objects.first()
doc = Document.objects.create(
    title='Test',
    created_by=user,
    department=user.departments.first()
)
print(doc)
```

---

## 🐛 Debugging

### Enable Debug Logging
```python
# In management command or shell
import logging
logging.basicConfig(level=logging.DEBUG)

# Or use logger utility
from apps.common.logger import notifications_logger
notifications_logger.debug('Debug message', extra={'key': 'value'})
```

### Check Celery Task
```bash
# Monitor tasks
celery -A config worker --loglevel=debug

# In shell
from apps.notifications.tasks import send_notification_email_async
task = send_notification_email_async.delay(notification_id=1)
print(task.status)  # PENDING, SUCCESS, FAILURE
```

### Query Performance
```python
# See SQL queries
from django.db import connection
from django.test.utils import CaptureQueriesContext

with CaptureQueriesContext(connection) as queries:
    # Your code
    pass

print(f"Queries: {len(queries)}")
for query in queries:
    print(query['sql'][:100])
```

---

## 📝 Important Files

### Backend
| File | Purpose |
|------|---------|
| `config/settings.py` | Django settings (DEBUG, DATABASES, INSTALLED_APPS) |
| `config/celery.py` | Celery configuration (broker, schedule) |
| `apps/notifications/service_refactored.py` | Notification service (core logic) |
| `apps/notifications/consumers.py` | WebSocket consumers (real-time) |
| `apps/notifications/tasks.py` | Async email tasks |
| `apps/common/logger.py` | Centralized logging utility |
| `apps/documents/views.py` | Document ViewSets (API) |
| `apps/users/models.py` | User model (core) |

### Frontend
| File | Purpose |
|------|---------|
| `src/services/api.ts` | API client (axios) |
| `src/services/websocket.ts` | WebSocket client |
| `src/components/NotificationBell.vue` | Notification UI |
| `src/views/Dashboard.vue` | Main dashboard |

---

## 🔧 Configuration

### Django Settings (Production)
```python
# config/settings.py (production)
DEBUG = False
ALLOWED_HOSTS = ['example.com']
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'sgdra',
        'USER': 'sgdra_user',
        'PASSWORD': 'secure_password',
        'HOST': 'localhost',
        'PORT': '3306',
    }
}
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
```

### Environment Variables
```bash
# .env (production)
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=mysql://user:pass@host:3306/sgdra
REDIS_URL=redis://localhost:6379/0
ALLOWED_HOSTS=example.com,www.example.com
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

---

## 🚨 Error Handling

### Common Errors & Solutions

#### 1. Migration Conflicts
```bash
# Reset migrations (DEV ONLY)
python manage.py migrate notifications zero
python manage.py makemigrations notifications
python manage.py migrate notifications

# OR apply manually
python manage.py migrate --run-syncdb
```

#### 2. Permission Denied
```python
# Check user permissions
from apps.users.models import User
user = User.objects.get(id=1)
print(user.is_admin)
print(user.get_departments())
```

#### 3. WebSocket Connection Error
```javascript
// Check ASGI configuration
// Check Redis running: redis-cli ping
// Check consumer routing: config/asgi.py
```

#### 4. Celery Task Not Running
```bash
# Check worker
celery -A config worker --loglevel=debug

# Check Redis
redis-cli ping

# Check task queue
celery -A config inspect active
```

---

## 📈 Performance Tips

1. **Use Pagination**
   ```python
   from rest_framework.pagination import PageNumberPagination
   # Always paginate large result sets
   ```

2. **Cache Results**
   ```python
   from django.views.decorators.cache import cache_page
   @cache_page(60 * 5)  # 5 minutes
   def my_view(request):
       pass
   ```

3. **Bulk Operations**
   ```python
   # Bad: 1000 queries
   for user in users:
       Notification.objects.create(...)
   
   # Good: 1 query
   Notification.objects.bulk_create([
       Notification(...) for user in users
   ])
   ```

4. **Use select_related/prefetch_related**
   ```python
   # Bad: N+1 query
   docs = Document.objects.all()
   for doc in docs:
       print(doc.created_by.name)  # N queries
   
   # Good: 2 queries
   docs = Document.objects.select_related('created_by')
   ```

---

## 🔐 Security Checklist

- ✅ Use HTTPS in production
- ✅ Set `SECURE_SSL_REDIRECT = True`
- ✅ Use CSRF tokens on forms
- ✅ Validate all input
- ✅ Use parameterized queries (ORM)
- ✅ Implement rate limiting
- ✅ Hash passwords (built-in)
- ✅ Use secure cookies
- ✅ Set CORS headers properly
- ✅ Rotate secret keys regularly

---

## 📞 Support Resources

- Django Docs: https://docs.djangoproject.com/
- Django REST Framework: https://www.django-rest-framework.org/
- Channels (WebSocket): https://channels.readthedocs.io/
- Celery (Async Tasks): https://docs.celeryproject.org/
- MySQL Docs: https://dev.mysql.com/doc/
- Redis Docs: https://redis.io/documentation

---

## 🎓 Learning Path

1. **Week 1**: Django basics, ORM, ViewSets
2. **Week 2**: Serializers, permissions, authentication
3. **Week 3**: REST API design, pagination, filtering
4. **Week 4**: WebSocket, Channels, real-time updates
5. **Week 5**: Celery, async tasks, background jobs
6. **Week 6**: Testing, debugging, performance tuning
7. **Week 7**: Deployment, monitoring, maintenance

---

## 🏁 Next Steps After Reading

1. Read [PHASE_4_NOTIFICATIONS_COMPLETE.md](PHASE_4_NOTIFICATIONS_COMPLETE.md)
2. Read [PROJECT_STATUS_COMPLETE.md](PROJECT_STATUS_COMPLETE.md)
3. Explore backend code: `backend/apps/`
4. Run test suite: `python manage.py test`
5. Start development server: `python manage.py runserver`
6. Access admin: `http://localhost:8000/admin/`

---

**Good luck! 🚀**

For questions or issues, refer to the comprehensive documentation or check the code comments.
