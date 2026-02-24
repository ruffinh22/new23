# 🔧 Real-Time Notifications & Audit Logs - Full Diagnostic & Fix Guide

## 📋 Issues Found & Fixed (February 24, 2026)

### Issues Reported
- ❌ Audit logs not showing in real-time
- ❌ Notifications not auto-refreshing instantly (require manual click to refresh)

### Root Causes Identified

#### 1. **Redis Not Connected** 🔴
- **Problem**: Backend configured for Docker hostname `sgdra-redis:6379` but Redis not accessible locally
- **Error**: `Error -3 connecting to sgdra-redis:6379`
- **Impact**: WebSocket messages couldn't be broadcast
- **Fix**: Updated `config/settings.py` to detect and use `localhost:6379` for development

#### 2. **WebSocket Group Name Mismatch** 🔴
- **Problem**: Signals sent notifications to group `notifications_{user_id}_group` but consumer joined `notifications_user_{user_id}`
- **Names didn't match** → messages weren't delivered
- **Fix**: Synced consumer to use correct group name

#### 3. **Message Type Mismatch** 🔴
- **Problem**: Signals send `type: 'notification'` but frontend listens for `'notification_new'`
- **Impact**: Messages received but not processed by frontend
- **Fix**: Updated frontend hook to listen for `'notification'` type

#### 4. **Handler Method Names Wrong** 🔴
- **Problem**: Signal sends `type: 'notification_created'` requiring handler `async def notification_created()`  
           But consumer had `async def notification_received()`
- **Impact**: Django Channels couldn't find handlers
- **Fix**: Renamed handlers to match signal types

#### 5. **Model Field Names Wrong** 🔴
- **Problem**: Consumers referenced non-existent fields:
  - `log.user` → should be `log.actor`
  - `log.timestamp` → should be `log.created_at`
  - `log.details` → should be `log.changes`
- **Impact**: Audit log serialization failed
- **Fix**: Updated consumers to use correct model fields

---

## ✅ Fixes Applied

### Backend Changes

#### 1. `config/settings.py` - Redis Auto-Detection
```python
# Now intelligently detects Redis availability
REDIS_HOST = 'localhost' if is_redis_available('localhost', 6379) else 'sgdra-redis'
# Uses localhost for development, sgdra-redis for Docker
```

#### 2. `config/consumers.py` - Synchronized WebSocket Consumers

**NotificationConsumer Changes:**
```python
# ✅ Fixed group name to match signals
self.room_group_name = f'notifications_{self.user.id}_group'

# ✅ Added correct event handlers
async def notification_created(self, event):  # Was: notification_received
async def notification_updated(self, event):  # NEW - was missing
async def notification_read(self, event):     # Unchanged
```

**AuditLogConsumer Changes:**
```python
# ✅ Fixed model field references
'actor': log.actor.matricule  # Was: log.user
'created_at': log.created_at.isoformat()  # Was: log.timestamp
'changes': log.changes  # Was: log.details
```

#### 3. `apps/common/signals.py` - Added Logging

Added comprehensive logging to debug broadcasts:
```python
print(f"📝 [AuditSignal] Declenchement du signal pour log {instance.id}")
print(f"📤 [AuditSignal] Envoi du log {instance.id} au groupe {room_group_name}")
```

### Frontend Changes

#### `src/hooks/useNotifications.ts` - Fixed Event Listeners
```typescript
// BEFORE: Listening to wrong event types
wsService.on('notification_new', handler)  // Backend never sends this

// AFTER: Listening to correct types
wsService.on('notification', handler)  // Matches backend type
```

---

## 🚀 How to Test the Fixes

### Step 1: Start Backend (with Redis support)

```bash
cd backend
source venv/bin/activate

# Restart with proper settings
python manage.py runserver
# Or with Daphne for WebSocket:
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Step 2: Start Frontend

```bash
cd frontend
yarn dev
# Starts on http://localhost:5174
```

### Step 3: Verify Redis Connection

```bash
redis-cli ping
# Should return: PONG

# Check Redis is working
redis-cli INFO
```

### Step 4: Login & Open Browser Console

- Go to http://localhost:5174
- Login with `TESTADMIN / test123`
- Open Browser DevTools: **F12** → **Console** tab
- Look for: **`✅ WebSocket connected`** message

### Step 5: Test Real-Time Notifications

**Method A: Create via Django Shell**
```bash
python manage.py shell
```

```python
from django.contrib.auth import get_user_model
from apps.notifications.models import Notification

User = get_user_model()
admin = User.objects.get(matricule='TESTADMIN')

# Create notification
notif = Notification.objects.create(
    recipient=admin,
    notification_type='DOCUMENT_UPLOADED',
    title='Test notification',
    message='Should appear INSTANTLY in browser',
    is_read=False
)

print(f'✅ Created notification {notif.id}')
```

**Expected Result:**
- 📦 Backend logs: `✨ Created notification X for user TESTADMIN`
- 📨 Backend console: `📨 [NotificationConsumer] notification_created reçu: {...}`
- 🔔 Frontend console: `📨 Message reçu: notification`
- ✨ **Notification appears in UI instantly** (no page refresh needed!)

### Step 6: Test Real-Time Audit Logs

**Method A: Create via Django Shell**
```python
from apps.common.audit import AuditLog

audit = AuditLog.objects.create(
    actor=admin,
    action='DOCUMENT_UPLOAD',
    severity='INFO',
    description='Test audit log',
    ip_address='127.0.0.1',
    success=True
)

print(f'✅ Created audit log {audit.id}')
```

**Expected Result:**
- 📦 Backend logs: `📝 New audit log X: DOCUMENT_UPLOAD by TESTADMIN`
- 📨 Backend console: `📤 [AuditSignal] Envoi du log X au groupe auditlog_admins`
- 🔔 Frontend console (if admin): `📨 Message reçu: auditlog`
- 📊 **Audit log appears in dashboard instantly** (no page refresh needed!)

---

## 🐛 Troubleshooting

### Problem: "WebSocket connection error"

**Check 1: Is Redis running?**
```bash
redis-cli ping
```
Should return `PONG`. If not:
```bash
redis-server
# Or on macOS with brew:
brew services start redis
```

**Check 2: Backend running with Channels support?**
```bash
# Check if running on proper ASGI
ps aux | grep -E "daphne|asgi"
```

Should see `daphne` or `config.asgi`. If not, restart with:
```bash
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

**Check 3: Check backend logs**
```bash
# Look for WebSocket connection messages
# Should see: ✅ Notification WebSocket connecté: TESTADMIN
# Should see: ✅ AuditLog WebSocket connecté: ADMIN001 (ADMIN)
```

### Problem: Notifications don't appear in real-time

**Check 1: Is notification actually created?**
```python
from apps.notifications.models import Notification
Notification.objects.all().count()  # Should have count > 0
```

**Check 2: Is user authenticated in WebSocket?**
Browser Console should show:
```
✅ WebSocket connecté
📨 Message reçu: initial_notifications
```

**Check 3: Check notification recipient**
```python
# In Django shell
from apps.notifications.models import Notification
notif = Notification.objects.latest('created_at')
print(f"Recipient: {notif.recipient.matricule}")
print(f"Is read: {notif.is_read}")
```

### Problem: Audit logs not appearing (Admin Only)

**Check 1: Are you logged in as admin?**
Only users with `is_staff=True` or `role='ADMIN'` can see audit logs

**Check 2: Is AuditLog created?**
```python
from apps.common.audit import AuditLog
AuditLog.objects.all().count()  # Should have count > 0
```

**Check 3: Check signal is triggered**
Backend console should show:
```
📝 [AuditSignal] Declenchement du signal pour log X
📤 [AuditSignal] Envoi du log X au groupe auditlog_admins
```

### Problem: Message "Redis configured for sgdra-redis" in  production

If backend is in Docker but Redis not accessible via `sgdra-redis`:

**Check 1: Docker network**
```bash
docker network ls
docker network inspect sgdra_network  # or your network name
```

**Check 2: Redis container running**
```bash
docker ps | grep redis
```

**Check 3: Fix /backend/config/settings.py REDIS_HOST if needed**
```python
# Hardcode for your environment
REDIS_HOST = 'redis-service-name:6379'
# or
REDIS_HOST = 'localhost:6379'  # if accessed via host port mapping
```

---

## 🔍 Debug Commands

### Monitor WebSocket connections in real-time

```bash
# Terminal 1: Watch backend logs
tail -f backend/logs/django.log

# Terminal 2: Monitor Redis
redis-cli monitor

# Terminal 3: Check active connections
redis-cli CLIENT LIST
```

### Check Django signals are registered

```bash
python manage.py shell
```

```python
from django.db.models.signals import post_save
from apps.notifications.models import Notification
from apps.common.audit import AuditLog

notif_receivers = post_save._live_receivers(Notification)
audit_receivers = post_save._live_receivers(AuditLog)

print(f"Notification receivers: {notif_receivers}")
print(f"Audit receivers: {audit_receivers}")
```

### Check WebSocket groups

```bash
rediscli -c
> KEYS 'asgi:*'  # Shows all WebSocket groups
> SMEMBERS 'asgi:notifications_*'  # Shows members of notification group
```

---

## 📊 Expected Message Flow

### Real-Time Notification Flow

```
1. User Action (or Webhook)
   ↓
2. NotificationService.create() called
   ↓
3. Notification model saved to DB
   ↓
4. Django post_save signal triggered
   ↓
5. apps/notifications/signals.py receiver called
   ↓
6. channel_layer.group_send() to notifications_{user_id}_group
   ↓
7. NotificationConsumer receives event
   ↓
8. async def notification_created() handler runs
   ↓
9. send_json() sends message to WebSocket
   ↓
10. Frontend receives message
    ↓
11. wsService routes to handler by 'type'
    ↓
12. useNotifications hook processes notification
    ↓
13. UI updates with new notification ✨
```

### Real-Time Audit Log Flow

```
1. Any System Action
   ↓
2. AuditMiddleware or explicit AuditLog.create()
   ↓
3. AuditLog model saved to DB
   ↓
4. Django post_save signal triggered
   ↓
5. apps/common/signals.py receiver called
   ↓
6. channel_layer.group_send() to auditlog_admins
   ↓
7. AuditLogConsumer receives event (ADMIN ONLY)
   ↓
8. async def auditlog_created() handler runs
   ↓
9. send_json() sends message to WebSocket
   ↓
10. Frontend receives message (if logged in as admin)
    ↓
11. wsService routes by 'type'
    ↓
12. useAuditLogs hook processes audit log
    ↓
13. Admin dashboard updates with new log ✨
```

---

## ✅ Verification Checklist

Before deployment, verify:

- [ ] Redis running: `redis-cli ping` → `PONG`
- [ ] Backend running with Daphne or runserver
- [ ] Frontend running: http://localhost:5174
- [ ] Django check clean: `python manage.py check`
- [ ] Database migrations: `python manage.py migrate`
- [ ] Signal receivers registered: 2 for Notification, 1 for AuditLog
- [ ] WebSocket connects: Browser console shows ✅ WebSocket connecté
- [ ] Test notification created: Appears instantly in UI
- [ ] Test audit log created (as admin): Appears instantly in dashboard
- [ ] Both real-time features working: ✨

---

## 📞 Summary

**All real-time features are now fixed and should work automatically:**

✅ Notifications appear the **instant** they're created  
✅ Audit logs appear in **real-time** (admin only)  
✅ Redis auto-detection for localhost/Docker  
✅ Comprehensive logging for debugging  
✅ Proper signal broadcasting  
✅ Correct message types  

**Just make sure:**
1. Redis is running
2. Backend is running (Daphne for WebSocket support)
3. Frontend is running
4. You're logged in (notifications see your own, audit needs admin role)

Notifications et audit logs are now "redynamisées dignement"! 🚀
