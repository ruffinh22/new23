/**
 * Stat Card Component
 * Composant pour afficher une statistique
 */

import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  LucideIcon 
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  bgColor?: string
  textColor?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  onClick?: () => void
  actionLabel?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  bgColor = 'bg-blue-50',
  textColor = 'text-blue-600',
  trend,
  onClick,
  actionLabel,
}) => {
  return (
    <div
      className={`card-hover cursor-pointer transform transition-transform hover:scale-105 ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="p-6 flex items-start justify-between">
        <div className="flex-1">
          <p className="text-secondary-600 text-sm font-medium mb-2">{title}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-secondary-900">{value}</h3>
            {trend && (
              <div className={`flex items-center gap-1 text-sm font-medium ${
                trend.direction === 'up' ? 'text-success-600' : 'text-error-600'
              }`}>
                {trend.direction === 'up' ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                <span>{trend.value}%</span>
              </div>
            )}
          </div>
          {actionLabel && (
            <div className="mt-4 flex items-center gap-2 text-primary-600 text-sm font-medium hover:text-primary-700">
              {actionLabel}
              <ArrowRight size={14} />
            </div>
          )}
        </div>
        <div className={`${bgColor} p-4 rounded-lg`}>
          <Icon className={`${textColor} w-8 h-8`} />
        </div>
      </div>
    </div>
  )
}
