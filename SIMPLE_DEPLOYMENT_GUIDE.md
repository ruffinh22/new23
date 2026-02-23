# SGDRA - Guide Simple de Compilation et Déploiement Docker

## Processus simplifié de déploiement

Vous avez maintenant deux options simples pour compiler et déployer votre application :

---

## 🚀 Option 1 : Compilation + Déploiement Local

Pour compiler et déployer **localement** sur votre machine :

```bash
./compile-and-deploy.sh
```

Ce script automatiquement :
1. ✅ Compile le frontend Vue/Vite
2. ✅ Intègre les fichiers compilés dans Django
3. ✅ Construit l'image Docker
4. ✅ Affiche les prochaines étapes

Ensuite, démarrez les conteneurs :

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## 🌐 Option 2 : Compilation + Déploiement sur le Serveur

Pour compiler **localement** et déployer **sur le serveur distant** (10.0.5.18) :

```bash
# D'abord compiler
./compile-and-deploy.sh

# Puis déployer sur le serveur
./deploy-docker-to-server.sh
```

Ce script fait :
1. ✅ Exporte l'image Docker compilée
2. ✅ L'envoie au serveur via SCP
3. ✅ La charge sur le serveur
4. ✅ Redémarre les conteneurs
5. ✅ Vérifie que tout fonctionne

---

## 📋 Structure du Processus

```
┌─── compile-and-deploy.sh ────────────────┐
│                                           │
├─ yarn/npm install                       │
├─ yarn/npm build                         │
│  (Génère frontend/dist)                  │
│                                           │
├─ Copie dist → backend/static/frontend   │
│                                           │
├─ docker build                           │
│  (Crée sgdra-backend:latest)            │
│                                           │
└───────────────────────────────────────────┘
              ↓
        ✨ Image prête ✨
              ↓
   ┌─────────────────────────┐
   │ Déploier localement or  │
   │ sur le serveur distant  │
   └─────────────────────────┘
```

---

## 🐳 Commandes Utiles

### Voir les images disponibles
```bash
docker images | grep sgdra
```

### Démarrer les conteneurs (local)
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Voir les logs
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f redis
docker-compose -f docker-compose.prod.yml logs -f mysql
```

### Arrêter les conteneurs
```bash
docker-compose -f docker-compose.prod.yml down
```

### Nettoyer les images anciennes
```bash
docker image prune -a --filter "until=24h"
```

---

## 🔍 Vérifier le Déploiement

Après le déploiement, vérifiez que tout fonctionne :

```bash
# Sur le serveur, vérifier les conteneurs
docker ps

# Voir le statut complet
docker-compose -f /srv/sgdra/docker-compose.prod.yml ps

# Tester la connexion
curl http://localhost:8000/health/
```

---

## 📝 Notes Importantes

- **Frontend** : Doit être compilé en `.dist` avant de créer l'image Docker
- **Dockerfile** : Copie automatiquement `backend/static/frontend/` dans l'image
- **Environnement** : Assurez-vous que `.env.production` existe et est à jour
- **Ports** : 
  - Backend: 127.0.0.1:8001 → 8000 (interne)
  - MySQL: 127.0.0.1:3307 → 3306
  - Redis: 127.0.0.1:6380 → 6379

---

## 🆘 Troubleshooting

### Le frontend ne se compile pas
```bash
cd frontend
# Augmenter la mémoire Node
export NODE_OPTIONS="--max-old-space-size=8192"
yarn install && yarn build
```

### Docker build échoue
```bash
# Nettoyer les couches d'avant
docker system prune -a
# Réessayer la compilation
./compile-and-deploy.sh
```

### Connexion SSH au serveur échoue
```bash
# Tester la connexion
ssh -v erpgmc@10.0.5.18
# Vérifier les clés SSH si nécessaire
ssh-copy-id erpgmc@10.0.5.18
```

---

**C'est tout ! Votre application est maintenant prête pour la production. 🎉**
