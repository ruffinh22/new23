import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Download, Search, RefreshCw, AlertCircle,
  CheckCircle2, Loader, Clock, BarChart3, Trash2, Plus,
  File, Folder
} from 'lucide-react'
import { Layout } from '@/components/common'
import { templateService, Template } from '@/services/templateService'
import { useAuth } from '@/contexts/AuthContext'

export const Templates: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    mostDownloaded: 0,
    categories: 0,
    active: 0,
  })

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await templateService.getTemplates()
      setTemplates(data)

      if (Array.isArray(data) && data.length > 0) {
        const activeCount = data.filter(d => d.is_active).length
        setStats({
          total: data.length,
          active: activeCount,
          mostDownloaded: Math.max(...data.map(t => t.downloads_count), 0),
          categories: new Set(data.map(t => t.template_type)).size,
        })
      } else {
        setStats({ total: 0, active: 0, mostDownloaded: 0, categories: 0 })
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Impossible de charger les modèles')
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      await fetchTemplates()
      setSuccessMessage('Modèles actualisés')
    } catch (err) {
      console.error('Error refreshing templates:', err)
      setError('Erreur lors du rafraîchissement')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDownload = async (template: Template) => {
    try {
      await templateService.downloadTemplateFile(template)
      setSuccessMessage(`${template.name} téléchargé`)
    } catch (err) {
      console.error('Error downloading template:', err)
      setError('Erreur lors du téléchargement')
    }
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce modèle?')) return

    try {
      await templateService.deleteTemplate(templateId)
      setTemplates(templates.filter(t => t.id !== templateId))
      setSuccessMessage('Modèle supprimé avec succès')
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('Erreur lors de la suppression')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !selectedType || template.template_type === selectedType
    return matchesSearch && matchesType
  })

  const isAdmin = user?.role === 'ADMIN'

  const getTypeLabel = (type: string) => {
    const types: { [key: string]: string } = {
      'REPORT': 'Rapport',
      'LETTER': 'Lettre',
      'REQUEST': 'Demande',
      'CONTRACT': 'Contrat',
      'PROCEDURE': 'Procédure',
      'FORM': 'Formulaire',
      'OTHER': 'Autre',
    }
    return types[type] || type
  }

  return (
    <Layout>
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

          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg">
                    <FileText size={28} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-black text-secondary-900">
                      Modèles de Documents
                    </h1>
                    <p className="text-secondary-600 mt-1">Accédez et téléchargez vos modèles</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button
                    onClick={() => navigate('/template-management')}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={20} />
                    Ajouter Modèle
                  </button>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`p-3 hover:bg-primary-100 rounded-lg transition-all ${
                    isRefreshing ? 'animate-spin' : 'transform hover:scale-110'
                  }`}
                  title="Actualiser"
                >
                  <RefreshCw size={20} className="text-primary-600" />
                </button>
              </div>
            </div>

            {/* Stats Grid - Professional Layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-secondary-200 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 rounded-lg">
                    <File size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary-600 font-medium">Total Modèles</p>
                    <p className="text-2xl font-bold text-secondary-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-secondary-200 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-green-100 rounded-lg">
                    <CheckCircle2 size={20} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary-600 font-medium">Modèles Actifs</p>
                    <p className="text-2xl font-bold text-secondary-900">{stats.active}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-secondary-200 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 rounded-lg">
                    <BarChart3 size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary-600 font-medium">Types</p>
                    <p className="text-2xl font-bold text-secondary-900">{stats.categories}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-secondary-200 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-100 rounded-lg">
                    <Download size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary-600 font-medium">Plus Téléchargé</p>
                    <p className="text-2xl font-bold text-secondary-900">{stats.mostDownloaded}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="animate-spin text-primary-600 mb-4" size={40} />
              <p className="text-secondary-600 font-medium">Chargement des modèles...</p>
            </div>
          ) : (
            <>
              {/* Search & Filter Bar - Improved */}
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un modèle par nom ou description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input pl-12 py-3 w-full"
                    />
                  </div>
                  <select 
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="input py-3 px-4 md:w-40"
                  >
                    <option value="">Tous les types</option>
                    {templates.map(t => t.template_type).filter((v, i, a) => a.indexOf(v) === i).map(type => (
                      <option key={type} value={type}>{getTypeLabel(type)}</option>
                    ))}
                  </select>
                  {(searchTerm || selectedType) && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSelectedType('')
                      }}
                      className="px-4 py-3 border border-secondary-300 text-secondary-600 rounded-lg hover:bg-secondary-50 transition font-medium"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>

              {/* Templates Grid - Better Layout */}
              {filteredTemplates.length > 0 ? (
                <div className="space-y-4">
                  {/* List View for better readability */}
                  {filteredTemplates.map((template, index) => (
                    <div 
                      key={template.id}
                      className="bg-white border border-secondary-200 rounded-xl p-5 hover:shadow-md transition-all animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-start justify-between">
                        {/* Left Content */}
                        <div className="flex-1 flex items-start gap-4">
                          {/* Icon */}
                          <div className="p-3 bg-primary-100 rounded-lg flex-shrink-0">
                            <FileText size={24} className="text-primary-600" />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-bold text-secondary-900 text-lg">{template.name}</h3>
                              <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-600 rounded">
                                v{template.version}
                              </span>
                              {template.is_active ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 rounded">
                                  Actif
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                  Inactif
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-secondary-600 mb-3 line-clamp-1">{template.description}</p>

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-4 text-xs text-secondary-600">
                              <div className="flex items-center gap-1">
                                <Folder size={14} />
                                <span className="font-medium">{getTypeLabel(template.template_type)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText size={14} />
                                <span>{template.file_type} • {formatFileSize(template.file_size)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Download size={14} />
                                <span>{template.downloads_count} téléchargement(s)</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock size={14} />
                                <span>{new Date(template.created_at).toLocaleDateString('fr-FR')}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <button
                            onClick={() => handleDownload(template)}
                            className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition font-medium flex items-center gap-2"
                          >
                            <Download size={16} />
                            <span className="hidden sm:inline">Télécharger</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="p-2 hover:bg-error-100 rounded-lg transition text-error-600"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-secondary-200 rounded-xl p-12 text-center">
                  <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <FileText className="w-10 h-10 text-secondary-400" />
                  </div>
                  <h3 className="text-xl font-bold text-secondary-900 mb-2">Aucun modèle disponible</h3>
                  <p className="text-secondary-600 mb-6">
                    {searchTerm || selectedType
                      ? 'Aucun modèle ne correspond à votre recherche'
                      : 'Aucun modèle n\'a été créé pour le moment'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {(searchTerm || selectedType) && (
                      <button
                        onClick={() => {
                          setSearchTerm('')
                          setSelectedType('')
                        }}
                        className="px-6 py-2 border border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition font-medium"
                      >
                        Effacer les filtres
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => navigate('/template-management')}
                        className="px-6 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition font-medium flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        Créer le premier modèle
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
