import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, AlertCircle } from 'lucide-react';
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
  status: string;
  image?: string;
}

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('sgdra_access_token');
  if (!token) return {};
  return { 'Authorization': `Bearer ${token}` };
};

export const PublicEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchEvents();
  }, [filterType]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const endpoint = filterType === 'upcoming' 
        ? '/api/scheduling/events/upcoming/' 
        : '/api/scheduling/events/past/';
      
      const response = await fetch(endpoint, {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Chargement des événements...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '20px' }}>📅 Événements publics</h1>
        
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

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            className={filterType === 'upcoming' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setFilterType('upcoming')}
          >
            Événements à venir
          </button>
          <button
            className={filterType === 'past' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => setFilterType('past')}
          >
            Événements passés
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div style={{
          backgroundColor: '#f3f4f6',
          padding: '40px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Aucun événement {filterType === 'upcoming' ? 'à venir' : 'passé'} pour le moment.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {events.map(event => (
            <div
              key={event.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 15px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              }}
            >
              {event.image && (
                <img
                  src={event.image}
                  alt={event.title}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                  }}
                />
              )}
              
              <div style={{ padding: '16px' }}>
                <h3 style={{ marginBottom: '8px', color: '#1f2937' }}>
                  {event.title}
                </h3>

                <p style={{
                  color: '#6b7280',
                  fontSize: '0.95em',
                  marginBottom: '12px',
                  lineHeight: '1.5'
                }}>
                  {event.description}
                </p>

                <div style={{ 
                  display: 'grid', 
                  gap: '8px',
                  fontSize: '0.9em',
                  color: '#505050',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: '#3b82f6' }} />
                    <span>{formatDate(event.event_date)}</span>
                  </div>

                  {event.start_time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={16} style={{ color: '#3b82f6' }} />
                      <span>
                        {event.start_time}
                        {event.end_time && ` - ${event.end_time}`}
                      </span>
                    </div>
                  )}

                  {event.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={16} style={{ color: '#3b82f6' }} />
                      <span>{event.location}</span>
                    </div>
                  )}
                </div>

                {event.is_upcoming && (
                  <div style={{
                    backgroundColor: '#d1fae5',
                    color: '#065f46',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                    display: 'inline-block'
                  }}>
                    À venir
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
