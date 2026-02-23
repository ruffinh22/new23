/**
 * Universal Dashboard Component
 * Composant unique qui s'adapte aux rôles ADMIN et AGENT
 * 
 * CORRECTION IMPORTANTE:
 * - ADMIN voit TOUS les documents (tous les agents)
 * - AGENT voit UNIQUEMENT ses propres documents
 */

import React, { useEffect, useState } from 'react'
import {
  FileText,
  CheckCircle2,
  Clock,
  TrendingUp,
  RefreshCw,
  Bell,
  User,
  ArrowUpRight,
  Upload,
  BarChart3,
  Eye,
  X,
} from 'lucide-react'
import { RecentDocuments } from './RecentDocuments'
import { DepartmentStatsComponent } from './DepartmentStats'
import { QuickActions } from './QuickActions'
import { DashboardCharts } from './DashboardCharts'
import { AlertsComponent, Alert } from './Alerts'
import { DocumentList } from './DocumentList'
import { GovernmentDashboard } from './GovernmentDashboard'
import { DocumentUpload } from '../agent/DocumentUpload'
import { FileViewer } from '../documents/FileViewer'
import { DashboardData, dashboardService } from '@/services/dashboardService'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'

interface UniversalDashboardProps {
  userName?: string
  onUploadDocument?: () => void
  onSearch?: () => void
  onViewReports?: () => void
  onSettings?: () => void
  onTemplates?: () => void
  showFullView?: boolean
}

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════
interface AdminStats {
  totalDocuments: number
  totalUsers: number
  approvedDocuments: number
  pendingDocuments: number
}

// ═══════════════════════════════════════════════════════════════════
// ANIMATED COUNTER HOOK
// ═══════════════════════════════════════════════════════════════════
function useCounter(target: number, duration = 1200) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    if (!target) {
      setCount(0)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return count
}

// ─── Animated Radial Progress Ring (Premium) ────────────────────
const RadialRing: React.FC<{
  percent: number
  color: string
  label: string
  sublabel: string
  animate: boolean
}> = ({ percent, color, label, sublabel, animate }) => {
  const R = 48
  const circ = 2 * Math.PI * R
  const offset = circ - (percent / 100) * circ
  const animVal = useCounter(animate ? percent : 0, 1000)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 140, height: 140 }}>
        <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
            <filter id={`blur-${color}`}>
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
            </filter>
          </defs>
          {/* outer track glow */}
          <circle cx={70} cy={70} r={R} fill="none" stroke={color} strokeWidth={11} opacity="0.1" />
          {/* main track */}
          <circle cx={70} cy={70} r={R} fill="none" stroke="#f0f0f0" strokeWidth={9} />
          {/* progress bar */}
          <circle
            cx={70} cy={70} r={R}
            fill="none"
            stroke={`url(#grad-${color})`}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={animate ? offset : circ}
            style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.22,1,.36,1)', filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        {/* center label with pulse */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div style={{
            opacity: animate ? 1 : 0.3,
            transition: 'opacity 0.8s ease',
          }}>
            <span className="text-[28px] font-black text-gray-900">{animVal}</span>
            <span className="text-[14px] text-gray-500 ml-1">%</span>
          </div>
        </div>
        {/* ambient glow */}
        <div
          className="absolute -inset-3 rounded-full pointer-events-none"
          style={{
            boxShadow: animate ? `inset 0 0 24px ${color}20, 0 0 32px ${color}25` : `inset 0 0 12px ${color}08`,
            transition: 'box-shadow 1s ease'
          }}
        />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-bold text-gray-900">{label}</p>
        <p className="text-[12px] text-gray-500 mt-1">{sublabel}</p>
      </div>
    </div>
  )
}

export const UniversalDashboard: React.FC<UniversalDashboardProps> = ({
  userName = 'Utilisateur',
  onUploadDocument,
  onSearch,
  onViewReports,
  onSettings,
  onTemplates,
  showFullView = true,
}) => {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalDocuments: 0,
    totalUsers: 0,
    approvedDocuments: 0,
    pendingDocuments: 0,
  })
  const [categories, setCategories] = useState<any[]>([
    { label: '0 – 100',   count: 0, color: '#ef4444' },
    { label: '100 – 200', count: 0, color: '#f97316' },
    { label: '200 – 300', count: 0, color: '#eab308' },
    { label: '300 – 400', count: 0, color: '#22c55e' },
    { label: '> 400',     count: 0, color: '#3b82f6' },
  ])
  const [topUsers, setTopUsers] = useState<any[]>([])
  const [topApprovers, setTopApprovers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  // Load data based on role
  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // UNIFIED APPROACH: Same method for both ADMIN and AGENT
      // Pass false for ADMIN (load all documents), true for AGENT (filter by current user)
      const isAgent = user?.role === 'AGENT'
      
      console.log(`[UniversalDashboard][${user?.role}] Loading dashboard data (forAgent: ${isAgent})`)
      
      // Load core dashboard data (uses dashboardService which handles filtering)
      const data = await dashboardService.getDashboardData(isAgent)
      
      // For ADMIN, set adminStats. For AGENT, set dashboardData
      if (user?.role === 'ADMIN') {
        setAdminStats({
          totalDocuments: data.stats.totalDocuments || 0,
          approvedDocuments: data.stats.approvedDocuments || 0,
          pendingDocuments: data.stats.pendingDocuments || 0,
          totalUsers: data.stats.totalUsers || 0,
        })
      } else {
        setDashboardData(data)
        generateAlerts(data)
      }
      
      // Calculate categories, top users, top approvers from loaded documents
      const docs = data.recentDocuments || []
      
      if (Array.isArray(docs) && docs.length > 0) {
        // Calculate categories (based on reference number)
        const catCounts = [0, 0, 0, 0, 0]
        docs.forEach((doc: any) => {
          const refNum = parseInt(doc.reference?.match(/\d+/)?.[0] || '0')
          if (refNum < 100) catCounts[0]++
          else if (refNum < 200) catCounts[1]++
          else if (refNum < 300) catCounts[2]++
          else if (refNum < 400) catCounts[3]++
          else catCounts[4]++
        })
        setCategories(prev => prev.map((cat, idx) => ({ ...cat, count: catCounts[idx] })))
        
        // Calculate TOP USERS (by department)
        const userMap = new Map<string, number>()
        docs.forEach((doc: any) => {
          const deptName = typeof doc.department === 'string' 
            ? doc.department 
            : (doc.department as any) || 'Sans département'
          userMap.set(deptName, (userMap.get(deptName) || 0) + 1)
        })
        const topUsersData = Array.from(userMap.entries())
          .map(([name, count]) => ({ name, docs: count }))
          .sort((a, b) => b.docs - a.docs)
          .slice(0, 3)
        setTopUsers(topUsersData.length > 0 ? topUsersData : topUsers)
        
        // Calculate TOP APPROVERS (by department, only approved documents)
        const approverStats = new Map<string, number>()
        docs.forEach((doc: any) => {
          const deptName = typeof doc.department === 'string' 
            ? doc.department 
            : (doc.department as any) || 'Sans département'
          if (doc.status === 'APPROUVE' || doc.status === 'VALIDE') {
            approverStats.set(deptName, (approverStats.get(deptName) || 0) + 1)
          }
        })
        const topApproversData = Array.from(approverStats.entries())
          .map(([name, count]) => ({ name, docs: count }))
          .sort((a, b) => b.docs - a.docs)
          .slice(0, 3)
        setTopApprovers(topApproversData.length > 0 ? topApproversData : topApprovers)
      }
      
      setLastUpdated(new Date())
    } catch (e) {
      console.error('[UniversalDashboard]', e)
    } finally {
      setIsLoading(false)
    }
  }

  const generateAlerts = (data: DashboardData) => {
    const newAlerts: Alert[] = []
    if (data.stats && data.stats.pendingDocuments > 5) {
      newAlerts.push({
        id: 'pending',
        type: 'warning',
        title: 'Documents en attente',
        message: `${data.stats.pendingDocuments} documents sont en attente d'approbation`,
      })
    }
    if (data.stats && data.stats.rejectedDocuments > 0) {
      newAlerts.push({
        id: 'rejected',
        type: 'error',
        title: 'Documents rejetés',
        message: `${data.stats.rejectedDocuments} document(s) ont été rejetés`,
      })
    }
    if (data.stats && data.stats.completionRate >= 80) {
      newAlerts.push({
        id: 'success',
        type: 'success',
        title: 'Excellent taux de complétude!',
        message: `${data.stats.completionRate}% des documents ont été approuvés`,
        dismissible: true,
      })
    }
    setAlerts(newAlerts)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Pass true for agent, false for admin
      const data = await dashboardService.getDashboardData(user?.role === 'AGENT')
      setDashboardData(data)
      setLastUpdated(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }

  // ── Document Action Handlers ──
  const [viewingDocument, setViewingDocument] = React.useState<any>(null)

  const handleViewDocument = (docId: string) => {
    const doc = dashboardData?.recentDocuments?.find((d: any) => d.id === docId)
    if (doc) {
      console.log('👁️ Viewing document:', doc.title)
      setViewingDocument(doc)
    }
  }

  const handleDownloadDocument = async (docId: string) => {
    const doc = dashboardData?.recentDocuments?.find((d: any) => d.id === docId)
    if (doc) {
      try {
        console.log('⬇️ Downloading document:', doc.title)
        const response = await apiClient.get(`/documents/${docId}/download/`, {
          responseType: 'blob'
        })
        // Create a blob URL and trigger download
        const url = window.URL.createObjectURL(response.data)
        const link = document.createElement('a')
        link.href = url
        link.download = doc.title || `document-${docId}`
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
      } catch (err) {
        console.error('Erreur téléchargement:', err)
      }
    }
  }

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.role])

  const stats = user?.role === 'ADMIN' ? adminStats : dashboardData?.stats

  // ─── SKELETON ───────────────────────────────────────────────────
  if (isLoading && !dashboardData && user?.role === 'AGENT') {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-white rounded-lg shadow-base" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 bg-white rounded-lg shadow-base animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  
  // ═══════════════════════════════════════════════════════════════
  // ADMIN RENDER
  // ═══════════════════════════════════════════════════════════════
  if (user?.role === 'ADMIN') {
    const approvalRate = adminStats.totalDocuments > 0 
      ? Math.round((adminStats.approvedDocuments / adminStats.totalDocuments) * 100) 
      : 0

    return (
      <div className="space-y-8">
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .card-premium {
            background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%);
            backdrop-filter: blur(10px);
          }
        `}</style>

        {/* Modern Header Section */}
        <div className="relative overflow-hidden rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30"></div>
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-primary-200/20 to-accent-200/20 rounded-full blur-3xl animate-pulse"></div>
            <div
              className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-br from-accent-200/20 to-primary-200/20 rounded-full blur-3xl animate-pulse"
              style={{ animationDelay: '1s' }}
            ></div>

            <div className="relative backdrop-blur-xl border border-white/40 p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                    <span className="text-2xl">👋</span>
                  </div>

                  <div className="min-w-0 pt-0.5">
                    <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wider mb-0.5">Plateforme Documentaire Avancée</p>
                    <h1 className="text-2xl md:text-3xl font-black text-red-600">
                      Centre de Gestion Documentaire
                    </h1>
                    <p className="text-xs text-secondary-500 mt-1">
                      Gestion intelligente • Routage automatisé • Temps réel
                    </p>
                  </div>
                </div>

                {/* Right side: Cards + buttons on same line */}
                <div className="flex gap-3 flex-shrink-0">
                  {/* Documents Card */}
                  <div className="flex items-center gap-2 bg-white/40 backdrop-blur px-3 py-2 rounded-lg min-w-max">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <FileText size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-secondary-600 font-medium">Documents</p>
                      <p className="text-sm font-bold text-gray-900">25</p>
                      <p className="text-xs text-green-600">+12% cette</p>
                    </div>
                  </div>
                  
                  {/* Users Card */}
                  <div className="flex items-center gap-2 bg-white/40 backdrop-blur px-3 py-2 rounded-lg min-w-max">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <User size={18} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-secondary-600 font-medium">Utilisateurs</p>
                      <p className="text-sm font-bold text-gray-900">6</p>
                      <p className="text-xs text-gray-600">Actifs</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`p-2.5 hover:bg-primary-100 rounded-lg transition-all transform hover:scale-105 ${
                      isRefreshing ? 'animate-spin' : ''
                    }`}
                    title="Actualiser"
                  >
                    <RefreshCw size={20} className="text-primary-600" />
                  </button>
                  <button
                    className="p-2.5 hover:bg-accent-100 rounded-lg transition-all transform hover:scale-105 relative"
                    title="Notifications"
                  >
                    <Bell size={20} className="text-accent-600" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full animate-pulse" />
                  </button>
                  <button className="p-2.5 hover:bg-info-100 rounded-lg transition-all transform hover:scale-105" title="Profil">
                    <User size={20} className="text-info-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* Alerts */}
        <AlertsComponent
          alerts={alerts}
          onDismiss={(id) => {
            setAlerts(alerts.filter((a) => a.id !== id))
          }}
        />

        <QuickActions
          onUploadDocument={onUploadDocument}
          onSearch={onSearch}
          onViewReports={onViewReports}
          onSettings={onSettings}
          onTemplates={onTemplates}
        />

        {/* Statistics Cards + Quick Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Documents */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 group">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Documents Totaux</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.totalDocuments}</p>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition">
                <FileText size={20} className="text-blue-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpRight size={14} className="mr-1" />
              <span>+12% cette semaine</span>
            </div>
          </div>

          {/* Pending Documents */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 group border border-amber-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-medium text-amber-700 mb-1">En Attente</p>
                <p className="text-2xl font-bold text-amber-900">{adminStats.pendingDocuments}</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition">
                <Clock size={20} className="text-amber-600" />
              </div>
            </div>
          </div>

          {/* Approved Documents */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 group border border-green-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-medium text-green-700 mb-1">Approuvés</p>
                <p className="text-2xl font-bold text-green-900">{adminStats.approvedDocuments}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
                <CheckCircle2 size={20} className="text-green-600" />
              </div>
            </div>
            <div className="flex items-center text-xs text-green-600">
              <span>Taux d'approbation excellent</span>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 group border border-blue-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-medium text-blue-700 mb-1">Taux Complétion</p>
                <p className="text-2xl font-bold text-blue-900">{approvalRate}%</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                <TrendingUp size={20} className="text-blue-600" />
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 group border border-purple-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-medium text-purple-700 mb-1">Utilisateurs Actifs</p>
                <p className="text-2xl font-bold text-purple-900">{adminStats.totalUsers}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                <User size={20} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Government Dashboard */}
        <GovernmentDashboard
          data={adminStats}
        />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // AGENT RENDER (ProfessionalDashboard-like)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .card-premium {
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%);
          backdrop-filter: blur(10px);
        }
      `}</style>

      {/* Modern Header Section */}
      <div className="relative overflow-hidden rounded-2xl mb-8">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-primary-200/20 to-accent-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-br from-accent-200/20 to-primary-200/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        ></div>

        <div className="relative backdrop-blur-xl border border-white/40 p-6 md:p-8">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                <span className="text-2xl">👋</span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-secondary-600 uppercase tracking-wider mb-0.5">Bienvenue</p>
                <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent truncate">
                  {userName}
                </h1>
                <p className="text-xs text-secondary-500 mt-1">
                  Dernière mise à jour il y a{' '}
                  <span className="font-bold text-primary-600">{Math.round((new Date().getTime() - lastUpdated.getTime()) / 1000)}s</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2.5 hover:bg-primary-100 rounded-lg transition-all transform hover:scale-105 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                title="Actualiser"
              >
                <RefreshCw size={20} className="text-primary-600" />
              </button>
              <button
                className="p-2.5 hover:bg-accent-100 rounded-lg transition-all transform hover:scale-105 relative"
                title="Notifications"
              >
                <Bell size={20} className="text-accent-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full animate-pulse" />
              </button>
              <button className="p-2.5 hover:bg-info-100 rounded-lg transition-all transform hover:scale-105" title="Profil">
                <User size={20} className="text-info-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <AlertsComponent
        alerts={alerts}
        onDismiss={(id) => {
          setAlerts(alerts.filter((a) => a.id !== id))
        }}
      />

      <QuickActions
        onUploadDocument={onUploadDocument}
        onSearch={onSearch}
        onViewReports={onViewReports}
        onSettings={onSettings}
        onTemplates={onTemplates}
      />

      {/* Statistics Cards + Quick Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Total Documents */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Documents Totaux</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalDocuments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition">
              <FileText size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="flex items-center text-sm text-green-600">
            <ArrowUpRight size={16} className="mr-1" />
            <span>+12% cette semaine</span>
          </div>
        </div>

        {/* Pending Documents */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 group border border-amber-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-amber-700 mb-1">En Attente</p>
              <p className="text-3xl font-bold text-amber-900">{stats?.pendingDocuments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition">
              <Clock size={24} className="text-amber-600" />
            </div>
          </div>
        </div>

        {/* Approved Documents */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 group border border-green-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Approuvés</p>
              <p className="text-3xl font-bold text-green-900">{stats?.approvedDocuments || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
              <CheckCircle2 size={24} className="text-green-600" />
            </div>
          </div>
          <div className="flex items-center text-xs text-green-600">
            <span>Taux d'approbation excellent</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 group border border-blue-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Taux Complétion</p>
              <p className="text-3xl font-bold text-blue-900">
                {stats?.totalDocuments && stats?.totalDocuments > 0
                  ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100)
                  : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 rounded-full h-2 transition-all duration-500"
              style={{
                width: `${
                  stats?.totalDocuments && stats?.totalDocuments > 0
                    ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100)
                    : 0
                }%`
              }}
            />
          </div>
        </div>

        {/* Quick Upload Zone */}
        <div className="md:col-span-2 lg:col-span-1 h-full">
          <div 
            onClick={() => setIsUploadOpen(true)}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 h-full border-2 border-dashed border-blue-300 hover:border-blue-500 cursor-pointer flex flex-col items-center justify-center group"
          >
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Upload size={20} className="text-blue-600" />
                </div>
              </div>
              <p className="text-xs font-semibold text-blue-600 mb-1">Upload Rapide</p>
              <p className="text-xs text-gray-700">Déposez un document</p>
              <p className="text-[10px] text-gray-500 mt-1">ou cliquez pour sélectionner</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentDocuments
            documents={dashboardData?.recentDocuments || []}
            isLoading={isLoading}
            userRole="AGENT"
            onView={handleViewDocument}
            onDownload={handleDownloadDocument}
          />
        </div>

        <div>
          <DepartmentStatsComponent
            departments={dashboardData?.departmentStats || []}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Row 2: Categories + Indicators (AGENT VIEW) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories */}
        <div className="card-premium rounded-2xl border p-8" style={{
          border: '1.5px solid #dbeafe',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}>
          <div className="flex items-center justify-between mb-7">
            <div>
              <h3 className="text-xl font-black text-gray-900">Répartition Catégories</h3>
              <p className="text-sm text-gray-500 mt-1">Documents par plage de numéro</p>
            </div>
            <BarChart3 size={24} className="text-gray-400" />
          </div>
          <div className="space-y-5">
            {categories && categories.length > 0 ? (
              categories.map((c, i) => {
                const maxCat = Math.max(...categories.map(cat => cat.count), 1)
                const pct = (c.count / maxCat) * 100
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[13px] font-semibold text-gray-800">{c.label}</span>
                      <span className="text-[13px] font-bold px-2.5 py-1 rounded-lg" style={{ color: c.color, background: c.color + '15', border: `1px solid ${c.color}30` }}>{c.count}</span>
                    </div>
                    <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden relative" style={{ border: `1px solid ${c.color}10` }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          background: `linear-gradient(90deg, ${c.color}ee, ${c.color}dd)`,
                          width: `${pct}%`,
                          boxShadow: `0 0 12px ${c.color}60, inset 0 0 8px ${c.color}30`,
                        }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-4 text-center text-gray-400">Chargement des catégories...</div>
            )}
          </div>
        </div>

        {/* Indicators */}
        <div className="card-premium rounded-2xl border p-8 flex flex-col" style={{
          border: '1.5px solid #d1fae5',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}>
          <div className="flex items-center justify-between mb-7">
            <div>
              <h3 className="text-xl font-black text-gray-900">Indicateurs Clés</h3>
              <p className="text-sm text-gray-500 mt-1">Vue synthétique des statuts</p>
            </div>
            <TrendingUp size={24} className="text-gray-400" />
          </div>
          <div className="flex-1 flex items-center justify-around py-6 gap-4">
            <RadialRing
              percent={stats?.totalDocuments && stats?.totalDocuments > 0 ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100) : 0}
              color="#10b981"
              label="Approuvés"
              sublabel={`${stats?.approvedDocuments || 0} docs`}
              animate={true}
            />
            <RadialRing
              percent={stats?.totalDocuments && stats?.totalDocuments > 0 ? Math.round((stats.pendingDocuments / stats.totalDocuments) * 100) : 0}
              color="#f59e0b"
              label="En Attente"
              sublabel={`${stats?.pendingDocuments || 0} docs`}
              animate={true}
            />
            <RadialRing
              percent={stats?.totalDocuments && stats?.totalDocuments > 0 ? Math.round(((stats.totalDocuments - stats.pendingDocuments) / stats.totalDocuments) * 100) : 0}
              color="#3b82f6"
              label="Traités"
              sublabel={`${(stats?.totalDocuments || 0) - (stats?.pendingDocuments || 0)} docs`}
              animate={true}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Top Users + Top Approvers (AGENT VIEW) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div className="card-premium rounded-2xl border p-8" style={{
          border: '1.5px solid #fef3c7',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-black text-gray-900">Top Utilisateurs</h3>
              <p className="text-sm text-gray-500 mt-1">Classement par document créé</p>
            </div>
            <button className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full hover:bg-amber-100 transition border border-amber-200">
              <Eye size={13} /> Détails
            </button>
          </div>
          <div className="mt-6">
            {topUsers && topUsers.length > 0 ? (
              <div className="space-y-3">
                {topUsers.map((u, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#fffbeb' }}>
                    <span className="text-sm font-medium text-gray-700">{u.name}</span>
                    <span className="font-bold text-amber-700">{u.docs} docs</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg animate-pulse" style={{ background: '#fffbeb' }}>
                  <span className="text-sm font-medium text-gray-400">Chargement...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Approvers */}
        <div className="card-premium rounded-2xl border p-8" style={{
          border: '1.5px solid #d1fae5',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xl font-black text-gray-900">Top Validateurs</h3>
              <p className="text-sm text-gray-500 mt-1">Classement par document validé</p>
            </div>
            <button className="flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full hover:bg-teal-100 transition border border-teal-200">
              <Eye size={13} /> Détails
            </button>
          </div>
          <div className="mt-6">
            {topApprovers && topApprovers.length > 0 ? (
              <div className="space-y-3">
                {topApprovers.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#ecfdf5' }}>
                    <span className="text-sm font-medium text-gray-700">{a.name}</span>
                    <span className="font-bold text-teal-700">{a.docs} docs</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg animate-pulse" style={{ background: '#ecfdf5' }}>
                  <span className="text-sm font-medium text-gray-400">Chargement...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <DashboardCharts stats={dashboardData?.stats || null} isLoading={isLoading} />

      {/* Complete Documents List */}
      {showFullView && (
        <DocumentList
          documents={dashboardData?.recentDocuments || []}
          isLoading={isLoading}
          title="Tous les Documents"
          onViewDocument={(id) => {
            console.log('View document:', id)
          }}
          onDeleteDocument={(id) => {
            console.log('Delete document:', id)
          }}
        />
      )}

      {/* Information Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Système</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-1">Capacité de Stockage</p>
            <div className="mt-3">
              <p className="text-2xl font-bold text-gray-900">78%</p>
              <div className="w-full bg-gray-300 rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-yellow-500 h-full" style={{ width: '78%' }} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-600 font-medium uppercase tracking-wide mb-1">Statut Système</p>
            <p className="text-2xl font-bold text-green-600 mt-3">Actif</p>
            <p className="text-xs text-gray-600 mt-2">Tous les services fonctionnent correctement</p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Documents cette semaine</p>
            <p className="text-2xl font-bold text-blue-600 mt-3">{Math.floor((stats?.totalDocuments || 0) * 0.3)}</p>
            <p className="text-xs text-gray-600 mt-2">Documents traités</p>
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      <DocumentUpload 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
      />

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-[90%] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 truncate">{viewingDocument.title}</h2>
                <p className="text-sm text-gray-500 mt-1">Référence: {viewingDocument.reference}</p>
              </div>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* FileViewer Content */}
            <div className="flex-1 overflow-auto bg-gray-50">
              <FileViewer 
                documentId={viewingDocument.id}
                fileName={viewingDocument.title}
                fileFormat={viewingDocument.file_format}
                onClose={() => setViewingDocument(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
