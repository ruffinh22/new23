import React, { useState, useEffect } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Alert, Input } from '@/components/common'
import { apiClient } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface DocumentType {
  document_type: string
  document_type_display: string
  description: string
  target_folder?: string  // Nom du dossier de destination
  target_folder_id?: number  // ID du dossier de destination
}

interface DocumentUploadProps {
  isOpen?: boolean
  onClose?: () => void
  onUploadSuccess?: (document: any) => void
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ isOpen = false, onClose, onUploadSuccess }) => {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const [documentType, setDocumentType] = useState<string>('')
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      console.log('[DocumentUpload] Modal opened, fetching document types...')
      console.log('[DocumentUpload] User data:', { matricule: user?.matricule, branch_name: user?.branch_name, department_name: user?.department_name, is_staff: user?.is_staff })
      fetchDocumentTypes()
    }
  }, [isOpen, user?.department, user?.department_name, user?.branch_id, user?.is_staff])

  const fetchDocumentTypes = async () => {
    try {
      console.log('[DocumentUpload] Starting fetchDocumentTypes...')
      const isAdmin = user?.is_staff || user?.role === 'ADMIN'
      let endpoint = ''
      
      // Pour les admins, charger TOUS les types de documents
      if (isAdmin) {
        endpoint = '/routing-rules/document-types/all_types/'
        console.log('[DocumentUpload] Admin mode - Loading ALL document types')
      } 
      // Pour les agents, charger les types spécifiques à leur département
      else if (user?.department_name) {
        endpoint = `/routing-rules/document-types/by_department/?department=${user.department_name}`
        console.log(`[DocumentUpload] Agent mode - Loading types for department: ${user.department_name}`)
      }
      // Si pas d'admin et pas de département, charger tous les types
      else {
        endpoint = '/routing-rules/document-types/all_types/'
        console.log('[DocumentUpload] No department assigned - Loading ALL document types')
      }

      console.log(`[DocumentUpload] Fetching from: ${endpoint}`)
      const response = await apiClient.get(endpoint)
      console.log('[DocumentUpload] API Response:', response.data)
      
      let types = response.data.document_types || []
      console.log(`[DocumentUpload] Parsed types (length: ${types.length}):`, types)
      
      // Si aucun type trouvé, afficher SEULEMENT "AUTRE"
      if (types.length === 0) {
        console.warn('[DocumentUpload] No types found - using fallback "AUTRE"')
        types = [{
          document_type: 'AUTRE',
          document_type_display: 'Autre',
          description: 'Type par défaut pour les documents non catégorisés',
          target_folder: 'Defaut'
        }]
      }
      
      console.log(`[DocumentUpload] Setting ${types.length} document types`)
      setDocumentTypes(types)
      setError('') // Clear any previous errors
    } catch (err: any) {
      console.error('[DocumentUpload] ERROR fetching document types:', err)
      console.error('[DocumentUpload] Error response:', err.response?.data || err.message)
      setError(`Erreur lors du chargement des types de documents: ${err.message}`)
      // En cas d'erreur, afficher au moins "AUTRE"
      setDocumentTypes([{
        document_type: 'AUTRE',
        document_type_display: 'Autre',
        description: 'Type par défaut',
        target_folder: 'Defaut'
      }])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('Le fichier doit faire moins de 50MB')
        return
      }
      
      // Vérifier le format du fichier si un type est sélectionné
      if (documentType && documentType !== 'AUTRE') {
        const selectedDocType = documentTypes.find(dt => dt.document_type === documentType)
        if (selectedDocType) {
          // Le backend fera la validation complète du fichier
          console.log(`Fichier sélectionné: ${selectedFile.name}, Type: ${documentType}`)
        }
      }
      
      setFile(selectedFile)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier')
      return
    }
    if (!title.trim()) {
      setError('Veuillez entrer un titre')
      return
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    // Type est obligatoire - jamais "AUTRE"
    formData.append('document_type', documentType)
    formData.append('description', description)

    try {
      const response = await apiClient.post('/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (response.status === 201 || response.status === 200) {
        setSuccess('Document uploadé avec succès!')
        setFile(null)
        setTitle('')
        setDescription('')
        setDocumentType('')

        if (onUploadSuccess) {
          onUploadSuccess(response.data)
        }

        setTimeout(() => {
          setSuccess('')
          onClose?.()
          navigate('/documents', { state: { refreshList: true } })
        }, 1500)
      }
    } catch (err: any) {
      let errorMessage = 'Erreur lors de l\'upload du document'
      if (err.response?.data?.detail) {
        errorMessage = String(err.response.data.detail)
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Uploader un Document</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {error && <Alert type="error" title="Erreur" message={error} onClose={() => setError('')} />}
          {success && <Alert type="success" title="Succès" message={success} onClose={() => setSuccess('')} />}

          <div className="space-y-6">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titre du document *</label>
              <Input placeholder="Ex: Demande de congé janvier 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {/* Filiale (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filiale</label>
              <div className="px-4 py-3 bg-blue-50 rounded-lg text-blue-700 font-medium border border-blue-300">
                🌍 {user?.branch_name || 'Non assignée'}
              </div>
            </div>

            {/* Département (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Département</label>
              <div className="px-4 py-3 bg-emerald-50 rounded-lg text-emerald-700 font-medium border border-emerald-300">
                💼 {user?.department_name || 'Non assigné'}
              </div>
            </div>

            {/* Type de document */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de document *</label>
              {documentTypes.length > 0 ? (
                <>
                  <select 
                    value={documentType} 
                    onChange={(e) => setDocumentType(e.target.value)} 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="">Sélectionner un type de document...</option>
                    {documentTypes.map((type) => (
                      <option key={type.document_type} value={type.document_type}>
                        {type.document_type_display}
                      </option>
                    ))}
                  </select>
                  {documentType && documentTypes.find(t => t.document_type === documentType) && (
                    <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
                      <p className="text-sm text-gray-700 font-medium">📁 Destination:</p>
                      <p className="text-lg font-bold text-blue-700 mt-1">
                        {user?.branch_name} 
                        {' → '} 
                        {user?.department_name}
                        {' → '} 
                        {documentTypes.find(t => t.document_type === documentType)?.document_type_display || 'Défaut'}
                      </p>
                      <p className="text-xs text-gray-600 mt-2">Le fichier sera automatiquement classé dans ce dossier</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
                  <p className="text-sm text-gray-500">Aucun type disponible pour votre département.</p>
                  <p className="text-sm text-gray-600 mt-2 p-3 bg-yellow-50 rounded border border-yellow-200">
                    📁 Fichiers seront classés dans: <strong>{user?.branch_name}/{user?.department_name || 'Défaut'}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
              <textarea 
                placeholder="Détails supplémentaires..." 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600" 
                rows={3} 
              />
            </div>

            {/* Sélection fichier */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add('border-blue-500', 'bg-blue-50')
              }}
              onDragLeave={() => {}}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) {
                  const evt = { target: { files: e.dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>
                  handleFileChange(evt)
                }
              }}
              onClick={() => document.getElementById('file-upload-input')?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer"
            >
              <input 
                type="file" 
                onChange={handleFileChange} 
                id="file-upload-input" 
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.jpg,.jpeg,.png" 
                className="hidden" 
              />
              <Upload size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">Déposez votre fichier ici ou cliquez pour sélectionner</p>
              <Button size="sm" type="button">Choisir un fichier</Button>

              {file && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-center gap-3 border border-blue-200">
                  <FileText size={20} className="text-blue-600" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button size="sm" onClick={() => setFile(null)} variant="secondary">Retirer</Button>
                </div>
              )}
            </div>

            {/* Bouton d'upload */}
            <Button 
              onClick={handleUpload} 
              disabled={isLoading || !file || !title}
              className="w-full"
            >
              {isLoading ? 'Upload en cours...' : 'Uploader le document'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
