import React, { useState, useEffect } from 'react'
import { X, Users, FolderOpen, Send, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/common'
import { apiClient } from '@/services/api'

interface User {
  id: string
  matricule: string
  email: string
  first_name: string
  last_name: string
}

interface Folder {
  id: number
  name: string
  folder_type: 'pole' | 'filiale' | 'service' | 'sub_service'
}

interface ShareDocumentModalProps {
  isOpen: boolean
  documentId: string
  documentTitle: string
  onClose: () => void
  onSuccess?: () => void
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  isOpen,
  documentId,
  documentTitle,
  onClose,
  onSuccess
}) => {
  const [shareType, setShareType] = useState<'user' | 'folder'>('user')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [permission, setPermission] = useState<'VIEW' | 'COMMENT' | 'DOWNLOAD'>('VIEW')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load available recipients on modal open
  useEffect(() => {
    if (isOpen) {
      loadRecipients()
    }
  }, [isOpen])

  const loadRecipients = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/documents/shares/available_recipients/')
      setUsers(response.data.users || [])
      setFolders(response.data.folders || [])
      setError(null)
    } catch (err: any) {
      console.error('Error loading recipients:', err)
      setError('Impossible de charger les destinataires')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    if (!documentId) return

    // Validate selection
    if (shareType === 'user' && !selectedUser) {
      setError('Veuillez sélectionner un utilisateur')
      return
    }

    if (shareType === 'folder' && !selectedFolder) {
      setError('Veuillez sélectionner un dossier')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const payload: any = {
        document: documentId,
        share_type: shareType === 'user' ? 'USER' : 'FOLDER',
        permission: permission,
        message: message || undefined
      }

      if (shareType === 'user') {
        payload.shared_with_matricule = selectedUser
      } else {
        payload.shared_with_folder_id = parseInt(selectedFolder)
      }

      await apiClient.post('/documents/shares/', payload)

      setSuccess(`Document partagé avec succès! ✅`)
      
      // Reset form
      setSelectedUser('')
      setSelectedFolder('')
      setMessage('')
      setPermission('VIEW')

      // Call success callback after short delay
      setTimeout(() => {
        onClose()
        onSuccess?.()
      }, 1500)
    } catch (err: any) {
      console.error('Error sharing document:', err)
      const errorMsg = err.response?.data?.detail || 
                       err.response?.data?.shared_with_matricule?.[0] ||
                       'Erreur lors du partage du document'
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const getRecipientLabel = () => {
    if (shareType === 'user') {
      const user = users.find(u => u.matricule === selectedUser)
      return user ? `${user.first_name} ${user.last_name} (${user.matricule})` : 'Sélectionner un utilisateur'
    } else {
      const folder = folders.find(f => f.id.toString() === selectedFolder)
      return folder ? `${folder.name} (${folder.folder_type})` : 'Sélectionner un dossier'
    }
  }

  const typeLabels: Record<string, string> = {
    'pole': '🌍 Pôle',
    'filiale': '🏢 Filiale',
    'service': '📂 Service',
    'sub_service': '📋 Sous-service'
  }

  return (
    <Modal
      isOpen={isOpen}
      title={`Partager: ${documentTitle}`}
      onClose={onClose}
    >
      <div className="space-y-6">
        {/* Share Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Partager avec
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShareType('user')
                setSelectedUser('')
              }}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                shareType === 'user'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Users size={20} className="mx-auto mb-1" />
              <div className="text-sm font-medium">Utilisateur</div>
            </button>
            <button
              onClick={() => {
                setShareType('folder')
                setSelectedFolder('')
              }}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                shareType === 'folder'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <FolderOpen size={20} className="mx-auto mb-1" />
              <div className="text-sm font-medium">Dossier</div>
            </button>
          </div>
        </div>

        {/* User/Folder Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            {shareType === 'user' ? 'Utilisateur' : 'Dossier'} <span className="text-red-500">*</span>
          </label>
          <select
            value={shareType === 'user' ? selectedUser : selectedFolder}
            onChange={(e) => {
              if (shareType === 'user') {
                setSelectedUser(e.target.value)
              } else {
                setSelectedFolder(e.target.value)
              }
              setError(null)
            }}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
            disabled={isLoading}
          >
            <option value="">
              {shareType === 'user' ? 'Sélectionner un utilisateur' : 'Sélectionner un dossier'}
            </option>
            {shareType === 'user' ? (
              users.map(user => (
                <option key={user.id} value={user.matricule}>
                  {user.first_name} {user.last_name} ({user.matricule})
                </option>
              ))
            ) : (
              folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {typeLabels[folder.folder_type]} {folder.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Permission Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Permissions
          </label>
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as any)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
            disabled={isLoading}
          >
            <option value="VIEW">📖 Lecture seule</option>
            <option value="COMMENT">💬 Lecture + Commentaires</option>
            <option value="DOWNLOAD">⬇️ Téléchargement</option>
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Message (optionnel)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ajouter un message personnel au partage..."
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            rows={3}
            disabled={isLoading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleShare}
            disabled={isLoading || (!selectedUser && !selectedFolder)}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Partage en cours...
              </>
            ) : (
              <>
                <Send size={18} />
                Partager
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 btn-secondary"
          >
            Annuler
          </button>
        </div>
      </div>
    </Modal>
  )
}
