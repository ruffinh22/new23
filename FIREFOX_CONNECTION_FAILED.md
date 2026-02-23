# 🔴 Erreur d'Accès Firefox - Solutions

## 📊 Diagnostic Complet

### État du Serveur: ✅ **TOUS LES SERVICES OPÉRATIONNELS**
```
✅ Nginx répond sur port 8081
✅ HTTP 200 OK reçu
✅ Frontend HTML complet
✅ API opérationnelle
```

**Le problème n'est PAS le serveur - c'est la connectivité RÉSEAU de votre machine**

---

## ⚠️ Pourquoi Firefox dit "Connection refused"?

### Causes possibles (classées par probabilité)

1. **🔴 Votre machine n'est PAS sur le réseau 10.0.5.0/24**
   - Le serveur est sur: `10.0.5.18`
   - Vérifiez votre IP: `ipconfig` (Windows) ou `ifconfig` (Mac/Linux)
   
2. **🔴 Firewall ou VPN bloque le port 8081**
   - Firewall Windows/Mac/Antivirus
   - VPN actif changeant le routage
   - Proxy réseau en place

3. **🔴 Route réseau non existante**
   - Pas de gateway configuré
   - Hop intermédiaire bloqué

---

## ✅ Solutions (Essayez-les dans l'ordre)

### **Solution 1️⃣: Vérifier la Connectivité de Base**

Ouvrez un terminal et testez:

**Windows (Command Prompt ou PowerShell):**
```cmd
ping 10.0.5.18
```

**Mac/Linux (Terminal):**
```bash
ping -c 3 10.0.5.18
```

#### Si ✅ Réussi:
→ Allez à Solution 2

#### Si ❌ Échoué:
→ Vous n'êtes PAS sur le même réseau que le serveur
→ Utilisez **Solution 4** (SSH Tunnel)

---

### **Solution 2️⃣: Tester le Port 8081 Directement**

**Windows (PowerShell):**
```powershell
Test-NetConnection -ComputerName 10.0.5.18 -Port 8081 -WarningAction Ignore
```

**Mac/Linux:**
```bash
nc -zv 10.0.5.18 8081
# ou si nc n'existe pas:
telnet 10.0.5.18 8081
```

#### Si ✅ Connection established:
```
Successfully connected to 10.0.5.18 on port 8081
```
→ Le problème vient de Firefox, essayez un autre navigateur (Chrome, Safari, Edge)
→ Vérifiez les paramètres proxy de Firefox

#### Si ❌ Connection refused/timeout:
→ Allez à **Solution 3**

---

### **Solution 3️⃣: Vérifier le Firewall Local**

**Windows 11/10:**
1. Paramètres (Settings)
2. Confidentialité et sécurité (Privacy & Security)
3. Pare-feu Windows Defender (Windows Defender Firewall)
4. Autorisez une application (Allow an app)
5. Vérifiez que le browser/VPN n'est pas bloqué
6. Créez une règle permettant le port 8081

**Mac:**
1. Préférences système (System Preferences)
2. Sécurité et confidentialité (Security & Privacy)
3. Pare-feu (Firewall)
4. Cliquez sur "Options du pare-feu" (Firewall Options)
5. Ajoutez une règle si nécessaire

**Linux:**
```bash
sudo ufw status
sudo ufw allow 8081/tcp
```

---

### **Solution 4️⃣: Tunnel SSH (Meilleure Solution) ⭐**

Si les solutions précédentes ne fonctionnent pas, utilisez un tunnel SSH pour accéder via `localhost`.

**Sur votre machine:**

```bash
# D'abord, téléchargez le script:
# (voir ssh-tunnel.sh dans le dossier du projet)

# Ou créez manuellement le tunnel SSH:
ssh -L 8081:10.0.5.18:8081 erpgmc@10.0.5.18
# Entrez le mot de passe

# Laissez le terminal ouvert
# Dans Firefox, accédez à:
# http://localhost:8081
```

**Version GUI (Windows avec PuTTY):**
1. Ouvrez PuTTY
2. Hôte: `10.0.5.18`, Port: `22`
3. Catégorie: SSH → Tunnels
4. Port Source: `8081`
5. Destination: `10.0.5.18:8081`
6. Cliquez "Add" puis "Open"
7. Connectez-vous avec `erpgmc`
8. Accédez dans Firefox: `http://localhost:8081`

---

### **Solution 5️⃣: Utiliser un Client SOCKS Proxy**

Pour une solution plus "permanente":

```bash
# Sur votre machine, créez un proxy SOCKS5:
ssh -D 1080 erpgmc@10.0.5.18

# Dans Firefox:
# Edit > Preferences > Network > Settings
# Manual proxy configuration
# SOCKS Host: localhost, Port: 1080
# Accédez à: http://10.0.5.18:8081
```

---

## 🧪 Test de Connectivité Automatique

Téléchargez et exécutez:

```bash
# Mac/Linux:
bash test-connectivity.sh

# Windows (PowerShell):
# Adaptez le script en PowerShell ou lancez depuis WSL
```

Cela donnera un diagnostic complet et vous dira exactement où est le problème.

---

## 📋 Checklist Rapide

```
☐ Machine connectée au réseau? (Wifi/Ethernet actif?)
☐ Ping 10.0.5.18 fonctionne?
☐ Port 8081 ouvert (telnet test)?
☐ Firewall de votre machine autorise port 8081?
☐ VPN active? (essayez sans)
☐ Antivirus bloque? (exceptions?)
☐ Autre navigateur fonctionne? (teste si c'est Firefox)
☐ SSH tunnel établi? (Solution 4)
```

---

## 🚀 Résolution Rapide

**Si vous êtes PRESSÉ, utilisez ça:**

```bash
# Terminal/PowerShell
ssh -L 8081:10.0.5.18:8081 erpgmc@10.0.5.18
# Mot de passe: toor

# Firefox:
http://localhost:8081
```

---

## 📞 Support

Si rien ne marche:
1. Vérifiez que vous êtes vraiment connecté au réseau
2. Contactez l'administrateur réseau (si vous êtes en entreprise)
3. Essayez depuis un autre PC sur le même réseau
4. Vérifiez les logs: `ssh erpgmc@10.0.5.18 'cd /srv/sgdra && docker-compose -f docker-compose.prod.yml logs nginx'`

---

## ✅ Quand ça Fonctionne

Vous devriez voir:
- ✅ Logo SGDRA
- ✅ Formulaire de connexion
- ✅ Page d'accueil responsive

Si vous voyez ça, **BRAVO! 🎉 L'application fonctionne!**

