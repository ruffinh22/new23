import React, { useState, useEffect } from 'react'
import { 
  RefreshCw, Save, AlertCircle, CheckCircle2,
  Loader, FileText, BarChart3, Edit2, X, ChevronDown, ChevronUp,
  Lock, FileCode, Maximize2, Move, Plus
} from 'lucide-react'
import { Layout } from '@/components/common'
import { apiClient } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface FileTypeConfig {
  id: string
  file_type: string
  file_type_display: string
  display_name: string
  description: string
  max_file_size_mb: number
  min_file_size_kb: number
  max_rows: number | null
  max_columns: number | null
  max_sheets: number | null
  max_pages: number | null
  max_width_px: number | null
  max_height_px: number | null
  min_width_px: number | null
  min_height_px: number | null
  require_macros_disabled: boolean
  require_no_password: boolean
  allow_external_links: boolean
  require_utf8_encoding: boolean
  allowed_sheets: string[]
  forbidden_columns: string[]
  required_columns: string[]
  is_enabled: boolean
  is_auto_validated: boolean
}

export const FileTypeConfiguration: React.FC = () => {
  const { user } = useAuth()
  const [configs, setConfigs] = useState<FileTypeConfig[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<FileTypeConfig>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [newConfigData, setNewConfigData] = useState<Partial<FileTypeConfig>>({
    file_type: '',
    display_name: '',
    max_file_size_mb: 50,
    is_enabled: true,
    is_auto_validated: true,
  })
  const [stats, setStats] = useState({
    total_types: 0,
    enabled_types: 0,
    disabled_types: 0,
    auto_validated_types: 0,
  })

  const isAdmin = user?.is_staff

  const fetchConfigs = async () => {
    if (!isAdmin) return
    try {
      setIsLoading(true)
      const response = await apiClient.get('/documents/file-type-configurations/')
      const data = Array.isArray(response.data) 
        ? response.data 
        : response.data?.results || response.data?.data || []
      setConfigs(data || [])
      
      const statsResponse = await apiClient.get('/documents/file-type-configurations/statistics/')
      setStats(statsResponse.data || {})
    } catch (err) {
      console.error('Error fetching configurations:', err)
      setError('Erreur lors du chargement des configurations')
      setConfigs([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const handleEdit = (config: FileTypeConfig) => {
    setEditingId(config.id)
    setEditingData({ ...config })
  }

  const handleSave = async () => {
    if (!editingId) return
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)
      await apiClient.patch(`/documents/file-type-configurations/${editingData.file_type}/`, editingData)
      setConfigs(configs.map(c => c.id === editingId ? { ...c, ...editingData } : c))
      setEditingId(null)
      setEditingData({})
      setSuccessMessage('✅ Configuration mise à jour avec succès')
      await fetchConfigs()
      setTimeout(() => setSuccessMessage(null), 5000) // Afficher 5 secondes
    } catch (err) {
      console.error('Error saving configuration:', err)
      setError('❌ Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingData({})
  }

  const handleToggleEnabled = async (config: FileTypeConfig) => {
    try {
      setError(null)
      setSuccessMessage(null)
      await apiClient.post(`/documents/file-type-configurations/${config.file_type}/toggle_enabled/`)
      await fetchConfigs()
      setSuccessMessage(`✅ ${config.display_name} ${!config.is_enabled ? 'activé' : 'désactivé'}`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      console.error('Error toggling configuration:', err)
      setError('❌ Erreur lors de la modification')
    }
  }

  const handleAddConfig = async () => {
    const fileType = newConfigData.file_type?.trim().toLowerCase()
    const validTypes = ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'xlsm', 'xltx', 'xltm', 'xls', 'xlt', 'xlsb', 'xlam', 'csv', 'tsv', 'ods', 'image', 'zip']
    
    if (!fileType || !newConfigData.display_name) {
      setError('Type de fichier et nom d\'affichage requis')
      return
    }
    
    if (!validTypes.includes(fileType)) {
      setError(`❌ Type invalide: "${fileType}". Types valides: ${validTypes.join(', ')}`)
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)
      await apiClient.post('/documents/file-type-configurations/', { ...newConfigData, file_type: fileType })
      setShowAddModal(false)
      setNewConfigData({
        file_type: '',
        display_name: '',
        max_file_size_mb: 50,
        is_enabled: true,
        is_auto_validated: true,
      })
      setSuccessMessage('✅ Configuration ajoutée avec succès')
      await fetchConfigs()
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err: any) {
      console.error('Error adding configuration:', err)
      setError(err.response?.data?.detail || '❌ Erreur lors de l\'ajout de la configuration')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="card p-8 text-center">
              <AlertCircle size={48} className="text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès Refusé</h1>
              <p className="text-gray-600">Seuls les administrateurs peuvent accéder à cette page.</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50 p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-3 bg-red-600 rounded-lg">
                  <FileCode size={28} className="text-white" />
                </div>
                Configuration des Types de Fichiers
              </h1>
              <p className="text-gray-600 mt-2">Gérez les paramètres de validation pour chaque type de fichier</p>
            </div>
            <button
              onClick={fetchConfigs}
              className={`p-3 hover:bg-blue-100 rounded-lg transition-all ${
                isLoading ? 'animate-spin' : ''
              }`}
            >
              <RefreshCw size={20} className="text-blue-600" />
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Types</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_types}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText size={20} className="text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Activés</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.enabled_types}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle2 size={20} className="text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Désactivés</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.disabled_types}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Auto-validés</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{stats.auto_validated_types}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 size={20} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Add Button */}
          <div className="mb-8 flex justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus size={20} className="text-red-500" />
              Ajouter une Configuration
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-800 font-medium">Erreur</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Main Table */}
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader className="animate-spin text-blue-600" size={40} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-8"></th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-32">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 flex-1">Nom</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-24">État</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-32">Taille Max</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-24">Auto Val</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {configs.map((config) => (
                      <React.Fragment key={config.id}>
                        <tr className={`hover:bg-gray-50 transition ${editingId === config.id ? 'bg-blue-50' : ''}`}>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => toggleRowExpansion(config.id)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              {expandedRows.has(config.id) ? (
                                <ChevronUp size={18} className="text-gray-600" />
                              ) : (
                                <ChevronDown size={18} className="text-gray-600" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-lg font-mono text-sm font-medium">
                              {config.file_type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{config.display_name}</p>
                              <p className="text-sm text-gray-500">{config.description}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleEnabled(config)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                                config.is_enabled
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {config.is_enabled ? 'Actif' : 'Inactif'}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">
                              {config.max_file_size_mb}MB
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              config.is_auto_validated
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {config.is_auto_validated ? 'Oui' : 'Non'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {editingId === config.id ? (
                                <>
                                  <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
                                    title="Enregistrer"
                                  >
                                    <Save size={18} />
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                                    title="Annuler"
                                  >
                                    <X size={18} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleEdit(config)}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                                  title="Modifier"
                                >
                                  <Edit2 size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row - Detailed Info */}
                        {expandedRows.has(config.id) && (editingId === config.id ? (
                          <tr className="bg-blue-50 border-t-2 border-blue-200">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="grid grid-cols-3 gap-6">
                                {/* Column 1: File Size */}
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Maximize2 size={18} className="text-blue-600" />
                                    Taille des Fichiers
                                  </h4>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Taille Max (MB)
                                    </label>
                                    <input
                                      type="number"
                                      value={editingData.max_file_size_mb || 50}
                                      onChange={(e) => setEditingData({ ...editingData, max_file_size_mb: parseInt(e.target.value) })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Taille Min (KB)
                                    </label>
                                    <input
                                      type="number"
                                      value={editingData.min_file_size_kb || 0}
                                      onChange={(e) => setEditingData({ ...editingData, min_file_size_kb: parseInt(e.target.value) })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>

                                {/* Column 2: Dimensions & Pages */}
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Move size={18} className="text-blue-600" />
                                    Dimensions
                                  </h4>
                                  {config.file_type.toLowerCase() === 'pdf' && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Pages
                                      </label>
                                      <input
                                        type="number"
                                        value={editingData.max_pages || ''}
                                        onChange={(e) => setEditingData({ ...editingData, max_pages: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Illimité"
                                      />
                                    </div>
                                  )}
                                  {config.file_type.toLowerCase().includes('xls') && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Max Lignes
                                        </label>
                                        <input
                                          type="number"
                                          value={editingData.max_rows || ''}
                                          onChange={(e) => setEditingData({ ...editingData, max_rows: e.target.value ? parseInt(e.target.value) : null })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                          placeholder="Illimité"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Max Colonnes
                                        </label>
                                        <input
                                          type="number"
                                          value={editingData.max_columns || ''}
                                          onChange={(e) => setEditingData({ ...editingData, max_columns: e.target.value ? parseInt(e.target.value) : null })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                          placeholder="Illimité"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                          Max Feuilles
                                        </label>
                                        <input
                                          type="number"
                                          value={editingData.max_sheets || ''}
                                          onChange={(e) => setEditingData({ ...editingData, max_sheets: e.target.value ? parseInt(e.target.value) : null })}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                          placeholder="Illimité"
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Column 3: Security */}
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Lock size={18} className="text-blue-600" />
                                    Sécurité
                                  </h4>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingData.require_macros_disabled || false}
                                      onChange={(e) => setEditingData({ ...editingData, require_macros_disabled: e.target.checked })}
                                      className="rounded"
                                    />
                                    <span className="text-sm text-gray-700">Macros désactivées</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingData.require_no_password || false}
                                      onChange={(e) => setEditingData({ ...editingData, require_no_password: e.target.checked })}
                                      className="rounded"
                                    />
                                    <span className="text-sm text-gray-700">Sans protection</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingData.require_utf8_encoding || false}
                                      onChange={(e) => setEditingData({ ...editingData, require_utf8_encoding: e.target.checked })}
                                      className="rounded"
                                    />
                                    <span className="text-sm text-gray-700">Encodage UTF-8</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editingData.allow_external_links || false}
                                      onChange={(e) => setEditingData({ ...editingData, allow_external_links: e.target.checked })}
                                      className="rounded"
                                    />
                                    <span className="text-sm text-gray-700">Liens externes autorisés</span>
                                  </label>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr className="bg-gray-50 border-t border-gray-200">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="grid grid-cols-4 gap-6 text-sm">
                                <div>
                                  <p className="text-gray-600 font-medium">Taille Max</p>
                                  <p className="text-gray-900 mt-1">{config.max_file_size_mb}MB</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Spécifications</p>
                                  <div className="mt-1 space-y-1">
                                    {config.max_rows && <p className="text-gray-700">• Max Lignes: {config.max_rows}</p>}
                                    {config.max_columns && <p className="text-gray-700">• Max Colonnes: {config.max_columns}</p>}
                                    {config.max_sheets && <p className="text-gray-700">• Max Feuilles: {config.max_sheets}</p>}
                                    {config.max_pages && <p className="text-gray-700">• Max Pages: {config.max_pages}</p>}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Sécurité</p>
                                  <div className="mt-1 space-y-1 text-xs">
                                    {config.require_macros_disabled && <span className="block text-gray-700">✓ Macros désactivées</span>}
                                    {config.require_no_password && <span className="block text-gray-700">✓ Sans mot de passe</span>}
                                    {config.require_utf8_encoding && <span className="block text-gray-700">✓ UTF-8</span>}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Description</p>
                                  <p className="text-gray-700 mt-1 text-justify">{config.description}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Add Configuration Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Ajouter une Configuration</h2>
              
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Type de Fichier *
                  </label>
                  <input
                    type="text"
                    placeholder="ex: pdf, xlsx, docx..."
                    value={newConfigData.file_type || ''}
                    onChange={(e) => setNewConfigData({ ...newConfigData, file_type: e.target.value.toLowerCase().trim() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nom d'Affichage *
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Documents PDF"
                    value={newConfigData.display_name || ''}
                    onChange={(e) => setNewConfigData({ ...newConfigData, display_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Description optionnelle..."
                    value={newConfigData.description || ''}
                    onChange={(e) => setNewConfigData({ ...newConfigData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Taille Max (MB)
                  </label>
                  <input
                    type="number"
                    value={newConfigData.max_file_size_mb || 50}
                    onChange={(e) => setNewConfigData({ ...newConfigData, max_file_size_mb: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Conditional Fields for Excel (xlsx, xls, xlsm, xlsb, etc.) */}
                {newConfigData.file_type?.toLowerCase().includes('xls') && (
                  <>
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">📊 Dimensions</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nbre Lignes Max
                          </label>
                          <input
                            type="number"
                            value={newConfigData.max_rows || ''}
                            onChange={(e) => setNewConfigData({ ...newConfigData, max_rows: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nbre Colonnes Max
                          </label>
                          <input
                            type="number"
                            value={newConfigData.max_columns || ''}
                            onChange={(e) => setNewConfigData({ ...newConfigData, max_columns: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nbre Feuilles Max
                          </label>
                          <input
                            type="number"
                            value={newConfigData.max_sheets || ''}
                            onChange={(e) => setNewConfigData({ ...newConfigData, max_sheets: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Conditional Fields for PDF */}
                {newConfigData.file_type?.toLowerCase() === 'pdf' && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">📄 Dimensions</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nbre Pages Max
                      </label>
                      <input
                        type="number"
                        value={newConfigData.max_pages || ''}
                        onChange={(e) => setNewConfigData({ ...newConfigData, max_pages: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={newConfigData.is_enabled || false}
                      onChange={(e) => setNewConfigData({ ...newConfigData, is_enabled: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Actif</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={newConfigData.is_auto_validated || false}
                      onChange={(e) => setNewConfigData({ ...newConfigData, is_auto_validated: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Auto-validé</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddConfig}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  <Plus size={18}/>
                  Ajouter
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold shadow-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

