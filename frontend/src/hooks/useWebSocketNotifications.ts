/**
 * Hook React pour utiliser WebSocket dans les composants
 */

import { useEffect, useState, useCallback } from 'react'
import { wsService } from '@/services/websocketService'

export interface Notification {
  id: number
  notification_type: string
  resource_url?: string
  is_read: boolean
  created_at: string
}

export const useWebSocketNotifications = (enabled = true) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const markAsRead = useCallback((notificationId: number) => {
    wsService.markAsRead(notificationId)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    )
  }, [])

  const getUnreadCount = useCallback(() => {
    wsService.getUnreadCount()
  }, [])

  useEffect(() => {
    if (!enabled) return

    const token = localStorage.getItem('access_token')
    if (!token) {
      console.warn('Pas de token pour WebSocket')
      return
    }

    setIsLoading(true)
    let isActive = true

    // Connect to WebSocket
    wsService.connect(token).then(() => {
      if (isActive) {
        setIsConnected(true)
        setIsLoading(false)
      }
    }).catch((error) => {
      console.error('WebSocket connection error:', error)
      if (isActive) {
        setIsLoading(false)
        setIsConnected(false)
      }
    })

    // Define handlers
    const handleInitialSync = (data: any) => {
      if (isActive) {
        console.log('📦 Initial sync received:', data.notifications)
        setNotifications(data.notifications)
        setUnreadCount(data.notifications.filter((n: Notification) => !n.is_read).length)
      }
    }

    const handleNotificationCreated = (data: any) => {
      if (isActive) {
        console.log('🎉 New notification:', data.notification)
        setNotifications((prev) => [data.notification, ...prev])
        if (!data.notification.is_read) {
          setUnreadCount((prev) => prev + 1)
        }
      }
    }

    const handleNotificationUpdated = (data: any) => {
      if (isActive) {
        console.log('🔄 Notification updated:', data.notification)
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === data.notification.id ? data.notification : n
          )
        )
      }
    }

    const handleUnreadCount = (data: any) => {
      if (isActive) {
        console.log('📊 Unread count:', data.count)
        setUnreadCount(data.count)
      }
    }

    const handlePong = () => {
      if (isActive) console.log('♥️ Pong received')
    }

    // Register handlers
    wsService.on('initial_sync', handleInitialSync)
    wsService.on('notification_created', handleNotificationCreated)
    wsService.on('notification_updated', handleNotificationUpdated)
    wsService.on('unread_count', handleUnreadCount)
    wsService.on('pong', handlePong)

    // Cleanup on unmount
    return () => {
      isActive = false
      wsService.disconnect()
      setIsConnected(false)
    }
  }, [enabled])

  return {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    markAsRead,
    getUnreadCount,
  }
}
