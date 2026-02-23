import React, { useEffect, useState } from 'react'
import { FileText, Calendar, HardDrive } from 'lucide-react'
import { apiClient } from '@/services/api'

interface DocumentsHeaderProps {
  title?: string
  description?: string
  forAgentOnly?: boolean  // Filter stats to current agent only
}

export const DocumentsHeader: React.FC<DocumentsHeaderProps> = ({
  title = 'Centre de Gestion des Documents',
  description = 'Consultez et gérez tous les documents de votre organisation',
  forAgentOnly = false  // Default: show all documents
}) => {
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
    totalSize: '0 B',
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [forAgentOnly])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      // Use the statistics endpoint like the Reports page does
      // Add agent filter if forAgentOnly is true
      const agentParam = forAgentOnly ? '?agent=me' : ''
      const response = await apiClient.get(`/documents/statistics/${agentParam}`)
      
      if (response.data) {
        // Map the response like dashboardService does
        const statusStats = response.data.status_stats || {}
        const approved = statusStats.VALIDE || 0
        const rejected = statusStats.REJETE || 0
        const pending = statusStats.EN_ATTENTE || 0

        // Use total_size_mb directly from the API
        const totalSizeMb = response.data.total_size_mb || 0
        const sizeDisplay = totalSizeMb > 1024 
          ? (totalSizeMb / 1024).toFixed(2) + ' GB'
          : totalSizeMb.toFixed(2) + ' MB'

        setStats({
          totalDocuments: response.data.total_documents || 0,
          pendingDocuments: pending,
          approvedDocuments: approved,
          rejectedDocuments: rejected,
          totalSize: sizeDisplay,
        })
      }
    } catch (error) {
      console.error('Error loading document stats:', error)
      // Fallback: load from documents list
      try {
        const agentParam = forAgentOnly ? '&agent=me' : ''
        const response = await apiClient.get(`/documents/?limit=1000${agentParam}`)
        const data = Array.isArray(response.data) 
          ? response.data 
          : response.data?.results || []

        const approved = data.filter((d: any) => d.status === 'VALIDE' || d.status === 'APPROUVE').length
        const rejected = data.filter((d: any) => d.status === 'REJETE').length
        const pending = data.filter((d: any) => d.status === 'EN_ATTENTE' || d.status === 'EN_COURS').length

        setStats({
          totalDocuments: data.length,
          pendingDocuments: pending,
          approvedDocuments: approved,
          rejectedDocuments: rejected,
          totalSize: calculateTotalSize(data),
        })
      } catch (fallbackError) {
        console.error('Fallback error loading document stats:', fallbackError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const calculateTotalSize = (data: any[]) => {
    let bytes = 0
    data.forEach((doc: any) => {
      if (doc.file_size) {
        // Parse file size if it's a string like "123 KB" or "1.5 MB"
        if (typeof doc.file_size === 'string') {
          const match = doc.file_size.match(/(\d+\.?\d*)\s*(B|KB|MB|GB)/)
          if (match) {
            let size = parseFloat(match[1])
            const unit = match[2]
            if (unit === 'KB') size *= 1024
            else if (unit === 'MB') size *= 1024 * 1024
            else if (unit === 'GB') size *= 1024 * 1024 * 1024
            bytes += size
          }
        } else if (typeof doc.file_size === 'number') {
          bytes += doc.file_size
        }
      }
    })
    return formatBytes(bytes)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
  }

  return (
    <div className="relative overflow-hidden rounded-2xl mb-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30"></div>
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-br from-indigo-200/20 to-blue-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Content */}
      <div className="relative backdrop-blur-xl border border-white/40 p-3 md:p-4">
        {/* Title Section with Icon */}
        <div className="flex items-start gap-2 mb-4">
          {/* Avatar Icon */}
          <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-600/30 flex-shrink-0">
            <FileText className="text-white" size={24} />
          </div>

          {/* Text Content */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-0">Gestion des Documents</p>
            <h1 className="text-lg md:text-xl font-black bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent truncate">
              {title}
            </h1>
            <p className="text-xs text-gray-600 mt-0">{description}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-3">
        {/* Total Documents */}
        <div className="bg-white rounded-md shadow-sm p-3 border border-gray-300 border-l-4 border-l-blue-600 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                Total
              </p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {isLoading ? '-' : stats.totalDocuments}
              </p>
            </div>
            <FileText className="text-blue-600" size={28} />
          </div>
        </div>

        {/* Pending Documents */}
        <div className="bg-white rounded-md shadow-sm p-3 border border-gray-300 border-l-4 border-l-yellow-600 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                En Attente
              </p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {isLoading ? '-' : stats.pendingDocuments}
              </p>
            </div>
            <Calendar className="text-yellow-600" size={28} />
          </div>
        </div>

        {/* Approved Documents */}
        <div className="bg-white rounded-md shadow-sm p-3 border border-gray-300 border-l-4 border-l-green-600 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                Approuvés
              </p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {isLoading ? '-' : stats.approvedDocuments}
              </p>
            </div>
            <FileText className="text-green-600" size={28} />
          </div>
        </div>

        {/* Rejected Documents */}
        <div className="bg-white rounded-md shadow-sm p-3 border border-gray-300 border-l-4 border-l-red-600 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                Rejetés
              </p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {isLoading ? '-' : stats.rejectedDocuments}
              </p>
            </div>
            <FileText className="text-red-600" size={28} />
          </div>
        </div>

        {/* Total Size */}
        <div className="bg-white rounded-md shadow-sm p-3 border border-gray-300 border-l-4 border-l-purple-600 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                Espace Utilisé
              </p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">
                {isLoading ? '-' : stats.totalSize}
              </p>
            </div>
            <HardDrive className="text-purple-600" size={28} />
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
