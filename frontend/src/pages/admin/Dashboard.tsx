import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/common'
import { GovernmentDashboard } from '@/components/dashboard/GovernmentDashboard'
import { SearchModal } from '@/components/dashboard/SearchModal'
import { apiClient } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { FileText, Users, BarChart3, TrendingUp, Zap, Settings as SettingsIcon } from 'lucide-react'

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [stats, setStats] = React.useState({
  totalDocuments: 0,
  totalUsers: 0,
  approvedDocuments: 0,
  pendingDocuments: 0,
  rejectedDocuments: 0,  // ← AJOUTEZ CETTE LIGNE
})
  const [isLoading, setIsLoading] = React.useState(true)

  const handleSearch = () => {
    setIsSearchOpen(true)
  }

  const handleViewReports = () => {
    navigate('/reports')
  }

  const handleSettings = () => {
    navigate('/settings')
  }

  React.useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
  try {
    setIsLoading(true)
    const docsResponse = await apiClient.get<any>('documents/?limit=1000')
    const documents = docsResponse.data.results || docsResponse.data || []
    
    const totalDocuments = Array.isArray(documents) ? documents.length : 0
    const approvedDocuments = Array.isArray(documents) 
      ? documents.filter((d: any) => d.status === 'VALIDE' || d.status === 'APPROUVE').length 
      : 0
    const pendingDocuments = Array.isArray(documents)
      ? documents.filter((d: any) => d.status === 'EN_COURS' || d.status === 'EN_ATTENTE').length
      : 0
    // ✅ AJOUTEZ CETTE LIGNE
    const rejectedDocuments = Array.isArray(documents)
      ? documents.filter((d: any) => d.status === 'REJETE').length
      : 0
    const totalUsers = Array.isArray(documents) ? new Set(documents.map((d: any) => d.agent_username)).size : 0
    
    console.log('[AdminDashboard] Loaded stats:', { totalDocuments, approvedDocuments, pendingDocuments, rejectedDocuments, totalUsers })
    
    setStats({
      totalDocuments,
      totalUsers,
      approvedDocuments,
      pendingDocuments,
      rejectedDocuments,  
    })
  } catch (error) {
    console.error('[AdminDashboard] Error loading data:', error)
    setStats({
      totalDocuments: 0,
      totalUsers: 0,
      approvedDocuments: 0,
      pendingDocuments: 0,
      rejectedDocuments: 0,  // ✅ AJOUTEZ CETTE LIGNE
    })
  } finally {
    setIsLoading(false)
  }
}

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bienvenue, Admin {user?.first_name || 'Utilisateur'}</h1>
          <p className="text-gray-600 mt-2">Gérez et supervisez tous les documents du système</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalDocuments}</p>
              </div>
              <FileText size={40} className="text-blue-100" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Approuvés</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.approvedDocuments}</p>
              </div>
              <TrendingUp size={40} className="text-green-100" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">En Cours</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingDocuments}</p>
              </div>
              <Zap size={40} className="text-yellow-100" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">Utilisateurs</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <Users size={40} className="text-purple-100" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🚀 Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleSearch}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition"
            >
              <FileText size={24} className="text-blue-600" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Rechercher Documents</p>
                <p className="text-xs text-gray-600">Recherche avancée et filtrage</p>
              </div>
            </button>

            <button
              onClick={handleViewReports}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition"
            >
              <BarChart3 size={24} className="text-green-600" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Voir les Rapports</p>
                <p className="text-xs text-gray-600">Statistiques et analyses</p>
              </div>
            </button>

            <button
              onClick={handleSettings}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition"
            >
              <SettingsIcon size={24} className="text-purple-600" />
              <div className="text-left">
                <p className="font-semibold text-gray-900">Paramètres</p>
                <p className="text-xs text-gray-600">Configuration du système</p>
              </div>
            </button>
          </div>
        </div>

        {/* Main Dashboard */}
        <GovernmentDashboard 
          data={stats}
        />
        
        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow p-6 border border-blue-200">
          <h2 className="text-lg font-bold text-gray-900 mb-3">💡 Comment Consulter les Documents?</h2>
          <p className="text-gray-700 mb-4">
            Pour consulter et gérer les documents avec aisance:
          </p>
          <ol className="space-y-2 text-sm text-gray-700 ml-4">
            <li><strong>1. Cliquez sur "Consulter Documents"</strong> dans les actions rapides ci-dessus</li>
            <li><strong>2. Utilisez les filtres</strong> (statut, type, département, dates)</li>
            <li><strong>3. Choisissez votre vue</strong> (Grille 📱, Liste 📋 ou Tableau 📊)</li>
            <li><strong>4. Triez par colonnes</strong> (titre, agent, statut, taille, date)</li>
            <li><strong>5. Sélectionnez plusieurs documents</strong> et appliquez une action en masse</li>
            <li><strong>6. Cliquez "Voir"</strong> pour consulter les détails complets</li>
          </ol>
          <p className="text-xs text-gray-600 mt-4">
            📖 <strong>Guide complet:</strong> Consultez <code>ADMIN_DOCUMENTS_GUIDE.md</code> à la racine du projet
          </p>
        </div>
      </div>
    </Layout>
  )
}
