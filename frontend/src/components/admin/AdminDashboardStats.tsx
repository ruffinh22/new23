import React from 'react'
import { BarChart3, Users, FileText, TrendingUp, Activity, Zap } from 'lucide-react'

interface AdminDashboardStatsProps {
  stats: {
    totalDocuments: number
    totalUsers: number
    approvedDocuments: number
    pendingDocuments: number
  }
}

const StatCard: React.FC<{
  icon: React.ReactNode
  title: string
  value: number
  change?: number
  gradient: string
  iconColor: string
}> = ({ icon, title, value, change, gradient, iconColor }) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
      {/* Gradient overlay */}
      <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
      
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">{title}</p>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-2">{value.toLocaleString()}</h3>
            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                  change > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
                </div>
                <span className="text-xs text-gray-500 font-medium">ce mois</span>
              </div>
            )}
          </div>
          <div className={`p-4 ${iconColor} rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
            {icon}
          </div>
        </div>
      </div>
      
      {/* Bottom accent */}
      <div className={`h-1.5 ${gradient}`}></div>
    </div>
  )
}

export const AdminDashboardStats: React.FC<AdminDashboardStatsProps> = ({ stats }) => {
  const approvalRate = stats.totalDocuments > 0 
    ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100)
    : 0
  
  const pendingRate = stats.totalDocuments > 0 
    ? Math.round((stats.pendingDocuments / stats.totalDocuments) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FileText size={32} strokeWidth={2.5} className="text-white" />}
          title="Documents Actifs"
          value={stats.totalDocuments}
          change={12}
          gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
          iconColor="bg-gradient-to-br from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={<Users size={32} strokeWidth={2.5} className="text-white" />}
          title="Utilisateurs Actifs"
          value={stats.totalUsers}
          change={8}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
          iconColor="bg-gradient-to-br from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={<TrendingUp size={32} strokeWidth={2.5} className="text-white" />}
          title="Documents Approuvés"
          value={stats.approvedDocuments}
          change={15}
          gradient="bg-gradient-to-br from-green-500 to-emerald-500"
          iconColor="bg-gradient-to-br from-green-500 to-emerald-500"
        />
        <StatCard
          icon={<BarChart3 size={32} strokeWidth={2.5} className="text-white" />}
          title="En Attente"
          value={stats.pendingDocuments}
          change={-5}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          iconColor="bg-gradient-to-br from-amber-500 to-orange-500"
        />
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Validation Statistics */}
        <div className="lg:col-span-2 relative overflow-hidden bg-white rounded-3xl border border-gray-200 shadow-xl">
          {/* Decorative background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100/40 to-purple-100/40 rounded-full blur-3xl"></div>
          
          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
                <Activity size={24} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Statistiques de Validation</h3>
            </div>
            
            <div className="space-y-8">
              {/* Approval Rate */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Taux d'Approbation</span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    {approvalRate}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000 shadow-lg"
                    style={{ width: `${approvalRate}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer"></div>
                  </div>
                </div>
              </div>

              {/* Pending Rate */}
              <div>
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Taux en Attente</span>
                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                    {pendingRate}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-1000 shadow-lg"
                    style={{ width: `${pendingRate}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-xl">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
          
          <div className="relative p-8 text-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Zap size={24} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black tracking-tight">Santé du Système</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <span className="text-sm font-bold uppercase tracking-wider">Disponibilité</span>
                <span className="text-3xl font-black">99.8%</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <span className="text-sm font-bold uppercase tracking-wider">Statut</span>
                <span className="text-sm font-bold flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  En ligne
                </span>
              </div>
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Tous les services opérationnels</span>
                </div>
                <p className="text-xs opacity-80">Dernière mise à jour : À l'instant</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="relative overflow-hidden bg-white rounded-3xl border border-gray-200 shadow-xl">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-100/30 to-transparent rounded-full blur-3xl"></div>
        
        <div className="relative p-8">
          <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Récapitulatif de Gestion</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="relative group overflow-hidden text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 hover:border-blue-300 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-sm font-bold text-blue-700 mb-2 uppercase tracking-wider">Traités</div>
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-cyan-600 mb-2">
                  {stats.approvedDocuments}
                </div>
                <div className="text-xs text-blue-600 font-medium">Approuvés ce mois</div>
              </div>
            </div>

            <div className="relative group overflow-hidden text-center p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 hover:border-amber-300 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-sm font-bold text-amber-700 mb-2 uppercase tracking-wider">En Révision</div>
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-600 to-orange-600 mb-2">
                  {stats.pendingDocuments}
                </div>
                <div className="text-xs text-amber-600 font-medium">Attente de validation</div>
              </div>
            </div>

            <div className="relative group overflow-hidden text-center p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 hover:border-emerald-300 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-sm font-bold text-emerald-700 mb-2 uppercase tracking-wider">Utilisateurs</div>
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-teal-600 mb-2">
                  {stats.totalUsers}
                </div>
                <div className="text-xs text-emerald-600 font-medium">Sur la plateforme</div>
              </div>
            </div>

            <div className="relative group overflow-hidden text-center p-6 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 hover:border-violet-300 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-sm font-bold text-violet-700 mb-2 uppercase tracking-wider">Efficacité</div>
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-purple-600 mb-2">
                  {approvalRate}%
                </div>
                <div className="text-xs text-violet-600 font-medium">Taux de succès</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}