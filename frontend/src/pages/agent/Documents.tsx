import React, { useState, useEffect } from 'react' 
import {
  FileText, Search, Eye, Download,
  AlertCircle, CheckCircle2, Loader,
  Plus, LayoutGrid, List, X, Share, Send
} from 'lucide-react'
import { Layout } from '@/components/common'
import { DocumentUpload } from '@/components/agent/DocumentUpload'
import { DocumentsHeader } from '@/components/documents/DocumentsHeader'
import { DocumentRerouteModal } from '@/components/documents'
import { ShareDocumentModal } from '@/components/documents/ShareDocumentModal'
import { FolderTree } from '@/components/documents/FolderTree'
import { FileViewer } from '@/components/documents/FileViewer'
import { apiClient } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdmin } from '@/utils/authUtils'

interface Document {
  id: string
  name: string
  description?: string
  fileType: string
  fileSize: string
  createdAt: Date
  updatedAt?: Date
  createdBy: string
  folder?: string
  folder_path?: string
  status: 'NOUVEAU' | 'EN_COURS' | 'VALIDE' | 'REJETE' | 'ARCHIVE'
  downloads: number
}

const getFileTypeColor = (fileType: string) => {
  const types: { [key: string]: string } = {
    PDF: 'bg-error-100 text-error-700',
    DOCX: 'bg-info-100 text-info-700',
    XLSX: 'bg-success-100 text-success-700',
    PPTX: 'bg-warning-100 text-warning-700',
    default: 'bg-secondary-100 text-secondary-700',
  }
  return types[fileType] || types.default
}

const formatFileSize = (size: string | number): string => {
  if (!size || size === 'N/A') return 'N/A'
  
  const bytes = typeof size === 'string' ? parseInt(size, 10) : size
  if (isNaN(bytes)) return 'N/A'
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let fileSize = bytes
  let unitIndex = 0
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024
    unitIndex++
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`
}

export const AgentDocuments: React.FC = () => {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [receivedDocuments, setReceivedDocuments] = useState<Document[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'received'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('Tous')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedCreator, setSelectedCreator] = useState('Tous')
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>()
  const [folderRefreshTrigger, setFolderRefreshTrigger] = useState(0)
  const [viewingDocumentId, setViewingDocumentId] = useState<string | null>(null)
  const [isRerouteModalOpen, setIsRerouteModalOpen] = useState(false)
  const [selectedDocumentForReroute, setSelectedDocumentForReroute] = useState<Document | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [selectedDocumentForShare, setSelectedDocumentForShare] = useState<Document | null>(null)

  // ✅ UTILISE authUtils.isAdmin() - single source of truth
  const isAdminUser = isAdmin(user)

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments()
    fetchReceivedDocuments()
  }, [])

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // For admins, fetch all documents; for others, fetch only their own
      const endpoint = isAdminUser ? '/documents/' : `/documents/?created_by=${user?.id}`
      const response = await apiClient.get(endpoint)
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data?.results || response.data?.data || []
      
      if (data.length > 0) {
        const fetchedDocs = data.map((doc: any) => ({
          id: doc.id?.toString(),
          name: doc.name || doc.title || '',
          description: doc.description || '',
          fileType: doc.file_type?.toUpperCase() || doc.file_format?.toUpperCase() || 'DOC',
          fileSize: doc.file_size || 'N/A',
          createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
          updatedAt: doc.updated_at ? new Date(doc.updated_at) : undefined,
          createdBy: doc.agent_username || doc.created_by?.username || doc.created_by || 'Système',
          folder: doc.classification || doc.folder_name || doc.specification_display || 'Non classé',
          status: doc.status || 'NOUVEAU',
          downloads: doc.downloads_count || 0,
        }))
        setDocuments(fetchedDocs)
      }
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError('Impossible de récupérer les documents depuis la base de données')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchReceivedDocuments = async () => {
    try {
      const response = await apiClient.get('/documents/received_documents/')
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data?.results || response.data?.data || []
      
      if (data.length > 0) {
        const fetchedDocs = data.map((doc: any) => ({
          id: doc.id?.toString(),
          name: doc.name || doc.title || '',
          description: doc.description || '',
          fileType: doc.file_type?.toUpperCase() || doc.file_format?.toUpperCase() || 'DOC',
          fileSize: doc.file_size || 'N/A',
          createdAt: doc.created_at ? new Date(doc.created_at) : new Date(),
          updatedAt: doc.updated_at ? new Date(doc.updated_at) : undefined,
          createdBy: doc.agent_username || doc.created_by?.username || doc.created_by || 'Système',
          folder: doc.classification || doc.folder_name || doc.specification_display || 'Non classé',
          status: doc.status || 'NOUVEAU',
          downloads: doc.downloads_count || 0,
        }))
        setReceivedDocuments(fetchedDocs)
      } else {
        setReceivedDocuments([])
      }
    } catch (err) {
      console.error('Error fetching received documents:', err)
      // Don't show error for received documents - it's optional
    }
  }

  const handleDownload = async (doc: Document) => {
    try {
      const response = await apiClient.get(`/documents/${doc.id}/download/`, {
        responseType: 'blob',
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${doc.name}.${doc.fileType.toLowerCase()}`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setSuccessMessage(`${doc.name} téléchargé`)
    } catch (err) {
      console.error('Error downloading document:', err)
      setError('Erreur lors du téléchargement')
    }
  }

  // Filter documents
  const creators = ['Tous', ...new Set(documents.map(d => d.createdBy))]
  const folders = ['Tous', ...new Set(documents.map(d => (d as any).folder_path || d.folder).filter(f => f))]
  
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
    
    // For admins: filter by folder navigation OR filter dropdown
    // Use folder_path (full hierarchy) for filtering, not just folder name
    const docFolder = (doc as any).folder_path || doc.folder
    const matchesFolder = isAdminUser && currentPath.length > 0
      ? docFolder === currentPath[currentPath.length - 1]
      : selectedFolder === 'Tous' || docFolder === selectedFolder
    
    const matchesCreator = selectedCreator === 'Tous' || doc.createdBy === selectedCreator
    return matchesSearch && matchesFolder && matchesCreator
  })

  return (
    <Layout>



          {/* Documents Statistics Header */}
          <DocumentsHeader 
            title="Centre de Gestion des Documents"
            description="Consultez et gérez tous les documents de votre organisation"
            forAgentOnly={true}
          />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl flex items-start gap-3 animate-slide-up">
              <AlertCircle className="text-error-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-error-700 font-medium">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-error-600 hover:text-error-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-xl flex items-start gap-3 animate-slide-up">
              <CheckCircle2 className="text-success-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-success-700 font-medium">{successMessage}</p>
            </div>
          )}


          {/* Folder Navigation Breadcrumb - Admin Only */}
          {isAdminUser && (
            <div className="mb-6 p-4 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm">
              <p className="text-xs font-semibold text-secondary-500 uppercase mb-2">Arborescence</p>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <button
                  onClick={() => setCurrentPath([])}
                  className="text-primary-600 hover:text-primary-700 font-medium transition hover:underline"
                >
                  📁 Racine
                </button>
                {currentPath.map((folder, index) => (
                  <React.Fragment key={index}>
                    <span className="text-secondary-400">/</span>
                    <button
                      onClick={() => setCurrentPath(currentPath.slice(0, index + 1))}
                      className="text-primary-600 hover:text-primary-700 font-medium transition hover:underline"
                    >
                      📁 {folder}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'all'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-secondary-600 hover:text-secondary-900'
              }`}
            >
              📄 Tous les documents
            </button>
            <button
              onClick={() => setActiveTab('received')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition ${
                activeTab === 'received'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-secondary-600 hover:text-secondary-900'
              }`}
            >
              📥 Documents Reçus {receivedDocuments.length > 0 && `(${receivedDocuments.length})`}
            </button>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="animate-spin text-primary-600 mb-4" size={40} />
              <p className="text-secondary-600 font-medium">Chargement des documents...</p>
            </div>
          ) : (
            <>
              {/* Main Content: Folders + Documents OR Received Documents */}
              {activeTab === 'all' ? (
              // TAB: Tous les documents
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar: Folder Tree */}
                <div className="lg:col-span-1">
                  <div className="card p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">📁 Dossiers</h2>
                    <FolderTree 
                      onFolderSelect={(folderId, folderName) => {
                        setSelectedFolderId(folderId)
                        setSelectedFolder(folderName)
                        setSearchTerm('')
                      }}
                      selectedFolderId={selectedFolderId}
                      refreshTrigger={folderRefreshTrigger}
                    />
                  </div>
                </div>

                {/* Main Area: Search, Filters, and Documents */}
                <div className="lg:col-span-3">
                  {/* Search & Filter Bar */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                      <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" />
                      <input
                        type="text"
                        placeholder="Rechercher un document..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-12 py-3 w-full"
                      />
                    </div>
                    
                    {/* Folder Filter */}
                    <select 
                      value={selectedFolder}
                      onChange={(e) => setSelectedFolder(e.target.value)}
                      className="input py-3 px-4"
                    >
                      {folders.map(folder => (
                        <option key={folder} value={folder}>{folder}</option>
                      ))}
                    </select>

                    {/* Creator Filter - Only for Admins */}
                    {isAdminUser && (
                      <select 
                        value={selectedCreator}
                        onChange={(e) => setSelectedCreator(e.target.value)}
                        className="input py-3 px-4"
                      >
                        {creators.map(creator => (
                          <option key={creator} value={creator}>{creator}</option>
                        ))}
                      </select>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex gap-2 bg-secondary-100 rounded-xl p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-3 rounded-lg transition-all ${
                          viewMode === 'grid'
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-secondary-600 hover:text-secondary-900'
                        }`}
                        title="Vue grille"
                      >
                        <LayoutGrid size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-3 rounded-lg transition-all ${
                          viewMode === 'list'
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-secondary-600 hover:text-secondary-900'
                        }`}
                        title="Vue liste"
                      >
                        <List size={18} />
                      </button>
                    </div>

                    {/* Upload Button */}
                    <button 
                      onClick={() => setIsUploadModalOpen(true)}
                      className="btn-primary btn-lg"
                    >
                      <Plus size={20} /> Ajouter
                    </button>
                  </div>

                  {/* Documents Table */}
                  {filteredDocuments.length > 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden shadow-elevation-2">
                      {/* Table Header */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-red-600 to-red-700 border-b-2 border-red-700">
                              <th className="px-3 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-red-700 w-8"></th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-red-700 flex-1 min-w-[120px]">Titre</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-red-700 hidden sm:table-cell w-16">Dossier</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-red-700 w-16">Type</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-red-700 hidden md:table-cell w-12">Taille</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-red-700 w-20">Statut</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-red-700 hidden lg:table-cell w-24">Date</th>
                              <th className="px-4 py-4 text-center font-bold !text-white text-xs uppercase tracking-wider w-16">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filteredDocuments.map((doc, idx) => (
                              <tr
                                key={doc.id}
                                className={`
                                  transition-all duration-200 group
                                  ${idx % 2 === 0 ? 'bg-white hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/40'}
                                `}
                              >
                                {/* Icon */}
                                <td className="px-3 py-3.5 border-r border-gray-200 w-8">
                                  <span className="transition-transform duration-200 group-hover:scale-110 inline-block">
                                    <FileText size={20} className={`${
                                      doc.fileType === 'PDF' ? 'text-red-500' :
                                      doc.fileType === 'DOCX' ? 'text-blue-500' :
                                      doc.fileType === 'XLSX' ? 'text-green-500' :
                                      doc.fileType === 'PPTX' ? 'text-orange-500' :
                                      'text-gray-500'
                                    }`} />
                                  </span>
                                </td>

                                {/* Title */}
                                <td className="px-4 py-3.5 border-r border-gray-200 flex-1 min-w-[120px]">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-bold text-black bg-white px-2 py-1 rounded group-hover:bg-gray-100 transition-colors duration-200 break-words line-clamp-2">
                                      {doc.name}
                                    </span>
                                    {doc.description && (
                                      <span className="text-xs text-gray-500 font-medium hidden sm:inline-block truncate">
                                        {doc.description}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Folder - Hidden on mobile */}
                                <td className="px-4 py-3.5 border-r border-gray-200 hidden sm:table-cell w-16">
                                  <code className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono bg-gray-100 text-gray-700 group-hover:bg-gray-200 transition-colors whitespace-nowrap">
                                    {doc.folder || 'N/A'}
                                  </code>
                                </td>

                                {/* File Type */}
                                <td className="px-4 py-3.5 border-r border-gray-200 w-16">
                                  <span className={`px-2 py-1 rounded-lg font-semibold text-xs ${getFileTypeColor(doc.fileType)}`}>
                                    {doc.fileType}
                                  </span>
                                </td>

                                {/* File Size - Hidden on tablets and below */}
                                <td className="px-4 py-3.5 border-r border-gray-200 hidden md:table-cell w-12">
                                  <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                                    {formatFileSize(doc.fileSize)}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3.5 border-r border-gray-200 w-20">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                                    doc.status === 'NOUVEAU' ? 'bg-blue-100 text-blue-700' :
                                    doc.status === 'EN_COURS' ? 'bg-amber-100 text-amber-700' :
                                    doc.status === 'VALIDE' ? 'bg-emerald-100 text-emerald-700' :
                                    doc.status === 'REJETE' ? 'bg-rose-100 text-rose-700' :
                                    doc.status === 'ARCHIVE' ? 'bg-gray-100 text-gray-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {doc.status === 'NOUVEAU' ? 'Nouveau' :
                                     doc.status === 'EN_COURS' ? 'En cours' :
                                     doc.status === 'VALIDE' ? 'Validé' :
                                     doc.status === 'REJETE' ? 'Rejeté' :
                                     doc.status === 'ARCHIVE' ? 'Archivé' :
                                     doc.status}
                                  </span>
                                </td>

                                {/* Date - Hidden on small screens */}
                                <td className="px-4 py-3.5 text-gray-900 border-r border-gray-200 hidden lg:table-cell w-24">
                                  <span className="text-xs font-medium whitespace-nowrap">
                                    {doc.createdAt.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: '2-digit' })}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3.5 text-center relative">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setViewingDocumentId(doc.id)}
                                      className="p-1.5 hover:bg-blue-100 rounded-lg transition-all duration-200 text-gray-700 hover:text-blue-600"
                                      title="Voir"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDownload(doc)}
                                      className="p-1.5 hover:bg-green-100 rounded-lg transition-all duration-200 text-gray-700 hover:text-green-600"
                                      title="Télécharger"
                                    >
                                      <Download size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedDocumentForShare(doc)
                                        setIsShareModalOpen(true)
                                      }}
                                      className="p-1.5 hover:bg-orange-100 rounded-lg transition-all duration-200 text-gray-700 hover:text-orange-600"
                                      title="Partager"
                                    >
                                      <Send size={16} />
                                    </button>
                                    {isAdminUser && (
                                      <button
                                        onClick={() => {
                                          setSelectedDocumentForReroute(doc)
                                          setIsRerouteModalOpen(true)
                                        }}
                                        className="p-1.5 hover:bg-purple-100 rounded-lg transition-all duration-200 text-gray-700 hover:text-purple-600"
                                        title="Re-router"
                                      >
                                        <Share size={16} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="card p-16 text-center">
                      <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-secondary-400" />
                      </div>
                      <p className="text-secondary-900 font-semibold text-lg mb-2">Aucun document trouvé</p>
                      <p className="text-secondary-600 mb-6">
                        {searchTerm || selectedFolder !== 'Tous'
                          ? 'Affinez votre recherche ou vos filtres'
                          : 'Commencez par ajouter vos documents'}
                      </p>
                      {(searchTerm || selectedFolder !== 'Tous') && (
                        <button
                          onClick={() => {
                            setSearchTerm('')
                            setSelectedFolder('Tous')
                          }}
                          className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                        >
                          Réinitialiser les filtres
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              ) : (
                // TAB: Documents Reçus
                <div className="space-y-6">
                  {/* Search Bar for Received Documents */}
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" />
                      <input
                        type="text"
                        placeholder="Rechercher dans vos documents reçus..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-12 py-3 w-full"
                      />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex gap-2 bg-secondary-100 rounded-xl p-1">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-3 rounded-lg transition-all ${
                          viewMode === 'grid'
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-secondary-600 hover:text-secondary-900'
                        }`}
                        title="Vue grille"
                      >
                        <LayoutGrid size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-3 rounded-lg transition-all ${
                          viewMode === 'list'
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-secondary-600 hover:text-secondary-900'
                        }`}
                        title="Vue liste"
                      >
                        <List size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Received Documents List */}
                  {receivedDocuments.length > 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200/80 overflow-hidden shadow-elevation-2">
                      {/* Table Header */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-600 to-blue-700 border-b-2 border-blue-700">
                              <th className="px-3 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-blue-700 w-8"></th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-blue-700 flex-1 min-w-[120px]">Titre</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-blue-700 w-16">Type</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-blue-700 hidden md:table-cell w-12">Taille</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-blue-700 hidden lg:table-cell w-24">Envoyé par</th>
                              <th className="px-4 py-4 text-left font-bold !text-white text-xs uppercase tracking-wider border-r border-blue-700 hidden lg:table-cell w-24">Date</th>
                              <th className="px-4 py-4 text-center font-bold !text-white text-xs uppercase tracking-wider w-16">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {receivedDocuments
                              .filter(doc => !searchTerm || doc.name.toLowerCase().includes(searchTerm.toLowerCase()))
                              .map((doc, idx) => (
                              <tr
                                key={doc.id}
                                className={`transition-all duration-200 group ${
                                  idx % 2 === 0 ? 'bg-white hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/40'
                                }`}
                              >
                                {/* Icon */}
                                <td className="px-3 py-3.5 border-r border-gray-200 w-8">
                                  <span className="transition-transform duration-200 group-hover:scale-110 inline-block">
                                    <FileText size={20} className={`${
                                      doc.fileType === 'PDF' ? 'text-red-500' :
                                      doc.fileType === 'DOCX' ? 'text-blue-500' :
                                      doc.fileType === 'XLSX' ? 'text-green-500' :
                                      doc.fileType === 'PPTX' ? 'text-orange-500' :
                                      'text-gray-500'
                                    }`} />
                                  </span>
                                </td>

                                {/* Title */}
                                <td className="px-4 py-3.5 border-r border-gray-200 flex-1 min-w-[120px]">
                                  <span className="font-bold text-black group-hover:text-primary-600 transition-colors duration-200 cursor-pointer break-words line-clamp-2">
                                    {doc.name}
                                  </span>
                                </td>

                                {/* Type */}
                                <td className="px-4 py-3.5 border-r border-gray-200 w-16">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getFileTypeColor(doc.fileType)}`}>
                                    {doc.fileType}
                                  </span>
                                </td>

                                {/* Size */}
                                <td className="px-4 py-3.5 border-r border-gray-200 hidden md:table-cell w-12 text-secondary-600 text-xs font-medium">
                                  {formatFileSize(doc.fileSize)}
                                </td>

                                {/* Sent By */}
                                <td className="px-4 py-3.5 border-r border-gray-200 hidden lg:table-cell w-24 text-secondary-600 text-xs font-medium truncate">
                                  {doc.createdBy}
                                </td>

                                {/* Date */}
                                <td className="px-4 py-3.5 border-r border-gray-200 hidden lg:table-cell w-24 text-secondary-600 text-xs font-medium">
                                  {doc.createdAt?.toLocaleDateString() || 'N/A'}
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3.5 text-center w-16">
                                  <div className="flex justify-center gap-2">
                                    <button
                                      onClick={() => setViewingDocumentId(doc.id)}
                                      className="p-2 hover:bg-blue-100 rounded-lg transition-colors duration-200 text-blue-600 hover:text-blue-700"
                                      title="Voir le document"
                                    >
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDownload(doc)}
                                      className="p-2 hover:bg-green-100 rounded-lg transition-colors duration-200 text-green-600 hover:text-green-700"
                                      title="Télécharger"
                                    >
                                      <Download size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="card p-16 text-center">
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-10 h-10 text-blue-400" />
                      </div>
                      <p className="text-secondary-900 font-semibold text-lg mb-2">Aucun document reçu</p>
                      <p className="text-secondary-600">Les documents qui vous seront envoyés apparaîtront ici</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Document Upload Modal */}
        {isUploadModalOpen && (
          <DocumentUpload
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadSuccess={(newDocument: any) => {
              // Transform the API response to match the Document interface
              const transformedDoc: Document = {
                id: newDocument.id?.toString(),
                name: newDocument.name || newDocument.title || '',
                description: newDocument.description || '',
                fileType: newDocument.file_type?.toUpperCase() || newDocument.file_format?.toUpperCase() || 'DOC',
                fileSize: newDocument.file_size || 'N/A',
                createdAt: newDocument.created_at ? new Date(newDocument.created_at) : new Date(),
                updatedAt: newDocument.updated_at ? new Date(newDocument.updated_at) : undefined,
                createdBy: newDocument.agent_username || newDocument.created_by?.username || newDocument.created_by || 'Système',
                folder: newDocument.classification || newDocument.folder_name || newDocument.specification_display || 'Non classé',
                status: newDocument.status || 'active',
                downloads: newDocument.downloads_count || 0,
                folder_path: newDocument.folder_path,
              }
              setDocuments([transformedDoc, ...documents])
              setIsUploadModalOpen(false)
              // Rafraîchir l'arborescence des dossiers pour afficher les nouveaux dossiers Année/Mois
              setFolderRefreshTrigger(prev => prev + 1)
            }}
          />
        )}

        {viewingDocumentId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
                <div>
                  <h2 className="text-lg font-bold text-white">Aperçu du document</h2>
                  <p className="text-blue-100 text-sm">{documents.find(d => d.id === viewingDocumentId)?.fileType || 'Document'}</p>
                </div>
                <button
                  onClick={() => setViewingDocumentId(null)}
                  className="p-2 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-50">
                <FileViewer
                  documentId={viewingDocumentId}
                  fileName={documents.find(d => d.id === viewingDocumentId)?.name || 'document'}
                  fileFormat={documents.find(d => d.id === viewingDocumentId)?.fileType}
                  onClose={() => setViewingDocumentId(null)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Share Document Modal */}
        {isShareModalOpen && selectedDocumentForShare && (
          <ShareDocumentModal
            isOpen={isShareModalOpen}
            documentId={selectedDocumentForShare.id}
            documentTitle={selectedDocumentForShare.name}
            onClose={() => {
              setIsShareModalOpen(false)
              setSelectedDocumentForShare(null)
            }}
            onSuccess={() => {
              setSuccessMessage('Document partagé avec succès!')
            }}
          />
        )}

        {/* Re-routing Modal */}
        {isRerouteModalOpen && selectedDocumentForReroute && (
          <DocumentRerouteModal
            document={selectedDocumentForReroute as any}
            currentFolder={{
              id: '1',
              name: selectedDocumentForReroute.folder || 'Documents',
              created_at: new Date(),
              updated_at: new Date(),
              is_active: true,
            }}
            isOpen={isRerouteModalOpen}
            onClose={() => {
              setIsRerouteModalOpen(false)
              setSelectedDocumentForReroute(null)
            }}
            onSuccess={() => {
              setIsRerouteModalOpen(false)
              setSelectedDocumentForReroute(null)
              setSuccessMessage('Document re-routé avec succès!')
              fetchDocuments()
            }}
          />
        )}
      </div>
    </Layout>
  )
}
