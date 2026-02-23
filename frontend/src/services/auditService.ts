/**
 * Audit Service - Historique et audit trail
 * 
 * Gère:
 * - Historique complet des documents
 * - Audit trail avec qui a fait quoi quand
 * - Commentaires et annotations
 * - Export des logs
 */

import { apiClient } from './api'

export interface AuditLog {
  id: number
  document_id?: number
  user_id: number
  user_name: string
  action: string
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'VALIDATE' | 'TRANSFER' | 'COMMENT'
  timestamp: string
  changes?: Record<string, any>
  details?: string
  ip_address?: string
  metadata: Record<string, any>
}

export interface DocumentHistory {
  id: number
  document_id: number
  status_changes: AuditLog[]
  approvals: AuditLog[]
  validations: AuditLog[]
  transfers: AuditLog[]
  all_actions: AuditLog[]
}

export interface DocumentComment {
  id: number
  document_id: number
  user_id: number
  user_name: string
  text: string
  created_at: string
  updated_at?: string
  replies?: DocumentComment[]
  metadata?: Record<string, any>
}

export interface AuditStatistics {
  total_logs: number
  logs_by_action: Record<string, number>
  logs_by_user: Record<string, number>
  date_range?: {
    from: string
    to: string
  }
  average_time_to_approve?: number
}

interface AuditFilters {
  document_id?: number
  user_id?: number
  action_type?: string
  date_from?: string
  date_to?: string
  search?: string
}

class AuditService {
  /**
   * Get audit trail for a document
   */
  async getDocumentAuditTrail(documentId: number): Promise<DocumentHistory> {
    try {
      const response = await apiClient.get<DocumentHistory>(
        `/documents/${documentId}/audit-trail/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur audit trail doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Get all audit logs with filters
   */
  async getAuditLogs(filters?: AuditFilters): Promise<{
    count: number
    results: AuditLog[]
  }> {
    try {
      const response = await apiClient.get<{
        count: number
        results: AuditLog[]
      }>('/audit-logs/', { params: filters })
      return response.data
    } catch (error) {
      console.error('Erreur récupération audit logs:', error)
      throw error
    }
  }

  /**
   * Get audit logs by user
   */
  async getAuditLogsByUser(userId: number, filters?: AuditFilters): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<AuditLog[]>(
        '/audit-logs/',
        {
          params: { user_id: userId, ...filters },
        }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur audit logs user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Get audit logs by action type
   */
  async getAuditLogsByActionType(actionType: string): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<AuditLog[]>(
        '/audit-logs/',
        {
          params: { action_type: actionType },
        }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur audit logs action ${actionType}:`, error)
      throw error
    }
  }

  /**
   * Get audit logs by date range
   */
  async getAuditLogsByDateRange(startDate: string, endDate: string): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<AuditLog[]>(
        '/audit-logs/',
        {
          params: {
            date_from: startDate,
            date_to: endDate,
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur audit logs par date:', error)
      throw error
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(): Promise<AuditStatistics> {
    try {
      const response = await apiClient.get<AuditStatistics>(
        '/audit-logs/statistics/'
      )
      return response.data
    } catch (error) {
      console.error('Erreur stats audit:', error)
      throw error
    }
  }

  /**
   * Get document comments
   */
  async getDocumentComments(documentId: number): Promise<DocumentComment[]> {
    try {
      const response = await apiClient.get<DocumentComment[]>(
        `/documents/${documentId}/comments/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur commentaires doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Add comment to document
   */
  async addDocumentComment(
    documentId: number,
    text: string,
    metadata?: Record<string, any>
  ): Promise<DocumentComment> {
    try {
      const response = await apiClient.post<DocumentComment>(
        `/documents/${documentId}/comments/`,
        { text, metadata }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur ajout commentaire doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: number): Promise<void> {
    try {
      await apiClient.delete(`/comments/${commentId}/`)
    } catch (error) {
      console.error(`Erreur suppression commentaire ${commentId}:`, error)
      throw error
    }
  }

  /**
   * Reply to comment
   */
  async replyToComment(
    commentId: number,
    text: string
  ): Promise<DocumentComment> {
    try {
      const response = await apiClient.post<DocumentComment>(
        `/comments/${commentId}/replies/`,
        { text }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur reply comment ${commentId}:`, error)
      throw error
    }
  }

  /**
   * Export audit logs as CSV
   */
  async exportAuditLogs(filters?: AuditFilters): Promise<Blob> {
    try {
      const response = await apiClient.get<Blob>(
        '/audit-logs/export/?format=csv',
        {
          params: filters,
          responseType: 'blob' as any,
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur export audit logs:', error)
      throw error
    }
  }

  /**
   * Export audit logs as PDF
   */
  async exportAuditLogsPDF(filters?: AuditFilters): Promise<Blob> {
    try {
      const response = await apiClient.get<Blob>(
        '/audit-logs/export/?format=pdf',
        {
          params: filters,
          responseType: 'blob' as any,
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur export audit logs PDF:', error)
      throw error
    }
  }

  /**
   * Get document change history
   */
  async getDocumentChangeHistory(documentId: number): Promise<AuditLog[]> {
    try {
      const response = await apiClient.get<AuditLog[]>(
        `/documents/${documentId}/change-history/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur change history doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Get time to complete metrics
   */
  async getTimeToCompleteMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    try {
      const response = await apiClient.get<any>(
        '/audit-logs/time-to-complete/',
        {
          params: {
            start_date: startDate,
            end_date: endDate,
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur metrics time-to-complete:', error)
      throw error
    }
  }

  /**
   * Get approver performance metrics
   */
  async getApproverPerformance(userId?: number): Promise<any> {
    try {
      const params = userId ? { user_id: userId } : {}
      const response = await apiClient.get<any>(
        '/audit-logs/approver-performance/',
        { params }
      )
      return response.data
    } catch (error) {
      console.error('Erreur metrics approver performance:', error)
      throw error
    }
  }
}

export const auditService = new AuditService()
