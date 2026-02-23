import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Notification } from '@/services/notificationService'
import { wsService } from '@/services/websocketService'
import { notificationService } from '@/services/notificationService'
import { STORAGE_KEYS } from '@/utils/constants'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Notification) => void
  removeNotification: (id: number) => void
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  loadNotifications: () => Promise<void>
  isLoading: boolean
  isConnected: boolean
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Inner Provider that can use hooks
const NotificationProviderInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Fonction de tri immuable
  const sortNotifications = useCallback((notifs: Notification[]): Notification[] => {
    return [...notifs].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      return timeB - timeA
    })
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      // Load 100 latest notifications on initial app load (both read and unread)
      const data = await notificationService.getNotifications({ limit: 100 })
      if (Array.isArray(data.results)) {
        const sorted = sortNotifications(data.results)
        setNotifications(sorted)
        const unread = sorted.filter(n => !n.is_read).length
        console.log(`📊 Loaded ${sorted.length} notifications (${unread} unread)`)
      } else {
        console.error('❌ getNotifications returned non-array:', data)
        setNotifications([])
      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }, [sortNotifications])

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken)
    let isActive = true

    if (!token) {
      console.warn('⚠️  No access token available')
      return
    }

    console.log('🚀 NotificationContext initialized - loading notifications...')
    
    // Load initial notifications from API AND connect WebSocket in parallel
    Promise.all([
      loadNotifications(),
      wsService.connect(token).then(() => {
        if (isActive) {
          setIsConnected(true)
          console.log('✅ WebSocket connected for real-time notifications')
        }
      }).catch((error) => {
        console.error('❌ WebSocket connection error:', error)
        if (isActive) setIsConnected(false)
      })
    ]).catch(err => {
      console.error('Error in initialization:', err)
    })

    // Handler: Initial sync (all notifications - both read and unread)
    const handleInitialSync = (data: any) => {
      if (isActive) {
        const notifs = data.notifications || []
        if (Array.isArray(notifs)) {
          // 📌 Keep ALL notifications (read and unread) so notifications page shows everything
          if (notifs.length > 0) {
            const sorted = sortNotifications(notifs)
            setNotifications(sorted)
            const unread = sorted.filter((n: any) => !n.is_read).length
            console.log(`📥 Initial sync: received ${sorted.length} notifications (${unread} unread)`)
          } else {
            console.log(`📥 Initial sync: no notifications`)
            setNotifications([])
          }
        } else {
          console.warn(`⚠️  Initial sync: received non-array notifications:`, data)
        }
      }
    }

    // Handler: New notification created - SHOW TOAST!
    const handleNotificationCreated = (data: any) => {
      if (isActive && data.notification) {
        const notif = data.notification
        
        // 🔴 CRITICAL: Don't add if already read (shouldn't happen, but be safe)
        if (notif.is_read) {
          console.warn(`⚠️  Received read notification in notification_created - ignoring: ${notif.id}`)
          return
        }
        
        setNotifications((prev) => {
          // Deduplication: check if already exists
          if (prev.find(n => n.id === notif.id)) {
            console.debug(`ℹ️  Notification ${notif.id} already in list (skipped)`)
            return prev
          }
          const updated = sortNotifications([notif, ...prev])
          
          // Limit to 50 latest notifications in memory
          const limited = updated.slice(0, 50)
          
          // ✨ DO NOT SHOW TOAST - Keep notifications silent in the box only ✨
          console.log(`✨ New notification: ${notif.title} (ID: ${notif.id})`)
          
          return limited
        })
      }
    }

    // Handler: Notification status updated (e.g., marked as read)
    const handleNotificationUpdated = (data: any) => {
      if (isActive && data.notification) {
        setNotifications((prev) => {
          // � Update notification WITHOUT removing it (keep ALL notifications)
          const updated = prev.map((n) =>
            n.id === data.notification.id ? data.notification : n
          )
          console.log(`✏️  Notification ${data.notification.id} updated (read: ${data.notification.is_read})`)
          return sortNotifications(updated)
        })
      }
    }

    // Handler: Notification deleted
    const handleNotificationDeleted = (data: any) => {
      if (isActive && data.notification_id) {
        setNotifications((prev) => {
          const filtered = prev.filter(n => n.id !== data.notification_id)
          console.log(`🗑️  Notification ${data.notification_id} deleted`)
          return filtered
        })
      }
    }

    // Register WebSocket event handlers
    wsService.on('initial_sync', handleInitialSync)
    wsService.on('notification_created', handleNotificationCreated)
    wsService.on('notification_updated', handleNotificationUpdated)
    wsService.on('notification_deleted', handleNotificationDeleted)

    // Cleanup on unmount
    return () => {
      isActive = false
      wsService.off('initial_sync', handleInitialSync)
      wsService.off('notification_created', handleNotificationCreated)
      wsService.off('notification_updated', handleNotificationUpdated)
      wsService.off('notification_deleted', handleNotificationDeleted)
      wsService.disconnect()
      setIsConnected(false)
    }
  }, [])

  const addNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => sortNotifications([notification, ...prev]))
  }, [])

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const markAsRead = useCallback((id: number) => {
    // Send to WebSocket
    wsService.markAsRead(id)
    
    // Update local state
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        is_read: true,
        read_at: new Date().toISOString(),
      }))
    )
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        loadNotifications,
        isLoading,
        isConnected,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

// Outer provider that wraps the inner - allows hooks to work
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <NotificationProviderInner>{children}</NotificationProviderInner>
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
