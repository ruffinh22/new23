import React, { useState, useEffect } from 'react';
import { Clock, Send, Trash2, Plus, AlertCircle } from 'lucide-react';
import '../Reports.css';

interface EmailSchedule {
  id: string;
  subject: string;
  message: string;
  recipient_type: string;
  recipient_folder_name?: string;
  scheduled_at: string;
  recurrence_type?: 'ONE_TIME' | 'MONTHLY';
  monthly_days?: string;
  monthly_time?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
  created_by_username: string;
  created_at: string;
}

interface Folder {
  id: number;
  name: string;
  folder_type: string;
  parent?: number;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('sgdra_access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

export const EmailScheduling: React.FC = () => {
  const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    recipient_type: 'ALL_USERS',
    recipient_folder: '',
    scheduled_at: '',
    recurrence_type: 'ONE_TIME',
    monthly_days: [] as string[],
    monthly_time: '09:00',
  });

  useEffect(() => {
    fetchSchedules();
    fetchFolders();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scheduling/email-schedules/', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setSchedules(data.results || data);
      } else {
        setError('Failed to load schedules');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      // Utiliser les endpoints spécifiques qui retournent TOUTES les unités organisationnelles sans filtrage par user
      const [polesRes, filialesRes, servicesRes] = await Promise.all([
        fetch('/api/folders/poles/', { headers: getAuthHeaders() }),
        fetch('/api/folders/filiales/', { headers: getAuthHeaders() }),
        fetch('/api/folders/services/', { headers: getAuthHeaders() })
      ]);

      const folders: any[] = [];

      if (polesRes.ok) {
        const data = await polesRes.json();
        const poles = data.results || data;
        folders.push(...poles.map((p: any) => ({ ...p, folder_type: 'pole' })));
      }

      if (filialesRes.ok) {
        const data = await filialesRes.json();
        const filiales = data.results || data;
        folders.push(...filiales.map((f: any) => ({ ...f, folder_type: 'filiale' })));
      }

      if (servicesRes.ok) {
        const data = await servicesRes.json();
        const services = data.results || data;
        folders.push(...services.map((s: any) => ({ ...s, folder_type: 'service' })));
      }

      console.log('📁 Dossiers chargés depuis /api/folders/poles, /api/folders/filiales, /api/folders/services:', folders.length);
      const types = [...new Set(folders.map((f: any) => f.folder_type))];
      console.log('📋 Types trouvés:', types);
      folders.forEach((f: any) => {
        console.log(`  - ${f.name}: ${f.folder_type}`);
      });
      setFolders(folders);
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Construire le payload selon le type de récurrence
      const payload: any = {
        subject: formData.subject,
        message: formData.message,
        recipient_type: formData.recipient_type,
        recipient_folder: formData.recipient_type !== 'ALL_USERS' ? formData.recipient_folder : null,
        recurrence_type: formData.recurrence_type,
      };

      if (formData.recurrence_type === 'ONE_TIME') {
        // Pour une programmation unique, envoyer la date/heure
        payload.scheduled_at = formData.scheduled_at;
      } else if (formData.recurrence_type === 'MONTHLY') {
        // Pour une programmation mensuelle, envoyer les jours et l'heure
        payload.monthly_days = formData.monthly_days.join(',');
        payload.monthly_time = formData.monthly_time;
      }

      const response = await fetch('/api/scheduling/email-schedules/', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setFormData({
          subject: '',
          message: '',
          recipient_type: 'ALL_USERS',
          recipient_folder: '',
          scheduled_at: '',
          recurrence_type: 'ONE_TIME',
          monthly_days: [],
          monthly_time: '09:00',
        });
        setShowForm(false);
        fetchSchedules();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create schedule');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async (id: string) => {
    try {
      const response = await fetch(`/api/scheduling/email-schedules/${id}/send_now/`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        fetchSchedules();
      } else {
        setError('Failed to send email');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error sending email');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const response = await fetch(`/api/scheduling/email-schedules/${id}/cancel/`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        fetchSchedules();
      } else {
        setError('Failed to cancel schedule');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cancelling schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      const response = await fetch(`/api/scheduling/email-schedules/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        fetchSchedules();
      } else {
        setError('Failed to delete schedule');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting schedule');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return '#10b981';
      case 'SCHEDULED':
        return '#3b82f6';
      case 'DRAFT':
        return '#6b7280';
      case 'FAILED':
        return '#ef4444';
      case 'CANCELLED':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      DRAFT: 'Brouillon',
      SCHEDULED: 'Programmé',
      SENT: 'Envoyé',
      FAILED: 'Échoué',
      CANCELLED: 'Annulé',
    };
    return labels[status] || status;
  };
  const getFilteredSchedules = () => {
    if (filterStatus === 'all') return schedules;
    return schedules.filter(schedule => schedule.status === filterStatus);
  };
  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>📧 Planification des emails</h1>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', minWidth: '180px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
        >
          <option value="all">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="SCHEDULED">Programmé</option>
          <option value="SENT">Envoyé</option>
          <option value="FAILED">Échoué</option>
          <option value="CANCELLED">Annulé</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={18} /> Nouveau planning
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {showForm && (
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label>Sujet</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Sujet de l'email"
                required
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Contenu du message"
                required
                rows={5}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Type de destinataire</label>
                <select
                  value={formData.recipient_type}
                  onChange={(e) => setFormData({ ...formData, recipient_type: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                >
                  <option value="ALL_USERS">Tous les utilisateurs</option>
                  <option value="POLE">Pôle spécifique</option>
                  <option value="FILIALE">Filiale spécifique</option>
                  <option value="SERVICE">Service spécifique</option>
                  <option value="SUB_SERVICE">Sous-service spécifique</option>
                </select>
              </div>

              {formData.recipient_type !== 'ALL_USERS' && (
                <div>
                  <label>Dossier destinataire</label>
                  <select
                    value={formData.recipient_folder}
                    onChange={(e) => setFormData({ ...formData, recipient_folder: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {(() => {
                      const filteredFolders = folders.filter(f => {
                        // Map les types de sélection aux types réels de dossiers (basé sur les valeurs réelles du DB)
                        const typeMap: { [key: string]: string[] } = {
                          'POLE': ['pole'],
                          'FILIALE': ['filiale'],
                          'SERVICE': ['service'],
                        };
                        const acceptedTypes = typeMap[formData.recipient_type] || [];
                        return acceptedTypes.includes(f.folder_type);
                      });
                      
                      console.log(`🔍 Filtre pour ${formData.recipient_type}:`, filteredFolders);
                      
                      return filteredFolders.length === 0 ? (
                        <option disabled>Aucun dossier trouvé</option>
                      ) : (
                        filteredFolders.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))
                      );
                    })()}
                  </select>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Type de programmation</label>
                <select
                  value={formData.recurrence_type}
                  onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as 'ONE_TIME' | 'MONTHLY' })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                >
                  <option value="ONE_TIME">Une seule fois</option>
                  <option value="MONTHLY">Chaque mois</option>
                </select>
              </div>
            </div>

            {formData.recurrence_type === 'ONE_TIME' ? (
              <div style={{ marginBottom: '16px' }}>
                <label>Date et heure d'envoi</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label>Jours du mois (sélectionner au moins un)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginTop: '8px' }}>
                    {[1, 5, 10, 15, 20, 23, 25, 30].map(day => (
                      <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.monthly_days.includes(String(day))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ 
                                ...formData, 
                                monthly_days: [...formData.monthly_days, String(day)].sort((a, b) => parseInt(a) - parseInt(b))
                              });
                            } else {
                              setFormData({ 
                                ...formData, 
                                monthly_days: formData.monthly_days.filter(d => d !== String(day))
                              });
                            }
                          }}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label>Heure d'envoi</label>
                  <input
                    type="time"
                    value={formData.monthly_time}
                    onChange={(e) => setFormData({ ...formData, monthly_time: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                Créer le planning
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !showForm ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Sujet</th>
                <th>Type de destinataire</th>
                <th>Dossier</th>
                <th>Programmé pour</th>
                <th>Statut</th>
                <th>Créé par</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredSchedules().length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                    {filterStatus === 'all' ? 'Aucun planning d\'email' : `Aucun email avec le statut "${filterStatus}"`}
                  </td>
                </tr>
              ) : (
                getFilteredSchedules().map(schedule => (
                  <tr key={schedule.id}>
                    <td>
                      <strong>{schedule.subject}</strong>
                      <div style={{ fontSize: '0.85em', color: '#666' }}>
                        {schedule.message.substring(0, 50)}...
                      </div>
                    </td>
                    <td>
                      {schedule.recipient_type === 'ALL_USERS' ? 'Tous' : schedule.recipient_type}
                    </td>
                    <td>{schedule.recipient_folder_name || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={16} />
                        <div>
                          {schedule.recurrence_type === 'MONTHLY' ? (
                            <>
                              <div>Mensuel: jours {schedule.monthly_days} à {schedule.monthly_time}</div>
                            </>
                          ) : (
                            <>
                              <div>{new Date(schedule.scheduled_at).toLocaleString('fr-FR')}</div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        backgroundColor: getStatusColor(schedule.status),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: 'bold'
                      }}>
                        {getStatusLabel(schedule.status)}
                      </span>
                    </td>
                    <td>{schedule.created_by_username}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {schedule.status === 'DRAFT' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleSendNow(schedule.id)}
                            title="Envoyer maintenant"
                          >
                            <Send size={16} />
                          </button>
                        )}
                        {(schedule.status === 'DRAFT' || schedule.status === 'SCHEDULED') && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleCancel(schedule.id)}
                            title="Annuler"
                          >
                            Annuler
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(schedule.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
