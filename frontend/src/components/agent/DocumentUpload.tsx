import React, { useState, useEffect } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Alert, Input } from '@/components/common'
import { apiClient } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdmin } from '../../utils/authUtils'
import { folderService } from '@/services/folderService'
import { Folder } from '@/types/document'

interface DocumentType {
  id: number
  name: string
  display_name: string
  description?: string
  icon?: string
  color?: string
  allowed_formats?: string
  allowed_formats_list?: string[]
  max_file_size_mb?: number
  requires_excel?: boolean
  is_active?: boolean
}

interface DocumentUploadProps {
  isOpen?: boolean
  onClose?: () => void
  onUploadSuccess?: (document: any) => void
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ isOpen = false, onClose, onUploadSuccess }) => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Form fields
  const [title, setTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<string>('')

  // Hierarchy cascade (can be string or number)
  const [pole, setPole] = useState<string | number>('')
  const [filiale, setFiliale] = useState<string | number>('')
  const [service, setService] = useState<string | number>('')

  // Send to recipient (optional)
  const [sendToRecipient, setSendToRecipient] = useState(false)
  const [recipientType, setRecipientType] = useState<'pole' | 'filiale' | 'service' | 'user'>('pole')
  const [recipientPole, setRecipientPole] = useState<string | number>('')
  const [recipientFiliale, setRecipientFiliale] = useState<string | number>('')
  const [recipientService, setRecipientService] = useState<string | number>('')
  const [recipientUser, setRecipientUser] = useState<string>('')

  // Dropdown options
  const [poles, setPoles] = useState<Folder[]>([])
  const [filiales, setFiliales] = useState<Folder[]>([])
  const [services, setServices] = useState<Folder[]>([])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [users, setUsers] = useState<any[]>([])

  // UI states
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  // Validation errors for user guidance
  const [validationIssues, setValidationIssues] = useState<string[]>([])

  // Load poles on mount and pre-fill with user's hierarchy (only for admins)
  useEffect(() => {
    if (isOpen) {
      const issues: string[] = []
      
      console.log('[DocumentUpload] Form opened, user data:', {
        isAdmin: isAdmin(user),
        pole_id: user?.pole_id,
        pole_name: user?.pole_name,
        branch_id: user?.branch_id,
        branch_name: user?.branch_name,
        service_id: user?.service_id,
        service_name: user?.service_name,
      })
      
      // Check user data completeness
      if (!user?.pole_id) {
        issues.push('❌ Pôle non assigné - Contactez votre administrateur')
      }
      if (!user?.branch_id) {
        issues.push('❌ Filiale non assignée - Contactez votre administrateur')
      }
      
      if (issues.length > 0) {
        setValidationIssues(issues)
        setError('❌ Votre profil est incomplet:\n' + issues.join('\n') + '\n\n💡 Solution: \n1. Demandez à votre administrateur de vous assigner un Pôle et une Filiale\n2. Après l\'assignation, déconnectez-vous et reconnectez-vous pour que les modifications soient appliquées')
      } else {
        setValidationIssues([])
        setError('')
      }
      
      loadDocumentTypes()
      // Only load hierarchy dropdowns for admins
      if (isAdmin(user)) {
        loadPoles()
      } else {
        // For non-admins, set values directly from user data
        if (user?.pole_id) {
          console.log('[DocumentUpload] Setting pole to:', user.pole_id)
          setPole(user.pole_id)
        }
        if (user?.branch_id) {
          console.log('[DocumentUpload] Setting filiale to:', user.branch_id)
          setFiliale(user.branch_id)
        }
        // Service is optional - use if available, otherwise use branch as fallback
        if (user?.service_id) {
          console.log('[DocumentUpload] Setting service:', user.service_id)
          setService(user.service_id)
        } else if (user?.branch_id) {
          console.log('[DocumentUpload] No service assigned, using branch as fallback:', user.branch_id)
          setService(user.branch_id)
        }
      }
    }
  }, [isOpen, user])

  // Pre-fill pole and load filiales for admins
  useEffect(() => {
    if (isAdmin(user) && poles.length > 0 && user?.pole_id) {
      console.log(`[DocumentUpload] Pre-filling pole with user's pole: ${user.pole_id}`)
      setPole(user.pole_id)
      loadFiliales(user.pole_id)
    }
  }, [poles, user?.pole_id])

  // Pre-fill filiale and load services for admins
  useEffect(() => {
    if (isAdmin(user) && filiales.length > 0 && user?.branch_id && !filiale) {
      console.log(`[DocumentUpload] Pre-filling filiale with user's branch: ${user.branch_id}`)
      setFiliale(user.branch_id)
      loadServices(user.branch_id)
    }
  }, [filiales, user?.branch_id])

  // Pre-fill service for admins
  useEffect(() => {
    if (isAdmin(user) && services.length > 0 && !service) {
      if (user?.service_id) {
        console.log(`[DocumentUpload] Pre-filling service with user's service: ${user.service_id}`)
        setService(user.service_id)
      }
    }
  }, [services, user?.service_id])

  // Load poles and users when send to recipient mode is enabled
  useEffect(() => {
    if (sendToRecipient && poles.length === 0) {
      console.log('[DocumentUpload] Send to recipient enabled, loading poles...')
      loadPoles()
    }
    if (sendToRecipient && users.length === 0) {
      console.log('[DocumentUpload] Send to recipient enabled, loading users...')
      loadUsers()
    }
  }, [sendToRecipient])

  const loadPoles = async () => {
    try {
      console.log('[DocumentUpload] Loading poles...')
      const polesData = await folderService.getPoles()
      // Trier alphabétiquement
      polesData.sort((a: any, b: any) => a.name.localeCompare(b.name))
      setPoles(polesData)
      console.log(`[DocumentUpload] Loaded ${polesData.length} poles`)
    } catch (err: any) {
      console.error('[DocumentUpload] Error loading poles:', err)
      setError('Erreur lors du chargement des pôles')
    }
  }

  const loadFiliales = async (poleId: string | number) => {
    try {
      console.log(`[DocumentUpload] Loading filiales for pole ${poleId}...`)
      const filialesData = await folderService.getFiliales(poleId)
      // Trier alphabétiquement
      filialesData.sort((a: any, b: any) => a.name.localeCompare(b.name))
      setFiliales(filialesData)
      console.log(`[DocumentUpload] Loaded ${filialesData.length} filiales`)
    } catch (err: any) {
      console.error('[DocumentUpload] Error loading filiales:', err)
      setError('Erreur lors du chargement des filiales')
    }
  }

  const loadServices = async (filialeId: string | number) => {
    try {
      console.log(`[DocumentUpload] Loading services for filiale ${filialeId}...`)
      const servicesData = await folderService.getServices(filialeId)
      // Trier alphabétiquement
      servicesData.sort((a: any, b: any) => a.name.localeCompare(b.name))
      setServices(servicesData)
      console.log(`[DocumentUpload] Loaded ${servicesData.length} services`)
    } catch (err: any) {
      console.error('[DocumentUpload] Error loading services:', err)
      setError('Erreur lors du chargement des services')
    }
  }

  const loadDocumentTypes = async () => {
    try {
      console.log('[DocumentUpload] Loading document types...')
      
      // Load from the new documentType endpoint
      const response = await apiClient.get('/documents/types/')
      let types: DocumentType[] = []
      
      if (Array.isArray(response.data)) {
        types = response.data.map((docType: any) => ({
          id: docType.id,
          name: docType.name,
          display_name: docType.display_name,
          description: docType.description || '',
          icon: docType.icon || 'file',
          color: docType.color || '#6B7280'
        }))
      } else if (response.data?.results) {
        types = response.data.results.map((docType: any) => ({
          id: docType.id,
          name: docType.name,
          display_name: docType.display_name,
          description: docType.description || '',
          icon: docType.icon || 'file',
          color: docType.color || '#6B7280'
        }))
      }
      
      if (types.length === 0) {
        types = [{
          id: 0,
          name: 'AUTRE',
          display_name: 'Autre',
          description: 'Type par défaut'
        }]
      }
      
      setDocumentTypes(types)
      console.log(`[DocumentUpload] Loaded ${types.length} document types`)
    } catch (err: any) {
      console.error('[DocumentUpload] Error loading document types:', err)
      // Fallback to default type if API fails
      setDocumentTypes([{
        id: 0,
        name: 'AUTRE',
        display_name: 'Autre',
        description: 'Type par défaut'
      }])
      setError('Erreur lors du chargement des types de documents')
    }
  }

  const loadUsers = async () => {
    try {
      console.log('[DocumentUpload] Loading users...')
      const response = await apiClient.get('/auth/users/')
      const usersData = Array.isArray(response.data) ? response.data : response.data?.results || []
      
      // Filtrer pour exclure l'utilisateur courant
      const filteredUsers = usersData.filter((u: any) => u.id !== user?.id)
      
      // Trier alphabétiquement par nom
      filteredUsers.sort((a: any, b: any) => {
        const nameA = `${a.first_name} ${a.last_name}`.trim()
        const nameB = `${b.first_name} ${b.last_name}`.trim()
        return nameA.localeCompare(nameB)
      })
      
      setUsers(filteredUsers)
      console.log(`[DocumentUpload] Loaded ${filteredUsers.length} users`)
    } catch (err: any) {
      console.error('[DocumentUpload] Error loading users:', err)
      setError('Erreur lors du chargement des utilisateurs')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('Le fichier doit faire moins de 50MB')
        return
      }
      setFile(selectedFile)
      setError('')
    }
  }

  const handleUpload = async () => {
    // Check profile completeness first
    if (validationIssues.length > 0) {
      setError('❌ Impossible de continuer:\n' + validationIssues.join('\n\n') + '\n\nVeuillez contacter votre administrateur.')
      return
    }
    
    if (!file) {
      setError('❌ Veuillez sélectionner un fichier')
      return
    }
    if (!title.trim()) {
      setError('❌ Veuillez entrer un titre pour le document')
      return
    }
    if (!pole) {
      setError('❌ Pôle manquant - Veuillez sélectionner un pôle')
      return
    }
    if (!filiale) {
      setError('❌ Filiale manquante - Veuillez sélectionner une filiale')
      return
    }
    if (!documentType) {
      setError('❌ Type de document manquant - Veuillez sélectionner un type')
      return
    }

    // Validate recipient if sending to recipient
    if (sendToRecipient) {
      if (recipientType === 'pole' && !recipientPole) {
        setError('❌ Veuillez sélectionner un pôle destinataire')
        return
      }
      if (recipientType === 'filiale' && (!recipientPole || !recipientFiliale)) {
        setError('❌ Veuillez sélectionner une filiale destinataire')
        return
      }
      if (recipientType === 'service' && (!recipientPole || !recipientFiliale || !recipientService)) {
        setError('❌ Veuillez sélectionner un service destinataire')
        return
      }
      if (recipientType === 'user' && !recipientUser) {
        setError('❌ Veuillez sélectionner un utilisateur destinataire')
        return
      }
    }

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('document_type', documentType)
    formData.append('description', description)
    formData.append('agent_id', String(user?.id || ''))
    
    // DEBUG: Log all form data
    console.log('[DocumentUpload] FormData values:')
    console.log('  - title:', title)
    console.log('  - document_type:', documentType, typeof documentType)
    console.log('  - file:', file?.name)
    console.log('  - agent_id:', user?.id)
    
    // Service is optional - only add if provided (but NOT when sending to recipient)
    if (!sendToRecipient) {
      if (service) {
        formData.append('folder_id', String(service))
        console.log('  - folder_id (service):', service)
      } else {
        // Use filiale as fallback if service not assigned
        formData.append('folder_id', String(filiale))
        console.log('  - folder_id (filiale):', filiale)
      }
    } else {
      console.log('  - sendToRecipient: true (folder_id will be determined by recipient)')
    }

    // Add recipient info if sending to recipient
    if (sendToRecipient) {
      formData.append('send_to_recipient', 'true')
      formData.append('recipient_type', recipientType)
      
      if (recipientType === 'pole') {
        formData.append('recipient_pole_id', String(recipientPole))
        console.log('  - recipient_pole_id:', recipientPole)
      } else if (recipientType === 'filiale') {
        formData.append('recipient_filiale_id', String(recipientFiliale))
        console.log('  - recipient_filiale_id:', recipientFiliale)
      } else if (recipientType === 'service') {
        formData.append('recipient_service_id', String(recipientService))
        console.log('  - recipient_service_id:', recipientService)
      } else if (recipientType === 'user') {
        formData.append('recipient_user_id', String(recipientUser))
        console.log('  - recipient_user_id:', recipientUser)
      }
    }

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
        setPole('')
        setFiliale('')
        setService('')
        setSendToRecipient(false)
        setRecipientType('pole')
        setRecipientPole('')
        setRecipientFiliale('')
        setRecipientService('')
        setRecipientUser('')

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
      console.error('[DocumentUpload] Upload error:', err)
      let errorMessage = '❌ Erreur lors de l\'upload du document'
      
      // Log response data for debugging
      if (err.response?.data) {
        console.error('[DocumentUpload] Response error data:', JSON.stringify(err.response.data, null, 2))
      }
      
      // Parse error details - handle all possible error fields
      if (err.response?.data?.detail) {
        errorMessage = '❌ ' + String(err.response.data.detail)
      } else if (err.response?.data?.document_type) {
        errorMessage = '❌ Erreur type document: ' + String(err.response.data.document_type[0])
      } else if (err.response?.data?.folder_id) {
        errorMessage = '❌ Erreur dossier: ' + String(err.response.data.folder_id[0])
      } else if (err.response?.data?.file) {
        errorMessage = '❌ Erreur fichier: ' + String(err.response.data.file[0])
      } else if (err.response?.data?.title) {
        errorMessage = '❌ Erreur titre: ' + String(err.response.data.title[0])
      } else if (err.response?.status === 400) {
        // Get all errors from response
        const allErrors = Object.entries(err.response.data || {})
          .map(([key, value]: [string, any]) => `${key}: ${value?.[0] || value}`)
          .join(', ')
        errorMessage = allErrors ? `❌ ${allErrors}` : '❌ Données invalides - Veuillez vérifier vos saisies'
      } else if (err.response?.status === 403) {
        errorMessage = '❌ Accès refusé - Vous n\'avez pas la permission'
      } else if (err.response?.status === 404) {
        errorMessage = '❌ Ressource non trouvée - Le dossier n\'existe pas'
      } else if (err.message) {
        errorMessage = '❌ ' + err.message
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
          
          {validationIssues.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <h3 className="font-bold text-red-800 mb-2">ℹ️ Informations de votre profil:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                {validationIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
              <p className="text-xs text-red-600 mt-3">
                Si vous pensez que c'est une erreur, veuillez contacter votre administrateur.
              </p>
            </div>
          )}



          <div className="space-y-6">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Titre du document *</label>
              <Input placeholder="Ex: Demande de congé janvier 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
              <p className={`text-xs mt-2 ${title.trim().length < 3 ? 'text-red-600' : 'text-gray-500'}`}>
                {title.trim().length < 3 ? '⚠️ Minimum 3 caractères requis' : '✓ Titre valide'}
              </p>
            </div>

            {/* Send to Recipient Toggle */}
            <div className="p-4 bg-indigo-50 border-2 border-indigo-300 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-indigo-800 mb-1">📤 Envoyer vers un destinataire</h3>
                  <p className="text-sm text-indigo-700">
                    Activez cette option pour envoyer le document vers un pôle, filiale ou service spécifique
                  </p>
                </div>
                <button
                  onClick={() => setSendToRecipient(!sendToRecipient)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    sendToRecipient ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      sendToRecipient ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Recipient Selection */}
              {sendToRecipient && (
                <div className="mt-4 pt-4 border-t-2 border-indigo-200 space-y-4">
                  {/* Recipient Type */}
                  <div>
                    <label className="block text-sm font-medium text-indigo-800 mb-2">Type de destinataire</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['pole', 'filiale', 'service', 'user'].map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setRecipientType(type as any)
                            setRecipientPole('')
                            setRecipientFiliale('')
                            setRecipientService('')
                            setRecipientUser('')
                            if (type === 'user' && users.length === 0) {
                              loadUsers()
                            }
                          }}
                          className={`p-3 rounded-lg font-medium text-sm transition-all ${
                            recipientType === type
                              ? 'bg-indigo-600 text-white border-2 border-indigo-600'
                              : 'bg-white text-indigo-700 border-2 border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          {type === 'pole' ? '🌍 Pôle' : type === 'filiale' ? '🏢 Filiale' : type === 'service' ? '📂 Service' : '👤 Utilisateur'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipient Selection based on type */}
                  {recipientType === 'pole' && (
                    <div>
                      <label className="block text-sm font-medium text-indigo-800 mb-2">Pôle destinataire</label>
                      <select
                        value={recipientPole}
                        onChange={(e) => setRecipientPole(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
                      >
                        <option value="">Sélectionner un pôle...</option>
                        {poles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {recipientType === 'filiale' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-indigo-800 mb-2">Pôle de la filiale</label>
                        <select
                          value={recipientPole}
                          onChange={(e) => {
                            setRecipientPole(e.target.value)
                            setFiliales([])
                            setRecipientFiliale('')
                            if (e.target.value) {
                              // Load filiales for this pole
                              folderService.getFiliales(Number(e.target.value)).then(children => {
                                setFiliales(children)
                              })
                            }
                          }}
                          className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
                        >
                          <option value="">Sélectionner un pôle...</option>
                          {poles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-indigo-800 mb-2">Filiale destinataire</label>
                        <select
                          value={recipientFiliale}
                          onChange={(e) => setRecipientFiliale(e.target.value)}
                          disabled={!recipientPole}
                          className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Sélectionner une filiale...</option>
                          {filiales.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {recipientType === 'service' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-indigo-800 mb-2">Pôle du service</label>
                        <select
                          value={recipientPole}
                          onChange={(e) => {
                            setRecipientPole(e.target.value)
                            setFiliales([])
                            setRecipientFiliale('')
                            setServices([])
                            setRecipientService('')
                            if (e.target.value) {
                              folderService.getFiliales(Number(e.target.value)).then(children => {
                                setFiliales(children)
                              })
                            }
                          }}
                          className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
                        >
                          <option value="">Sélectionner un pôle...</option>
                          {poles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-indigo-800 mb-2">Filiale du service</label>
                        <select
                          value={recipientFiliale}
                          onChange={(e) => {
                            setRecipientFiliale(e.target.value)
                            setServices([])
                            setRecipientService('')
                            if (e.target.value) {
                              folderService.getServices(Number(e.target.value)).then((children: any) => {
                                setServices(children)
                              })
                            }
                          }}
                          disabled={!recipientPole}
                          className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Sélectionner une filiale...</option>
                          {filiales.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-indigo-800 mb-2">Service destinataire</label>
                        <select
                          value={recipientService}
                          onChange={(e) => setRecipientService(e.target.value)}
                          disabled={!recipientFiliale}
                          className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Sélectionner un service...</option>
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {recipientType === 'user' && (
                    <div>
                      <label className="block text-sm font-medium text-indigo-800 mb-2">Utilisateur destinataire</label>
                      <select
                        value={recipientUser}
                        onChange={(e) => setRecipientUser(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
                      >
                        <option value="">Sélectionner un utilisateur...</option>
                        {users.map((u: any) => (
                          <option key={u.id} value={u.id}>
                            {u.first_name} {u.last_name} ({u.email})
                          </option>
                        ))}
                      </select>
                      {users.length === 0 && recipientType === 'user' && (
                        <p className="text-xs text-indigo-600 mt-2">Chargement des utilisateurs...</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pôle - Masqué si envoi à destinataire */}
            {!sendToRecipient && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pôle *</label>
              {isAdmin(user) ? (
                <select
                  value={pole}
                  onChange={(e) => setPole(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">Sélectionner un pôle...</option>
                  {poles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={pole}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value={pole}>{user?.pole_name || 'Non assigné'}</option>
                </select>
              )}
            </div>
            )}

            {/* Filiale - Masqué si envoi à destinataire */}
            {!sendToRecipient && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filiale *</label>
              {isAdmin(user) ? (
                <select
                  value={filiale}
                  onChange={(e) => setFiliale(e.target.value)}
                  disabled={!pole}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{pole ? 'Sélectionner une filiale...' : 'Sélectionnez un pôle d\'abord'}</option>
                  {filiales.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={filiale}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value={filiale}>{user?.branch_name || 'Non assignée'}</option>
                </select>
              )}
            </div>
            )}

            {/* Service - Masqué si envoi à destinataire */}
            {!sendToRecipient && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service (optionnel)</label>
              {isAdmin(user) ? (
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  disabled={!filiale}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">{filiale ? 'Sélectionner un service...' : 'Sélectionnez une filiale d\'abord'}</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={service}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 disabled:cursor-not-allowed"
                >
                  <option value={service}>{user?.service_name || 'Non assigné'}</option>
                </select>
              )}
            </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de document *</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="">Sélectionner un type de document...</option>
                {documentTypes.map((type) => (
                  <option key={`type-${type.id}`} value={String(type.id)}>
                    {type.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fichier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fichier *</label>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('border-blue-500', 'bg-blue-50')
                }}
                onDragLeave={() => {}}
                onDrop={(e) => {
                  e.preventDefault()
                  const droppedFile = e.dataTransfer.files?.[0]
                  if (droppedFile) {
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

            {/* Upload Button */}
            <Button
              onClick={() => {
                console.log('[DocumentUpload] Button clicked, checking conditions:', {
                  isLoading,
                  validationIssues: validationIssues.length,
                  file: !!file,
                  title: !!title.trim(),
                  titleLength: title.trim().length,
                  pole,
                  filiale,
                  documentType,
                })
                handleUpload()
              }}
              disabled={isLoading || validationIssues.length > 0 || !file || title.trim().length < 3 || !pole || !filiale || !documentType}
              className="w-full"
              title={validationIssues.length > 0 ? 'Profil incomplet - Contactez un administrateur' : !file ? 'Veuillez sélectionner un fichier' : title.trim().length < 3 ? 'Le titre doit faire au moins 3 caractères' : !documentType ? 'Veuillez sélectionner un type' : ''}
            >
              {isLoading ? 'Upload en cours...' : 'Uploader le document'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
