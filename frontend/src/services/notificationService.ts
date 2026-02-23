/**
 * Service API pour les Notifications - Phase 12 Refactorisation
 * 
 * ✅ Utilise les nouveaux endpoints bulk du backend
 * ✅ Support complet de tous les champs (priority, metadata, archiving)
 * ✅ Gestion des préférences utilisateur
 * ✅ Statistiques et analytics
 * 
 * Endpoints utilisés:
 * - GET    /api/notifications/                           (list avec pagination)
 * - GET    /api/notifications/unread_count/              (count optimisé, 1 query)
 * - POST   /api/notifications/bulk_mark_read/            (bulk, 1 query)
 * - POST   /api/notifications/bulk_archive/              (bulk, 1 query)
 * - GET    /api/notifications/statistics/                (stats complètes)
 * - GET    /api/notifications/preferences/               (user preferences)
 * - POST   /api/notifications/preferences/               (update preferences)
 * - PATCH  /api/notifications/{id}/mark_as_read/         (single)
 * - PATCH  /api/notifications/{id}/archive/              (single)
 * - DELETE /api/notifications/{id}/                      (single)
 */

import { apiClient } from './api'

/* ============================================================================
   TYPES & INTERFACES
   ============================================================================ */

export interface Notification {
  id: number
  recipient: number
  notification_type: string
  title: string
  message: string
  document?: number
  
  // 🆕 Nouveaux champs Phase 11f
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  metadata: Record<string, any>
  is_read: boolean
  read_at: string | null
  is_archived: boolean
  archived_at: string | null
  group_key?: string
  expires_at?: string | null
  
  created_at: string
  updated_at?: string
}

export interface NotificationPreference {
  id: number
  user: number
  channel: 'IN_APP' | 'EMAIL' | 'BOTH' | 'NONE'
  frequency: 'IMMEDIATE' | 'DIGEST_HOURLY' | 'DIGEST_DAILY' | 'NEVER'
  quiet_hours_start: string  // Format: "22:00:00"
  quiet_hours_end: string    // Format: "08:00:00"
  created_at?: string
  updated_at?: string
}

export interface UnreadCountResponse {
  count: number
}

export interface BulkOperationResponse {
  detail: string
  count: number
  status: string
}

export interface NotificationStatistics {
  total: number
  unread: number
  archived: number
  by_priority: {
    LOW: number
    NORMAL: number
    HIGH: number
    URGENT: number
  }
  by_type: Record<string, number>
  expired: number
}

export interface NotificationFilters {
  limit?: number
  offset?: number
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  notification_type?: string
  is_read?: boolean
  is_archived?: boolean
  ordering?: string  // '-created_at', 'priority', etc
}

/* ============================================================================
   NOTIFICATION SERVICE
   ============================================================================ */

export const notificationService = {
  /**
   * Récupérer la liste des notifications avec pagination et filtres
   * 
   * ✅ Utilise endpoint optimisé du backend
   * ✅ Supporte tous les filtres
   * ✅ Triage par date (défaut)
   */
  async getNotifications(
    filters?: NotificationFilters
  ): Promise<{ results: Notification[]; count: number; next?: string; previous?: string }> {
    try {
      const params = new URLSearchParams()
      
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())
      if (filters?.priority) params.append('priority', filters.priority)
      if (filters?.notification_type) params.append('notification_type', filters.notification_type)
      if (filters?.is_read !== undefined) params.append('is_read', String(filters.is_read))
      if (filters?.is_archived !== undefined) params.append('is_archived', String(filters.is_archived))
      
      // Par défaut, trier par date décroissante (récentes d'abord)
      const ordering = filters?.ordering || '-created_at'
      params.append('ordering', ordering)

      const queryString = params.toString()
      const url = queryString ? `/notifications/?${queryString}` : '/notifications/'
      
      const response = await apiClient.get(url)
      
      // Support pagination DRF standard
      if (response.data.results && Array.isArray(response.data.results)) {
        return {
          results: response.data.results,
          count: response.data.count || 0,
          next: response.data.next,
          previous: response.data.previous
        }
      }
      
      // Fallback si pas de pagination
      if (Array.isArray(response.data)) {
        return {
          results: response.data,
          count: response.data.length
        }
      }

      console.warn('[notificationService] Unexpected response format:', response.data)
      return { results: [], count: 0 }
    } catch (error) {
      console.error('[notificationService] Error fetching notifications:', error)
      throw error
    }
  },

  /**
   * Récupérer une notification spécifique par ID
   * 
   * ✅ Includs tous les champs (metadata, priority, etc)
   */
  async getNotification(id: number): Promise<Notification> {
    try {
      const response = await apiClient.get(`/notifications/${id}/`)
      return response.data
    } catch (error) {
      console.error(`[notificationService] Error fetching notification ${id}:`, error)
      throw error
    }
  },

  /**
   * 🆕 Récupérer le nombre de notifications non-lues
   * 
   * ✅ Endpoint spécialisé du backend (1 query seulement!)
   * ✅ BEAUCOUP plus rapide que charger toutes les notifs et filtrer en mémoire
   * 
   * Ancien code (❌ INEFFICACE):
   *   const notifs = await getNotifications()
   *   return notifs.filter(n => !n.is_read).length  // charge TOUTES les notifs!
   */
  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get('/notifications/unread_count/')
      return response.data.count || 0
    } catch (error) {
      console.error('[notificationService] Error fetching unread count:', error)
      return 0
    }
  },

  /**
   * Marquer une notification spécifique comme lue
   * 
   * ✅ API: PATCH /notifications/{id}/mark_as_read/
   */
  async markAsRead(id: number): Promise<Notification> {
    try {
      const response = await apiClient.patch(`/notifications/${id}/mark_as_read/`, {})
      return response.data
    } catch (error) {
      console.error(`[notificationService] Error marking notification ${id} as read:`, error)
      throw error
    }
  },

  /**
   * 🆕 Marquer TOUTES les notifications non-lues comme lues
   * 
   * ✅ Endpoint bulk du backend (1 query pour 1000+ notifs!)
   * ✅ BEAUCOUP plus rapide que la boucle ancien code
   * 
   * Ancien code (❌ INEFFICACE):
   *   const notifs = await getNotifications()
   *   const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id)
   *   return Promise.all(unreadIds.map(id => markAsRead(id)))  // N queries!
   */
  async bulkMarkRead(): Promise<BulkOperationResponse> {
    try {
      const response = await apiClient.post('/notifications/bulk_mark_read/', {})
      return response.data
    } catch (error) {
      console.error('[notificationService] Error in bulk mark read:', error)
      throw error
    }
  },

  /**
   * Alias for bulkMarkRead for convenience
   * Marks all unread notifications as read
   */
  async markAllAsRead(): Promise<BulkOperationResponse> {
    return this.bulkMarkRead()
  },

  /**
   * 🆕 Archiver une notification spécifique
   * 
   * ✅ API: PATCH /notifications/{id}/archive/
   */
  async archive(id: number): Promise<Notification> {
    try {
      const response = await apiClient.patch(`/notifications/${id}/archive/`, {})
      return response.data
    } catch (error) {
      console.error(`[notificationService] Error archiving notification ${id}:`, error)
      throw error
    }
  },

  /**
   * 🆕 Archiver TOUTES les notifications
   * 
   * ✅ Endpoint bulk du backend (1 query pour 1000+ notifs!)
   */
  async bulkArchive(): Promise<BulkOperationResponse> {
    try {
      const response = await apiClient.post('/notifications/bulk_archive/', {})
      return response.data
    } catch (error) {
      console.error('[notificationService] Error in bulk archive:', error)
      throw error
    }
  },

  /**
   * Supprimer une notification spécifique
   * 
   * ✅ Hard delete via API
   */
  async deleteNotification(id: number): Promise<void> {
    try {
      await apiClient.delete(`/notifications/${id}/`)
    } catch (error) {
      console.error(`[notificationService] Error deleting notification ${id}:`, error)
      throw error
    }
  },

  /**
   * 🆕 Récupérer les statistiques complètes
   * 
   * ✅ Dashboard data - totals, by priority, by type
   * ✅ Endpoint spécialisé du backend
   */
  async getStatistics(): Promise<NotificationStatistics> {
    try {
      const response = await apiClient.get('/notifications/statistics/')
      return response.data
    } catch (error) {
      console.error('[notificationService] Error fetching statistics:', error)
      throw error
    }
  },

  /* ============================================================================
     PRÉFÉRENCES DE NOTIFICATION (🆕 NEW)
     ============================================================================ */

  /**
   * 🆕 Récupérer les préférences de notification de l'utilisateur
   * 
   * ✅ Inclut: canal (IN_APP/EMAIL), fréquence, heures silencieuses
   */
  async getPreferences(): Promise<NotificationPreference> {
    try {
      const response = await apiClient.get('/notifications/preferences/')
      return response.data
    } catch (error) {
      // Si pas de préférences, retourner les valeurs par défaut
      console.warn('[notificationService] Error fetching preferences (using defaults):', error)
      return {
        id: 0,
        user: 0,
        channel: 'BOTH',
        frequency: 'IMMEDIATE',
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '08:00:00'
      }
    }
  },

  /**
   * 🆕 Mettre à jour les préférences de notification
   * 
   * ✅ API: POST /notifications/preferences/
   * ✅ Support update partiel (pass que les champs à modifier)
   */
  async updatePreferences(
    data: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    try {
      const response = await apiClient.post('/notifications/preferences/', data)
      return response.data
    } catch (error) {
      console.error('[notificationService] Error updating preferences:', error)
      throw error
    }
  },

  /**
   * 🆕 Activer/Désactiver le canal EMAIL
   * 
   * ✅ Helper pour les préférences
   */
  async setEmailNotifications(enabled: boolean): Promise<NotificationPreference> {
    try {
      const current = await this.getPreferences()
      const newChannel = 
        enabled 
          ? (current.channel === 'IN_APP' ? 'BOTH' : 'EMAIL')
          : (current.channel === 'BOTH' ? 'IN_APP' : 'NONE')
      
      return this.updatePreferences({ channel: newChannel })
    } catch (error) {
      console.error('[notificationService] Error setting email notifications:', error)
      throw error
    }
  },

  /**
   * 🆕 Activer/Désactiver le canal IN_APP
   * 
   * ✅ Helper pour les préférences
   */
  async setInAppNotifications(enabled: boolean): Promise<NotificationPreference> {
    try {
      const current = await this.getPreferences()
      const newChannel = 
        enabled 
          ? (current.channel === 'EMAIL' ? 'BOTH' : 'IN_APP')
          : (current.channel === 'BOTH' ? 'EMAIL' : 'NONE')
      
      return this.updatePreferences({ channel: newChannel })
    } catch (error) {
      console.error('[notificationService] Error setting in-app notifications:', error)
      throw error
    }
  },

  /**
   * 🆕 Définir les heures silencieuses
   * 
   * ✅ Helper pour les préférences
   * 
   * @param startTime Format: "22:00:00" ou "22:00"
   * @param endTime   Format: "08:00:00" ou "08:00"
   */
  async setQuietHours(startTime: string, endTime: string): Promise<NotificationPreference> {
    try {
      // Normaliser format HH:MM à HH:MM:SS si nécessaire
      const normalizeTime = (time: string): string => {
        const parts = time.split(':')
        if (parts.length === 2) {
          return `${parts[0]}:${parts[1]}:00`
        }
        return time
      }

      return this.updatePreferences({
        quiet_hours_start: normalizeTime(startTime),
        quiet_hours_end: normalizeTime(endTime)
      })
    } catch (error) {
      console.error('[notificationService] Error setting quiet hours:', error)
      throw error
    }
  },

  /**
   * 🆕 Définir la fréquence de notifications
   * 
   * ✅ Helper pour les préférences
   */
  async setFrequency(
    frequency: 'IMMEDIATE' | 'DIGEST_HOURLY' | 'DIGEST_DAILY' | 'NEVER'
  ): Promise<NotificationPreference> {
    try {
      return this.updatePreferences({ frequency })
    } catch (error) {
      console.error('[notificationService] Error setting frequency:', error)
      throw error
    }
  },

  /* ============================================================================
     UTILITAIRES & HELPERS
     ============================================================================ */

  /**
   * 🆕 Vérifier si on est dans les heures silencieuses
   * 
   * ✅ Utilitaire client-side pour vérifier avant d'afficher une notif
   */
  isInQuietHours(preferences: NotificationPreference): boolean {
    try {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      
      const start = preferences.quiet_hours_start.substring(0, 5)  // "22:00"
      const end = preferences.quiet_hours_end.substring(0, 5)      // "08:00"

      // Cas spécial: plages qui chevauchent minuit (ex: 22:00 - 08:00)
      if (start > end) {
        return currentTime >= start || currentTime < end
      }

      // Plage normale (ex: 14:00 - 18:00)
      return currentTime >= start && currentTime < end
    } catch (error) {
      console.error('[notificationService] Error checking quiet hours:', error)
      return false
    }
  },

  /**
   * 🆕 Grouper les notifications par clé
   * 
   * ✅ Utilitaire pour l'UI (grouping dans NotificationList)
   */
  groupByKey(notifications: Notification[]): Map<string | undefined, Notification[]> {
    const groups = new Map<string | undefined, Notification[]>()

    for (const notif of notifications) {
      const key = notif.group_key || `notif-${notif.id}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(notif)
    }

    return groups
  },

  /**
   * 🆕 Trier par priorité (URGENT → LOW)
   * 
   * ✅ Utilitaire pour l'UI
   */
  sortByPriority(notifications: Notification[]): Notification[] {
    const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
    return [...notifications].sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    )
  },

  /**
   * 🆕 Filtrer les notifications non lues par priorité
   * 
   * ✅ Utilitaire pour le dashboard
   */
  getUnreadByPriority(notifications: Notification[]): Partial<NotificationStatistics['by_priority']> {
    const counts = {
      LOW: 0,
      NORMAL: 0,
      HIGH: 0,
      URGENT: 0
    }

    for (const notif of notifications) {
      if (!notif.is_read) {
        counts[notif.priority]++
      }
    }

    return counts
  },

  /**
   * 🆕 Vérifier si une notification est expirée
   * 
   * ✅ Utilitaire pour l'UI
   */
  isExpired(notification: Notification): boolean {
    if (!notification.expires_at) return false
    return new Date(notification.expires_at) < new Date()
  },

  /**
   * 🆕 Convertir timestamp en texte lisible ("5 min ago", "2 hours ago", etc)
   * 
   * ✅ Utilitaire pour l'UI
   */
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    }

    for (const [key, value] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / value)
      if (interval >= 1) {
        return interval === 1 ? `il y a 1 ${key}` : `il y a ${interval} ${key}s`
      }
    }

    return 'À l\'instant'
  }
}

export type { NotificationFilters, BulkOperationResponse, NotificationStatistics }
