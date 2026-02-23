/**
 * Tasks Service - Gestion des tâches en attente
 * 
 * Gère:
 * - Documents en attente de validation/approbation
 * - Actions rapides (approve, reject)
 * - Filtrage et tri
 * - Bulk actions
 */

import { apiClient } from './api'

export interface Task {
  id: number
  document_id: number
  document_title: string
  document_type: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  task_type: 'VALIDATE' | 'APPROVE' | 'REVIEW'
  assigned_to: number
  assigned_by: number
  assigned_at: string
  due_date?: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  description?: string
  metadata: Record<string, any>
  completed_at?: string
  completed_by?: number
}

export interface TaskFilters {
  status?: string
  task_type?: string
  priority?: string
  assigned_to?: number
  due_date_from?: string
  due_date_to?: string
  search?: string
}

export interface TaskStatistics {
  total_pending: number
  total_assigned: number
  by_type: Record<string, number>
  by_priority: Record<string, number>
  overdue: number
  due_today: number
}

export interface TaskApprovalRequest {
  notes?: string
  metadata?: Record<string, any>
}

export interface TaskRejectionRequest {
  rejection_reason: string
  notes?: string
  metadata?: Record<string, any>
}

class TasksService {
  /**
   * Get my pending tasks
   */
  async getMyTasks(filters?: TaskFilters): Promise<{
    count: number
    results: Task[]
  }> {
    try {
      const response = await apiClient.get<{
        count: number
        results: Task[]
      }>('/tasks/my-tasks/', { params: filters })
      return response.data
    } catch (error) {
      console.error('Erreur récupération mes tâches:', error)
      throw error
    }
  }

  /**
   * Get tasks by status
   */
  async getTasksByStatus(status: string): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>('/tasks/', {
        params: { status },
      })
      return response.data
    } catch (error) {
      console.error(`Erreur tâches status ${status}:`, error)
      throw error
    }
  }

  /**
   * Get pending validation tasks
   */
  async getPendingValidation(): Promise<Task[]> {
    return this.getTasksByStatus('PENDING')
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>('/tasks/pending-approvals/')
      return response.data
    } catch (error) {
      console.error('Erreur approvals en attente:', error)
      throw error
    }
  }

  /**
   * Get single task
   */
  async getTask(taskId: number): Promise<Task> {
    try {
      const response = await apiClient.get<Task>(`/tasks/${taskId}/`)
      return response.data
    } catch (error) {
      console.error(`Erreur tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Approve a task
   */
  async approveTask(taskId: number, data?: TaskApprovalRequest): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(
        `/tasks/${taskId}/approve/`,
        data || {}
      )
      return response.data
    } catch (error) {
      console.error(`Erreur approbation tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Reject a task
   */
  async rejectTask(
    taskId: number,
    data: TaskRejectionRequest
  ): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(
        `/tasks/${taskId}/reject/`,
        data
      )
      return response.data
    } catch (error) {
      console.error(`Erreur rejet tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Start task (mark as in progress)
   */
  async startTask(taskId: number): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(
        `/tasks/${taskId}/start/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur start tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Complete task
   */
  async completeTask(taskId: number): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(
        `/tasks/${taskId}/complete/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur complétion tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Bulk approve tasks
   */
  async bulkApprove(taskIds: number[], notes?: string): Promise<Task[]> {
    try {
      const response = await apiClient.post<Task[]>(
        '/tasks/bulk-approve/',
        {
          task_ids: taskIds,
          notes,
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur bulk approve:', error)
      throw error
    }
  }

  /**
   * Bulk reject tasks
   */
  async bulkReject(
    taskIds: number[],
    reason: string,
    notes?: string
  ): Promise<Task[]> {
    try {
      const response = await apiClient.post<Task[]>(
        '/tasks/bulk-reject/',
        {
          task_ids: taskIds,
          rejection_reason: reason,
          notes,
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur bulk reject:', error)
      throw error
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(): Promise<TaskStatistics> {
    try {
      const response = await apiClient.get<TaskStatistics>(
        '/tasks/statistics/'
      )
      return response.data
    } catch (error) {
      console.error('Erreur stats tâches:', error)
      throw error
    }
  }

  /**
   * Assign task to user
   */
  async assignTask(taskId: number, userId: number): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(
        `/tasks/${taskId}/assign/`,
        { user_id: userId }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur assign tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Reassign task to another user
   */
  async reassignTask(taskId: number, userId: number): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(
        `/tasks/${taskId}/reassign/`,
        { user_id: userId }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur reassign tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Escalate task (mark as urgent)
   */
  async escalateTask(taskId: number, reason?: string): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(
        `/tasks/${taskId}/escalate/`,
        { reason }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur escalade tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Set task due date
   */
  async setDueDate(taskId: number, dueDate: string): Promise<Task> {
    try {
      const response = await apiClient.patch<Task>(
        `/tasks/${taskId}/`,
        { due_date: dueDate }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur set due date tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Add comment to task
   */
  async addComment(
    taskId: number,
    comment: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    try {
      const response = await apiClient.post<any>(
        `/tasks/${taskId}/comments/`,
        { text: comment, metadata }
      )
      return response.data
    } catch (error) {
      console.error(`Erreur ajout commentaire tâche ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>(
        '/tasks/overdue/'
      )
      return response.data
    } catch (error) {
      console.error('Erreur tâches expired:', error)
      return []
    }
  }

  /**
   * Get tasks due today
   */
  async getTasksDueToday(): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>(
        '/tasks/due-today/'
      )
      return response.data
    } catch (error) {
      console.error('Erreur tâches today:', error)
      return []
    }
  }
}

export const tasksService = new TasksService()
