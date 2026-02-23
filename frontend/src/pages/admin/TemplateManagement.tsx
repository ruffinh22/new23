import React, { useState, useEffect } from 'react'
import {
  FileUp, Trash2, Plus, Search, Filter,
  AlertCircle, CheckCircle2, Loader,  Lock, Globe
} from 'lucide-react'
import { Layout } from '@/components/common'
import { apiClient } from '@/services/api'

interface Template {
  id: number
  name: string
  description: string
  template_type: string
  type_display: string
  visibility: string
  visibility_display: string
  file_type: string
  file_size: number
  downloads_count: number
  created_by_name: string
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
  departments: number[]
  allowed_users: number[]
}

interface Department {
  id: number
  name: string
  code: string
}

const TEMPLATE_TYPES = [
  { value: 'REPORT', label: 'Rapport' },
  { value: 'LETTER', label: 'Lettre' },
  { value: 'REQUEST', label: 'Demande' },
  { value: 'CONTRACT', label: 'Contrat' },
  { value: 'PROCEDURE', label: 'Procédure' },
  { value: 'FORM', label: 'Formulaire' },
  { value: 'OTHER', label: 'Autre' },
]

const VISIBILITY_OPTIONS = [
  { value: 'ALL', label: 'Tous les agents', icon: Globe },
  { value: 'DEPARTMENT', label: 'Par département', icon: Filter },
  { value: 'CUSTOM', label: 'Agents sélectionnés', icon: Lock },
]

export const TemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  
  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    template_type: 'OTHER',
    visibility: 'DEPARTMENT',
    departments: [] as number[],
    file: null as File | null,
  })
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    fetchTemplates()
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiClient.get('/documents/templates/')
      const data = Array.isArray(response.data) ? response.data : response.data?.results || []
      // Log template data for debugging
      console.log('📦 Templates fetched:', data)
      if (data.length > 0) {
        console.log('First template:', data[0])
      }
      setTemplates(data)
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Impossible de charger les modèles')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get('/auth/departments/')
      const depts = Array.isArray(response.data) ? response.data : response.data?.results || []
      console.log('🏢 Departments fetched:', depts)
      if (depts.length === 0) {
        console.warn('⚠️ No departments found in response')
      }
      setDepartments(depts)
    } catch (err: any) {
      console.error('❌ Error fetching departments:', err)
      console.error('Response status:', err.response?.status)
      console.error('Response data:', err.response?.data)
      setError('Impossible de charger les départements')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setUploadData({
        ...uploadData,
        file: e.target.files[0],
      })
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!uploadData.file) {
      setError('Veuillez sélectionner un fichier')
      return
    }

    if (!uploadData.name.trim()) {
      setError('Le nom du modèle est requis')
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('name', uploadData.name)
      formData.append('description', uploadData.description)
      formData.append('template_type', uploadData.template_type)
      formData.append('visibility', uploadData.visibility)
      formData.append('file', uploadData.file)

      if (uploadData.visibility === 'DEPARTMENT') {
        uploadData.departments.forEach(deptId => {
          formData.append('departments', deptId.toString())
        })
      }

      const response = await apiClient.post('/documents/templates/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setTemplates([response.data, ...templates])
      setSuccess('Modèle uploadé avec succès')
      setShowUploadModal(false)
      setUploadData({
        name: '',
        description: '',
        template_type: 'OTHER',
        visibility: 'ALL',
        departments: [],
        file: null,
      })
    } catch (err: any) {
      console.error('Error uploading template:', err)
      setError(err.response?.data?.message || 'Erreur lors de l\'upload')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!templateId) {
      setError('Erreur: ID du modèle non trouvé')
      return
    }
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle?')) return

    try {
      await apiClient.delete(`/documents/templates/${templateId}/`)
      setTemplates(templates.filter(t => t.id !== templateId))
      setSuccess('Modèle supprimé avec succès')
    } catch (err: any) {
      console.error('Error deleting template:', err)
      setError(err.response?.data?.message || 'Erreur lors de la suppression')
    }
  }

  const handleToggleActive = async (template: Template) => {
    if (!template.id) {
      setError('Erreur: ID du modèle non trouvé')
      return
    }
    try {
      const updated = { ...template, is_active: !template.is_active }
      console.log(`🔄 Toggling template ${template.id}: ${!template.is_active}`)
      await apiClient.patch(`/documents/templates/${template.id}/`, {
        is_active: !template.is_active,
      })
      setTemplates(templates.map(t => (t.id === template.id ? updated : t)))
      setSuccess(`Modèle ${updated.is_active ? 'activé' : 'désactivé'}`)
    } catch (err: any) {
      console.error('Error toggling template:', err)
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour')
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'ALL' || 
                         (filter === 'ACTIVE' && template.is_active) ||
                         (filter === 'INACTIVE' && !template.is_active)
    return matchesSearch && matchesFilter
  })

  const getVisibilityIcon = (visibility: string) => {
    const option = VISIBILITY_OPTIONS.find(o => o.value === visibility)
    const Icon = option?.icon || Globe
    return <Icon size={16} />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-primary-600">Gestion des Modèles</h1>
              <p className="text-secondary-600 mt-2">Créez et distribuez des modèles aux agents</p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={20} />
              Nouveau Modèle
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-error-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-error-700 font-medium">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-error-600">×</button>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="text-success-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-success-700 font-medium">{success}</p>
            </div>
          )}

          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" />
              <input
                type="text"
                placeholder="Rechercher un modèle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-12 w-full"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="input px-4"
            >
              <option value="ALL">Tous</option>
              <option value="ACTIVE">Actifs</option>
              <option value="INACTIVE">Inactifs</option>
            </select>
          </div>

          {/* Templates List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="animate-spin text-primary-600 mr-3" size={32} />
              <span className="text-secondary-600">Chargement...</span>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="card p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-secondary-900">{template.name}</h3>
                        <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-600 rounded">
                          v{template.version}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-500">{template.type_display}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getVisibilityIcon(template.visibility)}
                      <span className="text-xs text-secondary-500">{template.visibility_display}</span>
                    </div>
                  </div>

                  <p className="text-sm text-secondary-600 mb-3 line-clamp-2">{template.description}</p>

                  <div className="grid grid-cols-2 gap-2 py-3 mb-3 border-y border-secondary-100 text-xs">
                    <div>
                      <p className="text-secondary-500 font-medium">Type</p>
                      <p className="text-secondary-900 font-bold">{template.file_type}</p>
                    </div>
                    <div>
                      <p className="text-secondary-500 font-medium">Taille</p>
                      <p className="text-secondary-900 font-bold">{formatFileSize(template.file_size)}</p>
                    </div>
                    <div>
                      <p className="text-secondary-500 font-medium">Téléchargements</p>
                      <p className="text-secondary-900 font-bold">{template.downloads_count}</p>
                    </div>
                    <div>
                      <p className="text-secondary-500 font-medium">Créateur</p>
                      <p className="text-secondary-900 font-bold text-xs">{template.created_by_name}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(template)}
                      className={`flex-1 px-3 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                        template.is_active
                          ? 'bg-success-100 text-success-600 hover:bg-success-200'
                          : 'bg-warning-100 text-warning-600 hover:bg-warning-200'
                      }`}
                    >
                      {template.is_active ? '✓ Actif' : '⊘ Inactif'}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="px-3 py-2 border border-error-200 text-error-600 rounded-lg hover:bg-error-50 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-16 text-center">
              <FileUp className="w-12 h-12 text-secondary-400 mx-auto mb-3" />
              <p className="text-secondary-600 mb-4">Aucun modèle trouvé</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary"
              >
                <Plus size={16} className="mr-2" />
                Créer un modèle
              </button>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-secondary-900 mb-4">Nouveau Modèle</h2>

              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Nom du modèle *
                  </label>
                  <input
                    type="text"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                    className="input w-full"
                    placeholder="Ex: Rapport Mensuel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    className="input w-full resize-none" rows={3}
                    placeholder="Description du modèle..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Type de modèle
                  </label>
                  <select
                    value={uploadData.template_type}
                    onChange={(e) => setUploadData({ ...uploadData, template_type: e.target.value })}
                    className="input w-full"
                  >
                    {TEMPLATE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Visibilité
                  </label>
                  <select
                    value={uploadData.visibility}
                    onChange={(e) => setUploadData({ ...uploadData, visibility: e.target.value })}
                    className="input w-full"
                  >
                    {VISIBILITY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {uploadData.visibility === 'DEPARTMENT' && (
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Départements
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {departments.map(dept => (
                        <label key={dept.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={uploadData.departments.includes(dept.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUploadData({
                                  ...uploadData,
                                  departments: [...uploadData.departments, dept.id],
                                })
                              } else {
                                setUploadData({
                                  ...uploadData,
                                  departments: uploadData.departments.filter(id => id !== dept.id),
                                })
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-secondary-700">{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Fichier *
                  </label>
                  <div className="relative border-2 border-dashed border-secondary-300 rounded-lg p-4 hover:border-primary-400 transition cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.docx,.xlsx,.pptx,.doc,.xls,.ppt"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="text-center pointer-events-none">
                      <FileUp className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-secondary-700">
                        {uploadData.file?.name || 'Cliquez pour sélectionner'}
                      </p>
                      <p className="text-xs text-secondary-500 mt-1">
                        PDF, DOCX, XLSX, PPTX (max 10MB)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader size={16} className="inline animate-spin mr-2" />
                        Upload...
                      </>
                    ) : (
                      'Créer'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
