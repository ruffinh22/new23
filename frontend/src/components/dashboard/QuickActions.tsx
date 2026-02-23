/**
 * Quick Actions Component
 * Actions rapides pour le dashboard
 */

import React from 'react'
import {
  Upload,
  FileText,
  Search,
  BarChart3,
  Settings,
} from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  onClick: () => void
  description?: string
}

interface QuickActionsProps {
  onUploadDocument?: () => void
  onSearch?: () => void
  onViewReports?: () => void
  onSettings?: () => void
  onTemplates?: () => void
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onUploadDocument,
  onSearch,
  onViewReports,
  onSettings,
  onTemplates,
}) => {
  const actions: QuickAction[] = [
    {
      id: 'upload',
      label: 'Télécharger un document',
      icon: <Upload size={20} />,
      color: 'bg-gradient-to-br from-green-500 to-green-600',
      onClick: onUploadDocument ? onUploadDocument : () => {},
      description: 'Importer un fichier',
    },
    {
      id: 'search',
      label: 'Rechercher un document',
      icon: <Search size={20} />,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      onClick: onSearch ? onSearch : () => {},
      description: 'Trouver rapidement',
    },
    {
      id: 'reports',
      label: 'Voir les rapports',
      icon: <BarChart3 size={20} />,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600',
      onClick: onViewReports ? onViewReports : () => {},
      description: 'Statistiques détaillées',
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: <Settings size={20} />,
      color: 'bg-gradient-to-br from-gray-500 to-gray-600',
      onClick: onSettings ? onSettings : () => {},
      description: 'Configuration',
    },
    {
      id: 'templates',
      label: 'Modèles',
      icon: <FileText size={20} />,
      color: 'bg-gradient-to-br from-red-500 to-red-600',
      onClick: onTemplates ? onTemplates : () => {},
      description: 'Documents modèles',
    },
  ]

  return (
    <div className="card w-full">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-2">Actions Rapides</h3>
        <p className="text-sm text-secondary-600 mb-6">Accès direct aux fonctionnalités principales de la plateforme</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className="group flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-secondary-200 hover:border-primary-300 transition-all duration-200 hover:shadow-md"
            >
              <div className={`${action.color} p-3 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-secondary-900">{action.label}</p>
                {action.description && (
                  <p className="text-xs text-secondary-600 mt-1">{action.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
