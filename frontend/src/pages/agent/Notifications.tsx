import React, { useState, useEffect } from 'react'
import { Bell, Check, Trash2 } from 'lucide-react'
import { Layout } from '@/components/common'
import { Button } from '@/components/common'
import { useNotifications } from '@/contexts/NotificationContext'
import { notificationService } from '@/services/notificationService'

const notificationTypeColors: Record<string, string> = {
  DOCUMENT_UPLOADED: 'bg-blue-100 text-blue-800',
  DOCUMENT_DOWNLOADED: 'bg-blue-100 text-blue-800',
  DOCUMENT_APPROVED: 'bg-green-100 text-green-800',
  DOCUMENT_REJECTED: 'bg-red-100 text-red-800',
  COMMENT: 'bg-purple-100 text-purple-800',
  ROUTING: 'bg-orange-100 text-orange-800',
  SYSTEM: 'bg-gray-100 text-gray-800',
}

export const Notifications: React.FC = () => {
  const { notifications, isLoading, loadNotifications, markAsRead, markAllAsRead, removeNotification } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Load notifications when page mounts
  useEffect(() => {
    loadNotifications()
  }, [])

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id)
      markAsRead(id)
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await notificationService.deleteNotification(id)
      removeNotification(id)
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // Update context
      markAllAsRead()
      // Notify server in background
      await notificationService.markAllAsRead()
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin">
              <Bell size={48} className="text-blue-600" />
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Bell size={32} />
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="text-gray-600 mt-1">{unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}</p>
                )}
              </div>
              {unreadCount > 0 && (
                <Button variant="secondary" onClick={handleMarkAllAsRead}>
                  Marquer tout comme lu
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Toutes
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg transition ${
                  filter === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Non lues ({unreadCount})
              </button>
            </div>

            {/* Notifications List */}
            {filteredNotifications.length > 0 ? (
              <div className="space-y-3">
                {filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.is_read
                        ? 'bg-white border-gray-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            notificationTypeColors[notification.notification_type] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.notification_type}
                          </span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">{notification.title}</h3>
                        <p className="text-gray-700 text-sm mb-2">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Intl.DateTimeFormat('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(notification.created_at))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition"
                            title="Marquer comme lu"
                          >
                            <Check size={18} className="text-blue-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bell size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg">Aucune notification</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
