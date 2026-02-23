import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Edit2, Trash2, X, AlertCircle, CheckCircle2,
  Loader, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react'
import { Layout } from '@/components/common'
import { apiClient } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface DocumentType {
  id: number
  document_type: string
  display_name: string
  description: string
  allowed_formats: string
  allowed_formats_list: string[]
  requires_excel: boolean
  excel_sheet_name: string
  required_columns: string[]
  required_columns_list: string[]
  max_file_size_mb: number
  max_rows: number | null
  is_active: boolean
  requires_validation: boolean
  created_at: string
  updated_at: string
}

export const DocumentTypesManagement: React.FC = () => {
  const { user } = useAuth()
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<any>({})

  const isAdmin = user?.is_staff

  // Charger les types de documents - MEMOIZED to prevent unnecessary refetches
  const fetchDocumentTypes = useCallback(async () => {
    if (!isAdmin) return
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiClient.get('/documents/specifications/')
      const data = Array.isArray(response.data) ? response.data : response.data.results || []
      setDocumentTypes(data)
      console.log(`✅ Loaded ${data.length} document types`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des types de documents')
      console.error('Error fetching document types:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAdmin])

  // Load data once on mount, never auto-refresh
  useEffect(() => {
    fetchDocumentTypes()
  }, []) // Empty deps - only run on mount

  // Memoized list to prevent re-renders
  const memoizedDocumentTypes = useMemo(() => documentTypes, [documentTypes])

  // Créer un nouveau type
  const handleAddDocumentType = async () => {
    if (!editingData.document_type || !editingData.display_name) {
      setError('Le type et le nom d\'affichage sont requis')
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      const requiredCols = (() => {
        if (!editingData.required_columns) return []
        if (Array.isArray(editingData.required_columns)) {
          return editingData.required_columns
        }
        const str = String(editingData.required_columns)
        return str.split(',').map(c => c.trim()).filter(c => c)
      })()
      const payload = {
        ...editingData,
        required_columns: requiredCols
      }
      const response = await apiClient.post('/documents/specifications/', payload)
      setDocumentTypes([...documentTypes, response.data])
      setSuccessMessage('Type de document créé avec succès')
      setShowAddModal(false)
      setEditingData({})
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la création')
      console.error('Error creating document type:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Mettre à jour un type
  const handleUpdateDocumentType = async () => {
    if (!editingId) return
    try {
      setIsSaving(true)
      setError(null)
      const requiredCols = (() => {
        if (!editingData.required_columns) return []
        if (Array.isArray(editingData.required_columns)) {
          return editingData.required_columns
        }
        const str = String(editingData.required_columns)
        return str.split(',').map(c => c.trim()).filter(c => c)
      })()
      const payload = {
        ...editingData,
        required_columns: requiredCols
      }
      const response = await apiClient.patch(`/documents/specifications/${editingId}/`, payload)
      setDocumentTypes(documentTypes.map(dt => (dt.id === editingId ? response.data : dt)))
      setSuccessMessage('Type de document mis à jour avec succès')
      setEditingId(null)
      setEditingData({})
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la mise à jour')
      console.error('Error updating document type:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Supprimer un type
  const handleDeleteDocumentType = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce type de document ?')) return
    try {
      setIsSaving(true)
      setError(null)
      await apiClient.delete(`/documents/specifications/${id}/`)
      setDocumentTypes(documentTypes.filter(dt => dt.id !== id))
      setSuccessMessage('Type de document supprimé avec succès')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression')
      console.error('Error deleting document type:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Basculer l'expansion des lignes
  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Modal d'ajout/édition
  const renderFormModal = () => {
    const isEditing = editingId !== null
    const title = isEditing ? 'Modifier le type de document' : 'Créer un nouveau type de document'

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4 text-white flex items-center justify-between">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={() => {
                setShowAddModal(false)
                setEditingId(null)
                setEditingData({})
              }}
              className="p-1 hover:bg-white/20 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Type de document */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Type de document *</label>
              <input
                type="text"
                value={editingData.document_type || ''}
                onChange={(e) => setEditingData({ ...editingData, document_type: e.target.value })}
                placeholder="ex: CONGE, RAPPORT_EXCEL"
                disabled={isEditing}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100"
              />
            </div>

            {/* Nom d'affichage */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nom d'affichage *</label>
              <input
                type="text"
                value={editingData.display_name || ''}
                onChange={(e) => setEditingData({ ...editingData, display_name: e.target.value })}
                placeholder="ex: Congé, Rapport Excel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
              <textarea
                value={editingData.description || ''}
                onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                placeholder="Description du type de document"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 min-h-24"
              />
            </div>

            {/* Formats autorisés */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Formats autorisés *</label>
              <input
                type="text"
                value={editingData.allowed_formats || ''}
                onChange={(e) => setEditingData({ ...editingData, allowed_formats: e.target.value })}
                placeholder="pdf,docx,xlsx (séparés par des virgules)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-slate-500 mt-1">Formats disponibles: pdf, doc, docx, xls, xlsx, xlsm, csv, txt, image, zip</p>
            </div>

            {/* Taille max */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Taille max (MB)</label>
                <input
                  type="number"
                  value={editingData.max_file_size_mb || ''}
                  onChange={(e) => setEditingData({ ...editingData, max_file_size_mb: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Lignes max (Excel)</label>
                <input
                  type="number"
                  value={editingData.max_rows || ''}
                  onChange={(e) => setEditingData({ ...editingData, max_rows: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Validation Excel */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingData.requires_excel || false}
                  onChange={(e) => setEditingData({ ...editingData, requires_excel: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">Validation Excel requise</span>
              </label>

              {editingData.requires_excel && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nom de la feuille</label>
                    <input
                      type="text"
                      value={editingData.excel_sheet_name || ''}
                      onChange={(e) => setEditingData({ ...editingData, excel_sheet_name: e.target.value })}
                      placeholder="ex: Données (optionnel)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Colonnes requises</label>
                    <textarea
                      value={
                        Array.isArray(editingData.required_columns)
                          ? editingData.required_columns.join(', ')
                          : (editingData.required_columns || '')
                      }
                      onChange={(e) => setEditingData({ ...editingData, required_columns: e.target.value })}
                      placeholder="ex: Nom, Email, Département (séparées par des virgules)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-600 min-h-20"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingData.requires_validation !== false}
                  onChange={(e) => setEditingData({ ...editingData, requires_validation: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">Validation requise</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingData.is_active !== false}
                  onChange={(e) => setEditingData({ ...editingData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm font-semibold text-slate-700">Actif</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-slate-50 px-6 py-4 border-t flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowAddModal(false)
                setEditingId(null)
                setEditingData({})
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
            >
              Annuler
            </button>
            <button
              onClick={isEditing ? handleUpdateDocumentType : handleAddDocumentType}
              disabled={isSaving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Loader className="w-4 h-4 animate-spin" />}
              {isEditing ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">Accès réservé aux administrateurs</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Types de Documents</h1>
            <p className="text-slate-600 mt-1">Gestion des types et spécifications de documents</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => fetchDocumentTypes()}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition flex items-center gap-2 disabled:opacity-50"
              title="Rafraîchir la liste"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Rafraîchir
            </button>
            <button
              onClick={() => {
                setShowAddModal(true)
                setEditingData({
                  requires_validation: true,
                  is_active: true,
                  max_file_size_mb: 50
                })
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
            >
              <Plus size={18} />
              Ajouter un type
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : memoizedDocumentTypes.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-lg text-center">
            <p className="text-slate-600">Aucun type de document trouvé</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Nom</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Formats</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Taille Max</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Statut</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {memoizedDocumentTypes.map((dt) => (
                  <React.Fragment key={dt.id}>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-3 text-sm font-mono text-slate-900">{dt.document_type}</td>
                      <td className="px-6 py-3 text-sm text-slate-900 font-semibold">{dt.display_name}</td>
                      <td className="px-6 py-3 text-sm text-slate-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {dt.allowed_formats_list.join(', ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600">{dt.max_file_size_mb} MB</td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          dt.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {dt.is_active ? '✓ Actif' : '○ Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right space-x-2 flex items-center justify-end">
                        <button
                          onClick={() => toggleExpanded(dt.id)}
                          className="p-1 hover:bg-slate-100 rounded transition"
                        >
                          {expandedRows.has(dt.id) ? (
                            <ChevronUp size={18} className="text-slate-600" />
                          ) : (
                            <ChevronDown size={18} className="text-slate-600" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(dt.id)
                            setEditingData(dt)
                          }}
                          className="p-2 hover:bg-blue-100 rounded transition text-blue-600"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteDocumentType(dt.id)}
                          className="p-2 hover:bg-red-100 rounded transition text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(dt.id) && (
                      <tr className="bg-slate-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Description</p>
                              <p className="text-sm text-slate-600 mt-1">{dt.description || '—'}</p>
                            </div>
                            {dt.requires_excel && (
                              <>
                                <div>
                                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Feuille Excel</p>
                                  <p className="text-sm text-slate-600 mt-1">{dt.excel_sheet_name || '(Première feuille)'}</p>
                                </div>
                                {dt.required_columns_list.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Colonnes requises</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {dt.required_columns_list.map((col, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                          {col}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                              <div>
                                <p className="text-xs text-slate-500">Lignes max: {dt.max_rows || '—'}</p>
                                <p className="text-xs text-slate-500">Validation: {dt.requires_validation ? 'Oui' : 'Non'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Créé: {new Date(dt.created_at).toLocaleDateString('fr-FR')}</p>
                                <p className="text-xs text-slate-500">Modifié: {new Date(dt.updated_at).toLocaleDateString('fr-FR')}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showAddModal || editingId !== null) && renderFormModal()}
    </Layout>
  )
}
