import React, { useEffect, useState } from 'react'
import { Layout } from '@/components/common'
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { DocumentStatsCard, DocumentCharts, DocumentTable } from '@/components/reports'
import { useAuth } from '@/contexts/AuthContext'
import { reportsService, DocumentData } from '@/services/reportsService'
import { statusService } from '@/services/statusService'
import { ReportsAndStatistics } from './ReportsAndStatistics'

interface DocumentStats {
  total: number
  approved: number
  rejected: number
  pending: number
  inProgress: number
}

interface TimeSeriesData {
  name: string
  documents: number
  approved: number
  rejected: number
  pending: number
  [key: string]: string | number
}

interface DocumentStatusData {
  name: string
  value: number
  [key: string]: string | number
}

export const Reports: React.FC = () => {
  const { user } = useAuth()
  const isAgent = user?.role === 'AGENT'
  const [stats, setStats] = useState<DocumentStats>({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    inProgress: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [statusDistribution, setStatusDistribution] = useState<DocumentStatusData[]>([])
  const [recentDocuments, setRecentDocuments] = useState<any[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  useEffect(() => {
    loadData()
  }, [filterStatus, user?.role])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await reportsService.refreshAllData(isAgent)
      
      setStats({
        total: data.stats.total ?? 0,
        approved: data.stats.approved ?? 0,
        rejected: data.stats.rejected ?? 0,
        pending: data.stats.pending ?? 0,
        inProgress: data.stats.in_progress ?? 0,
      })

      setTimeSeriesData(
        data.timeSeries.map((d: any) => ({
          name: new Date(d.name).toLocaleDateString('fr-FR', {
            weekday: 'short',
          }),
          documents: d.documents,
          approved: d.approved,
          rejected: d.rejected,
          pending: d.pending,
        }))
      )

      setStatusDistribution(data.distribution)

      setRecentDocuments(
        data.documents.map((doc: DocumentData) => ({
          id: doc.id,
          name: doc.title,
          type: doc.type || 'PDF',
          size: doc.file_size || '0 MB',
          status: doc.status,
          statusDisplay: getStatusDisplay(doc.status),
          date: new Date(doc.created_at).toLocaleDateString('fr-FR'),
          department: doc.department?.name || 'N/A',
        }))
      )
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusDisplay = (status: string): string => {
    const statusMap: Record<string, string> = {
      'NOUVEAU': 'Nouveau',
      'EN_COURS': 'En cours',
      'VALIDE': 'Validé',
      'REJETE': 'Rejeté',
      'APPROUVE': 'Approuvé',
      'REFUSE': 'Refusé',
      'EN_ATTENTE': 'En attente',
      'ARCHIVE': 'Archivé',
    }
    return statusMap[status] || status
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadData()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExport = async () => {
    try {
      await reportsService.exportDocuments({
        format: 'csv',
        status: filterStatus || undefined,
      })
    } catch (error) {
      console.error('Error exporting:', error)
      alert('Erreur lors de l\'export')
    }
  }

  // Utiliser statusService pour les couleurs des statuts
  const getStatusColor = (status: string) => {
    const classes = statusService.getStatusClasses(status)
    return `${classes.text} ${classes.bg}`
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  const approvalRate = stats.approved + stats.rejected > 0
    ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
    : 0
  const completionRate = stats.total > 0
    ? Math.round(((stats.total - stats.pending) / stats.total) * 100)
    : 0

  return (
    <Layout>
      <div className="space-y-8">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Rapports & Statistiques</h1>
            <p className="text-gray-600 mt-2">
              Suivi complet de vos documents et statistiques
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Actualiser</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <Download size={18} />
              <span>Exporter</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <Filter size={18} />
                <span>Filtrer</span>
              </button>
              {showFilterMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  <div className="p-4 space-y-3">
                    <label className="block">
                      <input
                        type="radio"
                        name="status"
                        value=""
                        checked={filterStatus === ''}
                        onChange={(e) => {
                          setFilterStatus(e.target.value)
                          setShowFilterMenu(false)
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">Tous les statuts</span>
                    </label>
                    <label className="block">
                      <input
                        type="radio"
                        name="status"
                        value="APPROUVE"
                        checked={filterStatus === 'APPROUVE'}
                        onChange={(e) => {
                          setFilterStatus(e.target.value)
                          setShowFilterMenu(false)
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">Approuvés</span>
                    </label>
                    <label className="block">
                      <input
                        type="radio"
                        name="status"
                        value="REJET"
                        checked={filterStatus === 'REJET'}
                        onChange={(e) => {
                          setFilterStatus(e.target.value)
                          setShowFilterMenu(false)
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">Rejetés</span>
                    </label>
                    <label className="block">
                      <input
                        type="radio"
                        name="status"
                        value="EN_ATTENTE"
                        checked={filterStatus === 'EN_ATTENTE'}
                        onChange={(e) => {
                          setFilterStatus(e.target.value)
                          setShowFilterMenu(false)
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">En attente</span>
                    </label>
                    <label className="block">
                      <input
                        type="radio"
                        name="status"
                        value="EN_COURS"
                        checked={filterStatus === 'EN_COURS'}
                        onChange={(e) => {
                          setFilterStatus(e.target.value)
                          setShowFilterMenu(false)
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">En cours</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cartes de statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <DocumentStatsCard
            title="Total Documents"
            value={stats.total}
            subtitle="Tous les documents"
            icon={FileText}
            color="blue"
            trend={{
              value: 12,
              label: 'cette semaine',
              direction: 'up',
            }}
          />
          <DocumentStatsCard
            title="Approuvés"
            value={stats.approved}
            subtitle={`${approvalRate}% taux d'approbation`}
            icon={CheckCircle2}
            color="green"
            trend={{
              value: 8,
              label: 'cette semaine',
              direction: 'up',
            }}
          />
          <DocumentStatsCard
            title="Rejetés"
            value={stats.rejected}
            subtitle={`${((stats.rejected / stats.total) * 100).toFixed(1)}% du total`}
            icon={XCircle}
            color="red"
            trend={{
              value: 2,
              label: 'cette semaine',
              direction: 'down',
            }}
          />
          <DocumentStatsCard
            title="En Attente"
            value={stats.pending}
            subtitle={`${((stats.pending / stats.total) * 100).toFixed(1)}% du total`}
            icon={Clock}
            color="yellow"
          />
          <DocumentStatsCard
            title="En Cours"
            value={stats.inProgress}
            subtitle={`${completionRate}% traités`}
            icon={TrendingUp}
            color="purple"
            trend={{
              value: 5,
              label: 'cette semaine',
              direction: 'up',
            }}
          />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DocumentCharts
              data={timeSeriesData}
              chartType="area"
              title="Évolution des documents (7 derniers jours)"
              dataKey={['documents', 'approved', 'rejected']}
              colors={['#3b82f6', '#10b981', '#ef4444']}
            />
          </div>
          <DocumentCharts
            data={statusDistribution}
            chartType="pie"
            title="Distribution par statut"
            dataKey="value"
            colors={['#10b981', '#ef4444', '#f59e0b', '#8b5cf6']}
          />
        </div>

        {/* Graphique statuts avec barres */}
        <DocumentCharts
          data={timeSeriesData}
          chartType="bar"
          title="Détail des statuts par jour"
          dataKey={['approved', 'rejected', 'pending']}
          colors={['#10b981', '#ef4444', '#f59e0b']}
        />

        {/* Tableau des documents récents */}
        <DocumentTable
          title="Documents Récents"
          columns={[
            { key: 'name', label: 'Nom' },
            {
              key: 'type',
              label: 'Type',
              render: (value) => (
                <span className="px-3 py-1 bg-gray-100 rounded text-sm font-medium">
                  {value}
                </span>
              ),
            },
            { key: 'size', label: 'Taille' },
            { key: 'department', label: 'Département' },
            { key: 'date', label: 'Date' },
            {
              key: 'status',
              label: 'Statut',
              render: (value) => (
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    value
                  )}`}
                >
                  {value}
                </span>
              ),
            },
          ]}
          data={recentDocuments}
        />

        {/* Résumé rapide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Taux d'approbation
            </h4>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-blue-600">{approvalRate}%</p>
              <p className="text-sm text-gray-600 mb-1">
                {stats.approved} / {stats.approved + stats.rejected}
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Taux de complétion
            </h4>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-indigo-600">{completionRate}%</p>
              <p className="text-sm text-gray-600 mb-1">
                {stats.approved + stats.rejected} / {stats.total}
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Temps moyen de traitement
            </h4>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-purple-600">2.4</p>
              <p className="text-sm text-gray-600 mb-1">jours</p>
            </div>
          </div>
        </div>

        {/* ReportsAndStatistics - Row 2 & Row 3 */}
        <ReportsAndStatistics documents={recentDocuments.map(doc => ({
          id: doc.id,
          title: doc.name,
          type: doc.type,
          file_size: doc.size,
          status: doc.status,
          created_at: doc.date,
          department: { name: doc.department },
          reference: doc.id.toString()
        }))} />
      </div>
    </Layout>
  )
}
