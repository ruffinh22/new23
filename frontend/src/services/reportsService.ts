/**
 * Reports Service
 * Service pour récupérer les données de rapports et statistiques
 */

import { apiClient } from './api'

export interface DocumentStatistics {
  total?: number
  total_documents?: number
  approved?: number
  rejected?: number
  pending?: number
  in_progress?: number
  total_size_mb?: number
  completion_rate?: number
  status_stats?: any
  type_stats?: any
  format_stats?: any
  validation_stats?: any
  users_stats?: any
  daily_stats?: any
}

export interface FilterOptions {
  dateFrom?: string
  dateTo?: string
  documentType?: string
  status?: string
}

export interface DocumentData {
  id: string | number
  reference: string
  title: string
  status: string
  created_at: string
  file_name?: string
  file_size?: string
  department?: {
    name: string
  }
  type?: string
}

export interface ExportOptions extends FilterOptions {
  format?: 'csv' | 'pdf' | 'excel'
}

export const reportsService = {
  /**
   * Récupère les statistiques des documents (optionnellement filtrées par agent)
   */
  async getStatistics(filters?: FilterOptions & { agentFilter?: boolean }): Promise<DocumentStatistics> {
    try {
      const params: any = {
        date_from: filters?.dateFrom,
        date_to: filters?.dateTo,
        document_type: filters?.documentType,
        status: filters?.status,
      }
      
      // Add agent filter if needed
      if (filters?.agentFilter) {
        params.agent = 'me'
      }
      
      const response = await apiClient.get<any>('documents/statistics/', { params })

      // Normaliser la réponse pour supporter les deux formats
      const data = response.data
      
      // Mapper les statuts du backend aux clés attendues par le frontend
      const statusStats = data.status_stats || {}
      const approved = statusStats.VALIDE || 0
      const rejected = statusStats.REJETE || 0
      const pending = statusStats.EN_ATTENTE || 0
      const inProgress = statusStats.EN_COURS || 0
      
      return {
        total: data.total_documents || 0,
        total_documents: data.total_documents || 0,
        approved: approved,
        rejected: rejected,
        pending: pending,
        in_progress: inProgress,
        completion_rate: data.completion_rate || 0,
        total_size_mb: data.total_size_mb || 0,
        status_stats: statusStats,
        type_stats: data.type_stats || [],
        format_stats: data.format_stats || [],
        validation_stats: data.validation_stats || {
          PASSED: 0,
          FAILED: 0,
          WARNING: 0,
        },
        users_stats: data.users_stats || [],
        daily_stats: data.daily_stats || [],
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
      return {
        total: 0,
        total_documents: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        in_progress: 0,
        completion_rate: 0,
        status_stats: {
          NOUVEAU: 0,
          EN_COURS: 0,
          VALIDE: 0,
          REJETE: 0,
          ARCHIVE: 0,
        },
      }
    }
  },

  /**
   * Exporte les documents
   */
  async exportDocuments(options?: ExportOptions): Promise<void> {
    try {
      const params = new URLSearchParams()
      params.append('export_format', options?.format || 'csv')
      if (options?.dateFrom) params.append('date_from', options.dateFrom)
      if (options?.dateTo) params.append('date_to', options.dateTo)
      if (options?.documentType) params.append('document_type', options.documentType)
      if (options?.status) params.append('status', options.status)

      const response = await apiClient.get(`documents/export/?${params.toString()}`, {
        responseType: 'blob',
      })

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const timestamp = new Date().toISOString().split('T')[0]
      link.setAttribute(
        'download',
        `documents_export_${timestamp}.${options?.format || 'csv'}`
      )
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting documents:', error)
      throw error
    }
  },

  /**
   * Récupère la liste des documents
   */
  async getDocuments(
    filters?: {
      status?: string
      documentType?: string
      fileFormat?: string
      ordering?: string
      page?: number
      limit?: number
      agentFilter?: boolean
    },
    searchTerm?: string
  ): Promise<DocumentData[]> {
    try {
      const params: any = {
        limit: filters?.limit || 100,
        page: filters?.page || 1,
      }

      if (filters?.status) params.status = filters.status
      if (filters?.documentType) params.document_type = filters.documentType
      if (filters?.fileFormat) params.file_format = filters.fileFormat
      if (filters?.ordering) params.ordering = filters.ordering
      if (filters?.agentFilter) params.agent = 'me'
      if (searchTerm) params.search = searchTerm

      const response = await apiClient.get<any>('documents/', { params })

      const documents = Array.isArray(response.data)
        ? response.data
        : response.data.results || []

      return documents.map((doc: any) => ({
        id: doc.id,
        reference: doc.reference || `DOC-${doc.id}`,
        title: doc.title || doc.file_name || 'Sans titre',
        status: doc.status || 'EN_ATTENTE',
        created_at: doc.created_at || new Date().toISOString(),
        file_name: doc.file_name,
        file_size: doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : '0 MB',
        department: doc.department,
        type: doc.document_type || 'General',
      }))
    } catch (error) {
      console.error('Error fetching documents:', error)
      return []
    }
  },

  /**
   * Récupère les données pour les graphiques (série temporelle)
   */
  async getTimeSeries(days: number = 7, forAgent: boolean = false): Promise<any[]> {
    try {
      const params: any = { limit: 1000 }
      if (forAgent) params.agent = 'me'
      
      const response = await apiClient.get<any>('documents/', { params })

      const documents = Array.isArray(response.data)
        ? response.data
        : response.data.results || []

      // Group documents by date
      const dateMap = new Map<string, any>()

      documents.forEach((doc: any) => {
        const date = doc.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            name: date,
            documents: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
          })
        }

        const dayData = dateMap.get(date)
        dayData.documents += 1

        if (doc.status === 'APPROUVE') dayData.approved += 1
        else if (doc.status === 'REJET') dayData.rejected += 1
        else dayData.pending += 1
      })

      // Sort by date and return last N days
      return Array.from(dateMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(-days)
    } catch (error) {
      console.error('Error fetching time series data:', error)
      return []
    }
  },

  /**
   * Récupère les statistiques par statut
   */
  async getStatusDistribution(forAgent: boolean = false): Promise<Array<{ name: string; value: number }>> {
    try {
      const stats = await this.getStatistics(forAgent ? { agentFilter: true } : undefined)

      return [
        { name: 'Approuvé', value: stats.approved || 0 },
        { name: 'Rejeté', value: stats.rejected || 0 },
        { name: 'En attente', value: stats.pending || 0 },
        { name: 'En cours', value: stats.in_progress || 0 },
      ]
    } catch (error) {
      console.error('Error fetching status distribution:', error)
      return []
    }
  },

  /**
   * Récupère les types de documents disponibles
   */
  async getDocumentTypes(): Promise<Array<{ value: string; label: string }>> {
    return [
      { value: 'FACTURE', label: 'Facture' },
      { value: 'BON_COMMANDE', label: 'Bon de commande' },
      { value: 'BON_LIVRAISON', label: 'Bon de livraison' },
      { value: 'DEVIS', label: 'Devis' },
      { value: 'RAPPORT', label: 'Rapport' },
    ]
  },

  /**
   * Récupère les formats disponibles
   */
  async getFileFormats(): Promise<Array<{ value: string; label: string }>> {
    return [
      { value: 'PDF', label: 'PDF' },
      { value: 'DOCX', label: 'Word' },
      { value: 'XLSX', label: 'Excel' },
      { value: 'DOC', label: 'Doc' },
      { value: 'XLS', label: 'Xls' },
    ]
  },

  /**
   * Actualise toutes les données
   */
  async refreshAllData(forAgent: boolean = false): Promise<{
    stats: DocumentStatistics
    timeSeries: any[]
    distribution: Array<{ name: string; value: number }>
    documents: DocumentData[]
  }> {
    try {
      const [stats, timeSeries, distribution, documents] = await Promise.all([
        this.getStatistics(forAgent ? { agentFilter: true } : undefined),
        this.getTimeSeries(7, forAgent),
        this.getStatusDistribution(forAgent),
        this.getDocuments({ limit: 50, ordering: '-created_at', agentFilter: forAgent }),
      ])

      return {
        stats,
        timeSeries,
        distribution,
        documents,
      }
    } catch (error) {
      console.error('Error refreshing data:', error)
      throw error
    }
  },
}

export default reportsService
