# 🔴 AUDIT: SYSTÈME DE NOTIFICATIONS ACTUEL

## PROBLÈMES IDENTIFIÉS

### 🔴 CRITIQUE - Temps réel bloquant

**Problème 1: Pas de WebSocket**
- Notifications créées mais l'utilisateur ne les voie PAS immédiatement
- Doit rafraîchir la page pour voir les notifications
- Expérience utilisateur: **MAUVAISE** ❌

**Problème 2: Signaux bloquants**
```python
# apps/notifications/signals.py - Blocage pendant création
def notification_created_or_updated():
    # Bloque la création du document pendant l'envoi d'email
```

**Problème 3: Pas de priorité**
- Toutes les notifications = même niveau
- Impossible de filtrer les urgentes
- Signal perte de données urgentes

### 🟠 HAUTE - Performance

**Problème 4: Pas de batch processing**
- Envoyer 1000 notifications = 1000 appels Celery (lent!)
- Pas de compression/grouping
- Base de données explosée de notifications inutiles

**Problème 5: Pas de grouping**
- 10 documents uploadés = 10 notifications identiques
- UI surcharée, utilisateur submergé
- Manque d'agrégation intelligente

**Problème 6: Pagination simple**
```python
# API: retourne TOUTES les notifications non paginées
queryset = Notification.objects.all()  # ❌ 100K records!
```

### 🟡 MOYEN - UX

**Problème 7: Pas de préférences**
- Utilisateur ne peut pas choisir:
  - ✗ Quelles notifications reçoit
  - ✗ Via email ou in-app
  - ✗ Fréquence (immédiat, digest, jamais)
  - ✗ Heures de silence

**Problème 8: Pas de "marquer comme lu" batch**
- CLI: "Marquer tout comme lu"
- API: marquer 1 à 1 (lent!)
- DB: N+1 queries

**Problème 9: Archive manuelle**
- Les vieilles notifications restent = DB gonflée
- Pas de retention policy
- Recherche devient lente

---

## AUDIT DÉTAILLÉ

### Modèle Notification (BASIC)
```python
- recipient ✓
- notification_type (choix limités)
- title, message
- document (optionnel)
- is_read ✓
- created_at ✓
- ❌ MANQUE: priority, read_at, archived_at, source, metadata
```

### Service NotificationService (SIMPLE)
```python
- notify_on_document_uploaded() ✓
- notify_on_document_approved() ✓
- ...
- ❌ MANQUE: batch_create(), throttle(), group(), archive()
```

### API Views (BASIQUE)
```python
- GET /api/notifications/ - liste simple
- POST /api/notifications/ - crée 1 noti
- ❌ MANQUE: 
  - Bulk mark as read
  - Archive
  - Preferences
  - Subscription management
  - Real-time subscription
```

### WebSocket (ABSENT)
```
❌ AUCUN WebSocket
❌ AUCUN Channels
❌ AUCUN real-time
```

---

## CURRENT TECH STACK

- ✅ Django + DRF
- ✅ Celery (tasks async)
- ✅ MySQL (storage)
- ✅ Channels (installed but NOT USED for notifications!)
- ✅ Redis (cache/queue)
- ❌ WebSocket (NOT configured for notifications)

---

## SCORE ACTUEL

| Métrique | Score |
|----------|-------|
| **Real-time** | 0/10 ❌ (pas de WebSocket) |
| **Non-bloquant** | 5/10 🟡 (Celery mais signaux bloquants) |
| **Performance** | 4/10 🔴 (pas de batch, N+1 queries) |
| **UX** | 3/10 🔴 (pas de grouping, prefs, archive) |
| **Scalabilité** | 2/10 🔴 (DB gonflée, pas de retention) |
| **GLOBAL** | **3/50 = 6%** 🔴🔴🔴 |

---

## VISION APRÈS REFONTE

| Métrique | Avant | Après |
|----------|-------|-------|
| **Real-time** | 0/10 ❌ | 10/10 ✅ WebSocket |
| **Non-bloquant** | 5/10 | 10/10 ✅ Async + queue |
| **Performance** | 4/10 | 10/10 ✅ Batch, indexed |
| **UX** | 3/10 | 10/10 ✅ Grouping, prefs |
| **Scalabilité** | 2/10 | 9/10 ✅ Archiving, TTL |
| **GLOBAL** | **3%** 🔴 | **92%** 🟢 |

---

## PLAN DE REFONTE

### PHASE 1: Models Refactor (30 min)
- [ ] Ajouter: priority, read_at, archived_at
- [ ] Ajouter: metadata JSON field
- [ ] NotificationPreference model
- [ ] NotificationGroup model (grouping)
- [ ] Indexes pour performance

### PHASE 2: WebSocket Real-time (45 min)
- [ ] Consumer Channels pour notifications
- [ ] Push instantané au user connecté
- [ ] Badge count real-time
- [ ] Typing indicator support

### PHASE 3: Service Layer (45 min)
- [ ] Batch create + throttle
- [ ] Group by type/document
- [ ] Archive automatically
- [ ] Cleanup old notifications

### PHASE 4: API Refactor (30 min)
- [ ] Unread count
- [ ] Bulk mark as read/archive
- [ ] Subscribe/unsubscribe
- [ ] Preferences endpoint

### PHASE 5: Frontend Integration (20 min)
- [ ] Real-time notification badge
- [ ] Sound alerts
- [ ] Grouped notifications UI
- [ ] Settings page

---

**Total: ~3 heures pour un système HYPER PRO**

