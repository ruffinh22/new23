# Procédures Opérationnelles SGDRA

## Index
1. [Démarrage et Arrêt](#démarrage-et-arrêt)
2. [Gestion des Sauvegardes](#gestion-des-sauvegardes)
3. [Gestion des Utilisateurs](#gestion-des-utilisateurs)
4. [Gestion de la Base de Données](#gestion-de-la-base-de-données)
5. [Monitoring et Performance](#monitoring-et-performance)
6. [Synchronisation SSL/HTTPS](#synchronisation-ssxhttps)
7. [Procédures de Récupération](#procédures-de-récupération)

---

## Démarrage et Arrêt

### Démarrage des services
```bash
cd /srv/sgdra

# Démarrage complet (recommandé)
./deploy.sh start

# Vérifier le statut
./deploy.sh status

# Vérifier la santé des services
./deploy.sh health
```

### Arrêt des services
```bash
# Arrêt gracieux
./deploy.sh stop

# Redémarrage complet
./deploy.sh restart

# Redémarrage d'un service spécifique (exemple: backend)
docker-compose -f docker-compose.prod.yml restart sgdra-backend
```

### Vérifier que tout fonctionne
```bash
# API Backend
curl -k https://10.0.5.18/api/

# Admin Django
curl -k https://10.0.5.18/admin/

# Health Check
curl -k https://10.0.5.18/health/
```

---

## Gestion des Sauvegardes

### Sauvegarde manuelle
```bash
./deploy.sh backup

# Les sauvegardes sont créées dans ./backups/YYYYMMDD_HHMMSS/
# Contient:
#   - database.sql (dump MySQL)
#   - media.tar.gz (fichiers médias)
```

### Configuration de sauvegardes automatiques
```bash
# Éditer le crontab
crontab -e

# Ajouter:
# Sauvegarde quotidienne à 2h du matin
0 2 * * * cd /srv/sgdra && ./deploy.sh backup

# Sauvegarde hebdomadaire à 23h
0 23 * * 0 cd /srv/sgdra && ./deploy.sh backup
```

### Restauration d'une sauvegarde
```bash
# Arrêter les services
./deploy.sh stop

# Extraire la sauvegarde
BACKUP_DIR="./backups/20260212_150000"
cd $BACKUP_DIR

# Restaurer la base de données
docker run --rm -v sgdra_mysql_data:/var/lib/mysql \
  -v $(pwd):/backup mysql:8.0-alpine \
  sh -c 'exec mysql -h"mysql" -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < /backup/database.sql'

# Alternative: via docker-compose
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" sgdra_db < database.sql

# Restaurer les fichiers médias
tar -xzf media.tar.gz

# Redémarrer les services
./deploy.sh start
```

### Gestion des anciennes sauvegardes
```bash
# Voir toutes les sauvegardes
ls -la ./backups/

# Supprimer les sauvegardes de plus de 30 jours
find ./backups/ -type d -mtime +30 -exec rm -rf {} \;

# Compresser les sauvegardes anciennes
tar -czf backups_old.tar.gz backups/
```

---

## Gestion des Utilisateurs

### Créer un utilisateur administrateur
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py createsuperuser
```

### Créer un utilisateur standard
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py shell << EOF
from django.contrib.auth.models import User
User.objects.create_user(
    username='newuser',
    email='user@example.com',
    password='securepassword123'
)
print("User created successfully")
EOF
```

### Réinitialiser un mot de passe
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py changepassword username
```

### Liste des utilisateurs
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py shell << EOF
from django.contrib.auth.models import User
for user in User.objects.all():
    print(f"Username: {user.username}, Email: {user.email}, Staff: {user.is_staff}")
EOF
```

### Supprimer un utilisateur
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py shell << EOF
from django.contrib.auth.models import User
User.objects.filter(username='username_to_delete').delete()
print("User deleted")
EOF
```

---

## Gestion de la Base de Données

### Accès à MySQL
```bash
# Via docker-compose
docker-compose -f docker-compose.prod.yml exec mysql mysql -u sgdra_user -p sgdra_db

# Via docker directement
docker exec -it sgdra-mysql mysql -u sgdra_user -p sgdra_db
```

### Vérifier la santé de la BD
```bash
docker-compose -f docker-compose.prod.yml exec mysql \
  mysqladmin -u root -p "$MYSQL_ROOT_PASSWORD" status
```

### Nettoyer les anciennes sessions
```bash
docker-compose -f docker-compose.prod.yml exec backend \
  python manage.py clearsessions
```

### Vérifier l'intégrité de la BD
```bash
docker-compose -f docker-compose.prod.yml exec mysql \
  mysqlcheck -u root -p "$MYSQL_ROOT_PASSWORD" -A
```

### Optimiser les tables
```bash
docker-compose -f docker-compose.prod.yml exec mysql \
  mysql -u root -p "$MYSQL_ROOT_PASSWORD" \
  -e "OPTIMIZE TABLE sgdra_db.*"
```

### Export de la base de données
```bash
# Export complet
docker-compose -f docker-compose.prod.yml exec mysql \
  mysqldump -u root -p "$MYSQL_ROOT_PASSWORD" sgdra_db > sgdra_db_$(date +%Y%m%d_%H%M%S).sql

# Export avec compression
docker-compose -f docker-compose.prod.yml exec mysql \
  mysqldump -u root -p "$MYSQL_ROOT_PASSWORD" sgdra_db | gzip > sgdra_db_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## Monitoring et Performance

### Voir l'utilisation des ressources
```bash
# Utilisation en temps réel
docker stats

# Utilisation spécifiques des conteneurs
docker stats sgdra-backend sgdra-mysql sgdra-redis

# Historique
docker stats --no-stream
```

### Logs des services
```bash
# Tous les logs
./deploy.sh logs

# Logs d'un service spécifique
./deploy.sh logs backend
./deploy.sh logs mysql
./deploy.sh logs redis
./deploy.sh logs nginx

# Dernières N lignes
docker-compose -f docker-compose.prod.yml logs --tail=50 backend

# Suivi en temps réel
docker-compose -f docker-compose.prod.yml logs -f backend

# Entre deux timestamps
docker-compose -f docker-compose.prod.yml logs --timestamps --since 2026-02-12T10:00:00 backend
```

### Diagnostics
```bash
# Informations sur un conteneur
docker inspect sgdra-backend | grep -E "Memory|CpuShares"

# Utilisation disque
docker system df

# Événements Docker
docker events --since 10m
```

### Performance de Redis
```bash
docker-compose -f docker-compose.prod.yml exec redis redis-cli info

# Taille actuelle
docker-compose -f docker-compose.prod.yml exec redis redis-cli dbsize

# Vider le cache (WARNING!)
docker-compose -f docker-compose.prod.yml exec redis redis-cli flushall
```

---

## Synchronisation SSL/HTTPS

### Renouvellement Let's Encrypt
```bash
# Vérifier la date d'expiration
sudo openssl x509 -in frontend/ssl/cert.pem -noout -dates

# Renouvellement manuel
sudo certbot renew --standalone

# Copier les nouveaux certificats
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem frontend/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem frontend/ssl/key.pem
sudo chown erpgmc:erpgmc frontend/ssl/*

# Redémarrer nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### Renouvellement automatique
```bash
# Ajouter au crontab
crontab -e

# Ajouter:
0 3 * * * sudo certbot renew --standalone && \
  sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /srv/sgdra/frontend/ssl/cert.pem && \
  sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /srv/sgdra/frontend/ssl/key.pem && \
  sudo chown erpgmc:erpgmc /srv/sgdra/frontend/ssl/* && \
  docker-compose -f /srv/sgdra/docker-compose.prod.yml restart nginx
```

### Vérifier SSL
```bash
# Teste la configuration SSL
openssl s_client -connect 10.0.5.18:443

# Obtenir les infos du certificat
openssl x509 -in frontend/ssl/cert.pem -text -noout

# Vérifier la chaîne SSL
openssl verify -CAfile frontend/ssl/cert.pem frontend/ssl/cert.pem
```

---

## Procédures de Récupération

### Recovery après crash
```bash
# 1. Vérifier les logs
./deploy.sh logs

# 2. Redémarrer un service spécifique
docker-compose -f docker-compose.prod.yml restart sgdra-backend

# 3. Redémarrer tous les services
./deploy.sh restart

# 4. Reconstruire l'image si nécessaire
docker-compose -f docker-compose.prod.yml build --no-cache sgdra-backend
./deploy.sh start
```

### Récupération après perte de données
```bash
# 1. Arrêter les services
./deploy.sh stop

# 2. Restaurer à partir de la sauvegarde
# Voir section "Restauration d'une sauvegarde"

# 3. Vérifier l'intégrité
./deploy.sh health

# 4. Redémarrer
./deploy.sh start
```

### Vérifier la santé du système
```bash
# Script de vérification complet
./deploy.sh health

# Commandes individuelles:
# - Backend
curl -k https://10.0.5.18/health/

# - Base de données
docker-compose -f docker-compose.prod.yml exec mysql mysqladmin -u root -p "$MYSQL_ROOT_PASSWORD" ping

# - Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# - Nginx
curl -k https://10.0.5.18/health/
```

### Vider les caches
```bash
# Cache Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli flushall

# Cache Nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Cache Django
docker-compose -f docker-compose.prod.yml exec backend python manage.py clear_cache
```

---

## Contact et Support

Pour toute question ou incident:
- Vérifier les logs: `./deploy.sh logs`
- Exécuter le health check: `./deploy.sh health`
- Consulter la documentation: `DEPLOYMENT.md`
- Contacter l'équipe DevOps

---

**Dernière mise à jour**: 2026-02-12
**Version**: 1.0.0
