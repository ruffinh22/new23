/**
 * Folder Tree Component
 * Displays hierarchical folder structure with expand/collapse
 */

import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, FolderOpen, Folder as FolderIcon } from 'lucide-react'
import { apiClient } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdmin } from '../../utils/authUtils'

interface FolderNode {
  id: number
  name: string
  description?: string
  children?: FolderNode[]
}

interface FolderTreeProps {
  onFolderSelect?: (folderId: number, folderName: string) => void
  selectedFolderId?: number
  refreshTrigger?: number // Déclenche le rafraîchissement quand la valeur change
}

const FolderTreeItem: React.FC<{
  folder: FolderNode
  level: number
  onFolderSelect?: (folderId: number, folderName: string) => void
  selectedFolderId?: number
}> = ({ folder, level, onFolderSelect, selectedFolderId }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasChildren = folder.children && folder.children.length > 0
  const isSelected = selectedFolderId === folder.id

  return (
    <>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-all ${
          isSelected
            ? 'bg-primary-100 text-primary-700'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        style={{ marginLeft: `${level * 16}px` }}
      >
        {hasChildren && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 hover:bg-gray-200 rounded transition"
          >
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}

        <button
          onClick={() => onFolderSelect?.(folder.id, folder.name)}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {isSelected ? (
            <FolderOpen size={18} className="flex-shrink-0" />
          ) : (
            <FolderIcon size={18} className="flex-shrink-0" />
          )}
          <span className="font-medium text-sm truncate">{folder.name}</span>
        </button>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {folder.children!.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              onFolderSelect={onFolderSelect}
              selectedFolderId={selectedFolderId}
            />
          ))}
        </div>
      )}
    </>
  )
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  onFolderSelect,
  selectedFolderId,
  refreshTrigger,
}) => {
  const { user } = useAuth()
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // ✅ UTILISE authUtils.isAdmin() - single source of truth
  const isAdminUser = isAdmin(user)

  useEffect(() => {
    fetchFolderTree()
  }, [refreshTrigger, isAdminUser, user?.department])

  const fetchFolderTree = async () => {
    try {
      setIsLoading(true)
      setError(null)
      // Pour les admins: afficher tous les dossiers
      // Pour les agents: afficher seulement les dossiers du département
      let endpoint = '/folders/folders/tree/'
      
      if (!isAdminUser && user?.department) {
        endpoint = `/folders/folders/tree/?department=${user.department}`
      }
      
      const response = await apiClient.get(endpoint)
      setFolders(response.data || [])
    } catch (err) {
      console.error('Error fetching folder tree:', err)
      setError('Impossible de récupérer la structure des dossiers')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
        <p className="text-error-700 text-sm">{error}</p>
      </div>
    )
  }

  if (!folders || folders.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <p className="text-gray-500 text-sm">Aucun dossier disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {folders.map(folder => (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          level={0}
          onFolderSelect={onFolderSelect}
          selectedFolderId={selectedFolderId}
        />
      ))}
    </div>
  )
}
