import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/common'
import {
  Lock,
  Download,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calendar,
  User,
  Activity
} from 'lucide-react'
import { apiClient } from '@/services/api'

interface AuditLog {
  id: number
  actor_name: string
  action: string
  action_display: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  severity_display: string
  description: string
  success: boolean
  ip_address: string
  created_at: string
  created_at_formatted: string
  object_display: string
}

interface Stats {
  total_logs: number
  failed_logs: number
  success_rate: number
  logs_24h: number
  top_actions: Array<{ action: string; count: number }>
  severity_stats: Record<string, number>
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Filtres
  const [days, setDays] = useState('30')
  const [severity, setSeverity] = useState('')
  const [action, setAction] = useState('')

  useEffect(() => {
    loadLogs()
    loadStats()
  }, [days, severity, action])

  const loadLogs = async () => {
    try {
      setLoading(true)
      let url = `audit-logs/?days=${days}`
      
      if (severity) url += `&severity=${severity}`
      if (action) url += `&action=${action}`
      
      console.log('📋 Chargement des logs depuis:', url)
      const response = await apiClient.get(url)
      console.log('✅ Réponse reçue:', response.data)
      
      // Gérer les formats de réponse possibles
      const logsData = response.data.results || response.data || []
      console.log('📊 Nombre de logs trouvés:', Array.isArray(logsData) ? logsData.length : 0)
      
      setLogs(Array.isArray(logsData) ? logsData : [])
      setError('')
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || err.response?.data?.error?.message || 'Erreur lors du chargement des logs'
      console.error('❌ Erreur:', errorMsg, 'Status:', err.response?.status)
      setError(errorMsg)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      console.log('📊 Chargement des stats...')
      const response = await apiClient.get(`audit-logs/stats/?days=${days}`)
      console.log('✅ Stats reçues:', response.data)
      setStats(response.data)
    } catch (err) {
      console.error('❌ Erreur stats:', err)
      // Set default stats structure on error
      setStats({
        total_logs: 0,
        failed_logs: 0,
        success_rate: 0,
        logs_24h: 0,
        top_actions: [],
        severity_stats: { INFO: 0, WARNING: 0, ERROR: 0, CRITICAL: 0 }
      })
    }
  }

  const handleExport = async () => {
    try {
      const response = await apiClient.get(`audit-logs/export/?days=${days}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } catch (err) {
      setError('Erreur lors de l\'export')
    }
  }

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'INFO': 'bg-blue-50 text-blue-700 border-blue-200',
      'WARNING': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'ERROR': 'bg-red-50 text-red-700 border-red-200',
      'CRITICAL': 'bg-red-100 text-red-900 border-red-300',
    }
    return colors[severity] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'INFO': return <Activity className="w-4 h-4" />
      case 'WARNING': return <AlertCircle className="w-4 h-4" />
      case 'ERROR': return <AlertCircle className="w-4 h-4" />
      case 'CRITICAL': return <AlertCircle className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'text-green-600'
    if (action.includes('DELETE')) return 'text-red-600'
    if (action.includes('UPDATE')) return 'text-blue-600'
    if (action.includes('DENIED')) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* En-tête avec icône */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg">
            <Lock className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Journaux d'Audit</h1>
            <p className="text-gray-600 mt-1">Suivi détaillé de toutes les actions du système</p>
          </div>
        </div>

        {/* Messages d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Erreur</p>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Statistiques */}
        {stats && stats.severity_stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600 text-sm font-semibold">Total Logs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_logs || 0}</p>
              <p className="text-gray-500 text-xs mt-2">Derniers {days} jours</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600 text-sm font-semibold">Logs Échoués</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed_logs || 0}</p>
              <p className="text-gray-500 text-xs mt-2">Taux de succès: {stats.success_rate || 0}%</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600 text-sm font-semibold">Derniers 24h</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.logs_24h || 0}</p>
              <p className="text-gray-500 text-xs mt-2">Actions enregistrées</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600 text-sm font-semibold">Critiques</p>
              <p className={`text-3xl font-bold mt-2 ${((stats.severity_stats?.CRITICAL) || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.severity_stats?.CRITICAL || 0}
              </p>
              <p className="text-gray-500 text-xs mt-2">Actions critiques</p>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Filtres</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Jours */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Période</label>
              <select
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="7">7 derniers jours</option>
                <option value="30">30 derniers jours</option>
                <option value="90">90 derniers jours</option>
                <option value="365">Dernière année</option>
              </select>
            </div>

            {/* Sévérité */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sévérité</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Tous</option>
                <option value="INFO">Information</option>
                <option value="WARNING">Avertissement</option>
                <option value="ERROR">Erreur</option>
                <option value="CRITICAL">Critique</option>
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Action</label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Ex: DOCUMENT_APPROVE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <button
                onClick={loadLogs}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Rafraîchir
              </button>
              <button
                onClick={handleExport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Liste des logs */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-gray-600 mt-4">Chargement des logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <p>Aucun log trouvé pour les critères sélectionnés</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date/Heure</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Acteur</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Sévérité</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(Array.isArray(logs) ? logs : []).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {log.created_at_formatted}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{log.actor_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`font-mono font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getSeverityColor(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          {log.severity || log.severity_display || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {log.success ? (
                          <span className="inline-flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            Succès
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-red-700">
                            <AlertCircle className="w-4 h-4" />
                            Échoué
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Informations supplémentaires */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">À propos des audit logs</p>
            <p className="text-blue-800 text-sm mt-1">
              Les journaux d'audit enregistrent toutes les actions importantes effectuées par les utilisateurs et le système.
              Cela inclut les uploads de documents, les approbations, les rejets, les accès refusés et autres événements sensibles.
              Ces logs sont conservés à titre de trace d'audit pour la conformité et la sécurité.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
