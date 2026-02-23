import React, { useEffect, useState } from 'react'
import { X, CheckCircle2, AlertCircle, Bell, Info, FileText, Zap, Clock } from 'lucide-react'
import { Notification } from '@/services/notificationService'

interface ToastProps {
  notification: Notification
  onClose: () => void
  duration?: number
}

const getNotificationIcon = (type: string) => {
  const iconClass = 'w-5 h-5'
  switch (type) {
    case 'DOCUMENT_UPLOADED':
      return <FileText className={`${iconClass} text-primary-600`} />
    case 'DOCUMENT_APPROVED':
      return <CheckCircle2 className={`${iconClass} text-success-600`} />
    case 'DOCUMENT_REJECTED':
      return <AlertCircle className={`${iconClass} text-error-600`} />
    case 'DOCUMENT_OPENED':
      return <Info className={`${iconClass} text-primary-600`} />
    case 'ROUTING':
      return <Zap className={`${iconClass} text-warning-600`} />
    case 'VALIDATION':
      return <Clock className={`${iconClass} text-warning-600`} />
    default:
      return <Bell className={`${iconClass} text-primary-600`} />
  }
}

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'DOCUMENT_UPLOADED':
      return 'bg-primary-50 border-primary-200'
    case 'DOCUMENT_APPROVED':
      return 'bg-success-50 border-success-200'
    case 'DOCUMENT_REJECTED':
      return 'bg-error-50 border-error-200'
    case 'DOCUMENT_OPENED':
      return 'bg-primary-50 border-primary-200'
    case 'ROUTING':
      return 'bg-warning-50 border-warning-200'
    case 'VALIDATION':
      return 'bg-warning-50 border-warning-200'
    default:
      return 'bg-slate-50 border-slate-200'
  }
}

export const Toast: React.FC<ToastProps> = ({ notification, onClose, duration = 2000 }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Attendre l'animation avant de supprimer
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div
        className={`
          flex items-start gap-4 p-4 rounded-xl border-2 shadow-lg
          backdrop-blur-xl bg-white/95 hover:shadow-xl transition-shadow
          ${getNotificationColor(notification.notification_type)}
        `}
      >
        {/* Icône */}
        <div className="flex-shrink-0 mt-0.5 p-2 bg-white rounded-lg border-2 border-slate-200">
          {getNotificationIcon(notification.notification_type)}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 text-sm">
            {notification.title}
          </h3>
          <p className="text-slate-600 text-xs mt-1 line-clamp-2">
            {notification.message}
          </p>
        </div>

        {/* Bouton de fermeture */}
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-1.5 h-0.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-600 to-primary-500"
          style={{
            animation: `shrink ${(duration / 1000)}s linear`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

interface ToastContainerProps {
  toasts: (Notification & { toastId: string })[]
  onRemoveToast: (toastId: string) => void
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  return (
    <div className="fixed right-4 top-4 z-50 space-y-3 max-w-md pointer-events-auto sm:right-6 sm:top-6 lg:right-8 lg:top-8">
      {toasts.map((toast) => (
        <div key={toast.toastId} className="pointer-events-auto animate-in fade-in slide-in-from-right-5 duration-300">
          <Toast
            notification={toast}
            onClose={() => onRemoveToast(toast.toastId)}
            duration={2000}
          />
        </div>
      ))}
    </div>
  )
}
