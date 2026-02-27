import React, { useState, useEffect, useRef } from 'react';
import { Clock, Send, Trash2, Plus, AlertCircle, X, Calendar, Users, Mail, ChevronDown, MoreVertical, Edit2 } from 'lucide-react';

interface EmailSchedule {
  id: string; subject: string; message: string; recipient_type: string;
  recipient_folder_name?: string; recipient_folder?: string;
  scheduled_at: string; recurrence_type?: 'ONE_TIME' | 'MONTHLY';
  monthly_days?: string; monthly_time?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
  created_by_username: string; created_at: string;
}
interface Folder { id: number; name: string; folder_type: string; parent?: number; }

const getAuthHeaders = () => { const token = localStorage.getItem('sgdra_access_token'); return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }; };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT:     { label: 'Brouillon',  color: '#64748b', bg: '#f1f5f9' },
  SCHEDULED: { label: 'Programmé',  color: '#2563eb', bg: '#eff6ff' },
  SENT:      { label: 'Envoyé',     color: '#059669', bg: '#ecfdf5' },
  FAILED:    { label: 'Échoué',     color: '#dc2626', bg: '#fef2f2' },
  CANCELLED: { label: 'Annulé',     color: '#7c3aed', bg: '#f5f3ff' },
};
const RECIPIENT_LABELS: Record<string, string> = { ALL_USERS:'Tous les utilisateurs', POLE:'Pôle', FILIALE:'Filiale', SERVICE:'Service', SUB_SERVICE:'Sous-service' };

const inputStyle: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', color:'#1e293b', backgroundColor:'#fff', outline:'none', boxSizing:'border-box' };
const menuItemStyle: React.CSSProperties = { display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'9px 14px', border:'none', background:'none', fontSize:'13px', color:'#374151', cursor:'pointer', textAlign:'left' };
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div><label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'6px' }}>{label}</label>{children}</div>
);

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
        <div ref={menuRef} style={{ position:'fixed', top:pos.top, right:pos.right, backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:9999, minWidth:185, overflow:'hidden' }}>
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

const EMPTY_FORM = { subject:'', message:'', recipient_type:'ALL_USERS', recipient_folder:'', scheduled_at:'', recurrence_type:'ONE_TIME', monthly_days:[] as string[], monthly_time:'09:00' };

export const EmailScheduling: React.FC = () => {
  const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EmailSchedule | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  useEffect(() => { fetchSchedules(); fetchFolders(); }, []);

  const fetchSchedules = async () => {
    try { setLoading(true); const r = await fetch('/api/scheduling/email-schedules/', { headers: getAuthHeaders() }); if (r.ok) { const d = await r.json(); setSchedules(d.results || d); } else setError('Impossible de charger les plannings'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); } finally { setLoading(false); }
  };

  const fetchFolders = async () => {
    try {
      const [p,f,s] = await Promise.all([fetch('/api/folders/poles/', {headers:getAuthHeaders()}), fetch('/api/folders/filiales/', {headers:getAuthHeaders()}), fetch('/api/folders/services/', {headers:getAuthHeaders()})]);
      const all: any[] = [];
      if (p.ok) { const d = await p.json(); all.push(...(d.results||d).map((x:any)=>({...x,folder_type:'pole'}))); }
      if (f.ok) { const d = await f.json(); all.push(...(d.results||d).map((x:any)=>({...x,folder_type:'filiale'}))); }
      if (s.ok) { const d = await s.json(); all.push(...(d.results||d).map((x:any)=>({...x,folder_type:'service'}))); }
      setFolders(all);
    } catch (err) { console.error(err); }
  };

  const handleEdit = (s: EmailSchedule) => {
    setEditingSchedule(s);
    setFormData({
      subject: s.subject,
      message: s.message,
      recipient_type: s.recipient_type,
      recipient_folder: s.recipient_folder || '',
      scheduled_at: s.scheduled_at ? s.scheduled_at.slice(0, 16) : '',
      recurrence_type: s.recurrence_type || 'ONE_TIME',
      monthly_days: s.monthly_days ? s.monthly_days.split(',') : [],
      monthly_time: s.monthly_time || '09:00',
    });
    setShowForm(true);
  };

  const resetForm = () => { setFormData({...EMPTY_FORM}); setEditingSchedule(null); setShowForm(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        subject: formData.subject, message: formData.message,
        recipient_type: formData.recipient_type,
        recipient_folder: formData.recipient_type !== 'ALL_USERS' ? formData.recipient_folder : null,
        recurrence_type: formData.recurrence_type,
      };
      if (formData.recurrence_type === 'ONE_TIME') payload.scheduled_at = formData.scheduled_at;
      else { payload.monthly_days = formData.monthly_days.join(','); payload.monthly_time = formData.monthly_time; }

      const url = editingSchedule ? `/api/scheduling/email-schedules/${editingSchedule.id}/` : '/api/scheduling/email-schedules/';
      const method = editingSchedule ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (r.ok) { resetForm(); fetchSchedules(); }
      else { const d = await r.json(); setError(d.detail || 'Erreur lors de la sauvegarde'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur'); } finally { setLoading(false); }
  };

  const handleSendNow = async (id: string) => { const r = await fetch(`/api/scheduling/email-schedules/${id}/send_now/`, {method:'POST',headers:getAuthHeaders()}); if (r.ok) fetchSchedules(); else setError("Échec de l'envoi"); };
  const handleCancel  = async (id: string) => { const r = await fetch(`/api/scheduling/email-schedules/${id}/cancel/`,   {method:'POST',headers:getAuthHeaders()}); if (r.ok) fetchSchedules(); else setError("Échec de l'annulation"); };
  const handleDelete  = async (id: string) => { if (!window.confirm('Supprimer ce planning ?')) return; const r = await fetch(`/api/scheduling/email-schedules/${id}/`, {method:'DELETE',headers:getAuthHeaders()}); if (r.ok) fetchSchedules(); else setError('Erreur de suppression'); };

  const filtered = filterStatus === 'all' ? schedules : schedules.filter(s => s.status === filterStatus);
  const stats = { total:schedules.length, scheduled:schedules.filter(s=>s.status==='SCHEDULED').length, sent:schedules.filter(s=>s.status==='SENT').length, failed:schedules.filter(s=>s.status==='FAILED').length };

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", color:'#1e293b', minHeight:'100vh', backgroundColor:'#f8fafc', padding:'28px 32px' }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'28px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:700, margin:0, letterSpacing:'-0.3px' }}>Planification des emails</h1>
          <p style={{ margin:'4px 0 0', fontSize:'14px', color:'#64748b' }}>Gérez vos envois programmés et récurrents</p>
        </div>
        <button onClick={() => { setEditingSchedule(null); setFormData({...EMPTY_FORM}); setShowForm(true); }}
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 18px', backgroundColor:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}
          onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#1d4ed8')} onMouseLeave={e=>(e.currentTarget.style.backgroundColor='#2563eb')}>
          <Plus size={16}/> Nouveau planning
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px', marginBottom:'24px' }}>
        {[{label:'Total',value:stats.total,icon:<Mail size={18}/>,accent:'#2563eb',bg:'#eff6ff'},{label:'Programmés',value:stats.scheduled,icon:<Calendar size={18}/>,accent:'#0891b2',bg:'#ecfeff'},{label:'Envoyés',value:stats.sent,icon:<Send size={18}/>,accent:'#059669',bg:'#ecfdf5'},{label:'Échoués',value:stats.failed,icon:<AlertCircle size={18}/>,accent:'#dc2626',bg:'#fef2f2'}].map(card=>(
          <div key={card.label} style={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'18px 20px', display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:38, height:38, borderRadius:'8px', backgroundColor:card.bg, color:card.accent, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{card.icon}</div>
            <div><div style={{ fontSize:'22px', fontWeight:700, lineHeight:1 }}>{card.value}</div><div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'3px' }}>{card.label}</div></div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ backgroundColor:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', padding:'12px 16px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', fontSize:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}><AlertCircle size={16}/>{error}</div>
          <button onClick={()=>setError(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#991b1b' }}><X size={16}/></button>
        </div>
      )}

      {/* Modal Form — Création ET Modification */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(15,23,42,0.45)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ backgroundColor:'#fff', borderRadius:'14px', width:'100%', maxWidth:'620px', maxHeight:'90vh', overflow:'auto', boxShadow:'0 25px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ padding:'22px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ margin:0, fontSize:'16px', fontWeight:700 }}>{editingSchedule ? 'Modifier le planning' : "Créer un planning d'email"}</h2>
              <button onClick={resetForm} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding:'24px' }}>
              <div style={{ display:'grid', gap:'18px' }}>
                <Field label="Sujet"><input type="text" value={formData.subject} onChange={e=>setFormData({...formData,subject:e.target.value})} placeholder="Objet de l'email" required style={inputStyle}/></Field>
                <Field label="Message"><textarea value={formData.message} onChange={e=>setFormData({...formData,message:e.target.value})} placeholder="Rédigez votre message..." required rows={4} style={{...inputStyle,resize:'vertical'}}/></Field>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                  <Field label="Destinataires">
                    <div style={{ position:'relative' }}>
                      <select value={formData.recipient_type} onChange={e=>setFormData({...formData,recipient_type:e.target.value})} style={{...inputStyle,appearance:'none',paddingRight:32}}>
                        <option value="ALL_USERS">Tous les utilisateurs</option><option value="POLE">Pôle spécifique</option><option value="FILIALE">Filiale spécifique</option><option value="SERVICE">Service spécifique</option><option value="SUB_SERVICE">Sous-service</option>
                      </select>
                      <ChevronDown size={14} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                    </div>
                  </Field>
                  <Field label="Récurrence">
                    <div style={{ position:'relative' }}>
                      <select value={formData.recurrence_type} onChange={e=>setFormData({...formData,recurrence_type:e.target.value as any})} style={{...inputStyle,appearance:'none',paddingRight:32}}>
                        <option value="ONE_TIME">Unique</option><option value="MONTHLY">Mensuelle</option>
                      </select>
                      <ChevronDown size={14} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                    </div>
                  </Field>
                </div>
                {formData.recipient_type !== 'ALL_USERS' && (
                  <Field label="Unité organisationnelle">
                    <div style={{ position:'relative' }}>
                      <select value={formData.recipient_folder} onChange={e=>setFormData({...formData,recipient_folder:e.target.value})} required style={{...inputStyle,appearance:'none',paddingRight:32}}>
                        <option value="">— Sélectionner —</option>
                        {folders.filter(f=>({POLE:'pole',FILIALE:'filiale',SERVICE:'service'} as any)[formData.recipient_type]===f.folder_type).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                      <ChevronDown size={14} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }}/>
                    </div>
                  </Field>
                )}
                {formData.recurrence_type === 'ONE_TIME' ? (
                  <Field label="Date et heure d'envoi"><input type="datetime-local" value={formData.scheduled_at} onChange={e=>setFormData({...formData,scheduled_at:e.target.value})} required style={inputStyle}/></Field>
                ) : (
                  <>
                    <Field label="Jours du mois">
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', padding:'12px', border:'1px solid #e2e8f0', borderRadius:'8px', backgroundColor:'#f8fafc' }}>
                        {[1,5,10,15,20,23,25,30].map(day => {
                          const checked = formData.monthly_days.includes(String(day));
                          return (
                            <label key={day} style={{ display:'flex', alignItems:'center', justifyContent:'center', width:38, height:38, borderRadius:'8px', border:`1px solid ${checked?'#2563eb':'#e2e8f0'}`, backgroundColor:checked?'#eff6ff':'#fff', color:checked?'#2563eb':'#475569', fontSize:'13px', fontWeight:checked?700:400, cursor:'pointer', userSelect:'none' }}>
                              <input type="checkbox" checked={checked} onChange={e=>setFormData({...formData,monthly_days:e.target.checked?[...formData.monthly_days,String(day)].sort((a,b)=>+a-+b):formData.monthly_days.filter(d=>d!==String(day))})} style={{ display:'none' }}/>{day}
                            </label>
                          );
                        })}
                      </div>
                    </Field>
                    <Field label="Heure d'envoi"><input type="time" value={formData.monthly_time} onChange={e=>setFormData({...formData,monthly_time:e.target.value})} required style={{...inputStyle,maxWidth:160}}/></Field>
                  </>
                )}
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'24px', paddingTop:'20px', borderTop:'1px solid #f1f5f9' }}>
                <button type="button" onClick={resetForm} style={{ padding:'9px 18px', border:'1px solid #e2e8f0', borderRadius:'8px', background:'#fff', color:'#475569', fontSize:'14px', fontWeight:500, cursor:'pointer' }}>Annuler</button>
                <button type="submit" disabled={loading} style={{ padding:'9px 20px', backgroundColor:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:600, cursor:'pointer', opacity:loading?0.7:1 }}>
                  {loading ? 'Sauvegarde...' : editingSchedule ? 'Mettre à jour' : 'Créer le planning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ backgroundColor:'#fff', border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
          <span style={{ fontSize:'14px', fontWeight:600, color:'#374151' }}>{filtered.length} planning{filtered.length!==1?'s':''}</span>
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
                {['Sujet & message','Destinataires','Programmation','Statut','Créé par',''].map(h=>(
                  <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:'12px', fontWeight:600, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'48px', color:'#94a3b8', fontSize:'14px' }}>
                  <Mail size={32} style={{ display:'block', margin:'0 auto 10px', opacity:0.3 }}/>Aucun planning trouvé
                </td></tr>
              ) : filtered.map((s, i) => {
                const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.DRAFT;
                const canEdit = s.status === 'DRAFT' || s.status === 'SCHEDULED';
                const menuItems: ActionItem[] = [
                  { label:'Modifier', icon:<Edit2 size={13}/>, onClick:()=>handleEdit(s) },
                  ...(s.status==='DRAFT' ? [{label:'Envoyer maintenant', icon:<Send size={13}/>, onClick:()=>handleSendNow(s.id)}] : []),
                  ...(canEdit ? [{label:'Annuler le planning', icon:<X size={13}/>, onClick:()=>handleCancel(s.id)}] : []),
                  {label:'Supprimer', icon:<Trash2 size={13}/>, onClick:()=>handleDelete(s.id), danger:true},
                ];
                return (
                  <tr key={s.id} style={{ borderBottom:i<filtered.length-1?'1px solid #f8fafc':'none' }}
                    onMouseEnter={e=>(e.currentTarget.style.backgroundColor='#fafbfc')}
                    onMouseLeave={e=>(e.currentTarget.style.backgroundColor='transparent')}>
                    <td style={{ padding:'14px 16px', maxWidth:240 }}>
                      <div style={{ fontWeight:600, color:'#1e293b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.subject}</div>
                      <div style={{ fontSize:'12px', color:'#94a3b8', marginTop:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(s.message||'').substring(0,55)}…</div>
                    </td>
                    <td style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Users size={13} style={{ color:'#94a3b8', flexShrink:0 }}/>
                        <div>
                          <div style={{ fontWeight:500, color:'#374151' }}>{RECIPIENT_LABELS[s.recipient_type]||s.recipient_type}</div>
                          {s.recipient_folder_name&&<div style={{ fontSize:'12px', color:'#94a3b8' }}>{s.recipient_folder_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'14px 16px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Clock size={13} style={{ color:'#94a3b8', flexShrink:0 }}/>
                        <div>
                          {s.recurrence_type==='MONTHLY' ? (
                            <><div style={{ fontWeight:500, color:'#374151' }}>Mensuel</div><div style={{ fontSize:'12px', color:'#94a3b8' }}>Jours {s.monthly_days} · {s.monthly_time}</div></>
                          ) : (
                            <><div style={{ fontWeight:500, color:'#374151' }}>{s.scheduled_at?new Date(s.scheduled_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}):'—'}</div>
                            <div style={{ fontSize:'12px', color:'#94a3b8' }}>{s.scheduled_at?new Date(s.scheduled_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</div></>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'14px 16px' }}>
                      <span style={{ display:'inline-block', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:600, color:cfg.color, backgroundColor:cfg.bg, whiteSpace:'nowrap' }}>{cfg.label}</span>
                    </td>
                    <td style={{ padding:'14px 16px', color:'#64748b', fontSize:'13px' }}>{s.created_by_username}</td>
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