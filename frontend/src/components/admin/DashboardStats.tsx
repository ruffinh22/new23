import React from 'react'
import { FileText, Users, CheckCircle, AlertCircle } from 'lucide-react'

interface DashboardStatsProps {
  stats: {
    totalDocuments: number
    totalUsers: number
    approvedDocuments: number
    pendingDocuments: number
  }
}

const StatCard: React.FC<{
  icon: React.ReactNode
  label: string
  value: number
  gradient: string
  iconBg: string
}> = ({ icon, label, value, gradient, iconBg }) => (
  <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03]">
    {/* Animated gradient background */}
    <div className={`absolute inset-0 ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-700`}></div>
    
    {/* Shine effect on hover */}
    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
    </div>

    <div className="relative p-8">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-3">{label}</p>
          <p className="text-5xl font-black text-gray-900 tracking-tight">{value}</p>
        </div>
        <div className={`${iconBg} p-5 rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
          {icon}
        </div>
      </div>
    </div>

    {/* Bottom accent line */}
    <div className={`h-1.5 ${gradient}`}></div>
  </div>
)

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        icon={<FileText size={32} className="text-blue-600" strokeWidth={2.5} />}
        label="Total Documents"
        value={stats.totalDocuments}
        gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
        iconBg="bg-gradient-to-br from-blue-50 to-blue-100"
      />
      <StatCard
        icon={<Users size={32} className="text-emerald-600" strokeWidth={2.5} />}
        label="Total Users"
        value={stats.totalUsers}
        gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
        iconBg="bg-gradient-to-br from-emerald-50 to-emerald-100"
      />
      <StatCard
        icon={<CheckCircle size={32} className="text-green-600" strokeWidth={2.5} />}
        label="Approved"
        value={stats.approvedDocuments}
        gradient="bg-gradient-to-br from-green-500 to-emerald-500"
        iconBg="bg-gradient-to-br from-green-50 to-green-100"
      />
      <StatCard
        icon={<AlertCircle size={32} className="text-amber-600" strokeWidth={2.5} />}
        label="Pending"
        value={stats.pendingDocuments}
        gradient="bg-gradient-to-br from-amber-500 to-orange-500"
        iconBg="bg-gradient-to-br from-amber-50 to-amber-100"
      />
    </div>
  )
}