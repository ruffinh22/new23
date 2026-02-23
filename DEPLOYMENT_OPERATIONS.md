# SGDRA Deployment - Troubleshooting & Operations Guide

## 🎯 Current Status

**✅ Application is LIVE on 10.0.5.18:8081**

- Backend: ✅ Healthy
- MySQL: ✅ Healthy  
- Redis: ✅ Healthy
- Nginx: ✅ Healthy
- API: Ready at `http://10.0.5.18:8081/api/`

---

## 🔧 Solved Issue: MySQL Connection Timeout

### Problem
Backend container failed to connect to MySQL with error:
```
django.db.utils.OperationalError: (2003, "Can't connect to MySQL server on 'mysql'")
```

### Root Cause
- **Timing Issue**: Backend started before MySQL fully initialized
- Quick deployment script (10s wait) was insufficient for MySQL InnoDB initialization
- MySQL takes 30-50 seconds to complete initialization

### Solution Implemented
Created `restart-deployment.sh` with:
1. ✅ Proper startup sequence (infra → backend → services)
2. ✅ Health checks (MySQL `mysqladmin ping`)
3. ✅ Extended timeouts (60 seconds for MySQL, 60 for backend)
4. ✅ Retry logic with exponential backoff
5. ✅ Detailed logging

---

## 📋 Deployment Scripts

### 1. **Initial Deployment** (compile + deploy)
```bash
# On your local machine
./compile-and-deploy.sh      # Builds frontend + Docker image
./deploy-docker-to-server.sh # Transfers to remote server
```

### 2. **Restart Services** (after initial setup)
```bash
# On the remote server (10.0.5.18)
cd /srv/sgdra
./restart-deployment.sh
```

### 3. **Update & Redeploy** (after code changes)
```bash
# On local machine
git pull                    # Get latest code
./compile-and-deploy.sh     # Recompile & build
scp sgdra-backend-latest.tar erpgmc@10.0.5.18:/srv/sgdra/

# On remote server
cd /srv/sgdra
docker load -i sgdra-backend-latest.tar
./restart-deployment.sh
```

---

## 🐳 Docker Services

### Service Architecture

```
┌─────────────────────────────────────┐
│   NGINX (Port 8081/8443)           │
│   - Reverse proxy                   │
│   - Static files                    │
│   - SSL/TLS termination            │
└──────────┬──────────────────────────┘
           │
           ├─► Backend (Port 8000)
           │   - Django + Gunicorn
           │   - API endpoints
           │   - Health checks
           │
           ├─► MySQL (Port 3306)
           │   - Database
           │   - Persisted in volume
           │
           ├─► Redis (Port 6379)
           │   - Cache & broker
           │
           ├─► Celery Worker
           │   - Background tasks
           │
           └─► Celery Beat
               - Scheduled tasks
```

### Key Configuration
- **Database**: MySQL 8.0, Schema initialized on first run
- **Frontend**: Pre-compiled Vite SPA in `/static/frontend/`
- **Static Files**: Collected via `python manage.py collectstatic`
- **Volumes**: Persistent data in `*_data` volumes

---

## 📊 Monitoring & Logs

### Check Service Status
```bash
ssh erpgmc@10.0.5.18
cd /srv/sgdra

# View all containers
docker ps

# View detailed status with health
docker-compose -f docker-compose.prod.yml ps

# View service health
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

### View Logs
```bash
# Backend logs (follow mode)
docker-compose -f docker-compose.prod.yml logs -f backend

# MySQL logs
docker-compose -f docker-compose.prod.yml logs -f mysql

# Last 50 lines of all services
docker-compose -f docker-compose.prod.yml logs --tail=50

# Specific time range
docker-compose -f docker-compose.prod.yml logs --since 10m
```

### Health Check Endpoints
```bash
# Direct backend health
curl http://10.0.5.18:8081/health/

# API availability
curl http://10.0.5.18:8081/api/

# Admin panel
http://10.0.5.18:8081/admin/

# Nginx status
curl -I http://10.0.5.18:8081/
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Backend Health is "Starting" (After Restart)
**Cause**: Backend is still running migrations or collecting static files
**Solution**: Wait 30-60 seconds, then check logs
```bash
docker-compose -f docker-compose.prod.yml logs backend | tail -20
```

### Issue 2: "Connection refused" on Startup
**Cause**: Services starting in wrong order or too quickly
**Solution**: Use `restart-deployment.sh` (has proper sequencing)
```bash
./restart-deployment.sh
```

### Issue 3: Celery Services Unhealthy
**Cause**: Usually transient, celery-beat/worker are non-critical
**Status**: This is OK - application still works
**To Fix**: 
```bash
docker-compose -f docker-compose.prod.yml restart celery-beat celery-worker
```

### Issue 4: Nginx Showing "Bad Gateway" (502)
**Cause**: Backend container crashed or not responding
**Solution**:
```bash
# Check backend status
docker ps | grep sgdra-backend

# View backend logs
docker-compose -f docker-compose.prod.yml logs backend | tail -50

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

### Issue 5: Database Connection Error in Logs
**Cause**: MySQL not fully ready when backend connects
**Solution**: Use `restart-deployment.sh` instead of `docker-compose up`
```bash
./restart-deployment.sh
```

---

## 🛠️ Maintenance Tasks

### Backup Database
```bash
ssh erpgmc@10.0.5.18
cd /srv/sgdra
docker-compose exec mysql mysqldump -u$MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Clean Up Docker Resources
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes  
docker volume prune

# See all images and sizes
docker images | grep sgdra
```

### Update Environment Variables
```bash
# Edit .env.production on server
ssh erpgmc@10.0.5.18
vi /srv/sgdra/.env.production

# Restart with new config
cd /srv/sgdra
./restart-deployment.sh
```

---

## 📈 Performance Tuning

### Backend (Gunicorn)
Edit `Dockerfile` if you need to change:
- `--workers 4` → Number of worker processes
- `--timeout 120` → Request timeout in seconds

### MySQL
Persisted volume: `mysql_data:/var/lib/mysql`
Memory limit set in `docker-compose.prod.yml`

### Redis
Persisted volume: `redis_data:/data`
Uses RDB snapshots for durability

---

## 🔐 Security Notes

1. **Passwords**: Stored in `.env.production` (not in git)
2. **SSL/TLS**: Configure in nginx or use reverse proxy
3. **CORS**: Configured in Django settings
4. **Database Port**: Only exposed to localhost (127.0.0.1:3307)
5. **Redis Port**: Only exposed to localhost (127.0.0.1:6380)

---

## 🚀 Quick Reference

| Action | Command |
|--------|---------|
| Deploy from local | `./compile-and-deploy.sh && ./deploy-docker-to-server.sh` |
| Restart services | `ssh erpgmc@10.0.5.18 'cd /srv/sgdra && ./restart-deployment.sh'` |
| View logs | `ssh erpgmc@10.0.5.18 'cd /srv/sgdra && docker-compose -f docker-compose.prod.yml logs -f backend'` |
| Stop everything | `ssh erpgmc@10.0.5.18 'cd /srv/sgdra && docker-compose -f docker-compose.prod.yml down'` |
| Start everything | `ssh erpgmc@10.0.5.18 'cd /srv/sgdra && ./restart-deployment.sh'` |
| Check status | `ssh erpgmc@10.0.5.18 'cd /srv/sgdra && docker-compose -f docker-compose.prod.yml ps'` |

---

## 📞 Support

For issues:
1. Check logs: `docker-compose -f docker-compose.prod.yml logs -f <service>`
2. Verify env vars: `cat .env.production | grep DATABASE_URL`
3. Restart services: `./restart-deployment.sh`
4. Check Docker: `docker ps` and `docker images`

---

**Last Updated**: 16 février 2026  
**Status**: ✅ Production Ready
