/**
 * Hook personalisé useNotifications
 * 
 * Encapsule toute la logique des notifications
 * Simplifie l'utilisation dans les composants
 * 
 * Utilisation:
 *   const { notifications, unreadCount, markAsRead } = useNotifications()
 */

import { useEffect } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { wsService } from '@/services/websocketService'
import { STORAGE_KEYS } from '@/utils/constants'

export function useNotifications() {
  const store = useNotificationStore()

  // Initialisation au mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken)
    if (!token) {
      console.warn('[useNotifications] No access token available')
      return
    }

    // Charger les données initiales
    store.refreshAll()

    // Connecter WebSocket
    wsService
      .connect(token)
      .then(() => {
        console.log('[useNotifications] WebSocket connected')
      })
      .catch((error) => {
        console.error('[useNotifications] WebSocket connection error:', error)
      })

    // WebSocket listeners
    const handleNotificationNew = (data: any) => {
      console.log('[useNotifications] New notification received:', data)
      if (data.notification) {
        store.addNotification(data.notification)
        store.loadUnreadCount()
      }
    }

    const handleNotificationUpdated = (data: any) => {
      console.log('[useNotifications] Notification updated:', data)
      if (data.notification) {
        store.updateNotification(data.notification.id, data.notification)
        store.loadUnreadCount()
      }
    }

    const handleBadgeUpdate = (data: any) => {
      console.log('[useNotifications] Badge update:', data)
      store.loadUnreadCount()
    }

    wsService.on('notification_new', handleNotificationNew)
    wsService.on('notification_updated', handleNotificationUpdated)
    wsService.on('badge_update', handleBadgeUpdate)

    // Cleanup
    return () => {
      wsService.off('notification_new', handleNotificationNew)
      wsService.off('notification_updated', handleNotificationUpdated)
      wsService.off('badge_update', handleBadgeUpdate)
      wsService.disconnect()
    }
  }, [store])

  return {
    // State
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    preferences: store.preferences,
    statistics: store.statistics,
    loading: store.loading,
    error: store.error,

    // Actions - Notifications
    addNotification: store.addNotification,
    updateNotification: store.updateNotification,
    removeNotification: store.removeNotification,
    markAsRead: store.markAsRead,
    bulkMarkRead: store.bulkMarkRead,
    archive: store.archive,
    bulkArchive: store.bulkArchive,
    deleteNotification: store.deleteNotification,

    // Actions - Préférences
    updatePreferences: store.updatePreferences,
    setEmailNotifications: store.setEmailNotifications,
    setInAppNotifications: store.setInAppNotifications,
    setQuietHours: store.setQuietHours,
    setFrequency: store.setFrequency,

    // Actions - UI
    setFilter: store.setFilter,
    setPage: store.setPage,
    clearError: store.clearError,

    // Helpers
    getBadgeCount: store.getBadgeCount,
    getUnreadByPriority: store.getUnreadByPriority,
    isInQuietHours: store.isInQuietHours,

    // Refresh
    refreshAll: store.refreshAll,
    loadNotifications: store.loadNotifications,
    loadStatistics: store.loadStatistics,
    loadPreferences: store.loadPreferences
  }
}
