import { Bell, Clock, AlertCircle, CheckCircle2, Zap, FileText } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/contexts/NotificationContext'
import { notificationService } from '@/services/notificationService'

interface NotificationBadgeProps {
  onClick?: () => void
}

export function NotificationBadge({ onClick }: NotificationBadgeProps) {
  const navigate = useNavigate()
  const { unreadCount, notifications, markAsRead } = useNotifications()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showLatestNotif, setShowLatestNotif] = useState(false)
  const previousUnreadCountRef = useRef(unreadCount)

  // Détecte les NOUVELLES notifications et affiche le tooltip pendant 3s
  useEffect(() => {
    if (unreadCount > previousUnreadCountRef.current) {
      console.log(`🎯 NEW NOTIFICATION DETECTED: was ${previousUnreadCountRef.current}, now ${unreadCount}`)
      setShowLatestNotif(true)
      
      // Auto-hide après 3 secondes
      const timer = setTimeout(() => {
        setShowLatestNotif(false)
      }, 3000)
      
      previousUnreadCountRef.current = unreadCount
      return () => clearTimeout(timer)
    }
  }, [unreadCount])

  // Récupérer la dernière notification (non-lue si dispo, sinon la plus récente)
  const latestNotification = notifications.length > 0
    ? notifications.find(n => !n.is_read) || notifications[0]
    : null

  const handleNotificationClick = async (notificationId: number, e: React.MouseEvent) => {
    e.stopPropagation()  // ← IMPORTANT: Empêcher le clic de propager au backdrop!
    try {
      await notificationService.markAsRead(notificationId)
      markAsRead(notificationId)
      // Le dropdown reste ouvert pour voir les autres notifications
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleViewAll = () => {
    setShowDropdown(false)
    // Naviguer vers la page de tous les notifications
    navigate('/notifications')
    onClick?.()
  }

  const getNotificationIcon = (type: string) => {
    const iconProps = 'w-4 h-4'
    switch (type) {
      case 'DOCUMENT_UPLOADED':
        return <FileText className={`${iconProps} text-primary-600`} />
      case 'DOCUMENT_DOWNLOADED':
        return <FileText className={`${iconProps} text-success-600`} />
      case 'DOCUMENT_APPROVED':
        return <CheckCircle2 className={`${iconProps} text-success-600`} />
      case 'DOCUMENT_REJECTED':
        return <AlertCircle className={`${iconProps} text-error-600`} />
      case 'ROUTING':
        return <Zap className={`${iconProps} text-warning-600`} />
      case 'VALIDATION':
        return <Clock className={`${iconProps} text-warning-600`} />
      default:
        return <Bell className={`${iconProps} text-primary-600`} />
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200 group"
        title={`Notifications: ${unreadCount} unread, ${notifications.length} total`}
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[28px] h-6 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-xl shadow-red-500/50 animate-pulse ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {notifications.length > 0 && unreadCount === 0 && (
          <span className="absolute top-0 right-0 min-w-[28px] h-6 bg-slate-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-xl ring-2 ring-white">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </button>

      {/* 🔥 PUSH: Latest Notification Tooltip - Auto 2s */}
      {showLatestNotif && latestNotification && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-300">
          {/* Color indicator */}
          <div className={`h-1 ${latestNotification.is_read ? 'bg-slate-300' : 'bg-red-500'}`} />
          
          <div className="p-3">
            {/* Icon + Title */}
            <div className="flex items-start gap-2.5 mb-2">
              <div className="flex-shrink-0 p-1.5 rounded-md bg-slate-100">
                {getNotificationIcon((latestNotification as any).notification_type || 'DEFAULT')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 line-clamp-1">
                  {latestNotification.title}
                </p>
              </div>
            </div>

            {/* Message */}
            <p className="text-xs text-slate-600 line-clamp-2 mb-2">
              {latestNotification.message}
            </p>

            {/* Timestamp */}
            <p className="text-xs text-slate-400">
              {new Date(latestNotification.created_at).toLocaleDateString('fr-FR', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Notifications</h3>
                  <p className="text-xs text-white/70">{unreadCount} non lues · {notifications.length} total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Liste - FORCE: Afficher TOUTES les notifications, triées par date */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="inline-flex p-3 bg-slate-100 rounded-lg mb-3">
                  <Bell className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={(e) => handleNotificationClick(notif.id, e)}
                  className={`
                    p-4 cursor-pointer transition-all duration-200 hover:bg-slate-50 group
                    ${notif.is_read ? 'bg-white' : 'bg-primary-50'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1 p-2 rounded-lg bg-white border-2 border-slate-200 group-hover:border-primary-600 transition-colors">
                      {getNotificationIcon((notif as any).notification_type || 'DEFAULT')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-600 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-50 px-6 py-3 border-t border-slate-100">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleViewAll()
              }}
              className="w-full py-2 text-sm font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-all duration-200"
            >
              Voir toutes les notifications →
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}
