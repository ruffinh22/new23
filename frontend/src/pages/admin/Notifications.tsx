import { useState, useEffect } from 'react'
import { Bell, Loader, AlertCircle, CheckCircle, Zap, FileText, Clock, Trash2 } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationContext'
import { notificationService } from '@/services/notificationService'

export default function Notifications() {
  const { notifications, markAsRead, removeNotification, isLoading, loadNotifications } = useNotifications()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Load notifications when page mounts
  useEffect(() => {
    loadNotifications()
  }, [])

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

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
      removeNotification(id)
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.is_read)
          .map((n) => notificationService.markAsRead(n.id))
      )
      notifications.filter((n) => !n.is_read).forEach((n) => markAsRead(n.id))
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconClass = 'w-5 h-5'
    switch (type) {
      case 'DOCUMENT_UPLOADED':
        return <FileText className={`${iconClass} text-primary-600`} />;
      case 'DOCUMENT_DOWNLOADED':
        return <FileText className={`${iconClass} text-success-600`} />;
      case 'DOCUMENT_APPROVED':
        return <CheckCircle className={`${iconClass} text-success-600`} />;
      case 'DOCUMENT_REJECTED':
        return <AlertCircle className={`${iconClass} text-error-600`} />;
      case 'ROUTING':
        return <Zap className={`${iconClass} text-warning-600`} />;
      case 'VALIDATION':
        return <Clock className={`${iconClass} text-warning-600`} />;
      default:
        return <Bell className={`${iconClass} text-primary-600`} />;
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-white';
    switch (type) {
      case 'DOCUMENT_UPLOADED':
        return 'bg-primary-50/50';
      case 'DOCUMENT_DOWNLOADED':
        return 'bg-success-50/50';
      case 'DOCUMENT_APPROVED':
        return 'bg-success-50/50';
      case 'DOCUMENT_REJECTED':
        return 'bg-error-50/50';
      case 'ROUTING':
        return 'bg-warning-50/50';
      case 'VALIDATION':
        return 'bg-warning-50/50';
      default:
        return 'bg-slate-50/50';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 sm:p-8">
        <div className="flex justify-center items-center py-20">
          <div className="flex flex-col items-center gap-4">
            <Loader className="w-8 h-8 text-primary-600 animate-spin" />
            <p className="text-slate-600 font-medium">Chargement des notifications...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 p-6 sm:p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-8 text-white shadow-xl shadow-primary-500/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black">Notifications</h1>
                <p className="text-white/80 mt-1 text-base">
                  {notifications.length} total • <span className="font-semibold">{notifications.filter((n) => !n.is_read).length} non lues</span>
                </p>
              </div>
            </div>
            {notifications.some((n) => !n.is_read) && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-6 py-2.5 bg-white text-primary-600 rounded-lg hover:bg-slate-50 transition-all duration-200 text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                Marquer tout lu
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {(['all', 'unread'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 text-sm transform hover:scale-105 active:scale-95 ${
              filter === tab
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-primary-600 hover:text-primary-600'
            }`}
          >
            {tab === 'all' ? `Toutes (${notifications.length})` : `Non lues (${notifications.filter(n => !n.is_read).length})`}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-16 text-center shadow-sm hover:shadow-md transition-shadow">
            <div className="inline-flex p-4 bg-slate-100 rounded-xl mb-4">
              <Bell className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 text-lg font-medium">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Pas de notifications'}
            </p>
            <p className="text-slate-500 text-sm mt-2">
              {filter === 'unread' 
                ? 'Vous êtes à jour !' 
                : 'Les notifications apparaîtront ici'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification, idx) => (
            <div
              key={notification.id}
              className={`
                rounded-xl border-2 border-slate-200 p-5 transition-all duration-300 hover:shadow-lg hover:border-primary-300
                ${getNotificationBgColor(notification.notification_type, notification.is_read)}
                ${!notification.is_read ? 'shadow-md' : 'shadow-sm'}
              `}
              style={{
                animation: `slideIn 0.4s ease-out ${idx * 0.05}s backwards`
              }}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 p-3 bg-white rounded-lg border-2 border-slate-200 shadow-sm">
                  {getNotificationIcon(notification.notification_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className={`font-bold text-base transition-colors ${
                        !notification.is_read ? 'text-slate-900' : 'text-slate-700'
                      }`}>
                        {notification.title}
                      </h3>
                      <p className="text-slate-600 mt-1.5 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                        <Clock className="w-4 h-4" />
                        {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-2.5 text-primary-600 hover:bg-primary-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                      title="Marquer comme lu"
                    >
                      <CheckCircle size={20} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2.5 text-slate-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                    title="Supprimer"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Unread Indicator */}
              {!notification.is_read && (
                <div className="absolute top-4 left-4 w-2 h-2 bg-primary-600 rounded-full animate-pulse" />
              )}
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
