import React, { useState, useEffect } from 'react'
import { 
  CheckCircle2, Circle, Clock, AlertCircle, Zap, Search, Filter, 
  Trash2, Eye, Calendar, User, Flag, MessageSquare, RefreshCw, Loader
} from 'lucide-react'
import { Layout } from '@/components/common'
import { Modal } from '@/components/common'
import { apiClient } from '@/services/api'

interface Task {
  id: string
  title: string
  description: string
  documentType: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  priority: 'low' | 'medium' | 'high' | 'critical'
  dueDate: Date
  assignedTo: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  comments?: string
  documentId?: string
}

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Validation - Demande de congé RH',
    description: 'Vérifier et valider la demande de congé du service RH',
    documentType: 'CONGE',
    status: 'in_progress',
    priority: 'high',
    dueDate: new Date('2026-01-29'),
    assignedTo: 'Jean Dupont',
    createdBy: 'Admin',
    createdAt: new Date('2026-01-22'),
    updatedAt: new Date('2026-01-28'),
    comments: 'En cours de vérification',
  },
  {
    id: '2',
    title: 'Signature - Rapport financier',
    description: 'Signer le rapport financier mensuel',
    documentType: 'RAPPORT',
    status: 'pending',
    priority: 'critical',
    dueDate: new Date('2026-01-28'),
    assignedTo: 'Marie Martin',
    createdBy: 'Admin',
    createdAt: new Date('2026-01-25'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: '3',
    title: 'Archivage - Documents 2025',
    description: 'Archiver les documents de 2025',
    documentType: 'ARCHIVE',
    status: 'completed',
    priority: 'low',
    dueDate: new Date('2026-01-20'),
    assignedTo: 'Pierre Bernard',
    createdBy: 'Admin',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-20'),
    completedAt: new Date('2026-01-20T14:30:00'),
  },
  {
    id: '4',
    title: 'Review - Budget 2026',
    description: 'Examiner et approuver le budget pour 2026',
    documentType: 'BUDGET',
    status: 'overdue',
    priority: 'critical',
    dueDate: new Date('2026-01-25'),
    assignedTo: 'Sophie Lefevre',
    createdBy: 'Admin',
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-25'),
  },
  {
    id: '5',
    title: 'Correction - Facture client',
    description: 'Corriger et mettre à jour la facture',
    documentType: 'FACTURE',
    status: 'in_progress',
    priority: 'medium',
    dueDate: new Date('2026-01-31'),
    assignedTo: 'Jean Dupont',
    createdBy: 'Admin',
    createdAt: new Date('2026-01-22'),
    updatedAt: new Date('2026-01-28'),
  },
  {
    id: '6',
    title: 'Scan - Documents papier',
    description: 'Numériser les documents papier reçus',
    documentType: 'SCAN',
    status: 'pending',
    priority: 'low',
    dueDate: new Date('2026-02-05'),
    assignedTo: 'Pierre Bernard',
    createdBy: 'Admin',
    createdAt: new Date('2026-01-23'),
    updatedAt: new Date('2026-01-23'),
  },
]

const getStatusInfo = (status: Task['status']) => {
  switch (status) {
    case 'completed':
      return { label: 'Complétée', color: 'success', bgColor: 'bg-success-50', textColor: 'text-success-700', icon: CheckCircle2 }
    case 'in_progress':
      return { label: 'En cours', color: 'info', bgColor: 'bg-info-50', textColor: 'text-info-700', icon: Clock }
    case 'pending':
      return { label: 'En attente', color: 'warning', bgColor: 'bg-warning-50', textColor: 'text-warning-700', icon: Circle }
    case 'overdue':
      return { label: 'En retard', color: 'error', bgColor: 'bg-error-50', textColor: 'text-error-700', icon: AlertCircle }
    default:
      return { label: 'Inconnu', color: 'secondary', bgColor: 'bg-secondary-50', textColor: 'text-secondary-700', icon: Circle }
  }
}

const getPriorityInfo = (priority: Task['priority']) => {
  switch (priority) {
    case 'critical':
      return { label: 'Critique', color: 'error', bgColor: 'bg-error-100' }
    case 'high':
      return { label: 'Élevée', color: 'warning', bgColor: 'bg-warning-100' }
    case 'medium':
      return { label: 'Moyenne', color: 'info', bgColor: 'bg-info-100' }
    case 'low':
      return { label: 'Basse', color: 'success', bgColor: 'bg-success-100' }
    default:
      return { label: 'Inconnue', color: 'secondary', bgColor: 'bg-secondary-100' }
  }
}

const isOverdue = (dueDate: Date, status: Task['status']) => {
  return status !== 'completed' && new Date() > dueDate
}

export const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [showModal, setShowModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all')
  const [filterPriority] = useState<Task['priority'] | 'all'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks()
  }, [])

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await apiClient.get('/tasks/')
      if (response.data) {
        const fetchedTasks = response.data.map((task: any) => ({
          id: task.id?.toString(),
          title: task.title || '',
          description: task.description || '',
          documentType: task.document_type || 'N/A',
          status: (task.status?.toLowerCase() as Task['status']) || 'pending',
          priority: (task.priority?.toLowerCase() as Task['priority']) || 'medium',
          dueDate: task.due_date ? new Date(task.due_date) : new Date(),
          assignedTo: task.assigned_to?.username || 'Non assigné',
          createdBy: task.created_by?.username || 'Système',
          createdAt: task.created_at ? new Date(task.created_at) : new Date(),
          updatedAt: task.updated_at ? new Date(task.updated_at) : new Date(),
          completedAt: task.completed_at ? new Date(task.completed_at) : undefined,
          comments: task.comments || '',
          documentId: task.document_id?.toString(),
        }))
        setTasks(fetchedTasks)
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setTasks(mockTasks) // Fallback to mock data
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
  }

  const completionRate = tasks.length > 0 ? Math.round((stats.completed / tasks.length) * 100) : 0

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task)
    setShowModal(true)
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      await apiClient.put(`/tasks/${taskId}/`, { status: 'completed' })
      
      const updatedTasks = tasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'completed' as const,
              completedAt: new Date(),
              updatedAt: new Date(),
            }
          : t
      )
      setTasks(updatedTasks)
      
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => 
          prev ? { ...prev, status: 'completed', completedAt: new Date(), updatedAt: new Date() } : null
        )
      }
      
      setSuccessMessage('Tâche marquée comme complétée')
    } catch (err) {
      console.error('Error completing task:', err)
      setError('Erreur lors de la completion de la tâche')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche?')) {
      try {
        await apiClient.delete(`/tasks/${taskId}/`)
        
        const updatedTasks = tasks.filter(t => t.id !== taskId)
        setTasks(updatedTasks)
        
        if (selectedTask?.id === taskId) {
          setShowModal(false)
          setSelectedTask(null)
        }
        
        setSuccessMessage('Tâche supprimée avec succès')
      } catch (err) {
        console.error('Error deleting task:', err)
        setError('Erreur lors de la suppression de la tâche')
      }
    }
  }

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      setError(null)
      await fetchTasks()
      setSuccessMessage('Tâches actualisées')
    } catch (err) {
      console.error('Error refreshing tasks:', err)
      setError('Erreur lors du rafraîchissement des tâches')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl flex items-start gap-3 animate-slide-up">
              <AlertCircle className="text-error-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-error-700 font-medium">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-error-600 hover:text-error-700"
              >
                ×
              </button>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-xl flex items-start gap-3 animate-slide-up">
              <CheckCircle2 className="text-success-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-success-700 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="animate-spin text-primary-600 mb-4" size={40} />
              <p className="text-secondary-600 font-medium">Chargement des tâches...</p>
            </div>
          ) : (
            <>
          
              {/* Modern Glassmorphism Header */}
              <div className="glass-card-hover mb-8 border border-white/30 p-8 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                      <CheckCircle2 size={32} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-black bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                        Mes Tâches
                      </h1>
                      <p className="text-secondary-600 mt-2 font-medium">Gérez et suivez vos tâches documentaires</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`p-3 hover:bg-primary-100 rounded-xl transition-all transform hover:scale-110 ${
                      isRefreshing ? 'animate-spin' : ''
                    }`}
                    title="Actualiser"
                  >
                    <RefreshCw size={24} className="text-primary-600" />
                  </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8 pt-8 border-t border-white/20">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
                    <div className="p-3 bg-info-500/20 rounded-xl">
                      <Zap size={20} className="text-info-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-secondary-600">Total</p>
                      <p className="text-2xl font-bold text-primary-600">{stats.total}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
                    <div className="p-3 bg-success-500/20 rounded-xl">
                      <CheckCircle2 size={20} className="text-success-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-secondary-600">Complétées</p>
                      <p className="text-2xl font-bold text-success-600">{stats.completed}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
                    <div className="p-3 bg-warning-500/20 rounded-xl">
                      <Clock size={20} className="text-warning-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-secondary-600">En cours</p>
                      <p className="text-2xl font-bold text-warning-600">{stats.inProgress}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
                    <div className="p-3 bg-accent-500/20 rounded-xl">
                      <Circle size={20} className="text-accent-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-secondary-600">En attente</p>
                      <p className="text-2xl font-bold text-accent-600">{stats.pending}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
                    <div className="p-3 bg-error-500/20 rounded-xl">
                      <AlertCircle size={20} className="text-error-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-secondary-600">En retard</p>
                      <p className="text-2xl font-bold text-error-600">{stats.overdue}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 pt-6 border-t border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-secondary-700">Taux de completion</p>
                    <span className="text-sm font-bold text-primary-600">{completionRate}%</span>
                  </div>
                  <div className="w-full h-2 bg-secondary-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-success-500 to-success-600 transition-all duration-500" 
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 relative">
                  <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une tâche..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-12 py-3"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      filterStatus === 'all'
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    <Filter size={18} className="inline mr-2" />
                    Tous
                  </button>
                  <button
                    onClick={() => setFilterStatus('in_progress')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      filterStatus === 'in_progress'
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    ⏳ En cours
                  </button>
                  <button
                    onClick={() => setFilterStatus('completed')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      filterStatus === 'completed'
                        ? 'btn-success'
                        : 'btn-secondary'
                    }`}
                  >
                    ✓ Complétées
                  </button>
                  <button
                    onClick={() => setFilterStatus('overdue')}
                    className={`px-4 py-3 rounded-xl font-medium transition-all ${
                      filterStatus === 'overdue'
                        ? 'btn-danger'
                        : 'btn-secondary'
                    }`}
                  >
                    ⚠ En retard
                  </button>
                </div>
              </div>

              {/* Tasks List */}
              {filteredTasks.length > 0 ? (
                <div className="space-y-4 animate-fade-in">
                  {filteredTasks.map((task, index) => {
                    const statusInfo = getStatusInfo(task.status)
                    const priorityInfo = getPriorityInfo(task.priority)
                    const overdue = isOverdue(task.dueDate, task.status)
                    const StatusIcon = statusInfo.icon

                    return (
                      <div 
                        key={task.id} 
                        className="card group hover:shadow-lg transition-all animate-slide-up border-l-4"
                        style={{ 
                          borderLeftColor: statusInfo.color === 'success' ? '#10b981' : 
                                          statusInfo.color === 'info' ? '#3b82f6' :
                                          statusInfo.color === 'warning' ? '#f59e0b' :
                                          statusInfo.color === 'error' ? '#ef4444' : '#64748b',
                          animationDelay: `${index * 0.05}s`
                        }}
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-start gap-4 flex-1">
                              {/* Status Icon */}
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                className={`p-3 rounded-full transition-all ${statusInfo.bgColor} hover:scale-110 flex-shrink-0`}
                                title={task.status === 'completed' ? 'Marquer comme en cours' : 'Marquer comme complétée'}
                              >
                                <StatusIcon size={24} className={statusInfo.textColor} />
                              </button>

                              {/* Task Details */}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h3 className="text-lg font-bold text-secondary-900">{task.title}</h3>
                                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                    {statusInfo.label}
                                  </span>
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${priorityInfo.bgColor}`}>
                                    <Flag size={12} /> {priorityInfo.label}
                                  </span>
                                  {overdue && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-error-100 text-error-700 rounded-lg text-xs font-bold">
                                      <AlertCircle size={12} /> En retard
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-secondary-600 mb-3">{task.description}</p>

                                {/* Task Info Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  <div className="dashboard-stat p-3 border-0">
                                    <p className="text-xs text-secondary-600 font-medium mb-1">Type Document</p>
                                    <p className="font-semibold text-secondary-900">{task.documentType}</p>
                                  </div>
                                  <div className="dashboard-stat p-3 border-0">
                                    <p className="text-xs text-secondary-600 font-medium mb-1">Assigné à</p>
                                    <p className="font-semibold text-secondary-900 flex items-center gap-1">
                                      <User size={14} /> {task.assignedTo}
                                    </p>
                                  </div>
                                  <div className="dashboard-stat p-3 border-0">
                                    <p className="text-xs text-secondary-600 font-medium mb-1">Date limite</p>
                                    <p className={`font-semibold ${overdue && task.status !== 'completed' ? 'text-error-600' : 'text-secondary-900'}`}>
                                      <Calendar size={14} className="inline mr-1" />
                                      {task.dueDate.toLocaleDateString('fr-FR')}
                                    </p>
                                  </div>
                                  <div className="dashboard-stat p-3 border-0">
                                    <p className="text-xs text-secondary-600 font-medium mb-1">Créé par</p>
                                    <p className="font-semibold text-secondary-900">{task.createdBy}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => openTaskDetail(task)}
                                className="p-3 hover:bg-primary-100 rounded-xl transition-all transform hover:scale-110 group-hover:bg-primary-50"
                                title="Voir les détails"
                              >
                                <Eye size={18} className="text-primary-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-3 hover:bg-error-100 rounded-xl transition-all transform hover:scale-110 group-hover:bg-error-50"
                                title="Supprimer"
                              >
                                <Trash2 size={18} className="text-error-600" />
                              </button>
                            </div>
                          </div>

                          {/* Footer - Comments if available */}
                          {task.comments && (
                            <div className="pt-4 border-t border-secondary-100">
                              <p className="text-xs text-secondary-500 font-medium flex items-center gap-2">
                                <MessageSquare size={14} />
                                <span>{task.comments}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="card p-16 text-center">
                  <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-secondary-400" />
                  </div>
                  <p className="text-secondary-900 font-semibold text-lg mb-2">Aucune tâche trouvée</p>
                  <p className="text-secondary-600 mb-6">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Affinez votre recherche ou vos filtres'
                      : 'Vous êtes à jour - aucune tâche pour le moment'}
                  </p>
                  {(searchTerm || filterStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setFilterStatus('all')
                      }}
                      className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      {showModal && selectedTask && (
        <Modal 
          isOpen={showModal} 
          title={selectedTask.title} 
          onClose={() => setShowModal(false)}
        >
          <div className="space-y-6">
            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Statut</label>
                <div className={`p-3 rounded-lg ${getStatusInfo(selectedTask.status).bgColor}`}>
                  <span className={`font-semibold ${getStatusInfo(selectedTask.status).textColor} flex items-center gap-2`}>
                    {(() => {
                      const Icon = getStatusInfo(selectedTask.status).icon
                      return <><Icon size={18} /> {getStatusInfo(selectedTask.status).label}</>
                    })()}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Priorité</label>
                <div className={`p-3 rounded-lg ${getPriorityInfo(selectedTask.priority).bgColor}`}>
                  <span className="font-semibold flex items-center gap-2">
                    <Flag size={18} /> {getPriorityInfo(selectedTask.priority).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-secondary-900 mb-2">Description</label>
              <p className="p-4 bg-secondary-50 rounded-lg text-secondary-700">
                {selectedTask.description}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-secondary-600 font-medium mb-1">Type de document</label>
                <p className="text-sm font-semibold text-secondary-900">{selectedTask.documentType}</p>
              </div>
              <div>
                <label className="block text-xs text-secondary-600 font-medium mb-1">Date limite</label>
                <p className="text-sm font-semibold text-secondary-900 flex items-center gap-1">
                  <Calendar size={14} />
                  {selectedTask.dueDate.toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="block text-xs text-secondary-600 font-medium mb-1">Assigné à</label>
                <p className="text-sm font-semibold text-secondary-900 flex items-center gap-1">
                  <User size={14} />
                  {selectedTask.assignedTo}
                </p>
              </div>
              <div>
                <label className="block text-xs text-secondary-600 font-medium mb-1">Créé par</label>
                <p className="text-sm font-semibold text-secondary-900">{selectedTask.createdBy}</p>
              </div>
              <div>
                <label className="block text-xs text-secondary-600 font-medium mb-1">Créé le</label>
                <p className="text-sm font-semibold text-secondary-900">
                  {selectedTask.createdAt.toLocaleDateString('fr-FR')} à {selectedTask.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {selectedTask.completedAt && (
                <div>
                  <label className="block text-xs text-secondary-600 font-medium mb-1">Complétée le</label>
                  <p className="text-sm font-semibold text-success-600">
                    {selectedTask.completedAt.toLocaleDateString('fr-FR')} à {selectedTask.completedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            {/* Comments */}
            {selectedTask.comments && (
              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Commentaires
                </label>
                <p className="p-4 bg-secondary-50 rounded-lg text-secondary-700">
                  {selectedTask.comments}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-secondary-200">
              {selectedTask.status !== 'completed' && (
                <button
                  onClick={() => {
                    handleCompleteTask(selectedTask.id)
                    setShowModal(false)
                  }}
                  className="flex-1 btn-success"
                >
                  <CheckCircle2 size={18} className="inline mr-2" />
                  Marquer complétée
                </button>
              )}
              <button
                onClick={() => handleDeleteTask(selectedTask.id)}
                className="flex-1 btn-danger"
              >
                <Trash2 size={18} className="inline mr-2" />
                Supprimer
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 btn-secondary"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}