import React, { useState } from 'react'
import { Zap, Plus, Edit2, Trash2, RefreshCw, Filter, Search, AlertCircle, CheckCircle2, TrendingUp, Zap as ZapIcon } from 'lucide-react'
import { Layout } from '@/components/common'
import { Modal } from '@/components/common'
import { Input } from '@/components/common'
import { RoutingRule } from '@/types/document'

const mockRules: RoutingRule[] = [
  {
    id: '1',
    name: 'Congés - RH',
    description: 'Route les documents de congé vers le dossier RH',
    conditions: {
      document_type: { value: 'CONGE', operator: 'equals' },
      department: { value: 'RH', operator: 'equals' },
    },
    destination_folder_id: '2',
    priority: 10,
    is_active: true,
    times_applied: 45,
    last_applied: new Date('2026-01-22T10:30:00'),
    created_by_id: '1',
    created_at: new Date('2026-01-15'),
    updated_at: new Date('2026-01-22'),
  },
  {
    id: '2',
    name: 'Budget - Finance',
    description: 'Route les documents budgétaires vers Finance',
    conditions: {
      document_type: { value: 'BUDGET', operator: 'equals' },
    },
    destination_folder_id: '4',
    priority: 8,
    is_active: true,
    times_applied: 12,
    last_applied: new Date('2026-01-20T14:15:00'),
    created_by_id: '1',
    created_at: new Date('2026-01-10'),
    updated_at: new Date('2026-01-22'),
  },
  {
    id: '3',
    name: 'Rapports - Archive',
    description: 'Archive automatiquement les vieux rapports',
    conditions: {
      document_type: { value: 'RAPPORT', operator: 'equals' },
    },
    destination_folder_id: '5',
    priority: 5,
    is_active: false,
    times_applied: 0,
    last_applied: null,
    created_by_id: '1',
    created_at: new Date('2026-01-20'),
    updated_at: new Date('2026-01-22'),
  },
]

export const RoutingRules: React.FC = () => {
  const [rules, setRules] = useState<RoutingRule[]>(mockRules)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    documentType: '',
    destinationFolderId: '',
    priority: '0',
  })

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterActive === null || rule.is_active === filterActive
    return matchesSearch && matchesFilter
  })

  const activeRulesCount = rules.filter(r => r.is_active).length
  const totalApplications = rules.reduce((sum, r) => sum + r.times_applied, 0)

  const openModal = (rule?: RoutingRule) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        description: rule.description || '',
        documentType: (rule.conditions.document_type?.value as string) || '',
        destinationFolderId: rule.destination_folder_id,
        priority: rule.priority.toString(),
      })
    } else {
      setEditingRule(null)
      setFormData({
        name: '',
        description: '',
        documentType: '',
        destinationFolderId: '',
        priority: '0',
      })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Le nom de la règle est requis')
      return
    }

    if (editingRule) {
      setRules(rules.map(r =>
        r.id === editingRule.id
          ? {
              ...r,
              name: formData.name,
              description: formData.description,
              conditions: {
                document_type: { value: formData.documentType, operator: 'equals' },
              },
              destination_folder_id: formData.destinationFolderId,
              priority: parseInt(formData.priority),
              updated_at: new Date(),
            }
          : r
      ))
    } else {
      const newRule: RoutingRule = {
        id: Math.random().toString(36),
        name: formData.name,
        description: formData.description,
        conditions: {
          document_type: { value: formData.documentType, operator: 'equals' },
        },
        destination_folder_id: formData.destinationFolderId,
        priority: parseInt(formData.priority),
        is_active: true,
        times_applied: 0,
        last_applied: null,
        created_by_id: '1',
        created_at: new Date(),
        updated_at: new Date(),
      }
      setRules([...rules, newRule])
    }
    setShowModal(false)
  }

  const handleToggle = (id: string) => {
    setRules(rules.map(r =>
      r.id === id
        ? {
            ...r,
            is_active: !r.is_active,
            updated_at: new Date(),
          }
        : r
    ))
  }

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle?')) {
      setRules(rules.filter(r => r.id !== id))
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    setIsRefreshing(false)
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
          
          {/* Modern Glassmorphism Header */}
          <div className="glass-card-hover mb-8 border border-white/30 p-8 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                  <Zap size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                    Règles de Routage
                  </h1>
                  <p className="text-secondary-600 mt-2 font-medium">Automatisez le routage de vos documents selon des règles personnalisées</p>
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

            {/* Stats Cards - Enhanced */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/20">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
                <div className="p-3 bg-success-500/20 rounded-xl">
                  <CheckCircle2 size={24} className="text-success-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-600">Règles Actives</p>
                  <p className="text-3xl font-bold text-primary-600">{activeRulesCount}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
                <div className="p-3 bg-info-500/20 rounded-xl">
                  <TrendingUp size={24} className="text-info-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-600">Applications</p>
                  <p className="text-3xl font-bold text-info-600">{totalApplications}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/40 backdrop-blur-sm">
                <div className="p-3 bg-accent-500/20 rounded-xl">
                  <ZapIcon size={24} className="text-accent-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-600">Total Règles</p>
                  <p className="text-3xl font-bold text-accent-600">{rules.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar - Modern */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400" />
              <input
                type="text"
                placeholder="Rechercher une règle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-12 py-3"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterActive(null)}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  filterActive === null
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
              >
                <Filter size={18} className="inline mr-2" />
                Tous
              </button>
              <button
                onClick={() => setFilterActive(true)}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  filterActive === true
                    ? 'btn-success'
                    : 'btn-secondary'
                }`}
              >
                ✓ Actifs
              </button>
              <button
                onClick={() => setFilterActive(false)}
                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                  filterActive === false
                    ? 'btn-outline'
                    : 'btn-secondary'
                }`}
              >
                ○ Inactifs
              </button>
            </div>
            <button
              onClick={() => openModal()}
              className="btn-primary btn-lg"
            >
              <Plus size={20} /> Nouvelle règle
            </button>
          </div>

          {/* Rules List - Modern Cards */}
          {filteredRules.length > 0 ? (
            <div className="space-y-4 animate-fade-in">
              {filteredRules.map((rule, index) => (
                <div 
                  key={rule.id} 
                  className="routing-rule-card group animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-lg font-bold text-secondary-900">{rule.name}</h3>
                          <button
                            onClick={() => handleToggle(rule.id)}
                            className={`routing-rule-status transition-all ${
                              rule.is_active
                                ? 'routing-status-active'
                                : 'routing-status-inactive'
                            }`}
                          >
                            {rule.is_active ? '✓ Actif' : '○ Inactif'}
                          </button>
                          {rule.priority >= 8 && (
                            <span className="badge badge-error flex items-center gap-1">
                              <AlertCircle size={14} /> Haute priorité
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-secondary-600 mb-4">{rule.description}</p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="dashboard-stat p-3 border-0">
                            <p className="text-xs text-secondary-600 font-medium mb-1">Type Document</p>
                            <p className="font-semibold text-secondary-900">
                              {(rule.conditions?.document_type?.value as string) || 'Tous'}
                            </p>
                          </div>
                          <div className="dashboard-stat p-3 border-0">
                            <p className="text-xs text-secondary-600 font-medium mb-1">Destination</p>
                            <p className="font-semibold text-secondary-900">📁 {rule.destination_folder_id}</p>
                          </div>
                          <div className="dashboard-stat p-3 border-0">
                            <p className="text-xs text-secondary-600 font-medium mb-1">Appliquée</p>
                            <p className="font-semibold text-success-600">{rule.times_applied}x</p>
                          </div>
                          <div className="dashboard-stat p-3 border-0">
                            <p className="text-xs text-secondary-600 font-medium mb-1">Priorité</p>
                            <p className="font-semibold text-accent-600">{rule.priority}/10</p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(rule)}
                          className="p-3 hover:bg-primary-100 rounded-xl transition-all transform hover:scale-110 group-hover:bg-primary-50"
                          title="Éditer"
                        >
                          <Edit2 size={18} className="text-primary-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-3 hover:bg-error-100 rounded-xl transition-all transform hover:scale-110 group-hover:bg-error-50"
                          title="Supprimer"
                        >
                          <Trash2 size={18} className="text-error-600" />
                        </button>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-4 border-t border-secondary-100">
                      <p className="text-xs text-secondary-500 font-medium">
                        {rule.last_applied
                          ? `Dernière application: ${rule.last_applied.toLocaleDateString('fr-FR')} à ${rule.last_applied.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Pas encore appliquée'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-16 text-center">
              <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-10 h-10 text-secondary-400" />
              </div>
              <p className="text-secondary-900 font-semibold text-lg mb-2">Aucune règle trouvée</p>
              <p className="text-secondary-600 mb-6">
                {searchTerm || filterActive !== null
                  ? 'Affinez votre recherche ou vos filtres'
                  : 'Créez votre première règle de routage'}
              </p>
              {(searchTerm || filterActive !== null) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilterActive(null)
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          )}

          {/* Modal - Modernized */}
          {showModal && (
            <Modal 
              isOpen={showModal} 
              title={editingRule ? 'Éditer la règle' : 'Créer une nouvelle règle'} 
              onClose={() => setShowModal(false)}
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-secondary-900 mb-2">Nom de la règle</label>
                  <Input
                    type="text"
                    placeholder="Ex: Congés - RH"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-secondary-900 mb-2">Description</label>
                  <textarea
                    placeholder="Description de la règle"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="textarea"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-secondary-900 mb-2">Type de document</label>
                  <Input
                    type="text"
                    placeholder="Ex: CONGE, RAPPORT, BUDGET"
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-secondary-900 mb-2">Dossier de destination</label>
                  <Input
                    type="text"
                    placeholder="ID du dossier cible"
                    value={formData.destinationFolderId}
                    onChange={(e) => setFormData({ ...formData, destinationFolderId: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-secondary-900 mb-2">Priorité (0-10)</label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-secondary-200">
                  <button
                    onClick={handleSave}
                    className="flex-1 btn-primary"
                  >
                    {editingRule ? 'Mettre à jour' : 'Créer'}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </Layout>
  )
}