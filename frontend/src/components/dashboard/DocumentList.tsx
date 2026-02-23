/**
 * Document List Component
 * Affiche une liste complète de documents avec filtrage et tri
 */

import React, { useState } from 'react'
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Eye,
  Download,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { DocumentStat } from '@/services/dashboardService'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DocumentListProps {
  documents: DocumentStat[]
  isLoading?: boolean
  onViewDocument?: (id: string) => void
  onDeleteDocument?: (id: string) => void
  title?: string
}

type SortField = 'title' | 'status' | 'createdAt' | 'reference'
type SortOrder = 'asc' | 'desc'

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading = false,
  onViewDocument,
  onDeleteDocument,
  title = 'Documents',
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filtrer et trier les documents
  const filteredDocuments = React.useMemo(() => {
    let filtered = documents

    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.reference.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus) {
      filtered = filtered.filter((doc) => doc.status === filterStatus)
    }

    // Tri
    filtered.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [documents, searchTerm, filterStatus, sortField, sortOrder])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
  }

  const statuses = Array.from(new Set(documents.map((d) => d.status)))

  if (isLoading) {
    return (
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-6">{title}</h3>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-secondary-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="p-6 border-b border-secondary-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-secondary-900">{title}</h3>
          <span className="text-sm text-secondary-600">
            {filteredDocuments.length} / {documents.length}
          </span>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-secondary-400" />
            <input
              type="text"
              placeholder="Rechercher par titre ou référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 bg-secondary-50"
            />
          </div>

          {/* Status Filter */}
          <div className="relative flex items-center gap-2">
            <Filter size={18} className="text-secondary-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input bg-secondary-50"
            >
              <option value="">Tous les statuts</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ').toLowerCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-secondary-600">Aucun document ne correspond à vos critères</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary-200 bg-secondary-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wide cursor-pointer hover:bg-secondary-100"
                    onClick={() => toggleSort('reference')}>
                  <div className="flex items-center gap-2">
                    Référence
                    <SortIcon field="reference" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wide cursor-pointer hover:bg-secondary-100"
                    onClick={() => toggleSort('title')}>
                  <div className="flex items-center gap-2">
                    Titre
                    <SortIcon field="title" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wide cursor-pointer hover:bg-secondary-100"
                    onClick={() => toggleSort('status')}>
                  <div className="flex items-center gap-2">
                    Statut
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-secondary-700 uppercase tracking-wide cursor-pointer hover:bg-secondary-100"
                    onClick={() => toggleSort('createdAt')}>
                  <div className="flex items-center gap-2">
                    Date
                    <SortIcon field="createdAt" />
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-secondary-700 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <React.Fragment key={doc.id}>
                  <tr
                    className="border-b border-secondary-100 hover:bg-secondary-50 transition-colors cursor-pointer"
                    onMouseEnter={() => setExpandedId(doc.id)}
                    onMouseLeave={() => setExpandedId(null)}
                  >
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono text-secondary-700 bg-secondary-100 px-3 py-1 rounded">
                        {doc.reference}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-secondary-900 truncate max-w-xs">{doc.title}</p>
                      {doc.department && (
                        <p className="text-xs text-secondary-600 mt-1">{doc.department}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-sm text-secondary-600">
                      {formatDistanceToNow(new Date(doc.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {expandedId === doc.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onViewDocument?.(doc.id)}
                              className="p-2 hover:bg-secondary-200 rounded-lg transition-colors"
                              title="Afficher le document"
                            >
                              <Eye size={16} className="text-secondary-600" />
                            </button>
                            <button
                              className="p-2 hover:bg-secondary-200 rounded-lg transition-colors"
                              title="Télécharger"
                            >
                              <Download size={16} className="text-secondary-600" />
                            </button>
                            <button
                              onClick={() => onDeleteDocument?.(doc.id)}
                              className="p-2 hover:bg-error-100 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={16} className="text-error-600" />
                            </button>
                          </div>
                        ) : (
                          <button className="p-2 hover:bg-secondary-100 rounded-lg transition-colors">
                            <MoreVertical size={16} className="text-secondary-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
