import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/common'
import { branchService, Branch } from '../../services/branchService'
import { useAlert } from '../../hooks/useAlert'
import { Globe, BookOpen, Users, ChevronRight } from 'lucide-react'

interface BranchFormData {
  name: string
  code: string
  country_code: string
  description: string
  is_active: boolean
}

export const Branches: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedBranch, setExpandedBranch] = useState<number | null>(null)
  const { showAlert } = useAlert()

  const [formData, setFormData] = useState<BranchFormData>({
    name: '',
    code: '',
    country_code: '',
    description: '',
    is_active: true
  })

  // Charger les filiales
  const loadBranches = useCallback(async () => {
    setLoading(true)
    try {
      const data = await branchService.getBranches()
      setBranches(data)
    } catch (error) {
      showAlert('Erreur lors du chargement des filiales', 'error')
    } finally {
      setLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? !prev[name as keyof BranchFormData] : value
    }))
  }

  const handleEdit = (branch: Branch) => {
    setFormData({
      name: branch.name || '',
      code: branch.code || '',
      country_code: branch.country_code || '',
      description: branch.description || '',
      is_active: branch.is_active || true
    })
    setEditingId(branch.id || null)
    setShowForm(true)
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      code: '',
      country_code: '',
      description: '',
      is_active: true
    })
    setShowForm(false)
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim() || !formData.country_code.trim()) {
      showAlert('Le nom, le code et le code pays sont requis', 'error')
      return
    }

    try {
      setLoading(true)
      if (editingId) {
        await branchService.updateBranch(editingId, formData)
        showAlert('Filiale mise à jour avec succès', 'success')
      } else {
        await branchService.createBranch(formData)
        showAlert('Filiale créée avec succès', 'success')
      }
      
      handleCancel()
      await loadBranches()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur lors de l\'enregistrement'
      showAlert(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (branchId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette filiale ?')) {
      try {
        setLoading(true)
        await branchService.deleteBranch(branchId)
        showAlert('Filiale supprimée avec succès', 'success')
        await loadBranches()
      } catch (error: any) {
        const message = error.response?.data?.detail || 'Erreur lors de la suppression'
        showAlert(message, 'error')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <Layout>
      <div className="p-6">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-8 h-8 text-primary-500" />
              <h1 className="text-3xl font-bold text-slate-900">Filiales/Branches</h1>
            </div>
            <p className="text-slate-600">
              Gérez les 7 filiales (pays) et leur structure organisationnelle.
            </p>
          </div>
          <button
            onClick={() => {
              handleCancel()
              setShowForm(!showForm)
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium"
          >
            {showForm ? 'Annuler' : '+ Nouvelle Filiale'}
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6 border-l-4 border-primary-500">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">
              {editingId ? 'Modifier la Filiale' : 'Créer une Nouvelle Filiale'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nom du Pays/Filiale *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="ex: Bénin"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Code Filiale *
                  </label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="ex: BEN"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Code Pays ISO-3166 *
                  </label>
                  <input
                    type="text"
                    name="country_code"
                    value={formData.country_code}
                    onChange={handleInputChange}
                    placeholder="ex: BJ"
                    maxLength={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 mt-7">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Filiale Active</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Entrez une description optionnelle"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-slate-400 transition font-medium"
                >
                  {loading ? 'En cours...' : editingId ? 'Mettre à jour' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition font-medium"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des filiales */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading && !editingId ? (
            <div className="p-6 text-center text-slate-500">
              Chargement des filiales...
            </div>
          ) : branches.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              Aucune filiale disponible.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nom</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Code</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Code Pays</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">
                      <div className="flex items-center justify-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        Depts
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4" />
                        Utilisateurs
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Statut</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch, index) => (
                    <React.Fragment key={branch.id}>
                      <tr className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} >
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary-500" />
                            {branch.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono">
                            {branch.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                          {branch.country_code}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-full font-semibold text-sm">
                            {branch.departments_count || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-700 rounded-full font-semibold text-sm">
                            {branch.users_count || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            branch.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {branch.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-sm space-x-2">
                          <button
                            onClick={() => {
                              if (expandedBranch === branch.id) {
                                setExpandedBranch(null)
                              } else {
                                setExpandedBranch(branch.id || null)
                              }
                            }}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                            title="Voir les détails"
                          >
                            <ChevronRight className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleEdit(branch)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id || 0)}
                            className="text-red-600 hover:text-red-700 font-medium"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                      
                      {/* Détails - Departments */}
                      {expandedBranch === branch.id && branch.departments && branch.departments.length > 0 && (
                        <tr className={index % 2 === 0 ? 'bg-blue-50' : 'bg-blue-50'}>
                          <td colSpan={7} className="px-6 py-4">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary-500" />
                                Départements ({branch.departments.length})
                              </h4>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 pl-6">
                                {branch.departments.map(dept => (
                                  <div key={dept.id} className="p-2 bg-white rounded border border-slate-200">
                                    <p className="font-medium text-slate-900">{dept.name}</p>
                                    <p className="text-xs text-slate-500">{dept.folder_name}</p>
                                  </div>
                                ))}
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

        {/* Résumé */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-4 border border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Filiales Actives</p>
                <p className="text-2xl font-bold text-slate-900">
                  {branches.filter(b => b.is_active).length}
                </p>
              </div>
              <Globe className="w-8 h-8 text-primary-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Départements Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {branches.reduce((sum, b) => sum + (b.departments_count || 0), 0)}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">Utilisateurs Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {branches.reduce((sum, b) => sum + (b.users_count || 0), 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Branches
