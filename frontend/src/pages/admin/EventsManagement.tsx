import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Edit2, Trash2, Eye, EyeOff, AlertCircle, X, MapPin, Clock, ChevronDown, MoreVertical } from 'lucide-react';

interface Event {
  id: string; title: string; description: string; event_date: string;
  start_time?: string; end_time?: string; location: string; is_public: boolean;
  is_upcoming: boolean; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_by_username: string; visible_to_folder_name?: string; created_at: string;
}
interface Folder { id: number; name: string; folder_type: string; }

const getAuthHeaders = () => { const token = localStorage.getItem('sgdra_access_token'); return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }; };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Brouillon', color: '#64748b', bg: '#f1f5f9' },
  PUBLISHED: { label: 'Publié',    color: '#059669', bg: '#ecfdf5' },
  ARCHIVED:  { label: 'Archivé',   color: '#7c3aed', bg: '#f5f3ff' },
};

const inputStyle: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', color:'#1e293b', backgroundColor:'#fff', outline:'none', boxSizing:'border-box' };
const menuItemStyle: React.CSSProperties = { display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'9px 14px', border:'none', background:'none', fontSize:'13px', color:'#374151', cursor:'pointer', textAlign:'left' };
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>{label}</label>{children}</div>
);

// ActionMenu with position:fixed to escape overflow clipping
interface ActionItem { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean; }
const ActionMenu: React.FC<{ items: ActionItem[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <>
      <button ref={btnRef} onClick={handleToggle}
        style={{ background:open?'#f1f5f9':'none', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'5px 8px', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center' }}>
        <MoreVertical size={15}/>
      </button>
      {open && (
        <div ref={menuRef} style={{ position:'fixed', top:pos.top, right:pos.right, backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:9999, minWidth:165, overflow:'hidden' }}>
          {items.map((item, idx) => (
            <React.Fragment key={idx}>
              {item.danger && idx > 0 && <div style={{ borderTop:'1px solid #f1f5f9', margin:'2px 0' }}/>}
              <button onClick={() => { item.onClick(); setOpen(false); }}
                style={{ ...menuItemStyle, color: item.danger ? '#dc2626' : '#374151' }}
                onMouseEnter={e=>(e.currentTarget.style.backgroundColor=item.danger?'#fef2f2':'#f8fafc')}
                onMouseLeave={e=>(e.currentTarget.style.backgroundColor='transparent')}
              >{item.icon} {item.label}</button>
            </React.Fragment>
          ))}
        </div>
      )}
    </>
  );
};

export const EventsManagement: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({ title:'', description:'', event_date:'', start_time:'', end_time:'', location:'', is_public:true, visible_to_folder:'', status:'DRAFT' });

  useEffect(() => { fetchEvents(); fetchFolders(); }, []);

  const fetchEvents = async () => {
    try { setLoading(true); const r = await fetch('/api/scheduling/events/', {headers:getAuthHeaders()}); if (r.ok) { const d = await r.json(); setEvents(d.results||d); } else setError('Impossible de charger les événements'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); } finally { setLoading(false); }
  };
  const fetchFolders = async () => {
    try { const r = await fetch('/api/folders/', {headers:getAuthHeaders()}); if (r.ok) { const d = await r.json(); setFolders(d.results||d); } } catch (err) { console.error(err); }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { ...formData, visible_to_folder: formData.is_public ? null : formData.visible_to_folder };
      const url = editingEvent ? `/api/scheduling/events/${editingEvent.id}/` : '/api/scheduling/events/';
      const r = await fetch(url, { method:editingEvent?'PATCH':'POST', headers:getAuthHeaders(), body:JSON.stringify(payload) });
      if (r.ok) { resetForm(); fetchEvents(); }
      else { const d = await r.json(); setError(d.detail||'Erreur lors de la sauvegarde'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); } finally { setLoading(false); }
  };
  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({ title:event.title, description:event.description, event_date:event.event_date.split('T')[0], start_time:event.start_time||'', end_time:event.end_time||'', location:event.location, is_public:event.is_public, visible_to_folder:event.visible_to_folder_name||'', status:event.status });
    setShowForm(true);
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet événement ?')) return;
    const r = await fetch(`/api/scheduling/events/${id}/`, {method:'DELETE',headers:getAuthHeaders()});
    if (r.ok) fetchEvents(); else setError('Erreur de suppression');
  };
  const resetForm = () => { setFormData({title:'',description:'',event_date:'',start_time:'',end_time:'',location:'',is_public:true,visible_to_folder:'',status:'DRAFT'}); setEditingEvent(null); setShowForm(false); };

  const filtered = filterStatus === 'all' ? events : events.filter(e => e.status === filterStatus);
  const stats = { total:events.length, published:events.filter(e=>e.status==='PUBLISHED').length, upcoming:events.filter(e=>e.is_upcoming).length, draft:events.filter(e=>e.status==='DRAFT').length };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", color:'#1e293b', minHeight:'100vh', backgroundColor:'#f8fafc', padding:'28px 32px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:700, margin:0, letterSpacing:'-0.3px' }}>Gestion des événements</h1>
          <p style={{ margin:'4px 0 0', fontSize:'14px', color:'#64748b' }}>Créez et gérez les événements de votre organisation</p>
        </div>
        <button onClick={() => { setEditingEvent(null); setShowForm(true); }}
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 18px', backgroundColor:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}
          onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#1d4ed8')} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='#2563eb')}>
          <Plus size={16}/> Nouvel événement
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px', marginBottom:'24px' }}>
        {[{label:'Total',value:stats.total,icon:<Calendar size={18}/>,accent:'#2563eb',bg:'#eff6ff'},{label:'Publiés',value:stats.published,icon:<Eye size={18}/>,accent:'#059669',bg:'#ecfdf5'},{label:'À venir',value:stats.upcoming,icon:<Clock size={18}/>,accent:'#0891b2',bg:'#ecfeff'},{label:'Brouillons',value:stats.draft,icon:<Edit2 size={18}/>,accent:'#64748b',bg:'#f1f5f9'}].map(card=>(
          <div key={card.label} style={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'18px 20px', display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:38, height:38, borderRadius:'8px', backgroundColor:card.bg, color:card.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{card.icon}</div>
            <div><div style={{ fontSize:'22px', fontWeight:700, lineHeight:1 }}>{card.value}</div><div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'3px' }}>{card.label}</div></div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ backgroundColor:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', padding:'12px 16px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', fontSize:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}><AlertCircle size={16}/>{error}</div>
          <button onClick={()=>setError(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#991b1b' }}><X size={16}/></button>
        </div>
      )}

      {showForm && (
        <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(15,23,42,0.45)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ backgroundColor:'#fff', borderRadius:'14px', width:'100%', maxWidth:'640px', maxHeight:'90vh', overflow:'auto', boxShadow:'0 25px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ padding:'22px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ margin:0, fontSize:'16px', fontWeight:700 }}>{editingEvent?"Modifier l'événement":"Créer un événement"}</h2>
              <button onClick={resetForm} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding:'24px' }}>
              <div style={{ display:'grid', gap:'18px' }}>
                <Field label="Titre"><input type="text" value={formData.title} onChange={e=>setFormData({...formData,title:e.target.value})} placeholder="Titre de l'événement" required style={inputStyle}/></Field>
                <Field label="Description"><textarea value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} placeholder="Décrivez l'événement..." required rows={4} style={{...inputStyle,resize:'vertical'}}/></Field>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <Field label="Date"><input type="date" value={formData.event_date} onChange={e=>setFormData({...formData,event_date:e.target.value})} required style={inputStyle}/></Field>
                  <Field label="Lieu"><input type="text" value={formData.location} onChange={e=>setFormData({...formData,location:e.target.value})} placeholder="Lieu de l'événement" style={inputStyle}/></Field>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <Field label="Heure de début"><input type="time" value={formData.start_time} onChange={e=>setFormData({...formData,start_time:e.target.value})} style={inputStyle}/></Field>
                  <Field label="Heure de fin"><input type="time" value={formData.end_time} onChange={e=>setFormData({...formData,end_time:e.target.value})} style={inputStyle}/></Field>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <Field label="Statut">
                    <div style={{ position:'relative' }}>
                      <select value={formData.status} onChange={e=>setFormData({...formData,status:e.target.value})} style={{...inputStyle,appearance:'none',paddingRight:32}}>
                        <option value="DRAFT">Brouillon</option><option value="PUBLISHED">Publié</option><option value="ARCHIVED">Archivé</option>
                      </select>
                      <ChevronDown size={14} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                    </div>
                  </Field>
                  <Field label="Visibilité">
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', height:'38px' }}>
                      <div onClick={()=>setFormData({...formData,is_public:!formData.is_public})}
                        style={{ width:42, height:24, borderRadius:12, backgroundColor:formData.is_public?'#2563eb':'#e2e8f0', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
                        <div style={{ width:18, height:18, borderRadius:'50%', backgroundColor:'#fff', position:'absolute', top:3, left:formData.is_public?21:3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
                      </div>
                      <span style={{ fontSize:'14px', color:'#374151', fontWeight:500 }}>{formData.is_public?'Public':'Privé'}</span>
                    </div>
                  </Field>
                </div>
                {!formData.is_public && (
                  <Field label="Visible par">
                    <div style={{ position:'relative' }}>
                      <select value={formData.visible_to_folder} onChange={e=>setFormData({...formData,visible_to_folder:e.target.value})} required style={{...inputStyle,appearance:'none',paddingRight:32}}>
                        <option value="">— Sélectionner une unité —</option>
                        {folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                    </div>
                  </Field>
                )}
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'24px', paddingTop:'20px', borderTop:'1px solid #f1f5f9' }}>
                <button type="button" onClick={resetForm} style={{ padding:'9px 18px', border:'1px solid #e2e8f0', borderRadius:'8px', background:'#fff', color:'#475569', fontSize:'14px', fontWeight:500, cursor:'pointer' }}>Annuler</button>
                <button type="submit" disabled={loading} style={{ padding:'9px 20px', backgroundColor:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', opacity:loading?0.7:1 }}>
                  {loading?'Sauvegarde...':editingEvent?"Mettre à jour":"Créer l'événement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <span style={{ fontSize:'14px', fontWeight:600, color:'#374151' }}>{filtered.length} événement{filtered.length!==1?'s':''}</span>
          <div style={{ position:'relative' }}>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ padding:'7px 32px 7px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', color:'#374151', backgroundColor:'#fff', appearance:'none', cursor:'pointer' }}>
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
          </div>
        </div>
        {loading && !showForm ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#94a3b8', fontSize:'14px' }}>Chargement...</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
            <thead>
              <tr style={{ backgroundColor:'#f8fafc' }}>
                {['Titre & description','Date & horaire','Lieu','Accès','Statut','Créé par',''].map(h=>(
                  <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:'12px', fontWeight:600, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'48px', color:'#94a3b8', fontSize:'14px' }}>
                  <Calendar size={32} style={{ display:'block', margin:'0 auto 10px', opacity:0.3 }}/>Aucun événement trouvé
                </td></tr>
              ) : filtered.map((event, i) => {
                const cfg = STATUS_CONFIG[event.status] || STATUS_CONFIG.DRAFT;
                const menuItems: ActionItem[] = [
                  { label:'Modifier', icon:<Edit2 size={13}/>, onClick:()=>handleEdit(event) },
                  { label:'Supprimer', icon:<Trash2 size={13}/>, onClick:()=>handleDelete(event.id), danger:true },
                ];
                return (
                  <tr key={event.id} style={{ borderBottom:i<filtered.length-1?'1px solid #f8fafc':'none' }}
                    onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#fafbfc')}
                    onMouseLeave={e=>(e.currentTarget.style.backgroundColor='transparent')}>
                    <td style={{ padding:'14px 16px', maxWidth:220 }}>
                      <div style={{ fontWeight:600, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{event.title}</div>
                      <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(event.description||'').substring(0,55)}{(event.description?.length||0)>55?'…':''}</div>
                    </td>
                    <td style={{ padding:'14px 16px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Calendar size={13} style={{ color:'#94a3b8', flexShrink:0 }}/>
                        <div>
                          <div style={{ fontWeight:500, color:'#374151' }}>{new Date(event.event_date).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})}</div>
                          {event.start_time&&<div style={{ fontSize:'12px', color:'#94a3b8' }}>{event.start_time}{event.end_time?` – ${event.end_time}`:''}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'14px 16px' }}>
                      {event.location ? (
                        <div style={{ display:'flex', alignItems:'center', gap:5, color:'#374151' }}><MapPin size={13} style={{ color:'#94a3b8', flexShrink:0 }}/>{event.location}</div>
                      ) : <span style={{ color:'#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        {event.is_public ? <><Eye size={13} style={{ color:'#059669' }}/><span style={{ color:'#059669', fontWeight:500 }}>Public</span></> : <><EyeOff size={13} style={{ color:'#64748b' }}/><span style={{ color:'#64748b', fontWeight:500 }}>Privé</span></>}
                      </div>
                      {!event.is_public&&event.visible_to_folder_name&&<div style={{ fontSize:'12px', color:'#94a3b8', marginTop:2 }}>{event.visible_to_folder_name}</div>}
                    </td>
                    <td style={{ padding:'14px 16px' }}>
                      <span style={{ display:'inline-block', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600, color:cfg.color, backgroundColor:cfg.bg, whiteSpace:'nowrap' }}>{cfg.label}</span>
                    </td>
                    <td style={{ padding:'14px 16px', color:'#64748b', fontSize:'13px' }}>{event.created_by_username}</td>
                    <td style={{ padding:'14px 16px', textAlign:'right' }}><ActionMenu items={menuItems}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};