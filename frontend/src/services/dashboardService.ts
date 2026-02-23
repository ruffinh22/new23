/**
 * Dashboard Service
 * Service pour récupérer les données du dashboard depuis l'API
 * 
 * CORRECTION IMPORTANTE:
 * - agentFilter=false (ADMIN): charge TOUS les documents
 * - agentFilter=true (AGENT): charge UNIQUEMENT les documents de l'agent connecté
 */

import { apiClient } from './api'

export interface DashboardStats {
  totalDocuments: number
  pendingDocuments: number
  approvedDocuments: number
  rejectedDocuments: number
  inProgressDocuments: number
  totalUsers: number
  activeUsers: number
  completionRate: number
}

export interface DocumentStat {
  id: string
  reference: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  department?: string
  priority?: string
  file_format?: string
}

export interface DepartmentStats {
  name: string
  documentCount: number
  approvalRate: number
}

export interface DashboardData {
  stats: DashboardStats
  recentDocuments: DocumentStat[]
  departmentStats: DepartmentStats[]
  weeklyTrend?: Array<{
    date: string
    count: number
  }>
}

export const dashboardService = {
  /**
   * Get dashboard statistics (optionally filtered by agent)
   * @param agentFilter - If true, filter by current agent. If false, load ALL documents.
   */
  async getStatistics(agentFilter: boolean = false): Promise<DashboardStats> {
    try {
      // Build query params
      const params: any = { _cacheBust: Date.now() }
      if (agentFilter) {
        params.agent = 'me'
      }
      
      console.log('[dashboardService] Loading statistics with params:', params)
      
      // First try the dedicated statistics endpoint
      const response = await apiClient.get<any>('documents/statistics/', { params })
      
      if (response.data) {
        // Mapper les statuts du backend aux clés attendues par le frontend
        const statusStats = response.data.status_stats || {}
        const approved = statusStats.VALIDE || 0
        const rejected = statusStats.REJETE || 0
        const pending = statusStats.EN_ATTENTE || 0
        const inProgress = statusStats.EN_COURS || 0
        
        console.log('[dashboardService] Statistics loaded:', {
          total: response.data.total_documents,
          approved,
          pending,
          rejected,
          inProgress,
          agentFilter
        })
        
        return {
          totalDocuments: response.data.total_documents || 0,
          pendingDocuments: pending,
          approvedDocuments: approved,
          rejectedDocuments: rejected,
          inProgressDocuments: inProgress,
          totalUsers: response.data.users_stats?.length || 1,
          activeUsers: Math.ceil((response.data.users_stats?.length || 1) * 0.6),
          completionRate: response.data.completion_rate || 0,
        }
      }
      
      throw new Error('Statistics endpoint returned no data')
    } catch (error) {
      console.log('[dashboardService] Statistics endpoint failed, using documents fallback')
      // Fallback: calculate from documents list
      try {
        const params: any = { limit: 1000 }
        if (agentFilter) {
          params.agent = 'me'
        }
        
        console.log('[dashboardService] Fallback: loading documents with params:', params)
        const docsResponse = await apiClient.get<any>('documents/', { params })
        const documents = Array.isArray(docsResponse.data) 
          ? docsResponse.data 
          : (docsResponse.data.results || [])
        
        const validDocuments = documents.filter((d: any) => d && d.id && d.status)
        const approved = validDocuments.filter((d: any) => d.status === 'APPROUVE' || d.status === 'VALIDE').length
        const pending = validDocuments.filter((d: any) => d.status === 'EN_ATTENTE' || d.status === 'EN_COURS').length
        const rejected = validDocuments.filter((d: any) => d.status === 'REJET').length
        const inProgress = validDocuments.filter((d: any) => d.status === 'EN_COURS').length
        
        console.log('[dashboardService] Calculated stats from documents:', { 
          total: validDocuments.length, 
          approved, 
          pending, 
          rejected,
          agentFilter 
        })
        
        return {
          totalDocuments: validDocuments.length,
          pendingDocuments: pending,
          approvedDocuments: approved,
          rejectedDocuments: rejected,
          inProgressDocuments: inProgress,
          totalUsers: 1,
          activeUsers: 1,
          completionRate: validDocuments.length > 0 
            ? Math.round((approved / validDocuments.length) * 100)
            : 0,
        }
      } catch (fallbackError) {
        console.error('[dashboardService] All statistics methods failed:', fallbackError)
        return {
          totalDocuments: 0,
          pendingDocuments: 0,
          approvedDocuments: 0,
          rejectedDocuments: 0,
          inProgressDocuments: 0,
          totalUsers: 1,
          activeUsers: 1,
          completionRate: 0,
        }
      }
    }
  },

  /**
   * Get recent documents (optionally filtered by agent)
   * @param limit - Maximum number of documents to return
   * @param agentFilter - If true, filter by current agent. If false, load ALL documents.
   */
  async getRecentDocuments(limit: number = 10, agentFilter: boolean = false): Promise<DocumentStat[]> {
    try {
      // Build query params
      const params: any = { 
        limit: 1000, 
        ordering: '-created_at',
        _cacheBust: Date.now() 
      }
      if (agentFilter) {
        params.agent = 'me'
      }
      
      console.log('[dashboardService] Loading recent documents with params:', params)
      const response = await apiClient.get<any>('documents/', { params })
      
      const documents = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || [])
      
      console.log('[dashboardService] Loaded', documents.length, 'documents (agentFilter:', agentFilter, ')')
      
      return documents
        .filter((d: any) => d && d.id)
        .map((d: any) => ({
          id: d.id,
          reference: d.reference || d.id.toString(),
          title: d.title || `Document ${d.id}`,
          status: d.status || 'EN_ATTENTE',
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at || new Date().toISOString(),
          department: d.department?.name,
          priority: d.priority,
          file_format: d.file_format,
        }))
        .slice(0, limit)
    } catch (error) {
      console.error('[dashboardService] Error loading recent documents:', error)
      return []
    }
  },

  /**
   * Get ALL documents (no limit) - for stats (optionally filtered by agent)
   * @param agentFilter - If true, filter by current agent. If false, load ALL documents.
   */
  async getAllDocuments(agentFilter: boolean = false): Promise<DocumentStat[]> {
    try {
      const params: any = { limit: 1000 }
      if (agentFilter) {
        params.agent = 'me'
      }
      
      console.log('[dashboardService] Loading all documents with params:', params)
      const response = await apiClient.get<any>('documents/', { params })
      
      const documents = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || [])
      
      console.log('[dashboardService] Loaded', documents.length, 'total documents (agentFilter:', agentFilter, ')')
      
      return documents
        .filter((d: any) => d && d.id)
        .map((d: any) => ({
          id: d.id,
          reference: d.reference || d.id.toString(),
          title: d.title || `Document ${d.id}`,
          status: d.status || 'EN_ATTENTE',
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at || new Date().toISOString(),
          department: d.department?.name,
          priority: d.priority,
          file_format: d.file_format,
        }))
    } catch (error) {
      console.error('[dashboardService] Error loading all documents:', error)
      return []
    }
  },

  /**
   * Get department statistics (always ALL documents)
   */
  async getDepartmentStats(): Promise<DepartmentStats[]> {
    try {
      // Department stats should always show ALL documents for comparison
      const response = await apiClient.get<any>('documents/', { 
        params: { limit: 1000 } 
      })
      
      const documents = Array.isArray(response.data) 
        ? response.data 
        : (response.data.results || [])
      
      const departmentMap = new Map<string, any>()
      
      documents.forEach((doc: any) => {
        const deptName = doc.department?.name || 'Sans département'
        if (!departmentMap.has(deptName)) {
          departmentMap.set(deptName, {
            name: deptName,
            total: 0,
            approved: 0,
          })
        }
        
        const dept = departmentMap.get(deptName)
        dept.total += 1
        if (doc.status === 'APPROUVE' || doc.status === 'VALIDE') {
          dept.approved += 1
        }
      })
      
      return Array.from(departmentMap.values()).map((dept: any) => ({
        name: dept.name,
        documentCount: dept.total,
        approvalRate: dept.total > 0 ? Math.round((dept.approved / dept.total) * 100) : 0,
      }))
    } catch (error) {
      console.error('[dashboardService] Error loading department stats:', error)
      return []
    }
  },

  /**
   * Get full dashboard data
   * @param forAgent - If true, filter by current agent (AGENT view). If false, load ALL documents (ADMIN view).
   */
  async getDashboardData(forAgent: boolean = false): Promise<DashboardData> {
    try {
      console.log('[dashboardService] Loading dashboard data (forAgent:', forAgent, ')')
      
      // Load data in parallel - pass forAgent to getStatistics and getAllDocuments
      const [stats, allDocuments, departmentStats] = await Promise.all([
        this.getStatistics(forAgent),  // Pass forAgent to filter stats
        this.getAllDocuments(forAgent),  // Pass forAgent to filter documents
        this.getDepartmentStats(),  // Always load all for department comparison
      ])

      console.log('[dashboardService] Dashboard data loaded:', {
        statsTotal: stats.totalDocuments,
        documentsCount: allDocuments.length,
        forAgent
      })

      return {
        stats,
        recentDocuments: allDocuments,  // Use documents for calculations
        departmentStats,
      }
    } catch (error) {
      console.error('[dashboardService] Error loading dashboard data:', error)
      return {
        stats: {
          totalDocuments: 0,
          pendingDocuments: 0,
          approvedDocuments: 0,
          rejectedDocuments: 0,
          inProgressDocuments: 0,
          totalUsers: 1,
          activeUsers: 1,
          completionRate: 0,
        },
        recentDocuments: [],
        departmentStats: [],
      }
    }
  },

  /**
   * Get weekly trend data
   */
  async getWeeklyTrend(): Promise<Array<{ date: string; count: number }>> {
    try {
      const response = await apiClient.get<any>('documents/weekly-trend/')
      return response.data || []
    } catch (error) {
      console.error('[dashboardService] Error loading weekly trend:', error)
      return []
    }
  },
}