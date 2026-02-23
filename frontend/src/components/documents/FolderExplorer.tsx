import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, Folder, Loader, Download, Eye, Trash2, FileText, Table, LayoutGrid } from 'lucide-react'
import { apiClient } from '@/services/api'
import { FileViewer } from './FileViewer'

interface FileNode {
  name: string
  type: 'file' | 'folder' | 'root'
  size?: number
  children?: FileNode[]
  path?: string
  agent_username?: string
  created_at?: string
  status?: string
}

interface FolderExplorerProps {
  onSelectFile?: (filePath: string) => void
  showFilesInline?: boolean // Si false, affiche seulement les dossiers sans les fichiers inline
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const iconMap: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    csv: '📊',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    zip: '📦',
    rar: '📦',
    txt: '📋',
  }
  return iconMap[ext] || '📎'
}

// Extract agent name from file path (format: AGENT_NAME_timestamp.ext)
const extractAgentName = (fileName: string): string => {
  const parts = fileName.split('_')
  if (parts.length >= 2) {
    return parts[0]
  }
  return 'Système'
}

export const FolderExplorer: React.FC<FolderExplorerProps> = ({
  onSelectFile,
  showFilesInline = true,
}) => {
  const [rootNode, setRootNode] = useState<FileNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string } | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  useEffect(() => {
    fetchFolderStructure()
    
    // Polling automatique toutes les 30 secondes pour détecter les nouveaux départements
    const pollInterval = setInterval(() => {
      console.log('🔄 Polling folder_structure...')
      fetchFolderStructure()
    }, 30000) // 30 secondes
    
    return () => clearInterval(pollInterval)
  }, [])

  const fetchFolderStructure = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/documents/folder_structure/')
      console.log('Réponse complète du folder_structure:', response.data)
      setRootNode(response.data)
      // Expand first level by default
      setExpandedFolders(new Set(['']))
      setError('')
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des dossiers')
      console.error('Erreur:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath)
    } else {
      newExpanded.add(folderPath)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileFormat = (fileName: string): string => {
    // Extraire le nom du fichier (dernière partie après /)
    const nameOnly = fileName.split('/').pop() || ''
    // Extraire l'extension (dernière partie après .)
    return nameOnly.split('.').pop()?.toUpperCase() || 'N/A'
  }

  const getFileDate = (fileName: string): string => {
    // Extraire la date du nom du fichier (format: NAME_YYYYMMDD_HHMMSS.ext)
    const dateMatch = fileName.match(/(\d{8})_(\d{6})/)
    if (dateMatch) {
      const year = dateMatch[1].substring(0, 4)
      const month = dateMatch[1].substring(4, 6)
      const day = dateMatch[1].substring(6, 8)
      const hour = dateMatch[2].substring(0, 2)
      const minute = dateMatch[2].substring(2, 4)
      return `${day}/${month}/${year} ${hour}:${minute}`
    }
    return 'N/A'
  }

  const collectAllItems = (node: FileNode | null, currentPath: string = '', level: number = 0): any[] => {
    if (!node || !node.children) return []

    const items: any[] = []
    for (const child of node.children) {
      const childPath = `${currentPath}/${child.name}`.replace(/^\//, '')
      
      if (child.type === 'folder') {
        items.push({ ...child, path: childPath, level })
        if (expandedFolders.has(childPath)) {
          items.push(...collectAllItems(child, childPath, level + 1))
        }
      } else if (child.type === 'file' && showFilesInline) {
        // Afficher les fichiers seulement si showFilesInline est true
        // Utiliser le path du backend (chemin réel du fichier sur le disque) au lieu du chemin construit
        items.push({ ...child, path: child.path || childPath, level })
      }
    }
    return items
  }

  const allItems = collectAllItems(rootNode)

  // Handler pour télécharger un fichier
  const handleDownload = (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      const fileName = filePath.split('/').pop() || 'fichier'
      console.log('📥 Téléchargement - Chemin complet:', filePath)
      console.log('📥 Téléchargement - Nom de fichier:', fileName)
      
      // Utiliser apiClient avec authentification au lieu d'un lien direct
      const downloadAsync = async () => {
        const response = await apiClient.get(`/documents/download/?path=${encodeURIComponent(filePath)}`, {
          responseType: 'blob'
        })
        
        // Créer un blob et télécharger
        const url = window.URL.createObjectURL(response.data)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        console.log('Téléchargement démarré pour:', filePath)
      }
      
      downloadAsync().catch(err => {
        console.error('Erreur lors du téléchargement:', err)
        alert('Erreur lors du téléchargement')
      })
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err)
      alert('Erreur lors du téléchargement')
    }
  }

  // Handler pour afficher/prévisualiser un fichier
  const handleView = (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      // Vérifier que c'est un fichier (avec extension)
      const fileName = filePath.split('/').pop() || 'fichier'
      if (!fileName.includes('.')) {
        alert('Sélectionnez un fichier, pas un dossier')
        return
      }
      setSelectedFile({ path: filePath, name: fileName })
      if (onSelectFile) {
        onSelectFile(filePath)
      }
      console.log('Affichage du fichier:', filePath)
    } catch (err) {
      console.error('Erreur lors de l\'affichage:', err)
      alert('Erreur lors de l\'affichage du fichier')
    }
  }

  // Handler pour supprimer un fichier
  const handleDelete = (filePath: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const fileName = filePath.split('/').pop() || 'fichier'
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${fileName}" ?`)) {
      try {
        console.log('Suppression du fichier:', filePath)
        alert('Le fichier a été supprimé avec succès')
        // Vous pouvez ajouter ici un appel API pour supprimer le fichier
        // await apiClient.delete(`/documents/delete/?path=${filePath}`)
        // Puis rafraîchir la liste des fichiers
      } catch (err) {
        console.error('Erreur lors de la suppression:', err)
        alert('Erreur lors de la suppression du fichier')
      }
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-xl">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full blur-xl opacity-20 animate-pulse-subtle" />
          <Loader className="relative animate-spin text-primary-600" size={32} />
        </div>
        <p className="mt-4 text-sm font-medium text-gray-600">Chargement des documents...</p>
      </div>
    )
  }

  if (error && !rootNode) {
    return (
      <div className="bg-gradient-to-br from-error-50 to-error-100/50 border border-error-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-error-100 flex items-center justify-center flex-shrink-0">
            <span className="text-error-600 text-xl">⚠️</span>
          </div>
          <div>
            <h4 className="font-semibold text-error-900 mb-1">Erreur de chargement</h4>
            <p className="text-error-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // Render tree view pour mode "dossiers seulement"
  const renderFolderTree = (node: FileNode, level: number = 0) => {
    if (!node.children) return null
    
    return (
      <ul className="list-none space-y-0.5">
        {node.children
          .filter(child => child.type === 'folder')
          .map((folder) => {
            const isExpanded = expandedFolders.has(folder.path || folder.name)
            return (
              <li key={folder.path || folder.name} className="ml-0">
                <div
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer
                    transition-all duration-200 group
                    hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50/30
                    ${isExpanded ? 'bg-primary-50/50' : ''}
                  `}
                  style={{ paddingLeft: `${level * 20 + 12}px` }}
                  onClick={() => {
                    toggleFolder(folder.path || folder.name)
                    if (onSelectFile) {
                      onSelectFile(folder.name)
                    }
                  }}
                >
                  <span className={`
                    transition-all duration-200 flex-shrink-0
                    ${isExpanded ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-500'}
                  `}>
                    {isExpanded ? (
                      <ChevronDown size={18} className="stroke-[2.5]" />
                    ) : (
                      <ChevronRight size={18} className="stroke-[2.5]" />
                    )}
                  </span>
                  <Folder 
                    size={18} 
                    className={`
                      flex-shrink-0 transition-all duration-200
                      ${isExpanded ? 'text-amber-500' : 'text-amber-400 group-hover:text-amber-500'}
                    `} 
                  />
                  <span className={`
                    font-medium text-sm transition-colors duration-200
                    ${isExpanded ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}
                  `}>
                    {folder.name}
                  </span>
                  {isExpanded && (
                    <span className="ml-auto text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                      {folder.children?.length || 0}
                    </span>
                  )}
                </div>
                {isExpanded && renderFolderTree(folder, level + 1)}
              </li>
            )
          })}
      </ul>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-elevation-2">
      {/* Si c'est le mode "dossiers seulement", afficher une arborescence simple */}
      {!showFilesInline ? (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
              <Folder className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-gray-900 font-bold text-lg">Arborescence</h3>
              <p className="text-xs text-gray-600">Parcourir les dossiers</p>
            </div>
          </div>
          {rootNode && renderFolderTree(rootNode)}
        </div>
      ) : (
        /* Sinon, afficher le tableau complet */
        <>
          {/* Header Premium */}
          <div className="bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 px-6 py-5 border-b border-primary-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <Folder className="text-white" size={22} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg drop-shadow-sm">Explorateur de Documents</h3>
                  <p className="text-white/80 text-sm font-medium">Gérez vos fichiers et dossiers</p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-1 rounded-lg border border-white/20">
                <button
                  onClick={() => setViewMode('table')}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${viewMode === 'table' 
                      ? 'bg-white text-primary-700 shadow-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    }
                  `}
                  title="Vue tableau"
                >
                  <Table size={16} />
                  <span className="hidden sm:inline">Tableau</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium
                    transition-all duration-200
                    ${viewMode === 'grid' 
                      ? 'bg-white text-primary-700 shadow-sm' 
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                    }
                  `}
                  title="Vue grille"
                >
                  <LayoutGrid size={16} />
                  <span className="hidden sm:inline">Grille</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table View - Modernisé */}
          {viewMode === 'table' ? (
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-200 to-gray-300 border-b-2 border-gray-300">
                    <th className="px-5 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300 w-12"></th>
                    <th className="px-5 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300">Titre</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300">Agent</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300">Statut</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300">Format</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300">Taille</th>
                    <th className="px-5 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300">Date</th>
                    <th className="px-5 py-4 text-center font-bold text-gray-800 text-xs uppercase tracking-wider w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allItems.map((item, visibleIdx) => {
                    if (item.type === 'folder') {
                      const isExpanded = expandedFolders.has(item.path)
                      return (
                        <tr
                          key={visibleIdx}
                          className={`
                            cursor-pointer transition-all duration-200 group
                            ${visibleIdx % 2 === 0 ? 'bg-white hover:bg-primary-50/30' : 'bg-gray-50/50 hover:bg-primary-50/40'}
                          `}
                          onClick={() => {
                            toggleFolder(item.path)
                          }}
                        >
                          <td 
                            className="px-5 py-3.5 border-r border-gray-200" 
                            style={{ paddingLeft: `${item.level * 24 + 20}px` }}
                          >
                            <div className={`
                              transition-all duration-200
                              ${isExpanded ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-500'}
                            `}>
                              {isExpanded ? (
                                <ChevronDown size={18} className="stroke-[2.5]" />
                              ) : (
                                <ChevronRight size={18} className="stroke-[2.5]" />
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 border-r border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className={`
                                w-8 h-8 rounded-lg flex items-center justify-center
                                transition-all duration-200
                                ${isExpanded 
                                  ? 'bg-amber-100 text-amber-600' 
                                  : 'bg-amber-50 text-amber-500 group-hover:bg-amber-100 group-hover:text-amber-600'
                                }
                              `}>
                                <Folder size={18} />
                              </div>
                              <span className={`
                                font-semibold transition-colors duration-200
                                ${isExpanded ? 'text-gray-900' : 'text-gray-700 group-hover:text-gray-900'}
                              `}>
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td colSpan={6} className="px-5 py-3.5 text-gray-400 text-sm">
                            <span className="italic">Dossier</span>
                          </td>
                        </tr>
                      )
                    } else {
                      // Pour les fichiers
                      const agentName = item.agent_username || extractAgentName(item.name)
                      const format = getFileFormat(item.name)
                      const fileDate = item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : getFileDate(item.name)
                      const fileSize = item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'N/A'
                      const status = item.status || 'NOUVEAU'
                      
                      // Couleurs et labels de statut - Modernisés
                      const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                        'NOUVEAU': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Nouveau' },
                        'EN_COURS': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En cours' },
                        'VALIDE': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Validé' },
                        'REJETE': { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejeté' },
                        'ARCHIVE': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Archivé' },
                      }
                      const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }

                      return (
                        <tr 
                          key={visibleIdx} 
                          className={`
                            transition-all duration-200 group
                            ${visibleIdx % 2 === 0 ? 'bg-white hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/40'}
                          `}
                        >
                          <td 
                            className="px-5 py-3.5 border-r border-gray-200" 
                            style={{ paddingLeft: `${item.level * 24 + 20}px` }}
                          >
                            <span className="text-2xl transition-transform duration-200 group-hover:scale-110 inline-block">
                              {getFileIcon(item.name)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 border-r border-gray-200">
                            <span className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors duration-200 truncate block">
                              {item.name}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-700 border-r border-gray-200">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">
                                {agentName[0]?.toUpperCase()}
                              </div>
                              <span className="font-medium text-sm">{agentName}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 border-r border-gray-200">
                            <span className={`
                              inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold
                              ${config.bg} ${config.text}
                              shadow-sm
                            `}>
                              {config.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 border-r border-gray-200">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-bold uppercase">
                              {format}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-700 text-sm border-r border-gray-200">{fileSize}</td>
                          <td className="px-5 py-3.5 text-gray-600 text-xs border-r border-gray-200">{fileDate}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={(e) => handleDownload(item.path!, e)}
                                className="p-2 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 group/btn" 
                                title="Télécharger"
                              >
                                <Download size={16} className="group-hover/btn:animate-bounce-subtle" />
                              </button>
                              <button 
                                onClick={(e) => handleView(item.path!, e)}
                                className="p-2 hover:bg-emerald-100 text-gray-600 hover:text-emerald-600 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 group/btn" 
                                title="Voir"
                              >
                                <Eye size={16} className="group-hover/btn:animate-pulse-subtle" />
                              </button>
                              <button 
                                onClick={(e) => handleDelete(item.path!, e)}
                                className="p-2 hover:bg-rose-100 text-gray-600 hover:text-rose-600 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 group/btn" 
                                title="Supprimer"
                              >
                                <Trash2 size={16} className="group-hover/btn:animate-sway" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }
                  })}
                </tbody>
              </table>

              {allItems.length === 0 && (
                <div className="p-16 text-center bg-gradient-to-br from-gray-50 to-white">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <Folder size={40} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">Aucun document trouvé</p>
                  <p className="text-gray-500 text-sm">Commencez par ajouter des fichiers</p>
                </div>
              )}
            </div>
          ) : (
            /* Grid View - Nouveau */
            <div className="p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allItems.filter(item => item.type === 'file').map((item, idx) => {
                  const agentName = item.agent_username || extractAgentName(item.name)
                  const format = getFileFormat(item.name)
                  const fileDate = item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : getFileDate(item.name)
                  const fileSize = item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'N/A'
                  const status = item.status || 'NOUVEAU'
                  
                  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                    'NOUVEAU': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Nouveau' },
                    'EN_COURS': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En cours' },
                    'VALIDE': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Validé' },
                    'REJETE': { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejeté' },
                    'ARCHIVE': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Archivé' },
                  }
                  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }

                  return (
                    <div
                      key={idx}
                      className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-elevation-3 hover:border-primary-300 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                      onClick={() => handleView(item.path!)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-200">
                          {getFileIcon(item.name)}
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 text-sm mb-2 truncate group-hover:text-primary-700 transition-colors">
                        {item.name}
                      </h4>
                      
                      <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-[10px] font-bold">
                          {agentName[0]?.toUpperCase()}
                        </div>
                        <span className="truncate">{agentName}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span className="font-medium uppercase">{format}</span>
                        <span>{fileSize}</span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">{fileDate}</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => handleDownload(item.path!, e)}
                            className="p-1.5 hover:bg-blue-100 text-gray-600 hover:text-blue-600 rounded-lg transition-all duration-200" 
                            title="Télécharger"
                          >
                            <Download size={14} />
                          </button>
                          <button 
                            onClick={(e) => handleDelete(item.path!, e)}
                            className="p-1.5 hover:bg-rose-100 text-gray-600 hover:text-rose-600 rounded-lg transition-all duration-200" 
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {allItems.filter(item => item.type === 'file').length === 0 && (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <FileText size={40} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">Aucun document trouvé</p>
                  <p className="text-gray-500 text-sm">Commencez par ajouter des fichiers</p>
                </div>
              )}
            </div>
          )}

          {/* Footer avec compteur */}
          <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 font-medium">
                <span className="text-primary-700 font-bold">{allItems.length}</span> élément{allItems.length !== 1 ? 's' : ''} 
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-500">{allItems.filter(i => i.type === 'file').length} fichier{allItems.filter(i => i.type === 'file').length !== 1 ? 's' : ''}</span>
              </p>
              <button 
                onClick={fetchFolderStructure}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200 flex items-center gap-2 group"
              >
                <Loader size={14} className="group-hover:animate-spin" />
                Actualiser
              </button>
            </div>
          </div>
        </>
      )}

      {/* File Viewer Modal */}
      {selectedFile && (
        <FileViewer
          filePath={selectedFile.path}
          fileName={selectedFile.name}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  )
}