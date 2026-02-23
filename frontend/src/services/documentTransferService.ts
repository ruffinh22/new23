/**
 * Document Transfer Service - Re-routing de documents
 * 
 * Gère:
 * - Transfert de documents vers d'autres dossiers
 * - Historique des transferts
 * - Audit trail des re-routages
 */

import { apiClient } from './api'

export interface DocumentTransfer {
  id: number
  document: number
  source_folder: number
  target_folder: number
  transfer_type: 'REROUTE' | 'MOVE' | 'COPY' | 'TEMPORARY'
  reason: string
  notes?: string
  transferred_by: number
  transferred_at: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  error_message?: string
}

export interface DocumentTransferRequest {
  target_folder: number
  transfer_type: 'REROUTE' | 'MOVE' | 'COPY' | 'TEMPORARY'
  reason: string
  notes?: string
}

export interface TransferAuditTrail {
  id: number
  document_id: number
  action: string
  source_folder?: number
  target_folder?: number
  performed_by: number
  performed_at: string
  details: Record<string, any>
}

export interface TransferStatistics {
  total_transfers: number
  transfers_by_type: Record<string, number>
  transfers_by_user: Record<string, number>
  average_processing_time: number
  success_rate: number
}

class DocumentTransferService {
  /**
   * Transfer a document to a new folder
   */
  async transferDocument(
    documentId: number,
    data: DocumentTransferRequest
  ): Promise<DocumentTransfer> {
    try {
      const response = await apiClient.post<DocumentTransfer>(
        `/documents/${documentId}/transfer/`,
        data
      )
      return response.data
    } catch (error) {
      console.error(`Erreur transfer doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Re-route a document (alias for transfer)
   */
  async rerouteDocument(
    documentId: number,
    targetFolderId: number,
    reason: string,
    notes?: string
  ): Promise<DocumentTransfer> {
    return this.transferDocument(documentId, {
      target_folder: targetFolderId,
      transfer_type: 'REROUTE',
      reason,
      notes,
    })
  }

  /**
   * Get transfer history for a document
   */
  async getTransferHistory(documentId: number): Promise<DocumentTransfer[]> {
    try {
      const response = await apiClient.get<DocumentTransfer[]>(
        `/documents/${documentId}/transfer-history/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur historique transfer doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Get all transfers with filters
   */
  async getTransfers(params?: Record<string, any>): Promise<{
    count: number
    results: DocumentTransfer[]
  }> {
    try {
      const response = await apiClient.get<{
        count: number
        results: DocumentTransfer[]
      }>('/documents/transfers/', { params })
      return response.data
    } catch (error) {
      console.error('Erreur récupération transfers:', error)
      throw error
    }
  }

  /**
   * Get transfer audit trail for a document
   */
  async getTransferAuditTrail(documentId: number): Promise<TransferAuditTrail[]> {
    try {
      const response = await apiClient.get<TransferAuditTrail[]>(
        `/documents/${documentId}/transfer-audit/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur audit transfer doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Get transfer statistics
   */
  async getTransferStatistics(): Promise<TransferStatistics> {
    try {
      const response = await apiClient.get<TransferStatistics>(
        '/documents/transfer-statistics/'
      )
      return response.data
    } catch (error) {
      console.error('Erreur stats transfer:', error)
      throw error
    }
  }

  /**
   * Get transfer statistics by date range
   */
  async getTransferStatisticsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<TransferStatistics> {
    try {
      const response = await apiClient.get<TransferStatistics>(
        '/documents/transfer-statistics/',
        {
          params: {
            start_date: startDate,
            end_date: endDate,
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur stats transfer par date:', error)
      throw error
    }
  }

  /**
   * Undo a transfer
   */
  async undoTransfer(transferId: number): Promise<DocumentTransfer> {
    try {
      const response = await apiClient.post<DocumentTransfer>(
        `/documents/transfers/${transferId}/undo/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur undo transfer ${transferId}:`, error)
      throw error
    }
  }

  /**
   * Bulk transfer documents
   */
  async bulkTransfer(
    documentIds: number[],
    targetFolderId: number,
    reason: string
  ): Promise<DocumentTransfer[]> {
    try {
      const response = await apiClient.post<DocumentTransfer[]>(
        '/documents/bulk-transfer/',
        {
          document_ids: documentIds,
          target_folder: targetFolderId,
          reason,
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur bulk transfer:', error)
      throw error
    }
  }

  /**
   * Check if user can transfer document
   */
  async canTransferDocument(documentId: number): Promise<boolean> {
    try {
      const response = await apiClient.get<{ can_transfer: boolean }>(
        `/documents/${documentId}/can-transfer/`
      )
      return response.data.can_transfer
    } catch (error) {
      console.error(`Erreur check transfer permission doc ${documentId}:`, error)
      return false
    }
  }

  /**
   * Get suggested destination folders
   */
  async getSuggestedFolders(documentId: number): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(
        `/documents/${documentId}/suggested-folders/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur suggestions dossiers doc ${documentId}:`, error)
      return []
    }
  }
}

export const documentTransferService = new DocumentTransferService()
