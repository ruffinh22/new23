import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/common'
import {
  Calendar, Clock, MapPin, Users, ChevronLeft, ChevronRight,
  Mail, X, Eye, EyeOff
} from 'lucide-react'
import { apiClient } from '@/services'
import { useAuth } from '@/contexts/AuthContext'
import { EmailScheduling } from '@/pages/admin/EmailScheduling'
import { EventsManagement } from '@/pages/admin/EventsManagement'

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalEvent {
  id: string
  title: string
  date: Date
  startTime?: string
  endTime?: string
  kind: 'event' | 'email'
  status: string
  location?: string
  description?: string
  recipientType?: string
  recipientFolderName?: string
  isPublic?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Brouillon',  color: '#64748b', bg: '#f1f5f9' },
  SCHEDULED: { label: 'Programmé',  color: '#2563eb', bg: '#dbeafe' },
  SENT:      { label: 'Envoyé',     color: '#059669', bg: '#d1fae5' },
  FAILED:    { label: 'Échoué',     color: '#dc2626', bg: '#fee2e2' },
  CANCELLED: { label: 'Annulé',     color: '#7c3aed', bg: '#ede9fe' },
  PUBLISHED: { label: 'Publié',     color: '#059669', bg: '#d1fae5' },
  ARCHIVED:  { label: 'Archivé',    color: '#7c3aed', bg: '#ede9fe' },
  pending:   { label: 'En attente', color: '#92400e', bg: '#fef3c7' },
}

const EVENT_C = { dot: '#dc2626', bg: '#fff1f2', border: '#fecdd3', text: '#be123c' }
const EMAIL_C = { dot: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' }

const getAuthHeaders = () => {
  const token = localStorage.getItem('sgdra_access_token')
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export const Schedule: React.FC = () => {
  const { user } = useAuth()
  const [events, setEvents]     = useState<CalEvent[]>([])
  const [emails, setEmails]     = useState<CalEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dayPopup, setDayPopup]       = useState<{ label: string; items: CalEvent[] } | null>(null)
  const [detailItem, setDetailItem]   = useState<CalEvent | null>(null)
  const [showEmailMgr, setShowEmailMgr]   = useState(false)
  const [showEventsMgr, setShowEventsMgr] = useState(false)

  const isManager = user?.is_staff || ['POLE_MANAGER','FILIALE_MANAGER','SERVICE_MANAGER'].includes(user?.role ?? '')

  useEffect(() => { loadEvents(); loadEmails() }, [])

  const loadEvents = async () => {
    try {
      const r = await apiClient.get('/scheduling/events/')
      const data = r.data.results ?? r.data
      setEvents(data.map((e: any) => ({
        id: String(e.id), title: e.title,
        date: new Date(e.event_date),
        startTime: e.start_time, endTime: e.end_time,
        kind: 'event', status: e.status ?? 'pending',
        location: e.location, description: e.description, isPublic: e.is_public,
      })))
    } catch {}
  }

  const loadEmails = async () => {
    try {
      const r = await fetch('/api/scheduling/email-schedules/', { headers: getAuthHeaders() })
      if (!r.ok) return
      const data = await r.json()
      const items = data.results ?? data
      setEmails(items.filter((e: any) => e.scheduled_at).map((e: any) => ({
        id: `email-${e.id}`, title: e.subject,
        date: new Date(e.scheduled_at),
        startTime: new Date(e.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        kind: 'email', status: e.status,
        description: e.message,
        recipientType: e.recipient_type, recipientFolderName: e.recipient_folder_name,
      })))
    } catch {}
  }

  const allItems = [...events, ...emails]
  const forDate  = (d: Date) => allItems.filter(e => e.date.toDateString() === d.toDateString())

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDow    = (() => { const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); return d === 0 ? 6 : d - 1 })()

  const handleDayClick = (d: Date) => {
    const items = forDate(d)
    if (!items.length) return
    setDayPopup({ label: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, items })
  }

  const upcoming = [...allItems].sort((a, b) => a.date.getTime() - b.date.getTime())

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", color: '#0f172a', backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '0 0 48px' }}>

        {/* ══ RED HERO HEADER ══════════════════════════════════════════════════ */}
        <div style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 60%, #991b1b 100%)', padding: '32px 40px 28px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,.07)' }}/>
          <div style={{ position: 'absolute', bottom: -60, right: 120, width: 240, height: 240, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,.05)' }}/>
          <div style={{ position: 'absolute', top: 10, right: 220, width: 80, height: 80, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,.06)' }}/>

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={22} color="#fff"/>
                </div>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>Calendrier & Planning</h1>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,.75)' }}>Gérez vos événements et planifications emails</p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {isManager && <>
                <HeaderBtn icon={<Mail size={15}/>}     label="Planification emails"  onClick={() => setShowEmailMgr(true)}   solid/>
                <HeaderBtn icon={<Calendar size={15}/>} label="Gestion événements"    onClick={() => setShowEventsMgr(true)} solid/>
              </>}
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ position: 'relative', display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { v: events.length,          l: 'Événements' },
              { v: emails.length,          l: 'Emails planifiés' },
              { v: allItems.filter(e => e.date >= new Date()).length, l: 'À venir' },
            ].map(({ v, l }) => (
              <div key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{v}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', fontWeight: 500 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ BODY ═════════════════════════════════════════════════════════════ */}
        <div style={{ padding: '28px 40px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

          {/* ── CALENDAR ── */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,.07)', overflow: 'hidden' }}>

            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} style={navBtn}>
                <ChevronLeft size={17}/>
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                  {MONTHS[currentDate.getMonth()]}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{currentDate.getFullYear()}</div>
              </div>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} style={navBtn}>
                <ChevronRight size={17}/>
              </button>
            </div>

            {/* Legend row */}
            <div style={{ display: 'flex', gap: 16, padding: '10px 24px', backgroundColor: '#fafbfc', borderBottom: '2px solid #cbd5e1' }}>
              {[
                { c: EVENT_C.dot, l: 'Événement' },
                { c: EMAIL_C.dot, l: 'Email planifié' },
              ].map(({ c, l }) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#475569', fontWeight: 700 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c }}/>
                  {l}
                </div>
              ))}
            </div>

            {/* DOW header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', backgroundColor: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
              {DAYS.map(d => (
                <div key={d} style={{ padding: '12px 0', textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#475569', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {/* Empty padding cells */}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`p${i}`} style={{ minHeight: 110, backgroundColor: '#fafbfc', borderRight: '1.5px solid #cbd5e1', borderBottom: '1.5px solid #cbd5e1' }}/>
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day      = i + 1
                const date     = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                const dayItems = forDate(date)
                const isToday  = date.toDateString() === new Date().toDateString()
                const col      = (firstDow + i) % 7
                const isWeekend = col === 5 || col === 6
                const hasItems  = dayItems.length > 0

                return (
                  <div key={day}
                    onClick={() => handleDayClick(date)}
                    style={{
                      minHeight: 110,
                      padding: '8px 6px 6px',
                      borderRight: col < 6 ? '1.5px solid #cbd5e1' : 'none',
                      borderBottom: '1.5px solid #cbd5e1',
                      backgroundColor: isToday ? '#fff7ed' : isWeekend ? '#fafbfc' : '#fff',
                      cursor: hasItems ? 'pointer' : 'default',
                      transition: 'background .1s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (hasItems) e.currentTarget.style.backgroundColor = '#fff1f2' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = isToday ? '#fff7ed' : isWeekend ? '#fafbfc' : '#fff' }}
                  >
                    {/* Day number */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: isToday ? 800 : 500,
                        backgroundColor: isToday ? '#dc2626' : 'transparent',
                        color: isToday ? '#fff' : isWeekend ? '#94a3b8' : '#374151',
                        boxShadow: isToday ? '0 2px 8px rgba(220,38,38,.35)' : 'none',
                      }}>
                        {day}
                      </span>
                    </div>

                    {/* Pills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {dayItems.slice(0, 2).map(ev => {
                        const c = ev.kind === 'email' ? EMAIL_C : EVENT_C
                        return (
                          <div key={ev.id} style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '2px 6px', borderRadius: 5,
                            backgroundColor: c.bg,
                            border: `1px solid ${c.border}`,
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.dot, flexShrink: 0 }}/>
                            <span style={{ fontSize: 10, fontWeight: 700, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                              {ev.title}
                            </span>
                          </div>
                        )
                      })}
                      {dayItems.length > 2 && (
                        <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 700, paddingLeft: 6 }}>
                          +{dayItems.length - 2} de plus
                        </div>
                      )}
                    </div>

                    {/* Today line */}
                    {isToday && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#dc2626', borderRadius: '0 0 3px 3px' }}/>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR: Upcoming ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Today card */}
            <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', borderRadius: 14, padding: '20px 22px', color: '#fff', boxShadow: '0 4px 16px rgba(220,38,38,.3)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 4 }}>Aujourd'hui</div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
                {new Date().getDate()}
              </div>
              <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 500 }}>
                {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.2)', fontSize: 12, opacity: 0.8 }}>
                {forDate(new Date()).length === 0
                  ? 'Aucun événement aujourd\'hui'
                  : `${forDate(new Date()).length} événement${forDate(new Date()).length > 1 ? 's' : ''} aujourd'hui`
                }
              </div>
            </div>

            {/* Upcoming list */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,.06)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>À venir</span>
                <span style={{ fontSize: 12, color: '#475569', backgroundColor: '#f8fafc', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>{upcoming.length}</span>
              </div>

              {upcoming.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
                  <Calendar size={28} style={{ display: 'block', margin: '0 auto 8px', opacity: .3 }}/>
                  Aucun événement
                </div>
              ) : (
                <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {upcoming.map((item, idx) => {
                    const c    = item.kind === 'email' ? EMAIL_C : EVENT_C
                    const st   = STATUS_CFG[item.status] ?? STATUS_CFG.pending
                    return (
                      <div key={item.id}
                        onClick={() => setDetailItem(item)}
                        style={{ display: 'flex', gap: 12, padding: '12px 18px', borderBottom: idx < upcoming.length - 1 ? '1px solid #f8fafc' : 'none', cursor: 'pointer', transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fafbfc'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {/* Color bar */}
                        <div style={{ width: 3, borderRadius: 4, backgroundColor: c.dot, flexShrink: 0 }}/>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 5 }}>
                            {item.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            {item.startTime ? ` · ${item.startTime}` : ''}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: st.color, backgroundColor: st.bg, padding: '2px 7px', borderRadius: 10 }}>{st.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ MODALS ═══════════════════════════════════════════════════════════ */}

        {/* Day popup */}
        {dayPopup && (
          <Overlay onClose={() => setDayPopup(null)}>
            <ModalShell title={`📅 ${dayPopup.label}`} onClose={() => setDayPopup(null)} width={480}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dayPopup.items.map(item => {
                  const c  = item.kind === 'email' ? EMAIL_C : EVENT_C
                  const st = STATUS_CFG[item.status] ?? STATUS_CFG.pending
                  return (
                    <div key={item.id}
                      onClick={() => { setDetailItem(item); setDayPopup(null) }}
                      style={{ padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${c.border}`, backgroundColor: c.bg, cursor: 'pointer', transition: 'box-shadow .12s' }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: c.dot, flexShrink: 0 }}/>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', flex: 1 }}>{item.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: st.color, backgroundColor: '#fff', padding: '2px 8px', borderRadius: 10, border: `1px solid ${c.border}` }}>{st.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#475569', fontWeight: 500, flexWrap: 'wrap' }}>
                        {item.startTime && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11}/>{item.startTime}{item.endTime ? ` – ${item.endTime}` : ''}</span>}
                        {item.location  && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11}/>{item.location}</span>}
                        {item.recipientType && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={11}/>{item.recipientType}</span>}
                      </div>
                      {item.description && (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                          {item.description.substring(0, 100)}{item.description.length > 100 ? '…' : ''}
                        </p>
                      )}
                      <div style={{ marginTop: 8, fontSize: 11, color: c.text, fontWeight: 700 }}>Voir détails →</div>
                    </div>
                  )
                })}
              </div>
            </ModalShell>
          </Overlay>
        )}

        {/* Detail modal */}
        {detailItem && (
          <Overlay onClose={() => setDetailItem(null)}>
            <ModalShell title="Détails" onClose={() => setDetailItem(null)} width={520}>
              <DetailView item={detailItem}/>
            </ModalShell>
          </Overlay>
        )}

        {/* Email manager */}
        {showEmailMgr && (
          <Overlay onClose={() => setShowEmailMgr(false)}>
            <ModalShell title="Planification des emails" onClose={() => setShowEmailMgr(false)} width={1020}>
              <EmailScheduling/>
            </ModalShell>
          </Overlay>
        )}

        {/* Events manager */}
        {showEventsMgr && (
          <Overlay onClose={() => setShowEventsMgr(false)}>
            <ModalShell title="Gestion des événements" onClose={() => setShowEventsMgr(false)} width={1020}>
              <EventsManagement/>
            </ModalShell>
          </Overlay>
        )}

      </div>
    </Layout>
  )
}

// ─── Detail view ──────────────────────────────────────────────────────────────
const DetailView: React.FC<{ item: CalEvent }> = ({ item }) => {
  const c  = item.kind === 'email' ? EMAIL_C : EVENT_C
  const st = STATUS_CFG[item.status] ?? STATUS_CFG.pending
  return (
    <div>
      {/* Header band */}
      <div style={{ background: `linear-gradient(135deg, ${c.dot}22, ${c.dot}0d)`, border: `1.5px solid ${c.border}`, borderRadius: 12, padding: '18px 20px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: c.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${c.dot}44` }}>
          {item.kind === 'email' ? <Mail size={22} color="#fff"/> : <Calendar size={22} color="#fff"/>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', lineHeight: 1.3, marginBottom: 4 }}>{item.title}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: c.text, backgroundColor: c.bg, padding: '2px 9px', borderRadius: 10 }}>
              {item.kind === 'email' ? 'Email planifié' : 'Événement'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: st.color, backgroundColor: st.bg, padding: '2px 9px', borderRadius: 10 }}>
              {st.label}
            </span>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <InfoBox icon={<Calendar size={14}/>} label="Date" value={item.date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}/>
        {item.startTime && <InfoBox icon={<Clock size={14}/>} label="Horaire" value={`${item.startTime}${item.endTime ? ` – ${item.endTime}` : ''}`}/>}
        {item.location  && <InfoBox icon={<MapPin size={14}/>} label="Lieu" value={item.location}/>}
        {item.recipientType && <InfoBox icon={<Users size={14}/>} label="Destinataires" value={`${item.recipientType}${item.recipientFolderName ? ` · ${item.recipientFolderName}` : ''}`}/>}
        {item.isPublic !== undefined && <InfoBox icon={item.isPublic ? <Eye size={14}/> : <EyeOff size={14}/>} label="Visibilité" value={item.isPublic ? 'Public' : 'Privé'}/>}
      </div>

      {item.description && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Description</div>
          <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.7, backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: 10, border: '1px solid #f1f5f9' }}>
            {item.description}
          </p>
        </div>
      )}
    </div>
  )
}

const InfoBox: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
      {icon}{label}
    </div>
    <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', textTransform: 'capitalize' }}>{value}</div>
  </div>
)

// ─── Primitives ───────────────────────────────────────────────────────────────
const Overlay: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,.6)', backdropFilter: 'blur(3px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
)

const ModalShell: React.FC<{ title: string; onClose: () => void; width?: number; children: React.ReactNode }> = ({ title, onClose, width = 700, children }) => (
  <div style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 32px 64px rgba(0,0,0,.2)' }}>
    {/* Modal header — red gradient */}
    <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 1, borderRadius: '16px 16px 0 0' }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>{title}</h3>
      <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', cursor: 'pointer', color: '#fff', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.25)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.15)'}>
        <X size={16}/>
      </button>
    </div>
    <div style={{ padding: 24 }}>{children}</div>
  </div>
)

const HeaderBtn: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; solid?: boolean }> = ({ icon, label, onClick, solid }) => (
  <button onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', backgroundColor: solid ? '#fff' : 'rgba(255,255,255,.15)', color: solid ? '#dc2626' : '#fff', border: solid ? 'none' : '1.5px solid rgba(255,255,255,.35)', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}
    onMouseEnter={e => { e.currentTarget.style.backgroundColor = solid ? '#fff7f7' : 'rgba(255,255,255,.25)' }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = solid ? '#fff' : 'rgba(255,255,255,.15)' }}>
    {icon}{label}
  </button>
)

const navBtn: React.CSSProperties = { background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '7px 10px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', transition: 'border-color .1s' }