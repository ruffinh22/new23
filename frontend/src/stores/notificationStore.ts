/**
 * Store Zustand pour les Notifications - Phase 12
 * 
 * ✅ Gestion d'état global réactif des notifications
 * ✅ Performant et minimaliste (pas de prop drilling)
 * ✅ Sync automatique avec WebSocket
 * ✅ Persiste les préférences utilisateur
 * 
 * Utilisation:
 *   import { useNotificationStore } from '@/stores/notificationStore'
 *   
 *   function MyComponent() {
 *     const { notifications, unreadCount, markAsRead } = useNotificationStore()
 *     return <div>Vous avez {unreadCount} notifications</div>
 *   }
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  Notification,
  NotificationPreference,
  notificationService,
  NotificationStatistics,
  NotificationFilters
} from '@/services/notificationService'

/* ============================================================================
   TYPES & INTERFACES
   ============================================================================ */

interface NotificationState {
  // State - Notifications
  notifications: Notification[]
  unreadCount: number
  statistics: NotificationStatistics | null
  
  // State - Préférences
  preferences: NotificationPreference | null
  
  // State - UI
  loading: boolean
  error: string | null
  filter: NotificationFilters | null
  pagination: {
    page: number
    pageSize: number
    total: number
  }

  // Actions - Chargement
  loadNotifications: (filters?: NotificationFilters) => Promise<void>
  loadUnreadCount: () => Promise<void>
  loadStatistics: () => Promise<void>
  loadPreferences: () => Promise<void>
  refreshAll: () => Promise<void>

  // Actions - Notifications
  addNotification: (notification: Notification) => void
  updateNotification: (id: number, data: Partial<Notification>) => void
  removeNotification: (id: number) => void
  markAsRead: (id: number) => Promise<void>
  bulkMarkRead: () => Promise<void>
  archive: (id: number) => Promise<void>
  bulkArchive: () => Promise<void>
  deleteNotification: (id: number) => Promise<void>

  // Actions - Préférences
  updatePreferences: (data: Partial<NotificationPreference>) => Promise<void>
  setEmailNotifications: (enabled: boolean) => Promise<void>
  setInAppNotifications: (enabled: boolean) => Promise<void>
  setQuietHours: (start: string, end: string) => Promise<void>
  setFrequency: (frequency: 'IMMEDIATE' | 'DIGEST_HOURLY' | 'DIGEST_DAILY' | 'NEVER') => Promise<void>

  // Actions - UI
  setFilter: (filter: NotificationFilters | null) => void
  setPage: (page: number) => void
  clearError: () => void

  // Helpers
  getBadgeCount: () => number
  getUnreadByPriority: () => Record<string, number>
  isInQuietHours: () => boolean
}

/* ============================================================================
   STORE ZUSTAND
   ============================================================================ */

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        // ========== INITIAL STATE ==========
        notifications: [],
        unreadCount: 0,
        statistics: null,
        preferences: null,
        loading: false,
        error: null,
        filter: null,
        pagination: {
          page: 1,
          pageSize: 50,
          total: 0
        },

        // ========== ACTIONS: CHARGEMENT ==========

        /**
         * Charger les notifications avec filtres
         */
        async loadNotifications(filters?: NotificationFilters) {
          set({ loading: true, error: null })
          try {
            const response = await notificationService.getNotifications(filters)
            set({
              notifications: response.results,
              pagination: {
                page: 1,
                pageSize: filters?.limit || 50,
                total: response.count
              }
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur lors du chargement'
            set({ error: message })
            console.error('[notificationStore] Error loading notifications:', error)
          } finally {
            set({ loading: false })
          }
        },

        /**
         * Charger le nombre de notifications non-lues
         * ✅ Endpoint optimisé du backend (1 query!)
         */
        async loadUnreadCount() {
          try {
            const count = await notificationService.getUnreadCount()
            set({ unreadCount: count })
          } catch (error) {
            console.error('[notificationStore] Error loading unread count:', error)
          }
        },

        /**
         * Charger les statistiques
         */
        async loadStatistics() {
          try {
            const stats = await notificationService.getStatistics()
            set({ statistics: stats })
          } catch (error) {
            console.error('[notificationStore] Error loading statistics:', error)
          }
        },

        /**
         * Charger les préférences de notification
         */
        async loadPreferences() {
          try {
            const prefs = await notificationService.getPreferences()
            set({ preferences: prefs })
          } catch (error) {
            console.error('[notificationStore] Error loading preferences:', error)
            // Fournir des valeurs par défaut
            set({
              preferences: {
                id: 0,
                user: 0,
                channel: 'BOTH',
                frequency: 'IMMEDIATE',
                quiet_hours_start: '22:00:00',
                quiet_hours_end: '08:00:00'
              }
            })
          }
        },

        /**
         * Rafraîchir tout (notifs, count, stats, prefs)
         */
        async refreshAll() {
          await Promise.all([
            get().loadNotifications(),
            get().loadUnreadCount(),
            get().loadStatistics(),
            get().loadPreferences()
          ])
        },

        // ========== ACTIONS: NOTIFICATIONS ==========

        /**
         * Ajouter une nouvelle notification (from WebSocket)
         */
        addNotification(notification: Notification) {
          set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: !notification.is_read ? state.unreadCount + 1 : state.unreadCount
          }))
        },

        /**
         * Mettre à jour une notification existante
         */
        updateNotification(id: number, data: Partial<Notification>) {
          set((state) => ({
            notifications: state.notifications.map((notif) =>
              notif.id === id ? { ...notif, ...data } : notif
            )
          }))
        },

        /**
         * Supprimer une notification de la liste
         */
        removeNotification(id: number) {
          set((state) => ({
            notifications: state.notifications.filter((notif) => notif.id !== id)
          }))
        },

        /**
         * Marquer une notification spécifique comme lue
         */
        async markAsRead(id: number) {
          try {
            const updated = await notificationService.markAsRead(id)
            get().updateNotification(id, updated)
            await get().loadUnreadCount()
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur lors du marquage'
            set({ error: message })
            throw error
          }
        },

        /**
         * 🆕 Marquer TOUTES les notifications non-lues comme lues
         * ✅ Endpoint bulk (1 query pour 1000+ notifs!)
         */
        async bulkMarkRead() {
          try {
            await notificationService.bulkMarkRead()
            // Mettre à jour toutes les notifs localement
            get().notifications.forEach((notif) => {
              if (!notif.is_read) {
                get().updateNotification(notif.id, {
                  is_read: true,
                  read_at: new Date().toISOString()
                })
              }
            })
            set({ unreadCount: 0 })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur lors du marquage'
            set({ error: message })
            throw error
          }
        },

        /**
         * Archiver une notification spécifique
         */
        async archive(id: number) {
          try {
            const updated = await notificationService.archive(id)
            get().updateNotification(id, updated)
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur lors de l\'archivage'
            set({ error: message })
            throw error
          }
        },

        /**
         * 🆕 Archiver TOUTES les notifications
         * ✅ Endpoint bulk (1 query pour 1000+ notifs!)
         */
        async bulkArchive() {
          try {
            await notificationService.bulkArchive()
            // Marquer toutes les notifs comme archivées localement
            get().notifications.forEach((notif) => {
              if (!notif.is_archived) {
                get().updateNotification(notif.id, {
                  is_archived: true,
                  archived_at: new Date().toISOString()
                })
              }
            })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur lors de l\'archivage'
            set({ error: message })
            throw error
          }
        },

        /**
         * Supprimer une notification spécifique
         */
        async deleteNotification(id: number) {
          try {
            await notificationService.deleteNotification(id)
            get().removeNotification(id)
            await get().loadUnreadCount()
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur lors de la suppression'
            set({ error: message })
            throw error
          }
        },

        // ========== ACTIONS: PRÉFÉRENCES ==========

        /**
         * Mettre à jour les préférences
         */
        async updatePreferences(data: Partial<NotificationPreference>) {
          try {
            const updated = await notificationService.updatePreferences(data)
            set({ preferences: updated })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
            set({ error: message })
            throw error
          }
        },

        /**
         * Activer/Désactiver EMAIL
         */
        async setEmailNotifications(enabled: boolean) {
          try {
            const updated = await notificationService.setEmailNotifications(enabled)
            set({ preferences: updated })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur'
            set({ error: message })
            throw error
          }
        },

        /**
         * Activer/Désactiver IN_APP
         */
        async setInAppNotifications(enabled: boolean) {
          try {
            const updated = await notificationService.setInAppNotifications(enabled)
            set({ preferences: updated })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur'
            set({ error: message })
            throw error
          }
        },

        /**
         * Définir les heures silencieuses
         */
        async setQuietHours(start: string, end: string) {
          try {
            const updated = await notificationService.setQuietHours(start, end)
            set({ preferences: updated })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur'
            set({ error: message })
            throw error
          }
        },

        /**
         * Définir la fréquence
         */
        async setFrequency(frequency: 'IMMEDIATE' | 'DIGEST_HOURLY' | 'DIGEST_DAILY' | 'NEVER') {
          try {
            const updated = await notificationService.setFrequency(frequency)
            set({ preferences: updated })
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur'
            set({ error: message })
            throw error
          }
        },

        // ========== ACTIONS: UI ==========

        /**
         * Définir le filtre actuel
         */
        setFilter(filter: NotificationFilters | null) {
          set({ filter })
        },

        /**
         * Aller à une page spécifique
         */
        setPage(page: number) {
          set((state) => ({
            pagination: { ...state.pagination, page }
          }))
        },

        /**
         * Effacer le message d'erreur
         */
        clearError() {
          set({ error: null })
        },

        // ========== HELPERS ==========

        /**
         * Obtenir le badge count (nombre de notifs non-lues)
         */
        getBadgeCount(): number {
          return get().unreadCount
        },

        /**
         * Obtenir les non-lues par priorité
         */
        getUnreadByPriority(): Record<string, number> {
          const counts = {
            LOW: 0,
            NORMAL: 0,
            HIGH: 0,
            URGENT: 0
          }

          get().notifications.forEach((notif) => {
            if (!notif.is_read) {
              counts[notif.priority]++
            }
          })

          return counts
        },

        /**
         * Vérifier si on est dans les heures silencieuses
         */
        isInQuietHours(): boolean {
          const prefs = get().preferences
          if (!prefs) return false
          return notificationService.isInQuietHours(prefs)
        }
      }),
      {
        name: 'notification-store',
        partialize: (state) => ({
          preferences: state.preferences,
          pagination: state.pagination,
          filter: state.filter
        })
      }
    )
  )
)

export type { NotificationState }
