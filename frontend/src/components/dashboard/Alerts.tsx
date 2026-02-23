/**
 * Alerts & Notifications Component
 * Affiche les alertes et notifications importantes
 */

import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'

export interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface AlertsComponentProps {
  alerts: Alert[]
  onDismiss?: (id: string) => void
}

const alertConfig = {
  info: {
    bg: 'bg-info-50',
    border: 'border-info-200',
    icon: Info,
    iconColor: 'text-info-600',
  },
  warning: {
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    icon: AlertTriangle,
    iconColor: 'text-warning-600',
  },
  error: {
    bg: 'bg-error-50',
    border: 'border-error-200',
    icon: AlertCircle,
    iconColor: 'text-error-600',
  },
  success: {
    bg: 'bg-success-50',
    border: 'border-success-200',
    icon: CheckCircle,
    iconColor: 'text-success-600',
  },
}

export const AlertsComponent: React.FC<AlertsComponentProps> = ({ alerts, onDismiss }) => {
  const [visibleAlerts, setVisibleAlerts] = React.useState<Set<string>>(new Set(alerts.map((a) => a.id)))

  const handleDismiss = (id: string) => {
    setVisibleAlerts((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    onDismiss?.(id)
  }

  if (alerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 mb-8">
      {alerts
        .filter((alert) => visibleAlerts.has(alert.id))
        .map((alert) => {
          const config = alertConfig[alert.type]
          const IconComponent = config.icon

          return (
            <div
              key={alert.id}
              className={`${config.bg} border-l-4 border ${config.border} p-4 rounded-lg flex items-start gap-4`}
            >
              <IconComponent size={20} className={`${config.iconColor} flex-shrink-0 mt-0.5`} />

              <div className="flex-1">
                <h4 className="font-semibold text-secondary-900">{alert.title}</h4>
                <p className="text-sm text-secondary-700 mt-1">{alert.message}</p>

                {alert.action && (
                  <button
                    onClick={alert.action.onClick}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 mt-2 hover:underline"
                  >
                    {alert.action.label}
                  </button>
                )}
              </div>

              {alert.dismissible !== false && (
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="text-secondary-400 hover:text-secondary-600 flex-shrink-0"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )
        })}
    </div>
  )
}
