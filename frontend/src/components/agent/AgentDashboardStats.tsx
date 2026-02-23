import React from 'react'
import { FileText, CheckCircle, Clock, TrendingUp, Zap } from 'lucide-react'

interface AgentDashboardStatsProps {
  stats: {
    totalDocuments: number
    approvedDocuments: number
    pendingDocuments: number
  }
}

const StatCard: React.FC<{
  icon: React.ReactNode
  title: string
  value: number
  subtitle: string
  gradient: string
  iconBg: string
  ringColor: string
}> = ({ icon, title, value, subtitle, gradient, iconBg, ringColor }) => {
  return (
    <div className={`group relative overflow-hidden rounded-2xl ${gradient} p-[1px] hover:scale-[1.02] transition-all duration-500`}>
      <div className="relative h-full bg-white rounded-2xl p-6 backdrop-blur-xl">
        {/* Animated background effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/50 to-transparent blur-xl transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </div>
        
        <div className="relative flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-600 mb-2 tracking-wide uppercase">{title}</p>
            <h3 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">{value.toLocaleString()}</h3>
            <p className="text-xs text-gray-500 font-medium">{subtitle}</p>
          </div>
          <div className={`${iconBg} ${ringColor} ring-4 ring-opacity-20 p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-500`}>
            {icon}
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"></div>
      </div>
    </div>
  )
}

export const AgentDashboardStats: React.FC<AgentDashboardStatsProps> = ({ stats }) => {
  const completionRate = stats.totalDocuments > 0 
    ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<FileText size={28} strokeWidth={2.5} className="text-blue-600" />}
          title="Documents Totaux"
          value={stats.totalDocuments}
          subtitle="Tous les documents"
          gradient="bg-gradient-to-br from-blue-500 via-blue-400 to-cyan-400"
          iconBg="bg-gradient-to-br from-blue-50 to-blue-100"
          ringColor="ring-blue-500"
        />
        <StatCard
          icon={<CheckCircle size={28} strokeWidth={2.5} className="text-emerald-600" />}
          title="Documents Approuvés"
          value={stats.approvedDocuments}
          subtitle={`${completionRate}% de taux de complétion`}
          gradient="bg-gradient-to-br from-emerald-500 via-green-400 to-teal-400"
          iconBg="bg-gradient-to-br from-emerald-50 to-emerald-100"
          ringColor="ring-emerald-500"
        />
        <StatCard
          icon={<Clock size={28} strokeWidth={2.5} className="text-amber-600" />}
          title="En Attente"
          value={stats.pendingDocuments}
          subtitle="Documents à traiter"
          gradient="bg-gradient-to-br from-amber-500 via-orange-400 to-yellow-400"
          iconBg="bg-gradient-to-br from-amber-50 to-amber-100"
          ringColor="ring-amber-500"
        />
        <StatCard
          icon={<TrendingUp size={28} strokeWidth={2.5} className="text-violet-600" />}
          title="Taux de Complétion"
          value={completionRate}
          subtitle="Progression en %"
          gradient="bg-gradient-to-br from-violet-500 via-purple-400 to-fuchsia-400"
          iconBg="bg-gradient-to-br from-violet-50 to-violet-100"
          ringColor="ring-violet-500"
        />
      </div>

      {/* Enhanced Summary Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200 shadow-xl">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-100/30 to-violet-100/30 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-100/30 to-cyan-100/30 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg">
              <Zap size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Résumé de l'Activité</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* En Cours */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl opacity-5 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative text-center p-6 rounded-2xl border border-blue-100 bg-white/50 backdrop-blur-sm">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-lg">
                  <Clock size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">Documents en Cours</div>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-cyan-600 mb-2">
                  {stats.pendingDocuments}
                </div>
                <div className="text-xs text-gray-500 font-medium">À traiter par vous</div>
              </div>
            </div>

            {/* Approuvés */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl opacity-5 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative text-center p-6 rounded-2xl border border-emerald-100 bg-white/50 backdrop-blur-sm">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 mb-4 shadow-lg">
                  <CheckCircle size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">Documents Approuvés</div>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-600 to-teal-600 mb-2">
                  {stats.approvedDocuments}
                </div>
                <div className="text-xs text-gray-500 font-medium">Finalisés avec succès</div>
              </div>
            </div>

            {/* Taux de Succès */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl opacity-5 group-hover:opacity-10 transition-opacity"></div>
              <div className="relative text-center p-6 rounded-2xl border border-violet-100 bg-white/50 backdrop-blur-sm">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 mb-4 shadow-lg">
                  <TrendingUp size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <div className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">Taux de Succès</div>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-violet-600 to-purple-600 mb-2">
                  {completionRate}%
                </div>
                <div className="text-xs text-gray-500 font-medium">De vos documents</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}