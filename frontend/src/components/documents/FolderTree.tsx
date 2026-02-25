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
          {folder.children!.map((child, index) => (
            <FolderTreeItem
              key={`${folder.id}-child-${index}`}
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
  }, [refreshTrigger, isAdminUser, user?.id, user?.branch])

  const fetchFolderTree = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Toujours charger les pôles racine (roots) pour tous les utilisateurs
      const response = await apiClient.get('/folders/root/')
      let rootFolders = response.data || []
      
      // Pour les agents non-admin, reconstruire l'arborescence avec leurs restrictions
      if (!isAdminUser && user?.branch) {
        // Filtrer pour afficher seulement la branche de l'agent
        rootFolders = rootFolders.filter((folder: any) => folder.id === user.branch)
      }
      
      // Ajouter le dossier "Received" en haut de la liste pour tous les utilisateurs
      if (user?.id) {
        try {
          const receivedResponse = await apiClient.get('/folders/get_received_folder/')
          if (receivedResponse.data?.folder) {
            const receivedFolder: FolderNode = {
              id: receivedResponse.data.folder.id,
              name: `📥 ${receivedResponse.data.folder.name}`,
              description: 'Documents reçus',
              children: undefined
            }
            rootFolders = [receivedFolder, ...rootFolders]
          }
        } catch (err) {
          console.warn('Could not fetch received folder:', err)
        }
      }
      
      setFolders(rootFolders)
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
      {folders.map((folder, index) => (
        <FolderTreeItem
          key={`root-${index}-${folder.id}`}
          folder={folder}
          level={0}
          onFolderSelect={onFolderSelect}
          selectedFolderId={selectedFolderId}
        />
      ))}
    </div>
  )
}
