import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/common'
import { AddUserModal } from '@/components/admin/AddUserModal'
import { EditUserModal } from '@/components/admin/EditUserModal'
import { User } from '@/types/auth'
import { apiClient } from '@/services/api'
import { USER_ENDPOINTS } from '@/utils/constants'
import { Users as UsersIcon, Plus, AlertCircle, Loader } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export const Users: React.FC = () => {
  const auth = useAuth()
  const currentUser = auth?.user
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    setError('')
    try {
      console.log('[Users] Fetching users from API')
      const response = await apiClient.get<any>(USER_ENDPOINTS.list)
      
      // Handle both array and paginated response structures
      let data: User[] = []
      if (Array.isArray(response.data)) {
        data = response.data
      } else if (response.data?.results) {
        data = Array.isArray(response.data.results) ? response.data.results : []
      }
      
      setUsers(data)
      console.log('[Users] Loaded', data.length, 'users')
    } catch (err: any) {
      console.error('[Users] Load error:', err)
      setError(err.response?.data?.detail || 'Erreur lors du chargement des utilisateurs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = () => {
    console.log('[Users] Opening add user modal')
    setIsAddModalOpen(true)
  }

  const handleEdit = (user: User) => {
    console.log('[Users] Edit user:', user.id)
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
      return
    }

    setIsLoading(true)
    try {
      console.log('[Users] Deleting user:', id)
      await apiClient.delete(USER_ENDPOINTS.detail(id))
      console.log('[Users] User deleted successfully')
      await loadUsers()
    } catch (err: any) {
      console.error('[Users] Delete error:', err)
      setError(err.response?.data?.detail || 'Erreur lors de la suppression')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/20">
        <div className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                  <UsersIcon size={24} className="text-white sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
                    Gestion des Utilisateurs
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                    Gérez les accès et les rôles des utilisateurs
                  </p>
                </div>
              </div>
              <button
                onClick={handleAdd}
                disabled={isLoading}
                className="
                  flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-5 py-2 sm:py-3 
                  bg-gradient-to-r from-red-500 to-red-600 
                  text-white font-medium text-sm sm:text-base rounded-lg sm:rounded-xl
                  hover:from-red-600 hover:to-red-700
                  shadow-lg hover:shadow-xl
                  transition-all duration-200
                  transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                  flex-shrink-0
                "
              >
                <Plus size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Ajouter Utilisateur</span>
                <span className="sm:hidden">Ajouter</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{users.length}</div>
                <div className="text-xs text-gray-600 mt-1">Utilisateurs</div>
              </div>
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                <div className="text-xl sm:text-2xl font-bold text-green-600">
                  {users.filter(u => u.is_active).length}
                </div>
                <div className="text-xs text-gray-600 mt-1">Actifs</div>
              </div>
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
                <div className="text-xl sm:text-2xl font-bold text-gray-900">
                  {users.filter(u => u.is_staff).length}
                </div>
                <div className="text-xs text-gray-600 mt-1">Administrateurs</div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex gap-2 sm:gap-3">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && users.length === 0 && (
            <div className="flex items-center justify-center py-12 sm:py-20">
              <div className="flex flex-col items-center gap-3">
                <Loader size={32} className="animate-spin text-red-600" />
                <p className="text-sm text-gray-600">Chargement des utilisateurs...</p>
              </div>
            </div>
          )}

          {/* Users Table */}
          {!isLoading && (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {users.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-full w-16 sm:w-20 h-16 sm:h-20 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                    <UsersIcon size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-900 text-base sm:text-lg font-medium mb-1 sm:mb-2">Aucun utilisateur trouvé</p>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    Cliquez sur "Ajouter Utilisateur" pour créer le premier utilisateur
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nom</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Email</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rôle</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Statut</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <UsersIcon size={16} className="text-white sm:w-5 sm:h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate">{user.first_name} {user.last_name}</p>
                                <p className="text-xs text-gray-500 truncate sm:hidden">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                            {user.email}
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              {user.is_staff ? (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                                  👑 Administrateur
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                                  👤 Utilisateur
                                </span>
                              )}
                              {currentUser && currentUser.id === user.id && (
                                <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-green-100 text-green-800 border border-green-300">
                                  Vous
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-sm">
                            <span
                              className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border ${
                                user.is_active
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : 'bg-gray-100 text-gray-800 border-gray-300'
                              }`}
                            >
                              {user.is_active ? '🟢 Actif' : '⚪ Inactif'}
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-sm flex gap-1 sm:gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Éditer"
                            >
                              <span className="text-xs sm:text-sm">✎</span>
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={isLoading}
                              className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              <span className="text-xs sm:text-sm">🗑</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => loadUsers()}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        user={selectedUser}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedUser(null)
        }}
        onSuccess={() => loadUsers()}
      />
    </Layout>
  )
}
