/**
 * Hook personalisé useNotifications
 * 
 * Gère la connexion WebSocket en temps réel et les notifications
 * - Attend l'authentification avant de se connecter
 * - Gère automatiquement les reconnexions
 * - Écoute les mises à jour en temps réel du serveur
 */

import { useEffect, useRef, useCallback } from 'react'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAuth } from '@/contexts/AuthContext'
import { wsService } from '@/services/websocketService'
import { STORAGE_KEYS } from '@/utils/constants'

export function useNotifications() {
  const store = useNotificationStore()
  const { isAuthenticated } = useAuth()
  const storeRef = useRef(store)
  const hasInitializedRef = useRef(false)

  // Garder les refs à jour
  useEffect(() => {
    storeRef.current = store
  }, [store])

  // Créer les handlers (stable pour éviter les re-registrations)
  const createHandlers = useCallback(() => {
    return {
      handleNotification: (data: any) => {
        console.log('[useNotifications] 📨 Notification reçue:', data.notification?.id)
        if (data.notification) {
          storeRef.current.addNotification(data.notification)
          storeRef.current.loadUnreadCount()
        }
      },
      handleNotificationUpdated: (data: any) => {
        console.log('[useNotifications] ✏️ Notification mise à jour:', data.notification?.id)
        if (data.notification) {
          storeRef.current.updateNotification(data.notification.id, data.notification)
          storeRef.current.loadUnreadCount()
        }
      },
      handleInitialNotifications: (data: any) => {
        console.log('[useNotifications] 📦 Notifications initiales reçues:', data.count)
      }
    }
  }, [])

  // EFFET PRINCIPAL: Gérer la connexion WebSocket
  useEffect(() => {
    // Ne rien faire si pas authentifié
    if (!isAuthenticated) {
      console.log('[useNotifications] ⏳ En attente d\'authentification...')
      hasInitializedRef.current = false
      return
    }

    // Récupérer le token depuis localStorage
    const authToken = localStorage.getItem(STORAGE_KEYS.accessToken)
    
    if (!authToken) {
      console.log('[useNotifications] ❌ Aucun token trouvé en localStorage')
      hasInitializedRef.current = false
      return
    }

    // Éviter les initialisations multiples
    if (hasInitializedRef.current) {
      console.log('[useNotifications] ✅ Déjà initialisé, on saute')
      return
    }

    hasInitializedRef.current = true
    console.log('[useNotifications] 🚀 Initialisation avec token...')

    // Créer les handlers
    const handlers = createHandlers()

    // Enregistrer les handlers AVANT connexion
    wsService.on('notification', handlers.handleNotification)
    wsService.on('notification_updated', handlers.handleNotificationUpdated)
    wsService.on('initial_notifications', handlers.handleInitialNotifications)

    // Charger les notifications initiales via HTTP
    storeRef.current.refreshAll()

    // Se connecter au WebSocket
    wsService
      .connect(authToken)
      .then(() => {
        console.log('[useNotifications] ✅ WebSocket connecté avec succès')
      })
      .catch((error) => {
        console.error('[useNotifications] ❌ Erreur connexion WebSocket:', error)
      })

    // CLEANUP: Fermer la connexion et désenregistrer les handlers
    return () => {
      console.log('[useNotifications] 🧹 Cleanup: désenregistrement des handlers')
      wsService.off('notification', handlers.handleNotification)
      wsService.off('notification_updated', handlers.handleNotificationUpdated)
      wsService.off('initial_notifications', handlers.handleInitialNotifications)
      wsService.disconnect()
      hasInitializedRef.current = false
    }
  }, [isAuthenticated, createHandlers])

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

