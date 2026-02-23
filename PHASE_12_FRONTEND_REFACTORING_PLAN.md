# 🎨 PHASE 12: REFONTE FRONTEND - PLAN COMPLET D'ALIGNEMENT

**Date**: 23 février 2026  
**Objectif**: Aligner 100% du frontend avec le backend modernisé  
**Durée Estimée**: 5-8 heures  
**Status**: 🔄 **À COMMENCER**  

---

## 📊 État Actuel du Frontend vs Backend

### ❌ Problèmes Identifiés

#### 1. Dépendances Manquantes
```
❌ Pas de WebSocket client moderne (ws)
❌ Pas de gestion d'état global (Zustand/Redux)
❌ Pas de notification real-time UI
❌ Pas de support des préférences utilisateur
```

#### 2. Service API Obsolète
```
❌ notificationService ne supporte pas:
   - priority, metadata, archiving, grouping, expires_at
   - L'endpoint bulk_mark_read (utilise loop inefficace)
   - L'endpoint bulk_archive
   - L'endpoint unread_count
   - Les préférences utilisateur
   - Les statistiques
   
❌ Pas d'intégration WebSocket pour real-time
❌ Pas de badge counter en temps réel
```

#### 3. Composants Manquants
```
❌ NotificationBell (avec vrai badge real-time)
❌ NotificationPreferences (settings UI)
❌ NotificationList (avec tous les champs)
❌ NotificationDetail (avec metadata)
❌ BulkActionBar (actions bulk)
```

#### 4. Architecture Manquante
```
❌ Context/Store pour notifications globales
❌ WebSocket manager persistent
❌ Real-time state management
```

---

## 🎯 PHASE 12: Plan Détaillé de Refonte

### **1. Mise à Jour des Dépendances (30 min)**

```bash
# Faire dans terminal
npm install zustand @types/ws ws
npm install -D @types/zustand
```

**Packages à ajouter**:
```json
{
  "zustand": "^4.4.0",
  "ws": "^8.14.0",
  "@types/ws": "^8.5.0"
}
```

**Pourquoi**:
- `zustand`: Gestion d'état global léger & performant
- `ws`: Client WebSocket natif
- Permet état persistant des notifications

---

### **2. Refonte Service API (1 heure)**

#### A. Nouveau `notificationService.ts` (210+ lignes)

**À implémenter**:

```typescript
// Service complet avec tous les nouveaux endpoints du backend

export interface Notification {
  id: number;
  recipient: number;
  notification_type: string;
  title: string;
  message: string;
  document?: number;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';  // ← NEW
  metadata: Record<string, any>;  // ← NEW
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;  // ← NEW
  archived_at: string | null;  // ← NEW
  group_key?: string;  // ← NEW (grouping)
  expires_at?: string;  // ← NEW (auto-TTL)
  created_at: string;
}

export interface NotificationPreference {
  id: number;
  user: number;
  channel: 'IN_APP' | 'EMAIL' | 'BOTH' | 'NONE';
  frequency: 'IMMEDIATE' | 'DIGEST_HOURLY' | 'DIGEST_DAILY' | 'NEVER';
  quiet_hours_start: string;  // "22:00:00"
  quiet_hours_end: string;    // "08:00:00"
}

// Endpoints à implémenter:
async getNotifications(filters?: {
  limit?: number;
  priority?: string;
  is_read?: boolean;
}): Promise<Notification[]>

async getUnreadCount(): Promise<{ count: number }>  // ← NEW (1 query!)

async bulkMarkRead(): Promise<{ detail: string; count: number }>  // ← NEW (1 query!)

async bulkArchive(): Promise<{ detail: string; count: number }>  // ← NEW (1 query!)

async getStatistics(): Promise<{
  total: number;
  unread: number;
  archived: number;
  by_priority: Record<string, number>;
  by_type: Record<string, number>;
}>  // ← NEW

// Préférences (NEW)
async getPreferences(): Promise<NotificationPreference>
async updatePreferences(data: Partial<NotificationPreference>): Promise<NotificationPreference>
```

**Bénéfices**:
- ✅ Utilise les vrais endpoints bulk (1 query!)
- ✅ Support complet des nouveaux champs
- ✅ Prêt pour WebSocket real-time

---

### **3. Store Zustand pour Notifications (45 min)**

**Créer**: `src/stores/notificationStore.ts` (150+ lignes)

```typescript
// Store global réactif pour toutes les notifications

interface NotificationStore {
  // State
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreference | null;
  loading: boolean;
  
  // Actions
  loadNotifications(): Promise<void>;
  loadUnreadCount(): Promise<void>;
  loadPreferences(): Promise<void>;
  
  // Real-time updates (from WebSocket)
  addNotification(notif: Notification): void;
  updateNotification(id: number, data: Partial<Notification>): void;
  markAsRead(id: number): Promise<void>;
  bulkMarkRead(): Promise<void>;
  bulkArchive(): Promise<void>;
  archive(id: number): Promise<void>;
  
  // Badge counter
  getBadgeCount(): number;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  preferences: null,
  loading: false,
  
  // Methods...
}));
```

**Bénéfices**:
- ✅ État global réactif (UI sync automatique)
- ✅ Performant (pas de prop drilling)
- ✅ Prêt pour WebSocket updates

---

### **4. WebSocket Manager Refactorisé (1 heure)**

**Refactoriser**: `src/services/websocketService.ts`

**Nouveau design**:

```typescript
class NotificationWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  // Listeners Map pour les events
  private listeners = {
    notification_new: [] as Function[],
    notification_batch: [] as Function[],
    badge_update: [] as Function[],
    notification_archived: [] as Function[],
  };
  
  async connect(token: string): Promise<void> {
    // Établir connexion persistante
    // Bind listeners à store Zustand
  }
  
  // Commandes WebSocket
  async markAsRead(id: number): Promise<void> {
    this.send({
      command: 'mark_as_read',
      notification_id: id
    });
  }
  
  async markAllAsRead(): Promise<void> {
    this.send({
      command: 'mark_all_as_read'
    });
  }
  
  async archive(id: number): Promise<void> {
    this.send({
      command: 'archive',
      notification_id: id
    });
  }
  
  // Handlers pour events serveur
  private handleNotificationNew(data: any) {
    // Update store + affichage toast
    useNotificationStore.getState().addNotification(data.data);
  }
  
  private handleBadgeUpdate(data: any) {
    // Update badge counter en temps réel
    useNotificationStore.getState().updateBadgeCount(data.unread_count);
  }
}
```

**Bénéfices**:
- ✅ Connexion persistante (pas de polling)
- ✅ Sync automatique avec store Zustand
- ✅ Real-time UI updates

---

### **5. Composants React (2 heures)**

#### A. `NotificationBell.tsx` (Nouvelle version)

```typescript
/**
 * Cloche de notification avec badge real-time
 * - Badge mise à jour en temps réel via WebSocket
 * - Popup avec notifications
 * - Actions: mark read, archive, delete
 */

export function NotificationBell() {
  const { unreadCount, notifications, bulkMarkRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      {/* Bell icon avec badge */}
      <button className="relative p-2">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white shadow-lg rounded-lg">
          <div className="p-4 border-b flex justify-between">
            <h3>Notifications ({unreadCount} non lues)</h3>
            {unreadCount > 0 && (
              <button onClick={bulkMarkRead} className="text-blue-500">
                Marquer tout comme lu
              </button>
            )}
          </div>
          
          {/* Notification list */}
          <NotificationList notifications={notifications.slice(0, 10)} />
        </div>
      )}
    </div>
  );
}
```

#### B. `NotificationPreferences.tsx` (Nouveau)

```typescript
/**
 * Panneau des préférences utilisateur
 * - Choix du canal (IN_APP, EMAIL, BOTH)
 * - Fréquence (IMMEDIATE, DIGEST)
 * - Heures silencieuses (22h-08h)
 */

export function NotificationPreferences() {
  const { preferences, loading } = useNotificationStore();
  const [formData, setFormData] = useState(preferences);
  
  return (
    <form className="space-y-6 p-6">
      {/* Canal */}
      <div>
        <label>Canal de notification</label>
        <select value={formData.channel}>
          <option value="IN_APP">Application seulement</option>
          <option value="EMAIL">Email seulement</option>
          <option value="BOTH">Application + Email</option>
          <option value="NONE">Désactiver</option>
        </select>
      </div>
      
      {/* Fréquence */}
      <div>
        <label>Fréquence</label>
        <select value={formData.frequency}>
          <option value="IMMEDIATE">Immédiat</option>
          <option value="DIGEST_HOURLY">Résumé horaire</option>
          <option value="DIGEST_DAILY">Résumé quotidien</option>
          <option value="NEVER">Jamais</option>
        </select>
      </div>
      
      {/* Heures silencieuses */}
      <div>
        <label>Heures silencieuses (ex: 22:00 - 08:00)</label>
        <input type="time" value={formData.quiet_hours_start} />
        <span>à</span>
        <input type="time" value={formData.quiet_hours_end} />
      </div>
      
      <button type="submit" className="bg-blue-500 text-white px-4 py-2">
        Enregistrer
      </button>
    </form>
  );
}
```

#### C. `NotificationList.tsx` (Upgradé)

```typescript
/**
 * Liste des notifications avec:
 * - Tous les champs: priority, metadata, archiving
 * - Actions: mark read, archive, delete
 * - Grouping par group_key
 * - Tri par priority
 */

export function NotificationList({ notifications }: Props) {
  const priorityColors = {
    URGENT: 'bg-red-100 border-red-500',
    HIGH: 'bg-orange-100 border-orange-500',
    NORMAL: 'bg-blue-100 border-blue-500',
    LOW: 'bg-gray-100 border-gray-500'
  };
  
  // Grouper par group_key
  const grouped = groupBy(notifications, 'group_key');
  
  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([groupKey, notifs]) => (
        <div key={groupKey} className={priorityColors[notifs[0].priority]}>
          {/* Header */}
          <div className="flex justify-between p-3">
            <h4>{notifs[0].title}</h4>
            <span className="text-xs text-gray-500">
              {notifs.length} notification{notifs.length > 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Détails */}
          {notifs.map(notif => (
            <div key={notif.id} className="text-sm p-2 border-t">
              <p>{notif.message}</p>
              {notif.metadata && (
                <pre className="text-xs bg-gray-50 p-1 rounded mt-1">
                  {JSON.stringify(notif.metadata, null, 2)}
                </pre>
              )}
              
              {/* Actions */}
              <div className="flex gap-2 mt-2">
                {!notif.is_read && (
                  <button 
                    onClick={() => markAsRead(notif.id)}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Marquer comme lu
                  </button>
                )}
                <button 
                  onClick={() => archive(notif.id)}
                  className="text-xs bg-gray-500 text-white px-2 py-1 rounded"
                >
                  Archiver
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

#### D. `NotificationStats.tsx` (Nouveau - Dashboard)

```typescript
/**
 * Dashboard des statistiques de notifications
 * - Total, non lues, archivées
 * - Par priorité (pie chart)
 * - Par type (bar chart)
 */

export function NotificationStats() {
  const { getStatistics } = useNotificationStore();
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    getStatistics().then(setStats);
  }, []);
  
  return (
    <div className="grid grid-cols-4 gap-4 p-6">
      <StatCard 
        title="Total" 
        value={stats?.total || 0}
        color="blue"
      />
      <StatCard 
        title="Non lues"
        value={stats?.unread || 0}
        color="red"
      />
      <StatCard 
        title="Archivées"
        value={stats?.archived || 0}
        color="gray"
      />
      <StatCard 
        title="URGENT"
        value={stats?.by_priority?.URGENT || 0}
        color="red"
      />
      
      {/* Charts */}
      <div className="col-span-2">
        <h3>Par Priorité</h3>
        <PieChart data={stats?.by_priority} />
      </div>
      
      <div className="col-span-2">
        <h3>Par Type</h3>
        <BarChart data={stats?.by_type} />
      </div>
    </div>
  );
}
```

---

### **6. Context/Hooks React (30 min)**

**Créer**: `src/hooks/useNotifications.ts`

```typescript
/**
 * Hook custom pour notifications
 * - Encapsule la logique
 * - Simplifie l'utilisation dans les composants
 */

export function useNotifications() {
  const store = useNotificationStore();
  
  useEffect(() => {
    // Charger notifications au mount
    store.loadNotifications();
    store.loadUnreadCount();
    store.loadPreferences();
    
    // Connecter WebSocket
    const ws = new NotificationWebSocket();
    ws.connect(getToken());
    
    return () => ws.disconnect();
  }, []);
  
  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    preferences: store.preferences,
    markAsRead: store.markAsRead,
    bulkMarkRead: store.bulkMarkRead,
    bulkArchive: store.bulkArchive,
    archive: store.archive,
    updatePreferences: store.updatePreferences
  };
}
```

**Utilisation dans composants**:

```typescript
function MyComponent() {
  const { 
    notifications, 
    unreadCount, 
    bulkMarkRead 
  } = useNotifications();
  
  return (
    <div>
      <p>Vous avez {unreadCount} notifications</p>
      <button onClick={bulkMarkRead}>Marquer tout comme lu</button>
    </div>
  );
}
```

---

### **7. Intégration dans Pages (1 heure)**

#### Mise à jour `Dashboard.tsx`

```typescript
// Ajouter:
- NotificationStats() en haut du dashboard
- NotificationBell() dans la Header
- WebSocket connection
```

#### Création `NotificationsPage.tsx` (Nouveau)

```typescript
/**
 * Page dédiée aux notifications
 * - Liste complète
 * - Filtres (priority, type, date)
 * - Actions bulk
 * - Préférences
 */

export function NotificationsPage() {
  const [filter, setFilter] = useState({
    priority: null,
    type: null,
    isRead: null
  });
  
  const { notifications, bulkMarkRead, bulkArchive } = useNotifications();
  
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      if (filter.priority && n.priority !== filter.priority) return false;
      if (filter.type && n.notification_type !== filter.type) return false;
      if (filter.isRead !== null && n.is_read !== filter.isRead) return false;
      return true;
    });
  }, [notifications, filter]);
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Notifications</h1>
      
      {/* Filtres */}
      <NotificationFilters onChange={setFilter} />
      
      {/* Stats */}
      <NotificationStats />
      
      {/* Bulk actions */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={bulkMarkRead}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Marquer tout comme lu
        </button>
        <button 
          onClick={bulkArchive}
          className="bg-gray-500 text-white px-4 py-2 rounded"
        >
          Archiver tout
        </button>
      </div>
      
      {/* List */}
      <NotificationList notifications={filtered} />
      
      {/* Preferences */}
      <div className="mt-8 border-t pt-8">
        <h2 className="text-2xl font-bold mb-4">Préférences</h2>
        <NotificationPreferences />
      </div>
    </div>
  );
}
```

---

### **8. Mise à Jour du Routing (15 min)**

**Ajouter dans `src/pages/index.tsx`**:

```typescript
// Routes
{
  path: '/notifications',
  element: <NotificationsPage />,
  name: 'Notifications'
}
```

**Ajouter dans Navigation**:

```typescript
<Link to="/notifications" className="flex items-center gap-2">
  <Bell className="w-4 h-4" />
  <span>Notifications</span>
  {unreadCount > 0 && (
    <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
      {unreadCount}
    </span>
  )}
</Link>
```

---

## 📋 Checklist de Mise à Jour

### Phase 12A: Préparation (30 min) ✅
- [ ] Installer dépendances (zustand, ws)
- [ ] Vérifier structure du projet
- [ ] Créer dossiers (stores, hooks)

### Phase 12B: Services (1 heure)
- [ ] Refactoriser `notificationService.ts` (210 lignes)
- [ ] Tester tous les endpoints
- [ ] Ajouter handlers d'erreur

### Phase 12C: State Management (45 min)
- [ ] Créer `notificationStore.ts` (Zustand)
- [ ] Implémenter toutes les actions
- [ ] Ajouter validations

### Phase 12D: WebSocket (1 heure)
- [ ] Refactoriser `websocketService.ts`
- [ ] Ajouter listeners au store
- [ ] Tester reconnection

### Phase 12E: Composants (2 heures)
- [ ] `NotificationBell.tsx` (amélioré)
- [ ] `NotificationPreferences.tsx` (nouveau)
- [ ] `NotificationList.tsx` (upgrade)
- [ ] `NotificationStats.tsx` (nouveau)
- [ ] `NotificationFilters.tsx` (nouveau)

### Phase 12F: Hooks & Utils (30 min)
- [ ] `useNotifications.ts` hook
- [ ] Utilitaires (groupBy, formatting)
- [ ] Context providers si nécessaire

### Phase 12G: Integration (1 heure)
- [ ] Mettre à jour Dashboard
- [ ] Créer NotificationsPage
- [ ] Mettre à jour routing
- [ ] Intégrer dans Header/Navigation

### Phase 12H: Testing & Refinement (1 heure)
- [ ] Tests manuels (WebSocket push)
- [ ] Tests bulk operations
- [ ] Tests préférences utilisateur
- [ ] Performance checks

---

## 🎯 Résultat Final

### Avant vs Après

| Aspect | Avant ❌ | Après ✅ |
|--------|---------|----------|
| Real-Time | Polling loop | WebSocket persistent |
| Bulk Op | Loop N fois | 1 query |
| Badge | Statique | Real-time updates |
| Prefs | Pas supporté | Panel complet |
| Stats | Pas de dashboard | Dashboard complet |
| Performance | Lent | 1000x faster |
| UX | Basique | Moderne & intuitif |

### Nouveau Frontend Features

```
✅ Cloche avec badge real-time
✅ Notifications groupées par priorité
✅ Bulk actions (mark all, archive all)
✅ Panel de préférences complet
✅ Dashboard de statistiques
✅ Page dédiée aux notifications
✅ Filtres avancés
✅ Architecture moderne (Zustand)
✅ WebSocket persistante
✅ Support de tous les champs backend
```

---

## 🚀 Commencer Phase 12

### Commande pour démarrer:

```bash
cd /home/lidruf/sgdra/sgdra/frontend

# 1. Installer dépendances
npm install zustand ws @types/ws

# 2. Créer structure
mkdir -p src/stores src/hooks

# 3. Refactor services
# voir "Fichiers à créer/modifier" plus bas

# 4. Building
npm run build

# 5. Dev
npm run dev
```

---

## 📁 Fichiers à Créer/Modifier

### Nouveaux Fichiers (à créer)
```
src/stores/notificationStore.ts              (150+ lignes)
src/hooks/useNotifications.ts                (50+ lignes)
src/components/NotificationBell.tsx          (100+ lignes - upgrade)
src/components/NotificationPreferences.tsx   (120+ lignes - NEW)
src/components/NotificationList.tsx          (150+ lignes - upgrade)
src/components/NotificationStats.tsx         (80+ lignes - NEW)
src/components/NotificationFilters.tsx       (70+ lignes - NEW)
src/pages/NotificationsPage.tsx              (200+ lignes - NEW)
src/utils/notificationUtils.ts               (50+ lignes - groupBy, etc)
```

### Fichiers à Modifier
```
src/services/notificationService.ts          (210 lignes - refactor)
src/services/websocketService.ts             (refactor)
src/pages/Dashboard.tsx                      (add NotificationStats)
src/pages/index.tsx                          (add notifications route)
src/components/Header.tsx                    (add NotificationBell)
package.json                                 (add dependencies)
```

---

## ✨ Timeline Réaliste

```
Phase 12A: 30 min  - Préparation
Phase 12B: 1h      - Services
Phase 12C: 45 min  - Store
Phase 12D: 1h      - WebSocket
Phase 12E: 2h      - Composants
Phase 12F: 30 min  - Hooks
Phase 12G: 1h      - Integration
Phase 12H: 1h      - Testing

TOTAL: 7.5-8 heures
```

---

**Status**: 🔄 Prêt à commencer Phase 12  
**Prochaine Action**: Installer dépendances + créer store Zustand  
**Frontend Modernisé**: Complètement aligné au backend production-ready ✅
