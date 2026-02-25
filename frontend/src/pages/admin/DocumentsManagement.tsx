import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, Search, Filter, Download, Eye, MoreVertical,
  Loader, User, FolderOpen, LayoutGrid, List, ArrowUpDown, File
} from 'lucide-react'
import { Layout } from '@/components/common'
import { Input, Button, Alert } from '@/components/common'
import { DocumentsHeader } from '@/components/documents/DocumentsHeader'
import { FolderExplorer } from '@/components/documents/FolderExplorer'
import { FileViewer } from '@/components/documents/FileViewer'
import { apiClient } from '@/services/api'
import { departmentService, Department } from '@/services/departmentService'
import { documentTypeService } from '@/services/documentTypeService'
import { statusService } from '@/services/statusService'

interface Document {
  id: number
  title: string
  description: string
  document_type: string
  file: string
  file_format: string
  file_size: number
  status: string
  agent_username: string
  agent_email: string
  agent_department: string
  folder_name?: string
  created_at: string
  updated_at: string
  mime_type: string
  validation_status?: string
  rejection_reason?: string
}

type ViewType = 'grid' | 'list' | 'table'
type SortField = 'created_at' | 'title' | 'agent_username' | 'status' | 'file_size'
type SortOrder = 'asc' | 'desc'

interface Filters {
  search: string
  status: string
  type: string
  department: string
  dateFrom: string
  dateTo: string
}

// État de filtre dossier : on regroupe path + children ensemble
// pour éviter deux setState successifs qui déclenchent deux fetchDocuments
interface FolderFilter {
  path: string
  children: string[]
}

export const DocumentsManagement: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<ViewType>('table')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedDocs, setSelectedDocs] = useState<number[]>([])

  // Menu Actions pour un document spécifique
  const [actionMenuOpenFor, setActionMenuOpenFor] = useState<number | null>(null)

  // ✅ FIX : Un seul état atomique pour le filtre dossier
  // Au lieu de selectedFolderPath + selectedFolderChildren séparés,
  // on les met ensemble → une seule mise à jour = un seul re-render = zéro double fetch
  const [folderFilter, setFolderFilter] = useState<FolderFilter>({ path: '', children: [] })

  // ✅ FIX : Cache de la structure de dossiers en mémoire (ref = pas de re-render)
  // Évite de rappeler l'API /folder_structure/ à chaque clic sur un dossier
  const folderStructureCache = useRef<any>(null)

  // Données chargées depuis l'API
  const [departments, setDepartments] = useState<Department[]>([])
  const [statuses, setStatuses] = useState<Array<{ value: string; label: string }>>([])
  const [documentTypes, setDocumentTypes] = useState<Array<{ value: string; label: string }>>([])

  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    type: '',
    department: '',
    dateFrom: '',
    dateTo: '',
  })
  const [showPreview, setShowPreview] = useState<Document | null>(null)
  const [bulkAction, setBulkAction] = useState('')

  // Charger les données statiques UNE SEULE FOIS au montage
  useEffect(() => {
    loadDepartments()
    loadStatuses()
    loadDocumentTypes()
    // ✅ FIX : Pré-charger la structure des dossiers en cache dès le montage
    prefetchFolderStructure()
  }, [])

  // ✅ FIX : Le useEffect de fetch ne dépend plus que des filtres utilisateur + folderFilter (atomique)
  // Plus de dépendance sur selectedFolderChildren séparé → plus de double déclenchement
  useEffect(() => {
    fetchDocuments()
  }, [filters, sortField, sortOrder, folderFilter])

  // ─── Chargement des listes de filtres ──────────────────────────

  const loadDepartments = useCallback(async () => {
    try {
      const depts = await departmentService.getDepartmentsWithAll()
      setDepartments(depts)
    } catch (err) {
      console.error('Erreur chargement départements:', err)
    }
  }, [])

  const loadStatuses = useCallback(async () => {
    try {
      const sts = await statusService.getStatusesWithAll()
      setStatuses(sts)
    } catch (err) {
      console.error('Erreur chargement statuts:', err)
    }
  }, [])

  const loadDocumentTypes = useCallback(async () => {
    try {
      const types = await documentTypeService.getDocumentTypes()
      setDocumentTypes(types.map(t => ({value: String(t.id), label: t.display_name})))
    } catch (err) {
      console.error('Erreur chargement types de documents:', err)
    }
  }, [])

  // ✅ FIX : Pré-charger la structure de dossiers dans le cache (ref)
  // Sans provoquer de re-render, sans bloquer l'UI
  const prefetchFolderStructure = async () => {
    try {
      const response = await apiClient.get('/documents/folder_structure/')
      folderStructureCache.current = response.data
      console.log('📁 Structure dossiers mise en cache')
    } catch (err) {
      console.error('Erreur pré-chargement structure dossiers:', err)
    }
  }

  // ─── Helpers structure dossiers ────────────────────────────────

  const collectDescendantFolderNames = (folder: any, names: string[] = []): string[] => {
    names.push(folder.name)
    if (folder.children && Array.isArray(folder.children)) {
      for (const child of folder.children) {
        if (child.type === 'folder') {
          collectDescendantFolderNames(child, names)
        }
      }
    }
    return names
  }

  // ✅ FIX : Utilise le cache en mémoire au lieu de rappeler l'API
  // Si le cache est vide (cas exceptionnel), on le recharge
  const findFolderAndCollectChildren = async (folderName: string): Promise<string[]> => {
    try {
      // Utiliser le cache si disponible
      let rootNode = folderStructureCache.current
      if (!rootNode) {
        console.log('Cache vide, rechargement de la structure...')
        const response = await apiClient.get('/documents/folder_structure/')
        rootNode = response.data
        folderStructureCache.current = rootNode
      }

      const findFolder = (node: any): any => {
        if (node.name === folderName) return node
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            const found = findFolder(child)
            if (found) return found
          }
        }
        return null
      }

      const foundFolder = findFolder(rootNode)
      if (foundFolder) {
        const descendantNames = collectDescendantFolderNames(foundFolder)
        console.log('Dossiers descendants de', folderName, ':', descendantNames)
        return descendantNames
      }
    } catch (err) {
      console.error('Erreur recherche dossier:', err)
    }
    return []
  }

  // ─── Fetch documents ───────────────────────────────────────────

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)
      if (filters.type) params.append('document_type', filters.type)
      if (filters.department) params.append('department', filters.department)
      if (filters.dateFrom) params.append('created_after', filters.dateFrom)
      if (filters.dateTo) params.append('created_before', filters.dateTo)

      const queryStr = params.toString()
      const url = `/documents/${queryStr ? '?' + queryStr : ''}`
      console.log('URL fetch:', url)

      const response = await apiClient.get(url)
      let data = Array.isArray(response.data) ? response.data : response.data.results || []

      console.log('Documents reçus du backend:', data.length)

      // Filtres côté client
      if (filters.search) {
        data = data.filter((doc: any) =>
          doc.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          doc.document_type.toLowerCase().includes(filters.search.toLowerCase())
        )
      }
      if (filters.status) {
        data = data.filter((doc: any) => doc.status === filters.status)
      }
      if (filters.type) {
        data = data.filter((doc: any) => doc.document_type === filters.type)
      }
      if (filters.dateFrom) {
        data = data.filter((doc: any) => new Date(doc.created_at) >= new Date(filters.dateFrom))
      }
      if (filters.dateTo) {
        data = data.filter((doc: any) => new Date(doc.created_at) <= new Date(filters.dateTo))
      }
      if (filters.department) {
        data = data.filter((doc: any) => doc.agent_department === filters.department)
      }

      // ✅ FIX : Filtre dossier via l'état atomique folderFilter
      if (folderFilter.path && folderFilter.children.length > 0) {
        data = data.filter((doc: any) => folderFilter.children.includes(doc.folder_name))
        console.log('Après filtre dossier:', data.length, '| dossiers:', folderFilter.children)
      }

      // Tri
      data.sort((a: any, b: any) => {
        let aVal = a[sortField] ?? ''
        let bVal = b[sortField] ?? ''
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase() }
        if (sortOrder === 'asc') return aVal > bVal ? 1 : -1
        else return aVal < bVal ? 1 : -1
      })

      console.log('Documents finaux après filtrage:', data.length)
      setDocuments(data)
      setError('')
    } catch (err: any) {
      console.error('Erreur:', err)
      setError(err.response?.data?.detail || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  // ─── Actions ───────────────────────────────────────────────────

  const handleBulkAction = async () => {
    if (!bulkAction || selectedDocs.length === 0) return
    setLoading(true)
    try {
      for (const docId of selectedDocs) {
        await apiClient.patch(`/documents/${docId}/`, { status: bulkAction })
      }
      setSelectedDocs([])
      setBulkAction('')
      await fetchDocuments()
      setError('')
    } catch (err: any) {
      setError("Erreur lors de l'action en masse")
    } finally {
      setLoading(false)
    }
  }

  // ✅ FIX : handleFolderSelect met à jour path + children en une seule opération atomique
  // → un seul setState → un seul re-render → un seul fetchDocuments → zéro flash
  const handleFolderSelect = async (folderName: string) => {
    console.log('Dossier sélectionné pour filtrage:', folderName)
    const children = await findFolderAndCollectChildren(folderName)
    // Mise à jour atomique : path ET children ensemble
    setFolderFilter({ path: folderName, children })
  }

  // ─── Helpers affichage ────────────────────────────────────────

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      NOUVEAU: 'bg-blue-100 text-blue-800',
      EN_COURS: 'bg-yellow-100 text-yellow-800',
      VALIDE: 'bg-green-100 text-green-800',
      REJETE: 'bg-red-100 text-red-800',
      ARCHIVE: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getFileIcon = (format: string) => {
    if (['pdf'].includes(format.toLowerCase())) return '📄'
    if (['xlsx', 'xls', 'csv'].includes(format.toLowerCase())) return '📊'
    if (['docx', 'doc'].includes(format.toLowerCase())) return '📝'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(format.toLowerCase())) return '🖼️'
    return '📎'
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ─── Vues ──────────────────────────────────────────────────────

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((doc) => (
        <div key={doc.id} className={`bg-white rounded-lg shadow hover:shadow-lg transition border-2 ${selectedDocs.includes(doc.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    if (e.target.checked) setSelectedDocs([...selectedDocs, doc.id])
                    else setSelectedDocs(selectedDocs.filter(id => id !== doc.id))
                  }}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="text-2xl">{getFileIcon(doc.file_format)}</span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(doc.status)}`}>
                {doc.status}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 line-clamp-2">{doc.title}</h3>
            <p className="text-xs text-gray-600 mt-1">{formatDate(doc.created_at)}</p>
          </div>
          <div className="p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <User size={14} />
              <span>{doc.agent_username}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <File size={14} />
              <span>{doc.file_format.toUpperCase()} • {formatFileSize(doc.file_size)}</span>
            </div>
            {doc.folder_name && (
              <div className="flex items-center gap-2 text-gray-600">
                <FolderOpen size={14} />
                <span>{doc.folder_name}</span>
              </div>
            )}
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2 justify-between items-center relative">
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowPreview(doc)}>
                <Eye size={14} /> Voir
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  try {
                    const response = await apiClient.get(`/documents/${doc.id}/download/`, { responseType: 'blob' })
                    const url = window.URL.createObjectURL(response.data)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = doc.title || `document-${doc.id}`
                    document.body.appendChild(link)
                    link.click()
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(link)
                  } catch (err) {
                    console.error('Erreur téléchargement:', err)
                  }
                }}
              >
                <Download size={14} />
              </Button>
            </div>

            <button
              onClick={() => setActionMenuOpenFor(actionMenuOpenFor === doc.id ? null : doc.id)}
              className="text-gray-400 hover:text-primary-600 transition-colors p-2"
            >
              <MoreVertical size={18} />
            </button>

            {actionMenuOpenFor === doc.id && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                <button
                  onClick={() => { apiClient.patch(`/documents/${doc.id}/`, { status: 'VALIDE' }); fetchDocuments(); setActionMenuOpenFor(null) }}
                  className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-2 border-b border-gray-100 rounded-t-lg"
                >
                  <span className="text-lg">✓</span>
                  <span className="text-sm text-green-700 font-medium">Approuver</span>
                </button>
                <button
                  onClick={() => { apiClient.patch(`/documents/${doc.id}/`, { status: 'REJETE' }); fetchDocuments(); setActionMenuOpenFor(null) }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
                >
                  <span className="text-lg">✕</span>
                  <span className="text-sm text-red-700 font-medium">Rejeter</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const renderListView = () => (
    <div className="space-y-2 bg-white rounded-lg shadow overflow-hidden">
      {documents.map((doc, index) => (
        <div key={doc.id} className={`px-6 py-4 border-b last:border-b-0 flex items-center justify-between gap-4 ${
          index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
        }`}>
          <div className="flex items-center gap-4 flex-1">
            <input
              type="checkbox"
              checked={selectedDocs.includes(doc.id)}
              onChange={(e) => {
                e.stopPropagation()
                if (e.target.checked) setSelectedDocs([...selectedDocs, doc.id])
                else setSelectedDocs(selectedDocs.filter(id => id !== doc.id))
              }}
              className="w-5 h-5 cursor-pointer"
            />
            <span className="text-2xl">{getFileIcon(doc.file_format)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">{doc.title}</h3>
              <p className="text-xs text-gray-600">{doc.agent_username} • {formatDate(doc.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 relative">
            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(doc.status)}`}>
              {doc.status}
            </span>
            <span className="text-sm text-gray-600">{formatFileSize(doc.file_size)}</span>
            <button
              onClick={() => setActionMenuOpenFor(actionMenuOpenFor === doc.id ? null : doc.id)}
              className="text-gray-400 hover:text-primary-600 transition-colors"
            >
              <MoreVertical size={18} />
            </button>

            {actionMenuOpenFor === doc.id && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                <button
                  onClick={async () => {
                    try {
                      const response = await apiClient.get(`/documents/${doc.id}/download/`, { responseType: 'blob' })
                      const url = window.URL.createObjectURL(response.data)
                      const link = document.createElement('a')
                      link.href = url
                      link.download = doc.title || `document-${doc.id}`
                      document.body.appendChild(link)
                      link.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(link)
                      setActionMenuOpenFor(null)
                    } catch (err) {
                      console.error('Erreur téléchargement:', err)
                      setActionMenuOpenFor(null)
                    }
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 border-b border-gray-100"
                >
                  <Download size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-700">Télécharger</span>
                </button>
                <button
                  onClick={() => { setShowPreview(doc); setActionMenuOpenFor(null) }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 border-b border-gray-100"
                >
                  <Eye size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-700">Voir détails</span>
                </button>
                <button
                  onClick={() => { apiClient.patch(`/documents/${doc.id}/`, { status: 'VALIDE' }); fetchDocuments(); setActionMenuOpenFor(null) }}
                  className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-2 border-b border-gray-100"
                >
                  <span className="text-lg">✓</span>
                  <span className="text-sm text-green-700 font-medium">Approuver</span>
                </button>
                <button
                  onClick={() => { apiClient.patch(`/documents/${doc.id}/`, { status: 'REJETE' }); fetchDocuments(); setActionMenuOpenFor(null) }}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2"
                >
                  <span className="text-lg">✕</span>
                  <span className="text-sm text-red-700 font-medium">Rejeter</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )

  const renderTableView = () => (
    <div className="bg-white rounded-xl border border-gray-200/80 overflow-x-auto shadow-elevation-2">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col style={{ width: '3%' }} />
          <col style={{ width: '28%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '8%' }} />
        </colgroup>
        <thead>
          <tr className="bg-gradient-to-r from-red-600 to-red-700 border-b-2 border-red-600">
            <th className="px-3 py-4 text-left font-bold text-white text-xs uppercase tracking-wider border-r border-red-500">
              <input
                type="checkbox"
                checked={selectedDocs.length === documents.length && documents.length > 0}
                onChange={(e) => {
                  if (e.target.checked) setSelectedDocs(documents.map(d => d.id))
                  else setSelectedDocs([])
                }}
                className="w-4 h-4 cursor-pointer accent-white rounded"
                title={selectedDocs.length === documents.length && documents.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}
              />
            </th>
            {[
              { field: 'title' as SortField, label: 'Titre' },
              { field: 'agent_username' as SortField, label: 'Agent' },
              { field: 'status' as SortField, label: 'Statut' },
              { field: 'file_format' as SortField, label: 'Format' },
              { field: 'file_size' as SortField, label: 'Taille' },
              { field: 'created_at' as SortField, label: 'Date' },
            ].map((col) => (
              <th
                key={col.field}
                className="px-3 py-4 text-left font-bold text-white text-xs uppercase tracking-wider border-r border-red-500 cursor-pointer hover:bg-red-700/50 transition-colors"
                onClick={() => {
                  if (sortField === col.field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  else { setSortField(col.field); setSortOrder('asc') }
                }}
              >
                <div className="flex items-center gap-2 group">
                  {col.label}
                  <ArrowUpDown size={14} className="text-white/70 group-hover:text-white transition-colors" />
                </div>
              </th>
            ))}
            <th className="px-3 py-4 text-center font-bold text-white text-xs uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {documents.map((doc, index) => (
            <tr
              key={doc.id}
              className={`transition-colors group ${
                index % 2 === 0 ? 'bg-amber-50 hover:bg-gray-200' : 'bg-white hover:bg-red-100'
              }`}
            >
              <td className="px-3 py-3 border-r border-gray-200">
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(doc.id)}
                  onChange={(e) => {
                    e.stopPropagation()
                    if (e.target.checked) setSelectedDocs([...selectedDocs, doc.id])
                    else setSelectedDocs(selectedDocs.filter(id => id !== doc.id))
                  }}
                  className="w-4 h-4 cursor-pointer accent-primary-600 rounded"
                />
              </td>
              <td className="px-3 py-3 border-r border-gray-200">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-lg flex-shrink-0">{getFileIcon(doc.file_format)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{doc.title}</p>
                    <p className="text-xs text-gray-500 font-medium truncate">{doc.document_type}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 border-r border-gray-200 font-medium text-gray-700 truncate">{doc.agent_username}</td>
              <td className="px-3 py-3 border-r border-gray-200">
                <span className={`px-2 py-1 rounded text-xs font-semibold inline-flex ${getStatusBadge(doc.status)}`}>
                  {doc.status}
                </span>
              </td>
              <td className="px-3 py-3 border-r border-gray-200 font-medium text-gray-700 text-center">{doc.file_format.toUpperCase()}</td>
              <td className="px-3 py-3 border-r border-gray-200 font-medium text-gray-600 text-right">{formatFileSize(doc.file_size)}</td>
              <td className="px-3 py-3 border-r border-gray-200 text-gray-600 text-sm whitespace-nowrap">{formatDate(doc.created_at)}</td>
              <td className="px-3 py-3 text-center relative">
                <button
                  onClick={() => setActionMenuOpenFor(actionMenuOpenFor === doc.id ? null : doc.id)}
                  className="text-gray-400 hover:text-primary-600 transition-colors p-1 hover:bg-gray-100 rounded mx-auto"
                  title="Actions"
                >
                  <MoreVertical size={18} />
                </button>

                {actionMenuOpenFor === doc.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                    <button
                      onClick={async () => {
                        try {
                          const response = await apiClient.get(`/documents/${doc.id}/download/`, { responseType: 'blob' })
                          const url = window.URL.createObjectURL(response.data)
                          const link = document.createElement('a')
                          link.href = url
                          link.download = doc.title || `document-${doc.id}`
                          document.body.appendChild(link)
                          link.click()
                          window.URL.revokeObjectURL(url)
                          document.body.removeChild(link)
                          setActionMenuOpenFor(null)
                        } catch (err) {
                          console.error('Erreur téléchargement:', err)
                          setActionMenuOpenFor(null)
                        }
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 border-b border-gray-100"
                    >
                      <Download size={16} className="text-gray-600" />
                      <span className="text-sm text-gray-700">Télécharger</span>
                    </button>
                    <button
                      onClick={() => { setShowPreview(doc); setActionMenuOpenFor(null) }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 border-b border-gray-100"
                    >
                      <Eye size={16} className="text-gray-600" />
                      <span className="text-sm text-gray-700">Voir détails</span>
                    </button>
                    <button
                      onClick={() => { apiClient.patch(`/documents/${doc.id}/`, { status: 'VALIDE' }); fetchDocuments(); setActionMenuOpenFor(null) }}
                      className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-2 border-b border-gray-100"
                    >
                      <span className="text-lg">✓</span>
                      <span className="text-sm text-green-700 font-medium">Approuver</span>
                    </button>
                    <button
                      onClick={() => { apiClient.patch(`/documents/${doc.id}/`, { status: 'REJETE' }); fetchDocuments(); setActionMenuOpenFor(null) }}
                      className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2"
                    >
                      <span className="text-lg">✕</span>
                      <span className="text-sm text-red-700 font-medium">Rejeter</span>
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Documents Statistics Header */}
        <DocumentsHeader
          title="Centre de Gestion des Documents"
          description="Consultez et gérez tous les documents de votre organisation"
        />

        {/* Error */}
        {error && <Alert type="error" title="Erreur" message={error} onClose={() => setError('')} />}

        {/* Folder Explorer (vue complète avec fichiers inline) */}
        <div className="mb-6">
          <FolderExplorer
            showFilesInline={true}
            onSelectFile={(filePath) => {
              console.log('Fichier sélectionné:', filePath)
            }}
          />
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-r from-primary-50 via-accent-50 to-primary-50 rounded-lg shadow-md p-6 mb-6 border border-primary-100">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">
            <Filter size={20} className="text-primary-600" /> Filtres
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3.5 text-primary-400" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 border-primary-200 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 border border-primary-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer hover:border-primary-300"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-4 py-2 border border-primary-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer hover:border-primary-300"
            >
              {documentTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              className="px-4 py-2 border border-primary-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer hover:border-primary-300"
            >
              {departments.map((d) => (
                <option key={d.id || d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="px-4 py-2 border border-primary-200 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer hover:border-primary-300"
            />
            <button
              onClick={() => {
                setFilters({ search: '', status: '', type: '', department: '', dateFrom: '', dateTo: '' })
                // ✅ Réinitialiser aussi le filtre dossier
                setFolderFilter({ path: '', children: [] })
              }}
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Documents Section - Two Column Layout */}
        <div className="flex gap-4 mt-6">
          {/* LEFT COLUMN: Folder Tree */}
          <div className="w-1/4 bg-white rounded-lg shadow-md border border-gray-200 overflow-y-auto max-h-96">
            <div className="p-4">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FolderOpen size={18} className="text-primary-600" />
                Dossiers
                {/* ✅ Indicateur du dossier actif */}
                {folderFilter.path && (
                  <span className="ml-auto text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full font-medium truncate max-w-[80px]">
                    {folderFilter.path}
                  </span>
                )}
              </h3>
              <FolderExplorer
                showFilesInline={false}
                onSelectFile={handleFolderSelect}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Documents Table */}
          <div className="w-3/4">
            {/* View Controls */}
            <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-primary-50 via-accent-50 to-primary-50 rounded-lg shadow-md p-4 border border-primary-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-lg transition-all transform hover:scale-110 ${view === 'grid' ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/50'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-lg transition-all transform hover:scale-110 ${view === 'list' ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/50'}`}
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setView('table')}
                  className={`p-2 rounded-lg transition-all transform hover:scale-110 ${view === 'table' ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/50'}`}
                >
                  <FileText size={18} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold px-4 py-2 rounded-lg transition-all ${
                  selectedDocs.length > 0
                    ? 'text-primary-900 bg-gradient-to-r from-primary-100 to-accent-100 shadow-sm'
                    : 'text-gray-500 bg-gray-100'
                }`}>
                  {selectedDocs.length} sélectionnés
                </span>
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium transition ${
                    selectedDocs.length > 0
                      ? 'border-primary-300 bg-white text-gray-900 cursor-pointer focus:ring-2 focus:ring-primary-500'
                      : 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                  disabled={selectedDocs.length === 0}
                >
                  <option value="">Action...</option>
                  <option value="VALIDE">Valider</option>
                  <option value="REJETE">Rejeter</option>
                  <option value="ARCHIVE">Archiver</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction || selectedDocs.length === 0}
                  className={`px-6 py-2 rounded-lg font-medium transition-all transform ${
                    !bulkAction || selectedDocs.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                  }`}
                >
                  Appliquer
                </button>
              </div>
            </div>

            {/* Documents Display */}
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="animate-spin text-blue-600" size={32} />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">Aucun document trouvé</p>
              </div>
            ) : (
              <>
                {view === 'grid' && renderGridView()}
                {view === 'list' && renderListView()}
                {view === 'table' && renderTableView()}
              </>
            )}
          </div>
        </div>

        {/* File Viewer */}
        {showPreview && (
          <FileViewer
            documentId={showPreview.id}
            fileName={showPreview.title}
            fileFormat={showPreview.file_format}
            onClose={() => setShowPreview(null)}
          />
        )}
      </div>
    </Layout>
  )
}