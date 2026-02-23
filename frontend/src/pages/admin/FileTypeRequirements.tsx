import React, { useState, useEffect } from 'react'
import { 
  Settings, Plus, Trash2, Edit2, CheckCircle2, Loader,
  BarChart3, Save
} from 'lucide-react'
import { Layout } from '@/components/common'
import { Input, Button, Modal, Alert } from '@/components/common'
import { apiClient } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface RoutingRule {
  id: number
  name: string
  description: string
}

interface FileTypeConfig {
  id: number
  file_type: string
  display_name: string
  is_enabled: boolean
}

interface FileTypeRequirement {
  id: number
  routing_rule_id: number
  routing_rule_name: string
  file_type_config_id: number
  file_type_config: FileTypeConfig
  max_file_size_mb: number | null
  is_required: boolean
  effective_max_size: number
}

interface Stats {
  total_requirements: number
  required_types: number
  optional_types: number
  routing_rules_configured: number
}

export const FileTypeRequirements: React.FC = () => {
  const { user } = useAuth()
  const [requirements, setRequirements] = useState<FileTypeRequirement[]>([])
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([])
  const [fileTypes, setFileTypes] = useState<FileTypeConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    total_requirements: 0,
    required_types: 0,
    optional_types: 0,
    routing_rules_configured: 0,
  })

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedRuleFilter, setSelectedRuleFilter] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    routing_rule_id: 0,
    file_type_config_id: 0,
    max_file_size_mb: null as number | null,
    is_required: false,
  })

  const isAdmin = user?.is_staff

  // Fetch data
  const fetchData = async () => {
    if (!isAdmin) return
    try {
      setIsLoading(true)
      setError(null)

      // Fetch requirements
      const reqResponse = await apiClient.get('/documents/file-type-requirements/')
      const reqs = Array.isArray(reqResponse.data) 
        ? reqResponse.data 
        : reqResponse.data?.results || []
      setRequirements(reqs)

      // Fetch routing rules
      const rulesResponse = await apiClient.get('/routing-rules/')
      const rules = Array.isArray(rulesResponse.data)
        ? rulesResponse.data
        : rulesResponse.data?.results || []
      setRoutingRules(rules)

      // Fetch file type configurations
      const configsResponse = await apiClient.get('/documents/file-type-configurations/')
      const configs = Array.isArray(configsResponse.data)
        ? configsResponse.data
        : configsResponse.data?.results || []
      setFileTypes(configs)

      // Calculate stats
      const configuredRules = new Set(reqs.map((r: FileTypeRequirement) => r.routing_rule_id))
      setStats({
        total_requirements: reqs.length,
        required_types: reqs.filter((r: FileTypeRequirement) => r.is_required).length,
        optional_types: reqs.filter((r: FileTypeRequirement) => !r.is_required).length,
        routing_rules_configured: configuredRules.size,
      })
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError('Erreur lors du chargement des données')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Handle add/edit
  const handleSave = async () => {
    if (!formData.routing_rule_id || !formData.file_type_config_id) {
      setError('Veuillez sélectionner une règle et un type de fichier')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const payload = {
        routing_rule_id: formData.routing_rule_id,
        file_type_config_id: formData.file_type_config_id,
        max_file_size_mb: formData.max_file_size_mb,
        is_required: formData.is_required,
      }

      if (editingId) {
        // Update existing
        await apiClient.patch(`/documents/file-type-requirements/${editingId}/`, payload)
        setSuccessMessage('Association mise à jour avec succès')
      } else {
        // Create new
        await apiClient.post('/documents/file-type-requirements/', payload)
        setSuccessMessage('Association créée avec succès')
      }

      setShowAddModal(false)
      setEditingId(null)
      resetForm()
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de l\'enregistrement')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette association?')) return

    try {
      setIsSaving(true)
      setError(null)
      await apiClient.delete(`/documents/file-type-requirements/${id}/`)
      setSuccessMessage('Association supprimée avec succès')
      await fetchData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la suppression')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle edit
  const handleEdit = (requirement: FileTypeRequirement) => {
    setFormData({
      routing_rule_id: requirement.routing_rule_id,
      file_type_config_id: requirement.file_type_config_id,
      max_file_size_mb: requirement.max_file_size_mb,
      is_required: requirement.is_required,
    })
    setEditingId(requirement.id)
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      routing_rule_id: 0,
      file_type_config_id: 0,
      max_file_size_mb: null,
      is_required: false,
    })
    setEditingId(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setShowAddModal(true)
  }

  // Filter requirements
  const filteredRequirements = selectedRuleFilter
    ? requirements.filter(r => r.routing_rule_id === selectedRuleFilter)
    : requirements

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader className="animate-spin text-blue-600" size={40} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Exigences de Types de Fichiers</h1>
          <p className="text-gray-600 mt-2">Configurez quels types de fichiers sont acceptés pour chaque règle de routage</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert 
            type="error" 
            title="Erreur" 
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {/* Success Alert */}
        {successMessage && (
          <Alert 
            type="success" 
            title="Succès" 
            message={successMessage}
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Total Associations</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_requirements}</p>
              </div>
              <BarChart3 className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Types Obligatoires</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.required_types}</p>
              </div>
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Types Optionnels</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.optional_types}</p>
              </div>
              <Settings className="text-yellow-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Règles Configurées</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.routing_rules_configured}</p>
              </div>
              <Settings className="text-purple-600" size={32} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={20} />
            Ajouter une Association
          </Button>

          <select
            value={selectedRuleFilter || ''}
            onChange={(e) => setSelectedRuleFilter(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Toutes les règles</option>
            {routingRules.map(rule => (
              <option key={rule.id} value={rule.id}>{rule.name}</option>
            ))}
          </select>
        </div>

        {/* Requirements Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Règle de Routage</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type de Fichier</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Max Size</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequirements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      Aucune association configurée
                    </td>
                  </tr>
                ) : (
                  filteredRequirements.map(req => (
                    <tr key={req.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{req.routing_rule_name}</td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <span className="font-semibold text-gray-900">{req.file_type_config.display_name}</span>
                          <span className="text-gray-500 text-xs ml-2">({req.file_type_config.file_type})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          req.is_required
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {req.is_required ? 'OBLIGATOIRE' : 'OPTIONNEL'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {req.max_file_size_mb ? `${req.max_file_size_mb} MB` : `${req.effective_max_size} MB (défaut)`}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(req)}
                            className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                            title="Éditer"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(req.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            resetForm()
          }}
          title={editingId ? 'Éditer Association' : 'Ajouter une Association'}
        >
          <div className="space-y-4">
            {/* Routing Rule Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Règle de Routage *</label>
              <select
                value={formData.routing_rule_id}
                onChange={(e) => setFormData({ ...formData, routing_rule_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>-- Sélectionner une règle --</option>
                {routingRules.map(rule => (
                  <option key={rule.id} value={rule.id}>{rule.name}</option>
                ))}
              </select>
            </div>

            {/* File Type Select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Type de Fichier *</label>
              <select
                value={formData.file_type_config_id}
                onChange={(e) => setFormData({ ...formData, file_type_config_id: Number(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>-- Sélectionner un type --</option>
                {fileTypes.filter(ft => ft.is_enabled).map(ft => (
                  <option key={ft.id} value={ft.id}>
                    {ft.display_name} ({ft.file_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Max File Size */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Taille Max (MB)</label>
              <Input
                type="number"
                value={formData.max_file_size_mb || ''}
                onChange={(e) => setFormData({ ...formData, max_file_size_mb: e.target.value ? Number(e.target.value) : null })}
                placeholder="Laisser vide pour utiliser la config par défaut"
                min={1}
              />
              <p className="text-xs text-gray-500 mt-1">Si non défini, utilisera la taille par défaut du type</p>
            </div>

            {/* Is Required */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_required"
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600"
              />
              <label htmlFor="is_required" className="text-sm font-semibold text-gray-700">
                Type obligatoire pour cette règle
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save size={18} />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button
                onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
                variant="secondary"
                className="flex-1"
              >
                Annuler
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
