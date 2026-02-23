import React from 'react'
import { FolderOpen, FileText, Clock, RefreshCw } from 'lucide-react'

interface DocumentsHeaderStats {
  total: number
  today: number
  totalSize: number
}

interface DocumentsManagementHeaderProps {
  isAdmin: boolean
  stats: DocumentsHeaderStats
  isRefreshing?: boolean
  onRefresh?: () => void
  formatBytes?: (bytes: number) => string
}

export const DocumentsManagementHeader: React.FC<DocumentsManagementHeaderProps> = ({
  isAdmin,
  stats,
  isRefreshing = false,
  onRefresh,
  formatBytes = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
  },
}) => {
  return (
    <div className="glass-card-hover mb-8 border border-white/30 p-8 backdrop-blur-xl rounded-3xl">
      <div className="flex items-start justify-between gap-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
            {isAdmin ? (
              <FolderOpen size={32} className="text-white" />
            ) : (
              <FileText size={32} className="text-white" />
            )}
          </div>
          <div>
            <h1 className="text-4xl font-black text-primary-600">
              {isAdmin ? 'Centre de Gestion des Documents' : 'Mes Documents'}
            </h1>
            <p className="text-secondary-600 mt-2 font-medium">
              {isAdmin 
                ? 'Consultez et gérez tous les documents de votre organisation' 
                : 'Organisez et partagez vos documents facilement'}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`p-3 hover:bg-primary-100 rounded-xl transition-all transform hover:scale-110 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            title="Actualiser"
          >
            <RefreshCw size={24} className="text-primary-600" />
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/20">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
          <div className="p-3 bg-info-500/20 rounded-xl">
            <FileText size={24} className="text-info-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-600">
              {isAdmin ? 'Total Documents (Org)' : 'Total Documents'}
            </p>
            <p className="text-3xl font-bold text-primary-600">{stats.total}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
          <div className="p-3 bg-success-500/20 rounded-xl">
            <Clock size={24} className="text-success-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-600">
              {isAdmin ? 'Ajoutés Aujourd\'hui' : 'Aujourd\'hui'}
            </p>
            <p className="text-3xl font-bold text-success-600">{stats.today}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
          <div className="p-3 bg-accent-500/20 rounded-xl">
            <FolderOpen size={24} className="text-accent-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-600">
              {isAdmin ? 'Espace Total Utilisé' : 'Espace Utilisé'}
            </p>
            <p className="text-3xl font-bold text-accent-600">{formatBytes(stats.totalSize)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
