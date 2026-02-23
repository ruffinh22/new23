# Guide de Déploiement à Distance - SGDRA

## Configuration SSH (Prérequis)

Pour déployer depuis votre machine locale, vous devez configurer l'accès SSH sans mot de passe.

### Option 1: SSH Key (Recommandé)

#### Sur votre machine locale:
```bash
# Générer une clé SSH si vous n'en avez pas
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# Copier la clé publique vers le serveur
ssh-copy-id -i ~/.ssh/id_rsa.pub erpgmc@10.0.5.18
# Mot de passe: toor

# Tester la connexion
ssh erpgmc@10.0.5.18 "echo OK"
# Ne pas demander de mot de passe
```

#### Sur le serveur (alternative):
```bash
# Si ssh-copy-id ne fonctionne pas, faire manuellement:
ssh erpgmc@10.0.5.18
mkdir -p ~/.ssh
# Copier votre clé publique dans ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Option 2: SSH Agent (Pour les clés avec passphrase)
```bash
# Sur votre machine locale
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

# Entrer votre passphrase une fois
# Les déploiements ultérieurs n'auront pas besoin du mot de passe
```

---

## Utilisation Locale

### Première Installation

```bash
# 1. Sur votre machine, aller au répertoire du projet
cd /chemin/vers/sgdra

# 2. Rendre le script exécutable
chmod +x deploy-to-server.sh

# 3. Configurer SSH sans mot de passe (voir section ci-dessus)

# 4. Vérifier la connexion SSH
ssh erpgmc@10.0.5.18 "cd /srv/sgdra && ls -la"
```

### Déploiement Initial

```bash
# Déployer le code et démarrer les services
./deploy-to-server.sh deploy

# Cela va:
# 1. Vérifier la connexion SSH
# 2. Créer une sauvegarde (si services actifs)
# 3. Synchroniser le code vers /srv/sgdra
# 4. Vérifier la configuration
# 5. Demander confirmation
# 6. Démarrer les services
# 7. Effectuer les vérifications de santé
```

### Mise à Jour du Code

```bash
# Même commande pour les mises à jour
./deploy-to-server.sh deploy

# Ou directement sans redéployer:
./deploy-to-server.sh logs backend    # Voir les logs
./deploy-to-server.sh status          # Voir le statut
```

---

## Commandes Disponibles

### Déploiement
```bash
./deploy-to-server.sh deploy

# Crée une sauvegarde, sync le code, redémarre les services
```

### Logs
```bash
# Tous les logs
./deploy-to-server.sh logs

# Logs d'un service spécifique
./deploy-to-server.sh logs backend
./deploy-to-server.sh logs mysql
./deploy-to-server.sh logs redis
./deploy-to-server.sh logs nginx
```

### Statut
```bash
./deploy-to-server.sh status

# Affiche l'état de tous les conteneurs
```

### Restart
```bash
./deploy-to-server.sh restart

# Arrête et redémarre tous les services
```

### Stop
```bash
./deploy-to-server.sh stop

# Arrête tous les services
```

### Start
```bash
./deploy-to-server.sh start

# Démarre tous les services
```

---

## Configuration de l'Environnement

### Sur le serveur (première fois)

```bash
# Se connecter au serveur
ssh erpgmc@10.0.5.18

# Aller au répertoire du projet
cd /srv/sgdra

# Copier le template d'env
cp .env.production .env.production.local

# Éditer les variables
nano .env.production.local
```

**Variables à adapter:**
```env
# Sécurité
SECRET_KEY=<votre-clé-sécurisée>
DEBUG=False

# Base de données
MYSQL_ROOT_PASSWORD=<mot_de_passe_sécurisé>
MYSQL_PASSWORD=<mot_de_passe_utilisateur>

# Domaine
ALLOWED_HOSTS=10.0.5.18,yourdomain.com
CORS_ALLOWED_ORIGINS=https://10.0.5.18,https://yourdomain.com

# Email
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=<mot_de_passe_app>
```

### Vérifier la configuration
```bash
# Sur le serveur
cd /srv/sgdra
./pre-check.sh

# Doit retourner "ready for deployment"
```

---

## Processus de Déploiement Détaillé

```
Votre Machine (Local)
        │
        ├─ Vérifie la connexion SSH
        │
        ├─ Crée une sauvegarde sur le serveur
        │
        ├─ Synchronise le code (rsync)
        │  └─ Exclut: .git, __pycache__, media, logs, etc.
        │
        ├─ Configure l'environnement
        │
        ├─ Lance les vérifications (pre-check.sh)
        │
        ├─ Demande confirmation
        │
        └─ Lance le déploiement Docker
           └─ Services démarrés: MySQL, Redis, Backend, Celery, Nginx
```

---

## Troubleshooting

### Erreur: "Cannot connect to SSH"
```bash
# Vérifier la connexion SSH
ssh -vv erpgmc@10.0.5.18

# Vérifier la clé SSH
ssh-add -l

# Ajouter la clé si nécessaire
ssh-add ~/.ssh/id_rsa
```

### Erreur: "rsync: command not found on remote"
```bash
# Sur le serveur
sudo apt-get install rsync
```

### Erreur: ".env.production.local not found"
```bash
# Le serveur crée automatiquement depuis .env.production
# Vous devez l'éditer après le déploiement:
ssh erpgmc@10.0.5.18
cd /srv/sgdra
nano .env.production.local
```

### Services ne démarrent pas
```bash
# Vérifier les logs
./deploy-to-server.sh logs backend

# Vérifier la configuration
ssh erpgmc@10.0.5.18 "cd /srv/sgdra && ./pre-check.sh"

# Redémarrer
./deploy-to-server.sh restart
```

---

## Workflow Complet

### 1. Setup Initial (une fois)
```bash
# LOCAL
# Configurer SSH key
ssh-keygen -t rsa -b 4096
ssh-copy-id -i ~/.ssh/id_rsa.pub erpgmc@10.0.5.18

# REMOTE (10.0.5.18)
ssh erpgmc@10.0.5.18
cd /srv/sgdra
cp .env.production .env.production.local
nano .env.production.local  # Adapter les variables
./pre-check.sh              # Vérifier que tout est OK

# LOCAL
./deploy-to-server.sh deploy
```

### 2. Modifications depuis LOCAL
```bash
# Sur votre machine
nano backend/apps/documents/views.py  # Faire vos modifications

# Commit et déployer
git add .
git commit -m "Feature: nouvelle fonctionnalité"

# Déployer vers le serveur
./deploy-to-server.sh deploy

# Vérifier les logs
./deploy-to-server.sh logs backend
```

### 3. Maintenance quotidienne
```bash
# Voir les logs
./deploy-to-server.sh logs

# Vérifier la santé (depuis le serveur)
ssh erpgmc@10.0.5.18 "cd /srv/sgdra && ./deploy.sh health"

# Voir la performance
ssh erpgmc@10.0.5.18 "docker stats"
```

---

## Intégration CI/CD (GitHub Actions)

Pour automatiser le déploiement:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup SSH Key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H 10.0.5.18 >> ~/.ssh/known_hosts
      
      - name: Deploy
        run: |
          ./deploy-to-server.sh deploy
```

---

## Points Importants

✓ **SSH key** - Configurez d'abord l'accès SSH sans mot de passe  
✓ **.env** - Adapter .env.production.local sur le serveur  
✓ **Backup** - Un backup est créé avant chaque déploiement  
✓ **Exclusions** - Les fichiers volumineux sont exclus de la sync  
✓ **Confirmation** - Confirmation nécessaire avant déploiement  
✓ **Health Check** - Vérifications de santé après déploiement  

---

## Fichiers Impliqués

| Fichier | Localisation | Description |
|---------|-------------|-------------|
| `deploy-to-server.sh` | LOCAL | Script de déploiement à distance |
| `deploy.sh` | REMOTE | Script de gestion local sur le serveur |
| `.env.production` | REMOTE | Template des variables |
| `.env.production.local` | REMOTE | Configuration personnalisée (à adapter) |
| `docker-compose.prod.yml` | REMOTE | Configuration Docker |

---

## Commands Cheat Sheet

```bash
# Résumé des commandes essentielles

# Déploiement
./deploy-to-server.sh deploy        # Déployer depuis local

# Informations
./deploy-to-server.sh status        # État des services
./deploy-to-server.sh logs          # Tous les logs
./deploy-to-server.sh logs backend  # Logs du backend

# Gestion des services
./deploy-to-server.sh restart       # Redémarrer
./deploy-to-server.sh stop          # Arrêter
./deploy-to-server.sh start         # Démarrer

# Sur le serveur directement
ssh erpgmc@10.0.5.18 "cd /srv/sgdra && ./deploy.sh health"
```

---

**Date**: 2026-02-12  
**Version**: 1.0.0  
**Maintenu par**: DevOps Team
