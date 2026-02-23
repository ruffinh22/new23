import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '@/components/common'
import { departmentService, Department } from '../../services/departmentService'
import { branchService } from '../../services/branchService'
import { useAlert } from '../../hooks/useAlert'
import { Globe, Plus } from 'lucide-react'

interface Branch {
  id: number
  name: string
  code: string
  country_code: string
}

interface DepartmentFormData {
  name: string
  code: string
  description: string
  is_active: boolean
  branch: string
}

export const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [showUsers, setShowUsers] = useState<number | null>(null)
  const [departmentUsers, setDepartmentUsers] = useState<any[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const { showAlert } = useAlert()

  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    code: '',
    description: '',
    is_active: true,
    branch: ''
  })

  // Charger les filiales
  const loadBranches = useCallback(async () => {
    try {
      const data = await branchService.getBranches()
      // Convert to local Branch type
      const branches: Branch[] = data.map(b => ({
        id: b.id || 0,
        name: b.name || '',
        code: b.code || '',
        country_code: b.country_code || ''
      }))
      setBranches(branches)
      if (branches.length > 0 && !selectedBranch) {
        setSelectedBranch(branches[0].id.toString())
      }
    } catch (error) {
      console.error('Erreur chargement des filiales:', error)
      showAlert('Impossible de charger les filiales', 'error')
    }
  }, [selectedBranch, showAlert])

  // Charger les départements
  const loadDepartments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await departmentService.getDepartments()
      // Filter by selected branch if available
      if (selectedBranch) {
        const filtered = data.filter(dept => dept.branch?.toString() === selectedBranch)
        setDepartments(filtered)
      } else {
        setDepartments(data)
      }
    } catch (error) {
      showAlert('Erreur lors du chargement des départements', 'error')
    } finally {
      setLoading(false)
    }
  }, [selectedBranch, showAlert])

  // Charger les utilisateurs d'un département
  const loadDepartmentUsers = useCallback(async (deptId: number) => {
    setUsersLoading(true)
    try {
      const users = await departmentService.getDepartmentUsers(deptId)
      setDepartmentUsers(users)
      setShowUsers(deptId)
    } catch (error) {
      showAlert('Erreur lors du chargement des utilisateurs', 'error')
    } finally {
      setUsersLoading(false)
    }
  }, [showAlert])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? !prev[name as keyof DepartmentFormData] : value
    }))
  }

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.code.trim()) {
      showAlert('Le nom et le code sont requis', 'error')
      return
    }

    if (!formData.branch) {
      showAlert('La filiale est requise', 'error')
      return
    }

    try {
      setLoading(true)
      if (editingId) {
        await departmentService.updateDepartment(editingId, formData)
        showAlert('Département mis à jour avec succès', 'success')
      } else {
        await departmentService.createDepartment(formData)
        showAlert('Département créé avec succès', 'success')
      }
      
      // Réinitialiser le formulaire - garder la branche sélectionnée pour créer rapidement un autre dept
      setFormData({ name: '', code: '', description: '', is_active: true, branch: selectedBranch })
      setShowForm(false)
      setEditingId(null)
      
      // Recharger les départements
      await loadDepartments()
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur lors de l\'enregistrement'
      showAlert(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (dept: Department) => {
    setFormData({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      is_active: dept.is_active !== false,
      branch: dept.branch?.toString() || ''
    })
    setEditingId(dept.id || null)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce département ?')) {
      return
    }

    try {
      setLoading(true)
      await departmentService.deleteDepartment(id)
      showAlert('Département supprimé avec succès', 'success')
      await loadDepartments()
    } catch (error) {
      showAlert('Erreur lors de la suppression', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ name: '', code: '', description: '', is_active: true, branch: '' })
  }

  const handleNewDepartment = () => {
    if (!showForm) {
      // Ouverture du formulaire - pré-remplir avec la branche sélectionnée
      setFormData({ name: '', code: '', description: '', is_active: true, branch: selectedBranch })
    } else {
      // Fermeture du formulaire
      handleCancel()
    }
    setShowForm(!showForm)
  }

  const handleViewDetails = (dept: Department) => {
    setSelectedDepartment(dept)
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestion des Départements</h1>
            <p className="mt-2 text-gray-600">
              Créez et gérez les départements par filiale. Chaque département crée automatiquement un dossier racine.
            </p>
          </div>
          <button
            onClick={handleNewDepartment}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Plus size={20} />
            {showForm ? 'Annuler' : 'Nouveau Département'}
          </button>
        </div>

        {/* Sélecteur de Filiale */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <Globe className="text-blue-600" size={20} />
            <label className="text-sm font-medium text-gray-700">Filtrer par Filiale:</label>
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.id.toString()}>
                  🌍 {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Modifier le Département' : 'Créer un Nouveau Département'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🌍 Filiale *
                  </label>
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionnez une filiale</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id.toString()}>
                        {branch.name} ({branch.country_code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du Département *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="ex: Ressources Humaines"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="ex: RH"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Entrez une description optionnelle"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Département Actif</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'En cours...' : editingId ? 'Mettre à jour' : 'Créer'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des départements */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Chargement des départements...
            </div>
          ) : departments.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Aucun département trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      🌍 Filiale
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Dossier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Utilisateurs
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {departments.map(dept => {
                    const branch = branches.find(b => b.id.toString() === dept.branch?.toString())
                    return (
                      <tr key={dept.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                            🌍 {branch?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {dept.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-3 py-1 bg-gray-100 rounded-full">
                            {dept.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="text-blue-600">
                            {dept.folder_name || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => loadDepartmentUsers(dept.id || 0)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {dept.users_count || 0} utilisateurs
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              dept.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {dept.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleViewDetails(dept)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Détails
                          </button>
                          <button
                            onClick={() => handleEdit(dept)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id || 0)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal des utilisateurs */}
        {showUsers && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl max-h-96 overflow-auto">
              <h3 className="text-lg font-semibold mb-4">
                Utilisateurs du département
              </h3>
              {usersLoading ? (
                <div className="text-center text-gray-500">Chargement...</div>
              ) : departmentUsers.length === 0 ? (
                <div className="text-center text-gray-500">
                  Aucun utilisateur dans ce département
                </div>
              ) : (
                <div className="space-y-2">
                  {departmentUsers.map((user: any) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <span className="text-sm text-gray-600">{user.role}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowUsers(null)}
                className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Détails du département */}
        {selectedDepartment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl max-h-96 overflow-auto">
              <h3 className="text-lg font-semibold mb-4">
                Détails du Département: {selectedDepartment.name}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">🌍 Filiale</p>
                  <p className="font-medium text-blue-600">{selectedDepartment.branch_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Code</p>
                  <p className="font-medium">{selectedDepartment.code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium">{selectedDepartment.description || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dossier Racine</p>
                  <p className="font-medium text-blue-600">{selectedDepartment.folder_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nombre d'Utilisateurs</p>
                  <p className="font-medium">{selectedDepartment.users_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Créé</p>
                  <p className="font-medium">
                    {new Date(selectedDepartment.created_at || '').toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDepartment(null)}
                className="mt-6 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </Layout>
  )
}

export default Departments
