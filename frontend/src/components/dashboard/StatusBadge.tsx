/**
 * Status Badge Component
 * Badge pour afficher le statut d'un document
 */

import React from 'react'
import { CheckCircle2, Clock, XCircle, Zap } from 'lucide-react'

interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    'APPROUVE': {
      bg: 'bg-success-50',
      text: 'text-success-700',
      icon: <CheckCircle2 size={16} />,
    },
    'REJET': {
      bg: 'bg-error-50',
      text: 'text-error-700',
      icon: <XCircle size={16} />,
    },
    'EN_ATTENTE': {
      bg: 'bg-warning-50',
      text: 'text-warning-700',
      icon: <Clock size={16} />,
    },
    'EN_COURS': {
      bg: 'bg-info-50',
      text: 'text-info-700',
      icon: <Zap size={16} />,
    },
  }

  const config = statusConfig[status] || statusConfig['EN_ATTENTE']
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'lg' ? 'px-3 py-2 text-sm' : 'px-2.5 py-1.5 text-xs'

  return (
    <div className={`badge ${config.bg} ${config.text} ${sizeClasses} gap-2`}>
      {config.icon}
      <span className="font-medium capitalize">
        {status.replace(/_/g, ' ').toLowerCase()}
      </span>
    </div>
  )
}
