import React, { useState, useEffect } from 'react'
import { FolderOpen, Plus, Edit2, Trash2, ChevronRight, ChevronDown, AlertCircle, Globe, Archive, Briefcase } from 'lucide-react'
import { Layout } from '@/components/common'
import { Modal } from '@/components/common'
import { Input } from '@/components/common'
import { apiClient } from '@/services'
import { Folder } from '@/types/document'

export const Folders: React.FC = () => {
  const [folderTree, setFolderTree] = useState<Folder[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', folderType: 'service', parentId: '' })
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extrait tous les folders en flat list pour les stats
  const flatFolders = (folders: Folder[]): Folder[] => {
    return folders.reduce((acc: Folder[], folder: Folder) => {
      acc.push(folder)
      if (folder.children && folder.children.length > 0) {
        acc.push(...flatFolders(folder.children))
      }
      return acc
    }, [])
  }

  // Fetch folders from API
  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    try {
      setLoading(true)
      // Backend retourne déjà une arborescence imbriquée avec 'children'
      const response = await apiClient.get('/folders/folders/tree/')
      const treeData = Array.isArray(response.data) ? response.data : []
      
      // Garder la structure arborescente telle quelle
      setFolderTree(treeData)
      setError(null)
      
      // Expand first root folder by default
      const rootIds = treeData
        .slice(0, 1)
        .map((f: Folder) => f.id.toString())
      setExpandedFolders(new Set(rootIds))
    } catch (err: any) {
      console.error('Error fetching folders:', err)
      setError(err.response?.data?.detail || 'Erreur lors du chargement des dossiers')
      setFolderTree([])
    } finally {
      setLoading(false)
    }
  }

  // Obtenir tous les dossiers aplatis avec leur niveau hiérarchique
  const getAllFoldersFlat = (folders: Folder[], level: number = 0): Array<{ folder: Folder; level: number }> => {
    const result: Array<{ folder: Folder; level: number }> = []
    
    for (const folder of folders) {
      result.push({ folder, level })
      if (folder.children && folder.children.length > 0) {
        result.push(...getAllFoldersFlat(folder.children, level + 1))
      }
    }
    
    return result
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderId)) {
        newSet.delete(folderId)
      } else {
        newSet.add(folderId)
      }
      return newSet
    })
  }

  const getNextFolderType = (parentId: string): string => {
    if (!parentId) {
      return 'pole' // Racine
    }
    
    // Trouver le parent dans l'arborescence
    const findFolder = (folders: Folder[], id: string): Folder | null => {
      for (const folder of folders) {
        if (folder.id.toString() === id) return folder
        if (folder.children && folder.children.length > 0) {
          const found = findFolder(folder.children, id)
          if (found) return found
        }
      }
      return null
    }
    
    const parentFolder = findFolder(folderTree, parentId)
    if (!parentFolder) return 'service'
    
    const f = parentFolder as any
    const parentType = f.folder_type || 'service'
    
    switch (parentType) {
      case 'pole':
        return 'filiale'
      case 'filiale':
        return 'service'
      case 'service':
        return 'sub_service'
      case 'sub_service':
        return 'sub_service'
      default:
        return 'service'
    }
  }

  const openModal = (folder?: Folder) => {
    if (folder) {
      setEditingFolder(folder)
      const f = folder as any
      setFormData({
        name: folder.name,
        description: folder.description || '',
        folderType: f.folder_type || 'service',
        parentId: folder.parent ? folder.parent.toString() : '',
      })
    } else {
      setEditingFolder(null)
      setFormData({ name: '', description: '', folderType: 'pole', parentId: '' })
    }
    setShowModal(true)
  }

  // Auto-mettre à jour folderType quand parentId change
  const handleParentIdChange = (parentId: string) => {
    const nextType = getNextFolderType(parentId)
    setFormData(prev => ({ ...prev, parentId, folderType: nextType }))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Le nom du dossier est requis')
      return
    }

    try {
      if (editingFolder) {
        // Update existing folder
        await apiClient.put(`/folders/folders/${editingFolder.id}/`, {
          name: formData.name,
          description: formData.description,
          folder_type: formData.folderType,
          parent: formData.parentId || null,
        })
      } else {
        // Create new folder
        await apiClient.post('/folders/folders/', {
          name: formData.name,
          description: formData.description,
          folder_type: formData.folderType,
          parent: formData.parentId || null,
        })
      }
      await fetchFolders()
      setShowModal(false)
    } catch (err: any) {
      console.error('Error saving folder:', err)
      setError(err.response?.data?.detail || 'Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id: string | number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce dossier?')) {
      try {
        await apiClient.delete(`/folders/folders/${id}/`)
        await fetchFolders()
      } catch (err: any) {
        console.error('Error deleting folder:', err)
        setError(err.response?.data?.detail || 'Erreur lors de la suppression')
      }
    }
  }

  const FolderTree: React.FC<{ folders?: Folder[]; level?: number }> = ({ folders: foldersToShow = folderTree, level = 0 }) => {
    return (
      <div className={level > 0 ? 'ml-4 sm:ml-8 mt-1 sm:mt-2' : ''}>
        {foldersToShow.map(folder => {
          const hasChildren = folder.children && folder.children.length > 0
          const isExpanded = expandedFolders.has(folder.id.toString())

          return (
            <div key={folder.id} className="mb-1 sm:mb-2">
              <div className={`
                group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 
                bg-white rounded-lg sm:rounded-xl border border-gray-100
                hover:border-red-200 hover:shadow-md
                transition-all duration-200
                ${level > 0 ? 'bg-gradient-to-r from-gray-50 to-white' : ''}
              `}>
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  {/* Toggle button for folders with children */}
                  {hasChildren ? (
                    <button
                      onClick={() => toggleFolder(folder.id.toString())}
                      className="p-1 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-red-600 sm:w-5 sm:h-5" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  ) : (
                    <div className="w-6 sm:w-7 flex-shrink-0" />
                  )}

                  {/* Folder icon with type detection */}
                  {(() => {
                    // Determine folder type from folder_type field
                    const f = folder as any
                    const type = f.folder_type || 'service'
                    
                    if (type === 'filiale') {
                      return (
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 shadow-md">
                          <Globe size={18} className="text-white sm:w-6 sm:h-6" />
                        </div>
                      )
                    } else if (type === 'pole') {
                      return (
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                          <Globe size={18} className="text-white sm:w-6 sm:h-6" />
                        </div>
                      )
                    } else if (type === 'service') {
                      return (
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md">
                          <Briefcase size={18} className="text-white sm:w-6 sm:h-6" />
                        </div>
                      )
                    } else {
                      return (
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl flex-shrink-0 bg-gradient-to-br from-amber-500 to-amber-600 shadow-md">
                          <Archive size={18} className="text-white sm:w-6 sm:h-6" />
                        </div>
                      )
                    }
                  })()}
                  

                  {/* Folder info */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`
                      font-semibold text-gray-900 truncate
                      ${level === 0 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}
                    `}>
                      {folder.name}
                    </h3>
                    {folder.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5 hidden sm:block">
                        {folder.description}
                      </p>
                    )}
                  </div>

                  {/* Children count badge with type-based coloring */}
                  {hasChildren && (
                    (() => {
                      const f = folder as any
                      const type = f.folder_type || 'service'
                      
                      const badgeStyles = type === 'filiale'
                        ? 'bg-red-50 text-red-700 border-red-100'
                        : type === 'pole'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : type === 'service'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                      
                      return (
                        <span className={`
                          px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium
                          border flex-shrink-0
                          ${badgeStyles}
                        `}>
                          {folder.children!.length}
                        </span>
                      )
                    })()
                  )}
                </div>

                {/* Action buttons - Hidden on mobile, visible on hover for desktop */}
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => openModal(folder)}
                    className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Éditer"
                  >
                    <Edit2 size={16} className="text-red-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(folder.id)}
                    className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>

              {/* Child folders - only show if expanded */}
              {hasChildren && isExpanded && (
                <FolderTree folders={folder.children} level={level + 1} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20">
        <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                  <FolderOpen size={24} className="text-white sm:w-8 sm:h-8" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
                    Gestion des Dossiers
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                    Organisez vos documents par catégories
                  </p>
                </div>
              </div>
              <button
                onClick={() => openModal()}
                className="btn-primary sm:text-base text-sm flex-shrink-0"
              >
                <Plus size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Nouveau dossier</span>
                <span className="sm:hidden">Nouveau</span>
              </button>
            </div>

            {/* Stats - Responsive grid with type-based colors */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4 sm:mt-6">
              {(() => {
                const allFolders = flatFolders(folderTree)
                return (
                  <>
                    <div className="card card-body p-3 sm:p-4 border-l-4 border-l-gray-600">
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">{allFolders.length}</div>
                      <div className="text-xs text-gray-600 mt-1">Total</div>
                    </div>
                    <div className="card card-body p-3 sm:p-4 border-l-4 border-l-red-600">
                      <div className="text-xl sm:text-2xl font-bold text-red-600">
                        {allFolders.filter((f: Folder) => (f as any).folder_type === 'filiale').length}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Filiales</div>
                    </div>
                    <div className="card card-body p-3 sm:p-4 border-l-4 border-l-emerald-600">
                      <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                        {allFolders.filter((f: Folder) => (f as any).folder_type === 'service').length}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Services</div>
                    </div>
                    <div className="card card-body p-3 sm:p-4 border-l-4 border-l-amber-600">
                      <div className="text-xl sm:text-2xl font-bold text-amber-600">
                        {allFolders.filter((f: Folder) => (f as any).folder_type === 'sub_service').length}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Sous-services</div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12 sm:py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          )}

          {/* Folders Tree */}
          {!loading && (
            <div className="card card-body p-4 sm:p-6">
              {folderTree.length > 0 ? (
                <FolderTree />
              ) : (
                <div className="text-center py-12 sm:py-16">
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-full w-16 sm:w-20 h-16 sm:h-20 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <FolderOpen size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-900 text-base sm:text-lg font-medium mb-1 sm:mb-2">Aucun dossier créé</p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Commencez par créer votre premier dossier
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <Modal 
          isOpen={showModal} 
          title={editingFolder ? 'Éditer le dossier' : 'Créer un nouveau dossier'} 
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Nom du dossier <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Ex: Documents RH"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Dossier parent (optionnel)
              </label>
              <select
                value={formData.parentId}
                onChange={(e) => handleParentIdChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">-- Aucun parent (Pôle) --</option>
                {getAllFoldersFlat(folderTree).map(({ folder: f, level }) => (
                  <option key={f.id} value={f.id}>
                    {'  '.repeat(level)}
                    {level > 0 ? '└─ ' : ''}
                    {f.name} ({(() => {
                      const typeMap: Record<string, string> = {
                        'pole': 'Pôle',
                        'filiale': 'Filiale',
                        'service': 'Service',
                        'sub_service': 'Sous-service'
                      }
                      return typeMap[(f as any).folder_type] || (f as any).folder_type
                    })()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Type de dossier <span className="text-xs text-gray-500">(auto-détecté)</span>
              </label>
              <div className="px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 font-medium">
                {(() => {
                  const typeMap: Record<string, string> = {
                    'pole': '🌍 Pôle',
                    'filiale': '🏢 Filiale',
                    'service': '📂 Service',
                    'sub_service': '📋 Sous-service'
                  }
                  return typeMap[formData.folderType] || formData.folderType
                })()}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                placeholder="Description du dossier"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                className="btn-primary flex-1"
              >
                {editingFolder ? 'Mettre à jour' : 'Créer le dossier'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1"
              >
                Annuler
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}