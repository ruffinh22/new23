import React, { useState } from 'react'
import { Layout } from '@/components/common'
import { Calendar, Clock, MapPin, Users, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiClient } from '@/services'

interface ScheduleEvent {
  id: number
  title: string
  date: Date
  startTime: string
  endTime: string
  type: 'meeting' | 'task' | 'deadline' | 'review'
  status: 'pending' | 'completed' | 'cancelled'
  location?: string
  attendees?: string[]
  description?: string
}

const MOCK_EVENTS: ScheduleEvent[] = [
  {
    id: 1,
    title: 'Réunion avec l\'équipe Marketing',
    date: new Date(2026, 0, 28),
    startTime: '09:00',
    endTime: '10:30',
    type: 'meeting',
    status: 'pending',
    location: 'Salle A - Étage 2',
    attendees: ['Alice Dupont', 'Bob Martin', 'Carol Brown'],
    description: 'Discussion sur la stratégie Q1'
  },
  {
    id: 2,
    title: 'Révision des documents de routage',
    date: new Date(2026, 0, 28),
    startTime: '14:00',
    endTime: '15:00',
    type: 'review',
    status: 'pending',
    description: 'Valider les nouvelles règles de routage',
  },
  {
    id: 3,
    title: 'Rapport mensuel',
    date: new Date(2026, 0, 29),
    startTime: '11:00',
    endTime: '12:00',
    type: 'task',
    status: 'pending',
    description: 'Préparer le rapport des KPIs',
  },
  {
    id: 4,
    title: 'Formation système',
    date: new Date(2026, 0, 30),
    startTime: '10:00',
    endTime: '12:00',
    type: 'deadline',
    status: 'pending',
    location: 'Salle de formation',
    description: 'Formation sur les nouveaux workflows',
  },
]

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export const Schedule: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 28))
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null)
  const [showNewEventModal, setShowNewEventModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [newEventForm, setNewEventForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    type: 'meeting' as const,
    location: '',
    description: '',
    attendees: '',
  })

  const handleCreateEvent = async () => {
    if (!newEventForm.title || !newEventForm.date || !newEventForm.startTime || !newEventForm.endTime) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const attendeesArray = newEventForm.attendees
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0)

      const eventData = {
        title: newEventForm.title,
        date: newEventForm.date,
        start_time: newEventForm.startTime,
        end_time: newEventForm.endTime,
        type: newEventForm.type,
        location: newEventForm.location || null,
        description: newEventForm.description || null,
        attendees: attendeesArray,
      }

      await apiClient.post('/schedule/events/', eventData)

      setSuccess('Événement créé avec succès!')
      setShowNewEventModal(false)
      setNewEventForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        type: 'meeting',
        location: '',
        description: '',
        attendees: '',
      })

      // Recharger les événements après création
      setTimeout(() => {
        setSuccess('')
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la création de l\'événement')
    } finally {
      setLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'task': return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'deadline': return 'bg-red-100 text-red-800 border-red-300'
      case 'review': return 'bg-green-100 text-green-800 border-green-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Users size={16} />
      case 'task': return <CheckCircle2 size={16} />
      case 'deadline': return <AlertCircle size={16} />
      case 'review': return <Calendar size={16} />
      default: return <Clock size={16} />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'meeting': return 'Réunion'
      case 'task': return 'Tâche'
      case 'deadline': return 'Échéance'
      case 'review': return 'Révision'
      default: return 'Événement'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success-600'
      case 'cancelled': return 'text-error-600 line-through'
      default: return 'text-secondary-900'
    }
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEventsForDate = (date: Date) => {
    return MOCK_EVENTS.filter(event => 
      event.date.toDateString() === date.toDateString()
    )
  }

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-secondary-900 mb-2">Calendrier & Planning</h1>
            <p className="text-secondary-600 font-medium">Gérez vos rendez-vous et tâches planifiées</p>
          </div>
          <button
            onClick={() => setShowNewEventModal(true)}
            className="btn-primary inline-flex items-center gap-2 transform hover:scale-105"
          >
            <Plus size={20} /> Nouvel événement
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="flex gap-2">
          {(['month', 'week', 'day'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all transform ${
                viewMode === mode
                  ? 'bg-primary-500 text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-secondary-200 text-secondary-700 hover:border-primary-400'
              }`}
            >
              {mode === 'month' ? 'Mois' : mode === 'week' ? 'Semaine' : 'Jour'}
            </button>
          ))}
        </div>

        {/* Calendar View */}
        {viewMode === 'month' && (
          <div className="space-y-6">
            {/* Month Header */}
            <div className="card border-0 shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={previousMonth}
                  className="p-2 hover:bg-primary-50 rounded-lg transition"
                >
                  <ChevronLeft className="text-primary-600" size={24} />
                </button>
                <h2 className="text-2xl font-bold text-secondary-900">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-primary-50 rounded-lg transition"
                >
                  <ChevronRight className="text-primary-600" size={24} />
                </button>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="text-center font-bold text-secondary-700 py-3 bg-secondary-50 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-4 bg-secondary-50 rounded-lg" />
                ))}
                {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                  const day = i + 1
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                  const events = getEventsForDate(date)
                  const isToday = date.toDateString() === new Date().toDateString()

                  return (
                    <div
                      key={day}
                      className={`min-h-24 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isToday
                          ? 'bg-primary-50 border-primary-500 shadow-lg'
                          : 'bg-white border-secondary-200 hover:border-primary-300'
                      }`}
                    >
                      <p className={`font-bold mb-2 ${isToday ? 'text-primary-600' : 'text-secondary-900'}`}>
                        {day}
                      </p>
                      <div className="space-y-1">
                        {events.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={`text-xs px-2 py-1 rounded font-semibold border ${getTypeColor(event.type)} cursor-pointer hover:shadow-md transition`}
                            onClick={() => setSelectedEvent(event)}
                          >
                            {event.title.substring(0, 15)}...
                          </div>
                        ))}
                        {events.length > 2 && (
                          <p className="text-xs text-secondary-600 px-2 font-semibold">
                            +{events.length - 2} plus
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Events List */}
        <div className="card border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar size={24} /> Prochains événements
            </h3>
          </div>

          <div className="divide-y divide-secondary-200">
            {MOCK_EVENTS.sort((a, b) => a.date.getTime() - b.date.getTime()).map(event => (
              <div
                key={event.id}
                className="p-6 hover:bg-secondary-50 transition-all group cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Type Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getTypeColor(event.type)}`}>
                      {getTypeIcon(event.type)}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className={`text-lg font-bold ${getStatusColor(event.status)}`}>
                          {event.title}
                        </h4>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getTypeColor(event.type)}`}>
                          {getTypeLabel(event.type)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-secondary-600">
                          <Calendar size={16} />
                          <span>{event.date.toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-secondary-600">
                          <Clock size={16} />
                          <span>{event.startTime} - {event.endTime}</span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2 text-secondary-600">
                            <MapPin size={16} />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.attendees && (
                          <div className="flex items-center gap-2 text-secondary-600">
                            <Users size={16} />
                            <span>{event.attendees.length} personne(s)</span>
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className="mt-3 text-secondary-700 text-sm bg-secondary-50 p-3 rounded">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button className="p-2 hover:bg-primary-100 rounded-lg text-primary-600 transition transform hover:scale-110">
                      <Edit2 size={18} />
                    </button>
                    <button className="p-2 hover:bg-error-100 rounded-lg text-error-600 transition transform hover:scale-110">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card max-w-2xl w-full">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white">{selectedEvent.title}</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-white hover:bg-primary-600 p-2 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-secondary-600 font-bold uppercase mb-2">Date</p>
                    <p className="font-bold text-secondary-900">{selectedEvent.date.toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary-600 font-bold uppercase mb-2">Heure</p>
                    <p className="font-bold text-secondary-900">{selectedEvent.startTime} - {selectedEvent.endTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-secondary-600 font-bold uppercase mb-2">Type</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getTypeColor(selectedEvent.type)}`}>
                      {getTypeLabel(selectedEvent.type)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-secondary-600 font-bold uppercase mb-2">Statut</p>
                    <p className={`font-bold ${getStatusColor(selectedEvent.status)}`}>
                      {selectedEvent.status === 'completed' ? 'Complété' : selectedEvent.status === 'cancelled' ? 'Annulé' : 'En attente'}
                    </p>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <p className="text-xs text-secondary-600 font-bold uppercase mb-2">Lieu</p>
                    <p className="font-bold text-secondary-900">{selectedEvent.location}</p>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <p className="text-xs text-secondary-600 font-bold uppercase mb-2">Description</p>
                    <p className="text-secondary-700">{selectedEvent.description}</p>
                  </div>
                )}

                {selectedEvent.attendees && (
                  <div>
                    <p className="text-xs text-secondary-600 font-bold uppercase mb-2">Participants</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <span key={idx} className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-semibold">
                          {attendee}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-secondary-200">
                  <button className="btn-primary flex-1">Modifier</button>
                  <button onClick={() => setSelectedEvent(null)} className="btn-secondary flex-1">Fermer</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Event Modal */}
        {showNewEventModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4 flex justify-between items-center sticky top-0">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Plus size={24} /> Nouvel événement
                </h3>
                <button
                  onClick={() => setShowNewEventModal(false)}
                  className="text-white hover:bg-primary-600 p-2 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-8 space-y-6">
                {/* Success Message */}
                {success && (
                  <div className="alert alert-success animate-slide-up">
                    <CheckCircle2 size={20} className="flex-shrink-0" />
                    <span className="font-semibold">Succès</span>
                    <p>{success}</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="alert alert-error animate-slide-up">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <span className="font-semibold">Erreur</span>
                    <p>{error}</p>
                  </div>
                )}
                {/* Title */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-secondary-700">Titre *</label>
                  <input
                    type="text"
                    placeholder="Ex: Réunion d'équipe"
                    value={newEventForm.title}
                    onChange={(e) => setNewEventForm({ ...newEventForm, title: e.target.value })}
                    className="input focus:ring-primary-500"
                  />
                </div>

                {/* Type */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-secondary-700">Type d'événement *</label>
                  <select
                    value={newEventForm.type}
                    onChange={(e) => setNewEventForm({ ...newEventForm, type: e.target.value as any })}
                    className="input cursor-pointer focus:ring-primary-500"
                  >
                    <option value="meeting">🔵 Réunion</option>
                    <option value="task">🟣 Tâche</option>
                    <option value="deadline">🔴 Échéance</option>
                    <option value="review">🟢 Révision</option>
                  </select>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-secondary-700">Date *</label>
                    <input
                      type="date"
                      value={newEventForm.date}
                      onChange={(e) => setNewEventForm({ ...newEventForm, date: e.target.value })}
                      className="input focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-secondary-700">Début *</label>
                    <input
                      type="time"
                      value={newEventForm.startTime}
                      onChange={(e) => setNewEventForm({ ...newEventForm, startTime: e.target.value })}
                      className="input focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-secondary-700">Fin *</label>
                    <input
                      type="time"
                      value={newEventForm.endTime}
                      onChange={(e) => setNewEventForm({ ...newEventForm, endTime: e.target.value })}
                      className="input focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-secondary-700">Lieu (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Salle A - Étage 2"
                    value={newEventForm.location}
                    onChange={(e) => setNewEventForm({ ...newEventForm, location: e.target.value })}
                    className="input focus:ring-primary-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-secondary-700">Description (optionnel)</label>
                  <textarea
                    placeholder="Détails de l'événement..."
                    value={newEventForm.description}
                    onChange={(e) => setNewEventForm({ ...newEventForm, description: e.target.value })}
                    className="textarea focus:ring-primary-500 h-24"
                  />
                </div>

                {/* Attendees */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-secondary-700">Participants (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Noms séparés par des virgules"
                    value={newEventForm.attendees}
                    onChange={(e) => setNewEventForm({ ...newEventForm, attendees: e.target.value })}
                    className="input focus:ring-primary-500"
                  />
                  <p className="text-xs text-secondary-500">Ex: Alice Dupont, Bob Martin, Carol Brown</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-secondary-200">
                  <button
                    onClick={handleCreateEvent}
                    disabled={loading}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Création...
                      </>
                    ) : (
                      <>
                        <Plus size={18} /> Créer l'événement
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowNewEventModal(false)}
                    disabled={loading}
                    className="btn-secondary flex-1 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
