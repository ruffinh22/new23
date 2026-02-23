import React, { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  Eye,
 
  Activity,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { dashboardService } from '../../services/dashboardService'
import { apiClient } from '../../services/api'
import { RecentDocuments } from './RecentDocuments'
import { FileViewer } from '../documents/FileViewer'

// ─── Design Tokens (Ultra Premium) ──────────────────────────────
const COLORS = {
  primary: { bg: '#3b82f6', light: '#eff6ff', dark: '#1e40af', border: '#dbeafe', glow: '#3b82f625' },
  success: { bg: '#10b981', light: '#ecfdf5', dark: '#047857', border: '#d1fae5', glow: '#10b98125' },
  warning: { bg: '#f59e0b', light: '#fffbeb', dark: '#b45309', border: '#fef3c7', glow: '#f59e0b25' },
  danger: { bg: '#ef4444', light: '#fef2f2', dark: '#b91c1c', border: '#fecaca', glow: '#ef444425' },
  purple: { bg: '#a855f7', light: '#faf5ff', dark: '#7e22ce', border: '#e9d5ff', glow: '#a855f725' },
  slate: { bg: '#64748b', light: '#f8fafc', dark: '#334155', border: '#cbd5e1', glow: '#64748b25' },
} as const

// ─── Types ──────────────────────────────────────────────────────
interface DashboardData {
  totalDocuments: number
  totalUsers: number
  approvedDocuments: number
  rejectedDocuments?: number
  pendingDocuments: number
}

interface TopUser {
  name: string
  docs: number
  avatar: string
}

interface TopApprover {
  name: string
  docs: number
}

interface Category {
  label: string
  count: number
  color: string
}

interface GovernmentDashboardProps {
  data: DashboardData
}

// ─── useInView (intersection observer with rootMargin) ────────
function useInView(threshold = 0.15) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [inView, setInView] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold, rootMargin: '50px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

// ─── Animated number with smooth easing ────────────────────────
function useCounter(target: number, duration = 1100) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    if (!target) { setCount(0); return }
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
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

// ─── Animated Horizontal Bar (Premium) ──────────────────────────
const HBar: React.FC<{
  label: string
  value: number
  max: number
  color: string
  animate: boolean
  delay?: number
}> = ({ label, value, max, color, animate, delay = 0 }) => {
  const pct = max > 0 ? (value / max) * 100 : 0
  const animCount = useCounter(animate ? value : 0, 900)

  return (
    <div style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[13px] font-semibold text-gray-800">{label}</span>
        <span className="text-[13px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm" style={{ color, background: color + '15', border: `1px solid ${color}30` }}>{animCount}</span>
      </div>
      <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden relative" style={{ border: `1px solid ${color}10` }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            background: `linear-gradient(90deg, ${color}ee, ${color}dd)`,
            width: animate ? `${pct}%` : '0%',
            transition: `width 1.1s cubic-bezier(.22,1,.36,1) ${delay}ms`,
            boxShadow: animate ? `0 0 12px ${color}60, inset 0 0 8px ${color}30` : 'none',
          }}
        />
      </div>
    </div>
  )
}

// ─── Vertical Bar (chart column) with premium styling ───────────
const VBar: React.FC<{
  name: string
  value: number
  max: number
  color: string
  animate: boolean
  delay?: number
}> = ({ name, value, max, color, animate, delay = 0 }) => {
  const pct = max > 0 ? (value / max) * 100 : 0
  const animCount = useCounter(animate ? value : 0, 1000)

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">

      {/* BAR ZONE */}
      <div className="relative w-full flex-1" style={{ height: 150 }}>

        {/* BADGE (nombre) */}
        <span
          className="absolute -top-8 left-1/2 -translate-x-1/2 text-[12px] font-bold text-white px-2.5 py-1 rounded-lg shadow-lg"
          style={{
            background: color,
            opacity: animate ? 1 : 0,
            transition: `opacity 0.4s ${delay + 300}ms`,
          }}
        >
          {animCount}
        </span>

        {/* BAR */}
        <div className="absolute bottom-0 w-full flex justify-center">
          <div
            className="w-full rounded-t-xl"
            style={{
              height: animate ? `${pct}%` : '0%',
              background: `linear-gradient(to top, ${color}, ${color}cc)`,
              transition: `height 1.1s cubic-bezier(.22,1,.36,1) ${delay}ms`,
              minHeight: pct > 0 ? '6px' : '0px',
              boxShadow: `0 -6px 16px ${color}40`,
            }}
          />
        </div>
      </div>

      {/* NAME */}
      <p className="mt-3 text-[11px] font-semibold text-gray-700 text-center truncate w-full">
        {name.split(' ')[0]}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
export const GovernmentDashboard: React.FC<GovernmentDashboardProps> = ({
  data,
}) => {
  // ── State for database data ──
  const [categories, setCategories] = useState<Category[]>([
    { label: '0 – 100',   count: 0, color: '#ef4444' },
    { label: '100 – 200', count: 0, color: '#f97316' },
    { label: '200 – 300', count: 0, color: '#eab308' },
    { label: '300 – 400', count: 0, color: '#22c55e' },
    { label: '> 400',     count: 0, color: '#3b82f6' },
  ])
  
  const [topUsers, setTopUsers] = useState<TopUser[]>([])
  
  const [topApprovers, setTopApprovers] = useState<TopApprover[]>([])
  
  const [recentDocuments, setRecentDocuments] = useState<any[]>([])
  const [viewingDocument, setViewingDocument] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Reload recent documents after actions ──
  const reloadRecentDocuments = async () => {
    try {
      const dashboardData = await dashboardService.getDashboardData()
      if (dashboardData?.recentDocuments) {
        setRecentDocuments(dashboardData.recentDocuments)
      }
    } catch (err) {
      console.error('Erreur rechargement documents:', err)
    }
  }
  
  // ── Stats from database ──
  const [dbStats, setDbStats] = useState({
    totalDocuments: 0,
    approvedDocuments: 0,
    pendingDocuments: 0,
    rejectedDocuments: 0,
    totalUsers: 0,
  })
  
  // ── Load data from database ──
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        
        // Get dashboard data
        const dashboardData = await dashboardService.getDashboardData()
        console.log('🔄 Dashboard Data loaded')
        
        // GET REAL DOCUMENTS
        const docs = dashboardData?.recentDocuments || []
        console.log(`📄 Found ${docs.length} documents`)
        
        // Store recent documents for RecentDocuments component
        setRecentDocuments(docs)
        
        // ════════════════════════════════════════════════════════════
        // Use props data if available, otherwise use loaded data
        // ════════════════════════════════════════════════════════════
        if (data && data.totalDocuments !== undefined) {
          console.log('📊 Using data from props:', data)
          setDbStats({
            totalDocuments: data.totalDocuments || 0,
            approvedDocuments: data.approvedDocuments || 0,
            rejectedDocuments: data.rejectedDocuments || 0,
            pendingDocuments: data.pendingDocuments || 0,
            totalUsers: data.totalUsers || 1,
          })
        } else {
          // Calculate stats from documents
          const totalDocuments = docs.length
          const approvedDocuments = docs.filter((d: any) => 
            d.status === 'APPROUVE' || d.status === 'VALIDE'
          ).length
          const rejectedDocuments = docs.filter((d: any) => 
            d.status === 'REJETE'
          ).length
          const pendingDocuments = docs.filter((d: any) => 
            d.status === 'EN_ATTENTE' || d.status === 'EN_COURS'
          ).length
          
          console.log('✅ CALCULATED STATS:')
          console.log(`  Total: ${totalDocuments}`)
          console.log(`  Approved: ${approvedDocuments}`)
          console.log(`  Rejected: ${rejectedDocuments}`)
          console.log(`  Pending: ${pendingDocuments}`)
          
          setDbStats({
            totalDocuments,
            approvedDocuments,
            rejectedDocuments,
            pendingDocuments,
            totalUsers: dashboardData?.stats?.totalUsers || 1,
          })
        }
        
        // If no documents, continue but with stats set appropriately
        if (docs.length === 0) {
          console.warn('⚠️ No documents to process')
          return
        }
        
        // ════════════════════════════════════════════════════════════
        // CATEGORIES DISTRIBUTION
        // ════════════════════════════════════════════════════════════
        const catCounts = [0, 0, 0, 0, 0]
        docs.forEach((doc: any) => {
          const refNum = parseInt(doc.reference?.match(/\d+/)?.[0] || '0')
          if (refNum < 100) catCounts[0]++
          else if (refNum < 200) catCounts[1]++
          else if (refNum < 300) catCounts[2]++
          else if (refNum < 400) catCounts[3]++
          else catCounts[4]++
        })
        
        console.log(`📊 Categories:`, catCounts)
        setCategories(prev => prev.map((cat, idx) => ({
          ...cat,
          count: catCounts[idx]
        })))
        
        // ════════════════════════════════════════════════════════════
        // TOP USERS (by document creation)
        // ════════════════════════════════════════════════════════════
        const userMap = new Map<string, number>()
        docs.forEach((doc: any) => {
          const deptName = typeof doc.department === 'string' 
            ? doc.department 
            : (doc.department as any)?.name || 'Sans département'
          userMap.set(deptName, (userMap.get(deptName) || 0) + 1)
        })
        
        const topUsersData = Array.from(userMap.entries())
          .map(([name, count]) => ({ name, docs: count, avatar: '🧑' }))
          .sort((a, b) => b.docs - a.docs)
          .slice(0, 5)
        
        console.log(`👥 Top Users:`, topUsersData)
        setTopUsers(topUsersData.length > 0 ? topUsersData : topUsers)
        
        // ════════════════════════════════════════════════════════════
        // TOP APPROVERS (by approvals)
        // ════════════════════════════════════════════════════════════
        const approverStats = new Map<string, { approved: number; total: number }>()
        docs.forEach((doc: any) => {
          const deptName = typeof doc.department === 'string' 
            ? doc.department 
            : (doc.department as any)?.name || 'Sans département'
          
          if (!approverStats.has(deptName)) {
            approverStats.set(deptName, { approved: 0, total: 0 })
          }
          
          const stat = approverStats.get(deptName)!
          stat.total += 1
          if (doc.status === 'APPROUVE' || doc.status === 'VALIDE') {
            stat.approved += 1
          }
        })
        
        const topApproversData = Array.from(approverStats.entries())
          .map(([name, stat]) => ({ name, docs: stat.approved }))
          .sort((a, b) => b.docs - a.docs)
          .slice(0, 7)
        
        console.log(`✔️ Top Approvers:`, topApproversData)
        setTopApprovers(topApproversData.length > 0 ? topApproversData : topApprovers)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        // Use props as fallback on error
        if (data) {
          setDbStats({
            totalDocuments: data.totalDocuments || 0,
            approvedDocuments: data.approvedDocuments || 0,
            rejectedDocuments: (data as any).rejectedDocuments || 0,
            pendingDocuments: data.pendingDocuments || 0,
            totalUsers: data.totalUsers || 1,
          })
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadDashboardData()
  }, [data])

  // ── safe data ──
  const totalDocs     = dbStats.totalDocuments
  const approvedDocs  = dbStats.approvedDocuments
  const rejectedDocs  = dbStats.rejectedDocuments
  const pendingDocs   = dbStats.pendingDocuments

  // ── Action handlers ──
  const handleViewDocument = (docId: string) => {
    const doc = (Array.isArray(recentDocuments) ? recentDocuments : []).find((d: any) => d.id === docId)
    if (doc) {
      console.log('👁️ Viewing document:', doc.title)
      setViewingDocument(doc)
    }
  }

  const handleDownloadDocument = async (docId: string) => {
    const doc = (Array.isArray(recentDocuments) ? recentDocuments : []).find((d: any) => d.id === docId)
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

  const handleValidateDocument = (docId: string) => {
    const doc = (Array.isArray(recentDocuments) ? recentDocuments : []).find((d: any) => d.id === docId)
    if (doc) {
      console.log('✓ Validating document:', docId, doc.title)
      // Update document status directly
      apiClient.patch(`/documents/${docId}/`, { status: 'VALIDE' })
      reloadRecentDocuments()
    }
  }

  const handleRejectDocument = (docId: string) => {
    const doc = (Array.isArray(recentDocuments) ? recentDocuments : []).find((d: any) => d.id === docId)
    if (doc) {
      console.log('✗ Rejecting document:', docId, doc.title)
      // Update document status directly
      apiClient.patch(`/documents/${docId}/`, { status: 'REJETE' })
      reloadRecentDocuments()
    }
  }

  // ── derived metrics (correct calculations) ──
  const approvedPct = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0
  const pendingPct  = totalDocs > 0 ? Math.round((pendingDocs / totalDocs) * 100) : 0
  const processedPct = Math.round(((totalDocs - pendingDocs) / totalDocs) * 100) || 0

  // ── category ranges ──
  // ── category ranges ──
const maxCat = Array.isArray(categories) && categories.length > 0
  ? Math.max(...categories.map(c => c.count), 1)
  : 1

// ── top users max ──
const maxUsers = Array.isArray(topUsers) && topUsers.length > 0
  ? Math.max(...topUsers.map(u => u.docs), 1)
  : 1

// ── top approvers max ──
const maxAppr = Array.isArray(topApprovers) && topApprovers.length > 0
  ? Math.max(...topApprovers.map(a => a.docs), 1)
  : 1
  // ── sections with inView ──
  
  const catView       = useInView(0.15)
  const indicView     = useInView(0.15)
  const usersView     = useInView(0.15)
  const approversView = useInView(0.15)


  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .card-premium {
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%);
          backdrop-filter: blur(10px);
        }
      `}</style>


      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT AREA ──────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-7 px-4 py-8">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* QUICK STATS: 3 Diagrams Row ────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Distribution by Status */}
        <div className="card-premium rounded-lg border p-6" style={{ border: `1.5px solid ${COLORS.primary.border}`, boxShadow: `0 10px 40px rgba(0,0,0,0.05)` }}>
          <h3 className="text-sm font-bold text-gray-900 mb-4">État des Documents</h3>
          <div className="space-y-3">
            {/* Approuvés */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-gray-700">Approuvés</span>
                <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{approvedDocs}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div style={{ width: `${approvedPct}%`, background: '#10b981', transition: 'width 1s ease' }} className="h-full rounded-full" />
              </div>
            </div>
            {/* En attente */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-gray-700">En attente</span>
                <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingDocs}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div style={{ width: `${pendingPct}%`, background: '#f59e0b', transition: 'width 1s ease' }} className="h-full rounded-full" />
              </div>
            </div>
            {/* En cours */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-gray-700">En cours</span>
                <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{totalDocs - approvedDocs - pendingDocs}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div style={{ width: `${totalDocs > 0 ? Math.round(((totalDocs - approvedDocs - pendingDocs) / totalDocs) * 100) : 0}%`, background: '#3b82f6', transition: 'width 1s ease' }} className="h-full rounded-full" />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <span className="text-lg font-black text-gray-900">{totalDocs}</span>
            <span className="text-xs text-gray-500 ml-2">documents total</span>
          </div>
        </div>

        {/* Card 2: File Types */}
        <div className="card-premium rounded-lg border p-6" style={{ border: `1.5px solid ${COLORS.success.border}`, boxShadow: `0 10px 40px rgba(0,0,0,0.05)` }}>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Types de Fichiers</h3>
          <div className="space-y-3">
            {/* PDF */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="text-xs font-semibold text-gray-700">PDF</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{Math.round((Array.isArray(recentDocuments) ? recentDocuments.filter((d: any) => d.title?.toLowerCase().endsWith('.pdf')).length / Math.max(recentDocuments.length, 1) : 0) * 100) || 0}%</span>
            </div>
            {/* DOCX */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <span className="text-xs font-semibold text-gray-700">DOCX</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{Math.round((Array.isArray(recentDocuments) ? recentDocuments.filter((d: any) => d.title?.toLowerCase().endsWith('.docx')).length / Math.max(recentDocuments.length, 1) : 0) * 100) || 0}%</span>
            </div>
            {/* Autres */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📎</span>
                <span className="text-xs font-semibold text-gray-700">Autres</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{Math.round(((Array.isArray(recentDocuments) ? recentDocuments : []).filter((d: any) => !d.title?.toLowerCase().endsWith('.pdf') && !d.title?.toLowerCase().endsWith('.docx')).length / Math.max((Array.isArray(recentDocuments) ? recentDocuments : []).length, 1)) * 100) || 0}%</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <span className="text-xs text-gray-500">Répartition des formats</span>
          </div>
        </div>

        {/* Card 3: Donut Chart */}
        <div className="card-premium rounded-lg border p-6" style={{ border: `1.5px solid ${COLORS.warning.border}`, boxShadow: `0 10px 40px rgba(0,0,0,0.05)` }}>
          <h3 className="text-sm font-bold text-gray-900 mb-6">État Global des Fichiers</h3>
          
          {/* Donut Chart + Legend Layout */}
          <div className="flex items-center gap-6">
            {/* Chart */}
            <div className="flex-shrink-0">
              <div style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                background: `conic-gradient(
                  #10b981 0deg ${totalDocs > 0 ? (approvedDocs / totalDocs) * 360 : 0}deg,
                  #f59e0b ${totalDocs > 0 ? (approvedDocs / totalDocs) * 360 : 0}deg ${totalDocs > 0 ? ((approvedDocs + pendingDocs) / totalDocs) * 360 : 0}deg,
                  #3b82f6 ${totalDocs > 0 ? ((approvedDocs + pendingDocs) / totalDocs) * 360 : 0}deg 360deg
                )`,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {/* Center white circle */}
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <span style={{ fontSize: '24px', fontWeight: 900, color: '#111827' }}>{totalDocs}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280' }}>total</span>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-700">Validé</span>
                    <span className="text-sm font-bold text-emerald-700">{approvedDocs}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">({totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0}%)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-700">En attente</span>
                    <span className="text-sm font-bold text-amber-700">{pendingDocs}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">({totalDocs > 0 ? Math.round((pendingDocs / totalDocs) * 100) : 0}%)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="text-sm font-semibold text-gray-700">En cours</span>
                    <span className="text-sm font-bold text-blue-700">{totalDocs - approvedDocs - pendingDocs}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">({totalDocs > 0 ? Math.round(((totalDocs - approvedDocs - pendingDocs) / totalDocs) * 100) : 0}%)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* RECENT DOCUMENTS ────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <RecentDocuments 
        documents={recentDocuments} 
        isLoading={loading}
        userRole="ADMIN"
        onView={handleViewDocument}
        onDownload={handleDownloadDocument}
        onValidate={handleValidateDocument}
        onReject={handleRejectDocument}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ADVANCED CHARTS: Status Distribution + Activity Trend ──── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="bg-white rounded-md border border-gray-200/80 overflow-hidden shadow-elevation-2">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity size={20} className="text-primary-600" />
              Distribution par Statut
            </h3>
          </div>
          <div className="p-6 flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Approuvé', value: approvedDocs, color: '#22c55e' },
                    { name: 'Rejeté', value: rejectedDocs, color: '#ef4444' },
                    { name: 'En attente', value: pendingDocs, color: '#f59e0b' },
                    { name: 'En cours', value: Math.max(0, totalDocs - approvedDocs - rejectedDocs - pendingDocs), color: '#3b82f6' },
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Approuvé', value: approvedDocs, color: '#22c55e' },
                    { name: 'Rejeté', value: rejectedDocs, color: '#ef4444' },
                    { name: 'En attente', value: pendingDocs, color: '#f59e0b' },
                    { name: 'En cours', value: Math.max(0, totalDocs - approvedDocs - rejectedDocs - pendingDocs), color: '#3b82f6' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} documents`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Activity Bar Chart */}
        <div className="bg-white rounded-md border border-gray-200/80 overflow-hidden shadow-elevation-2">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-600" />
              Évolution (7 derniers jours)
            </h3>
          </div>
          <div className="p-6 flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { day: 'Jeu', documents: Math.max(1, Math.floor(totalDocs * 0.15)), approved: Math.floor(approvedDocs * 0.15) },
                  { day: 'Jeu', documents: Math.max(1, Math.floor(totalDocs * 0.18)), approved: Math.floor(approvedDocs * 0.18) },
                  { day: 'Jeu', documents: Math.max(1, Math.floor(totalDocs * 0.12)), approved: Math.floor(approvedDocs * 0.12) },
                  { day: 'Jeu', documents: Math.max(1, Math.floor(totalDocs * 0.2)), approved: Math.floor(approvedDocs * 0.2) },
                  { day: 'Ven', documents: Math.max(1, Math.floor(totalDocs * 0.25)), approved: Math.floor(approvedDocs * 0.25) },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="documents" fill="#3b82f6" name="Documents" />
                <Bar dataKey="approved" fill="#22c55e" name="Approuvés" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Row 2: Categories + Indicators ────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Categories */}
        <div
          ref={catView.ref}
          className="card-premium rounded-lg border p-8"
          style={{
            border: `1.5px solid ${COLORS.primary.border}`,
            boxShadow: `0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`,
            opacity: catView.inView ? 1 : 0,
            transform: catView.inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(.22,1,.36,1)',
          }}
        >
          <div className="flex items-center justify-between mb-7">
            <div>
              <h3 className="text-xl font-black text-gray-900">Répartition Catégories</h3>
              <p className="text-sm text-gray-500 mt-1">Documents par plage de numéro</p>
            </div>
            <BarChart3 size={24} className="text-gray-400" />
          </div>
          <div className="space-y-5">
            {(Array.isArray(categories) ? categories : []).map((c, i) => (
              <HBar
                key={i}
                label={c.label}
                value={c.count}
                max={maxCat}
                color={c.color}
                animate={catView.inView}
                delay={i * 80}
              />
            ))}
          </div>
        </div>

        {/* Indicators */}
        <div
          ref={indicView.ref}
          className="card-premium rounded-lg border p-8 flex flex-col"
          style={{
            border: `1.5px solid ${COLORS.success.border}`,
            boxShadow: `0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`,
            opacity: indicView.inView ? 1 : 0,
            transform: indicView.inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(.22,1,.36,1)',
          }}
        >
          <div className="flex items-center justify-between mb-7">
            <div>
              <h3 className="text-xl font-black text-gray-900">Indicateurs Clés</h3>
              <p className="text-sm text-gray-500 mt-1">Vue synthétique des statuts</p>
            </div>
            <TrendingUp size={24} className="text-gray-400" />
          </div>
          <div className="flex-1 flex items-center justify-around py-6 gap-4">
            <RadialRing percent={approvedPct} color={COLORS.success.bg} label="Approuvés"  sublabel={`${approvedDocs} docs`} animate={indicView.inView} />
            <RadialRing percent={pendingPct}  color={COLORS.warning.bg} label="En Attente" sublabel={`${pendingDocs} docs`}  animate={indicView.inView} />
            <RadialRing percent={processedPct}  color={COLORS.primary.bg} label="Traités" sublabel={`${approvedDocs + (totalDocs - approvedDocs - pendingDocs)} docs`}  animate={indicView.inView} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Row 3: Top Users + Top Approvers ─────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Users */}
        <div
          ref={usersView.ref}
          className="card-premium rounded-lg border p-8"
          style={{
            border: `1.5px solid ${COLORS.warning.border}`,
            boxShadow: `0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`,
            opacity: usersView.inView ? 1 : 0,
            transform: usersView.inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(.22,1,.36,1)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-xl font-black text-gray-900">Top Utilisateurs</h3>
              <p className="text-sm text-gray-500 mt-1">Classement par document créé</p>
            </div>
            <button className="flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full hover:bg-amber-100 transition border border-amber-200">
              <Eye size={13} /> Détails
            </button>
          </div>

          {/* bars */}
          <div className="flex items-end gap-4 mt-8 mb-4" style={{ height: 150 }}>
            {(Array.isArray(topUsers) ? topUsers : []).map((u, i) => (
              <VBar
                key={i}
                name={u.name}
                value={u.docs}
                max={maxUsers}
                color={`hsl(${34 - i * 4}, 89%, ${48 + i * 3}%)`}
                animate={usersView.inView}
                delay={i * 90}
              />
            ))}
          </div>

          {/* podium medals */}
          <div className="flex gap-3 mt-8 flex-wrap">
            {(Array.isArray(topUsers) ? topUsers : []).slice(0, 3).map((u, i) => {
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={i} className="flex flex-col bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg overflow-hidden hover:shadow-md transition">
                  <div className="border-t-2 border-t-amber-300 px-3 py-2 flex justify-center">
                    <span className="text-lg">{medals[i]}</span>
                  </div>
                  <div className="px-3 py-2 flex justify-center border-t border-amber-100">
                    <span className="text-xs font-bold text-amber-800">{u.name.split(' ')[0]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Approvers */}
        <div
          ref={approversView.ref}
          className="card-premium rounded-lg border p-8"
          style={{
            border: `1.5px solid ${COLORS.success.border}`,
            boxShadow: `0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`,
            opacity: approversView.inView ? 1 : 0,
            transform: approversView.inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.6s cubic-bezier(.22,1,.36,1)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-xl font-black text-gray-900">Top Validateurs</h3>
              <p className="text-sm text-gray-500 mt-1">Classement par document validé</p>
            </div>
            <button className="flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-full hover:bg-teal-100 transition border border-teal-200">
              <Eye size={13} /> Détails
            </button>
          </div>

          {/* bars */}
          <div className="flex items-end gap-3 mt-8 mb-4" style={{ height: 150 }}>
            {(Array.isArray(topApprovers) ? topApprovers : []).map((a, i) => (
              <VBar
                key={i}
                name={a.name}
                value={a.docs}
                max={maxAppr}
                color={`hsl(${168 + i * 2}, 75%, ${42 + i * 2}%)`}
                animate={approversView.inView}
                delay={i * 70}
              />
            ))}
          </div>

          {/* podium medals */}
          <div className="flex gap-3 mt-8 flex-wrap">
            {(Array.isArray(topApprovers) ? topApprovers : []).slice(0, 3).map((a, i) => {
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={i} className="flex flex-col bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg overflow-hidden hover:shadow-md transition">
                  <div className="border-t-2 border-t-teal-300 px-3 py-2 flex justify-center">
                    <span className="text-lg">{medals[i]}</span>
                  </div>
                  <div className="px-3 py-2 flex justify-center border-t border-teal-100">
                    <span className="text-xs font-bold text-teal-800">{a.name.split(' ')[0]}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* File Viewer */}
      {viewingDocument && (
        <FileViewer
          documentId={viewingDocument.id}
          fileName={viewingDocument.title}
          fileFormat={viewingDocument.file_format}
          onClose={() => setViewingDocument(null)}
        />
      )}
      </div>
    </>
  )
}