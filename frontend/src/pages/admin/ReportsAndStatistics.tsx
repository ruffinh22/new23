import React, { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
 

  Eye,
} from 'lucide-react'


// ─── Types ──────────────────────────────────────────────────────
interface ReportsStats {
  totalDocuments: number
  approvedDocuments: number
  rejectedDocuments: number
  pendingDocuments: number
  inProgressDocuments: number
}



// ─── useCounter hook ────────────────────────────────────────────
function useCounter(target: number, duration = 1000) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    if (!target) { setCount(0); return }
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return count
}

// ─── useInView hook ────────────────────────────────────────────
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

// ─── DESIGN TOKENS ─────────────────────────────────────────────
const COLORS = {
  primary: { bg: '#3b82f6', light: '#eff6ff', dark: '#1e40af', border: '#dbeafe', glow: '#3b82f625' },
  success: { bg: '#10b981', light: '#ecfdf5', dark: '#047857', border: '#d1fae5', glow: '#10b98125' },
  warning: { bg: '#f59e0b', light: '#fffbeb', dark: '#b45309', border: '#fef3c7', glow: '#f59e0b25' },
  danger: { bg: '#ef4444', light: '#fef2f2', dark: '#b91c1c', border: '#fecaca', glow: '#ef444425' },
  purple: { bg: '#a855f7', light: '#faf5ff', dark: '#7e22ce', border: '#e9d5ff', glow: '#a855f725' },
  slate: { bg: '#64748b', light: '#f8fafc', dark: '#334155', border: '#cbd5e1', glow: '#64748b25' },
} as const

// ─── RADIAL RING COMPONENT ────────────────────────────────────
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
          </defs>
          <circle cx={70} cy={70} r={R} fill="none" stroke={color} strokeWidth={11} opacity="0.1" />
          <circle cx={70} cy={70} r={R} fill="none" stroke="#f0f0f0" strokeWidth={9} />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div style={{
            opacity: animate ? 1 : 0.3,
            transition: 'opacity 0.8s ease',
          }}>
            <span className="text-[28px] font-black text-gray-900">{animVal}</span>
            <span className="text-[14px] text-gray-500 ml-1">%</span>
          </div>
        </div>
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

// ─── HBAR COMPONENT ──────────────────────────────────────────
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

// ─── VBAR COMPONENT ──────────────────────────────────────────
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
      <div className="relative w-full flex-1" style={{ height: 150 }}>
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
      <p className="mt-3 text-[11px] font-semibold text-gray-700 text-center truncate w-full">
        {name.split(' ')[0]}
      </p>
    </div>
  )
}

interface ReportsAndStatisticsProps {
  documents: any[]
}

export const ReportsAndStatistics: React.FC<ReportsAndStatisticsProps> = ({ documents: propDocuments = [] }) => {
  const [stats, setStats] = useState<ReportsStats>({
    totalDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
    pendingDocuments: 0,
    inProgressDocuments: 0,
  })

  
  const [categories, setCategories] = useState<any[]>([
    { label: '0 – 100',   count: 0, color: '#ef4444' },
    { label: '100 – 200', count: 0, color: '#f97316' },
    { label: '200 – 300', count: 0, color: '#eab308' },
    { label: '300 – 400', count: 0, color: '#22c55e' },
    { label: '> 400',     count: 0, color: '#3b82f6' },
  ])
  const [topUsers, setTopUsers] = useState<any[]>([
    { name: 'Ahmed Hassan',  docs: 0 },
    { name: 'Fatima Zahra',  docs: 0 },
    { name: 'Mohamed Ali',   docs: 0 },
  ])
  const [topApprovers, setTopApprovers] = useState<any[]>([
    { name: 'Hassan Ali',    docs: 0 },
    { name: 'Leila Karim',   docs: 0 },
    { name: 'Omar Majid',    docs: 0 },
  ])

  
  const catView = useInView(0.15)
  const indicView = useInView(0.15)
  const usersView = useInView(0.15)
  const approversView = useInView(0.15)

  // ─── Process statistics from props ──────────────────────────
  const processStatistics = () => {
    try {
      console.log('📊 Processing reports statistics from props...')

      const docs = propDocuments || []
      console.log(`📄 Processing ${docs.length} documents`)

      // Calculate statistics
      const totalDocuments = docs.length
      const approvedDocuments = docs.filter((d: any) =>
        d.status === 'APPROUVE' || d.status === 'VALIDE'
      ).length
      const rejectedDocuments = docs.filter((d: any) =>
        d.status === 'REJETE' || d.status === 'REFUSE'
      ).length
      const pendingDocuments = docs.filter((d: any) =>
        d.status === 'EN_ATTENTE'
      ).length
      const inProgressDocuments = docs.filter((d: any) =>
        d.status === 'EN_COURS'
      ).length

      console.log('✅ STATISTICS CALCULATED:')
      console.log(`  Total: ${totalDocuments}`)
      console.log(`  Approved: ${approvedDocuments}`)
      console.log(`  Rejected: ${rejectedDocuments}`)
      console.log(`  Pending: ${pendingDocuments}`)
      console.log(`  In Progress: ${inProgressDocuments}`)

      setStats({
        totalDocuments,
        approvedDocuments,
        rejectedDocuments,
        pendingDocuments,
        inProgressDocuments,
      })

      // ════════════════════════════════════════════════════════════
      // LOAD CATEGORIES, TOP USERS, TOP APPROVERS
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
      setCategories(prev => prev.map((cat, idx) => ({ ...cat, count: catCounts[idx] })))

      // TOP USERS
      const userMap = new Map<string, number>()
      docs.forEach((doc: any) => {
        const deptName = typeof doc.department === 'string' 
          ? doc.department 
          : (doc.department as any)?.name || 'Sans département'
        userMap.set(deptName, (userMap.get(deptName) || 0) + 1)
      })
      const topUsersData = Array.from(userMap.entries())
        .map(([name, count]) => ({ name, docs: count }))
        .sort((a, b) => b.docs - a.docs)
        .slice(0, 3)
      setTopUsers(topUsersData.length > 0 ? topUsersData : topUsers)

      // TOP APPROVERS
      const approverStats = new Map<string, number>()
      docs.forEach((doc: any) => {
        const deptName = typeof doc.department === 'string' 
          ? doc.department 
          : (doc.department as any)?.name || 'Sans département'
        if (doc.status === 'APPROUVE' || doc.status === 'VALIDE') {
          approverStats.set(deptName, (approverStats.get(deptName) || 0) + 1)
        }
      })
      const topApproversData = Array.from(approverStats.entries())
        .map(([name, count]) => ({ name, docs: count }))
        .sort((a, b) => b.docs - a.docs)
        .slice(0, 3)
      setTopApprovers(topApproversData.length > 0 ? topApproversData : topApprovers)
    } catch (error) {
      console.error('Failed to process statistics:', error)
    }
  }

  // ─── Process data when props change ──────────────────────────────────
  useEffect(() => {
    processStatistics()
  }, [propDocuments])

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .card-premium {
          background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%);
          backdrop-filter: blur(10px);
        }
      `}</style>

      {/* MAIN CONTENT - Row 2 & Row 3 ONLY */}
      <div className="space-y-7 px-4 py-8">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Row 2: Categories + Indicators ────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {(() => {
          const maxCat = Math.max(...categories.map(c => c.count), 1)
          const maxUsers = Math.max(...topUsers.map(u => u.docs), 1)
          const maxAppr = Math.max(...topApprovers.map(a => a.docs), 1)
          const approvalRate = stats.totalDocuments > 0 ? Math.round((stats.approvedDocuments / stats.totalDocuments) * 100) : 0
          const pendingRate = stats.totalDocuments > 0 ? Math.round((stats.pendingDocuments / stats.totalDocuments) * 100) : 0
          const processedRate = stats.totalDocuments > 0 ? Math.round(((stats.totalDocuments - stats.pendingDocuments) / stats.totalDocuments) * 100) : 0

          return (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories */}
                <div
                  ref={catView.ref}
                  className="card-premium rounded-2xl border p-8"
                  style={{
                    border: `1.5px solid ${COLORS.primary.border}`,
                    boxShadow: `0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`,
                    opacity: 1,
                    transform: catView.inView ? 'translateY(0)' : 'translateY(0)',
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
                    {categories.map((c, i) => (
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
                  className="card-premium rounded-2xl border p-8 flex flex-col"
                  style={{
                    border: `1.5px solid ${COLORS.success.border}`,
                    boxShadow: `0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`,
                    opacity: 1,
                    transform: indicView.inView ? 'translateY(0)' : 'translateY(0)',
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
                    <RadialRing percent={approvalRate} color={COLORS.success.bg} label="Approuvés"  sublabel={`${stats.approvedDocuments} docs`} animate={indicView.inView} />
                    <RadialRing percent={pendingRate}  color={COLORS.warning.bg} label="En Attente" sublabel={`${stats.pendingDocuments} docs`}  animate={indicView.inView} />
                    <RadialRing percent={processedRate}  color={COLORS.primary.bg} label="Traités" sublabel={`${stats.totalDocuments - stats.pendingDocuments} docs`}  animate={indicView.inView} />
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
                  className="card-premium rounded-2xl border p-8"
                  style={{
                    border: `1.5px solid ${COLORS.warning.border}`,
                    boxShadow: `0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`,
                    opacity: 1,
                    transform: usersView.inView ? 'translateY(0)' : 'translateY(0)',
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
                    {topUsers.map((u, i) => (
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
                    {topUsers.slice(0, 3).map((u, i) => {
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
                  className="card-premium rounded-2xl border p-8"
                  style={{
                    border: `1.5px solid ${COLORS.success.border}`,
                    boxShadow: `0 10px 40px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)`,
                    opacity: 1,
                    transform: approversView.inView ? 'translateY(0)' : 'translateY(0)',
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
                    {topApprovers.map((a, i) => (
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
                    {topApprovers.slice(0, 3).map((a, i) => {
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
            </>
          )
        })()}
      </div>
    </>
  )
}

