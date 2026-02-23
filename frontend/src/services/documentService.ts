/**
 * Document Service
 * Service pour les opérations sur les documents
 */

import { apiClient } from './api'
import { 
  Document,
  DocumentListResponse,
  DocumentCreateRequest,
  DocumentUpdateRequest,
  WorkflowTimeline,
  DocumentTransfer,
  DocumentTransferRequest,
  DocumentTransferListResponse,
} from '../types/document'
import { DOCUMENT_ENDPOINTS, WORKFLOW_ENDPOINTS } from '../utils/constants'

export const documentService = {
  /**
   * Get list of documents
   */
  async getDocuments(params?: Record<string, any>): Promise<DocumentListResponse> {
    const response = await apiClient.get<DocumentListResponse>(DOCUMENT_ENDPOINTS.list, {
      params,
    });
    return response.data;
  },

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document> {
    const response = await apiClient.get<Document>(DOCUMENT_ENDPOINTS.detail(id));
    return response.data;
  },

  /**
   * Create new document
   */
  async createDocument(data: DocumentCreateRequest): Promise<Document> {
    const response = await apiClient.post<Document>(DOCUMENT_ENDPOINTS.create, data);
    return response.data;
  },

  /**
   * Update document
   */
  async updateDocument(id: string, data: DocumentUpdateRequest): Promise<Document> {
    const response = await apiClient.patch<Document>(
      DOCUMENT_ENDPOINTS.update(id),
      data
    );
    return response.data;
  },

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(DOCUMENT_ENDPOINTS.delete(id));
  },

  /**
   * Upload document file
   */
  async uploadDocument(formData: FormData): Promise<Document> {
    const response = await apiClient.post<Document>(
      DOCUMENT_ENDPOINTS.upload,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Search documents
   */
  async searchDocuments(query: string, params?: Record<string, any>): Promise<DocumentListResponse> {
    const response = await apiClient.get<DocumentListResponse>(
      DOCUMENT_ENDPOINTS.search,
      {
        params: { q: query, ...params },
      }
    );
    return response.data;
  },

  /**
   * Get workflow timeline for document
   */
  async getWorkflowTimeline(documentId: string): Promise<WorkflowTimeline> {
    const response = await apiClient.get<WorkflowTimeline>(
      WORKFLOW_ENDPOINTS.timeline(documentId)
    );
    return response.data;
  },

  /**
   * Approve document
   */
  async approveDocument(documentId: string, comment?: string): Promise<Document> {
    const response = await apiClient.post<Document>(
      WORKFLOW_ENDPOINTS.approve(documentId),
      { comment }
    );
    return response.data;
  },

  /**
   * Reject document
   */
  async rejectDocument(documentId: string, comment?: string): Promise<Document> {
    const response = await apiClient.post<Document>(
      WORKFLOW_ENDPOINTS.reject(documentId),
      { comment }
    );
    return response.data;
  },

  /**
   * Request changes on document
   */
  async requestChanges(documentId: string, comment?: string): Promise<Document> {
    const response = await apiClient.post<Document>(
      WORKFLOW_ENDPOINTS.requestChanges(documentId),
      { comment }
    );
    return response.data;
  },

  /**
   * Re-route document to another folder
   */
  async rerouteDocument(documentId: string, data: DocumentTransferRequest): Promise<DocumentTransfer> {
    const response = await apiClient.post<DocumentTransfer>(
      WORKFLOW_ENDPOINTS.reroute(documentId),
      data
    );
    return response.data;
  },

  /**
   * Get transfer history for document
   */
  async getTransferHistory(documentId: string, params?: Record<string, any>): Promise<DocumentTransferListResponse> {
    const response = await apiClient.get<DocumentTransferListResponse>(
      WORKFLOW_ENDPOINTS.transfers(documentId),
      { params }
    );
    return response.data;
  },
};
