import React from 'react'
import { LucideIcon } from 'lucide-react'

interface DocumentStatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo'
  trend?: {
    value: number
    label: string
    direction: 'up' | 'down'
  }
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    icon: 'text-blue-500',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-600',
    icon: 'text-green-500',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-600',
    icon: 'text-red-500',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-600',
    icon: 'text-yellow-500',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-600',
    icon: 'text-purple-500',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-600',
    icon: 'text-indigo-500',
  },
}

export const DocumentStatsCard: React.FC<DocumentStatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}) => {
  const colors = colorClasses[color]

  return (
    <div
      className={`${colors.bg} ${colors.border} border rounded-lg p-6 transition-all hover:shadow-lg`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${colors.text}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-3">
              <span
                className={`text-sm font-medium ${
                  trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-2">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={`${colors.icon} p-3 bg-white rounded-lg shadow-sm flex-shrink-0`}
        >
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}
