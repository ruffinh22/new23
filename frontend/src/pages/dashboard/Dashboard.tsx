/**
 * Dashboard Page - Full Screen Layout - Modernized
 * Sans Layout wrapper (pas de sidebar/header)
 * Avec design moderne, animations et glassmorphism
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UniversalDashboard } from '@/components/dashboard/UniversalDashboard'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Activity, 
  FileText, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
export const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [stats] = useState({
    documentsTotal: 1248,
    documentsThisMonth: 342,
    validatedToday: 87,
    pendingApproval: 12,
  })

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const handleUploadDocument = () => {
    navigate('/documents?action=upload')
  }

  const handleSearch = () => {
    navigate('/documents?search=true')
  }

  const handleViewReports = () => {
    navigate('/reports')
  }

  const handleSettings = () => {
    navigate('/settings')
  }

  const handleTemplates = () => {
    navigate('/templates')
  }

  const QuickStatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    trend, 
    color 
  }: { 
    icon: any
    label: string
    value: number
    trend?: number
    color: 'primary' | 'success' | 'warning' | 'info'
  }) => {
    const colorMap = {
      primary: 'from-primary-500/20 to-primary-600/10',
      success: 'from-success-500/20 to-success-600/10',
      warning: 'from-warning-500/20 to-warning-600/10',
      info: 'from-info-500/20 to-info-600/10',
    }
    
    const iconColorMap = {
      primary: 'text-primary-600',
      success: 'text-success-600',
      warning: 'text-warning-600',
      info: 'text-info-600',
    }

    return (
      <div className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorMap[color]} backdrop-blur-xl border border-white/20 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-fade-in`}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl bg-white/10 backdrop-blur-sm ${iconColorMap[color]}`}>
              <Icon size={24} />
            </div>
            {trend !== undefined && (
              <div className={`text-xs font-bold ${trend > 0 ? 'text-success-600' : 'text-error-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </div>
            )}
          </div>
          <p className="text-sm font-medium text-secondary-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-secondary-900">{value.toLocaleString('fr-FR')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50 overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <UniversalDashboard
          
          userName={user?.first_name || 'Utilisateur'}
          onUploadDocument={handleUploadDocument}
          onSearch={handleSearch}
          onViewReports={handleViewReports}
          onSettings={handleSettings}
          onTemplates={handleTemplates}
        />

        {/* Quick Stats Overlay - Enhanced Modern Design */}
        {!isLoading && (
          <div className="fixed bottom-8 left-8 right-8 max-w-6xl mx-auto z-20 pointer-events-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <QuickStatCard
                icon={FileText}
                label="Documents Total"
                value={stats.documentsTotal}
                trend={8}
                color="primary"
              />
              <QuickStatCard
                icon={Activity}
                label="Ce mois"
                value={stats.documentsThisMonth}
                trend={12}
                color="info"
              />
              <QuickStatCard
                icon={CheckCircle2}
                label="Validé Aujourd'hui"
                value={stats.validatedToday}
                trend={5}
                color="success"
              />
              <QuickStatCard
                icon={AlertCircle}
                label="En attente"
                value={stats.pendingApproval}
                trend={-2}
                color="warning"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
