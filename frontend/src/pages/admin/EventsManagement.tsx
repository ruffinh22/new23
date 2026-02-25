import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import '../Reports.css';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location: string;
  is_public: boolean;
  is_upcoming: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  created_by_username: string;
  visible_to_folder_name?: string;
  created_at: string;
}

interface Folder {
  id: number;
  name: string;
  folder_type: string;
}

const getAuthHeaders = (contentType: string = 'application/json') => {
  const token = localStorage.getItem('sgdra_access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': contentType,
  };
};

export const EventsManagement: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
    is_public: true,
    visible_to_folder: '',
    status: 'DRAFT',
  });

  useEffect(() => {
    fetchEvents();
    fetchFolders();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/scheduling/events/', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.results || data);
      } else {
        setError('Failed to load events');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading events');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders/', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setFolders(data.results || data);
      }
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        visible_to_folder: formData.is_public ? null : formData.visible_to_folder,
      };

      const url = editingEvent
        ? `/api/scheduling/events/${editingEvent.id}/`
        : '/api/scheduling/events/';

      const response = await fetch(url, {
        method: editingEvent ? 'PATCH' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        resetForm();
        fetchEvents();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to save event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving event');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_date: event.event_date.split('T')[0],
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      location: event.location,
      is_public: event.is_public,
      visible_to_folder: event.visible_to_folder_name || '',
      status: event.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/scheduling/events/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        fetchEvents();
      } else {
        setError('Failed to delete event');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting event');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: '',
      start_time: '',
      end_time: '',
      location: '',
      is_public: true,
      visible_to_folder: '',
      status: 'DRAFT',
    });
    setEditingEvent(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return '#10b981';
      case 'DRAFT':
        return '#6b7280';
      case 'ARCHIVED':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      DRAFT: 'Brouillon',
      PUBLISHED: 'Publié',
      ARCHIVED: 'Archivé',
    };
    return labels[status] || status;
  };

  const filteredEvents = events.filter(event => {
    if (filterStatus === 'all') return true;
    return event.status === filterStatus;
  });

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>📅 Gestion des événements</h1>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', minWidth: '180px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
        >
          <option value="all">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PUBLISHED">Publié</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={() => !editingEvent && setShowForm(!showForm)}
        >
          <Plus size={18} /> Nouvel événement
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
              <label>Titre</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'événement"
                required
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de l'événement"
                required
                rows={4}
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>

              <div>
                <label>Lieu</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Lieu de l'événement"
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Heure de début</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>

              <div>
                <label>Heure de fin</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                  />
                  {' '}Événement public
                </label>
              </div>

              {!formData.is_public && (
                <div>
                  <label>Visible par</label>
                  <select
                    value={formData.visible_to_folder}
                    onChange={(e) => setFormData({ ...formData, visible_to_folder: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                  >
                    <option value="">-- Sélectionner --</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Statut</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="PUBLISHED">Publié</option>
                  <option value="ARCHIVED">Archivé</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {editingEvent ? 'Mettre à jour' : 'Créer'} l'événement
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
                <th>Titre</th>
                <th>Date</th>
                <th>Lieu</th>
                <th>Accès</th>
                <th>Statut</th>
                <th>Créé par</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                    Aucun événement
                  </td>
                </tr>
              ) : (
                filteredEvents.map(event => (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.title}</strong>
                      <div style={{ fontSize: '0.85em', color: '#666' }}>
                        {event.description ? event.description.substring(0, 50) : '-'}...
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={16} />
                        {new Date(event.event_date).toLocaleDateString('fr-FR')}
                      </div>
                      {event.start_time && (
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          {event.start_time}
                          {event.end_time && ` - ${event.end_time}`}
                        </div>
                      )}
                    </td>
                    <td>{event.location || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {event.is_public ? (
                          <>
                            <Eye size={16} />
                            Public
                          </>
                        ) : (
                          <>
                            <EyeOff size={16} />
                            Privé
                          </>
                        )}
                      </div>
                      {!event.is_public && event.visible_to_folder_name && (
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          {event.visible_to_folder_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        backgroundColor: getStatusColor(event.status),
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85em',
                        fontWeight: 'bold'
                      }}>
                        {getStatusLabel(event.status)}
                      </span>
                    </td>
                    <td>{event.created_by_username}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(event)}
                          title="Éditer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(event.id)}
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
