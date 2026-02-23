/**
 * Service centralisé pour gérer les branches/filiales
 * Charge toutes les branches depuis l'API (source unique de vérité)
 */

import { apiClient } from './api'

export interface Department {
  id: number
  branch: number
  branch_name: string
  name: string
  code: string
  description?: string
  folder?: number
  folder_name?: string
  users_count: number
}

export interface Branch {
  id?: number
  value?: string
  label?: string
  name?: string
  code?: string
  country_code?: string
  description?: string
  folder?: number | null
  folder_name?: string | null
  folder_data?: object | null
  departments_count?: number
  users_count?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
  departments?: Department[]
}

let cachedBranches: Branch[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Récupère la liste des branches depuis l'API
 * Utilise le cache local pour éviter les requêtes répétées
 */
export const branchService = {
  /**
   * Obtenir toutes les branches
   */
  async getBranches(): Promise<Branch[]> {
    // Retourner le cache s'il est valide
    if (cachedBranches && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedBranches
    }

    try {
      const response = await apiClient.get('/auth/branches/')
      let branches: Branch[] = response.data.results || response.data || []

      // Transformer les données pour le format attendu
      branches = branches.map(branch => ({
        ...branch,
        value: String(branch.id),
        label: `${branch.name} (${branch.code})`,
      }))

      // Mettre en cache
      cachedBranches = branches
      cacheTimestamp = Date.now()

      return branches
    } catch (error) {
      console.error('[branchService] Failed to load branches:', error)
      throw error
    }
  },

  /**
   * Obtenir les choix de branches pour les dropdowns
   */
  async getChoices(): Promise<Branch[]> {
    try {
      const response = await apiClient.get('/auth/branches/choices/')
      let branches: Branch[] = response.data.results || response.data || []

      branches = branches.map(branch => ({
        ...branch,
        value: String(branch.id),
        label: `${branch.name} (${branch.code})`,
      }))

      return branches
    } catch (error) {
      console.error('[branchService] Failed to load branch choices:', error)
      throw error
    }
  },

  /**
   * Obtenir une branche spécifique avec tous les détails (incluant départements)
   */
  async getBranchDetail(branchId: number): Promise<Branch> {
    try {
      const response = await apiClient.get(`/auth/branches/${branchId}/`)
      return response.data
    } catch (error) {
      console.error(`[branchService] Failed to load branch ${branchId}:`, error)
      throw error
    }
  },

  /**
   * Obtenir les départements d'une branche spécifique
   */
  async getBranchDepartments(branchId: number): Promise<Department[]> {
    try {
      const response = await apiClient.get(`/auth/branches/${branchId}/departments/`)
      return response.data.results || response.data || []
    } catch (error) {
      console.error(`[branchService] Failed to load departments for branch ${branchId}:`, error)
      throw error
    }
  },

  /**
   * Obtenir les utilisateurs d'une branche spécifique
   */
  async getBranchUsers(branchId: number): Promise<any[]> {
    try {
      const response = await apiClient.get(`/auth/branches/${branchId}/users/`)
      return response.data.results || response.data || []
    } catch (error) {
      console.error(`[branchService] Failed to load users for branch ${branchId}:`, error)
      throw error
    }
  },

  /**
   * Créer une nouvelle branche (admin uniquement)
   */
  async createBranch(data: Omit<Branch, 'id'>): Promise<Branch> {
    try {
      const response = await apiClient.post('/auth/branches/', data)
      // Invalider le cache
      cachedBranches = null
      return response.data
    } catch (error) {
      console.error('[branchService] Failed to create branch:', error)
      throw error
    }
  },

  /**
   * Mettre à jour une branche (admin uniquement)
   */
  async updateBranch(branchId: number, data: Partial<Branch>): Promise<Branch> {
    try {
      const response = await apiClient.patch(`/auth/branches/${branchId}/`, data)
      // Invalider le cache
      cachedBranches = null
      return response.data
    } catch (error) {
      console.error(`[branchService] Failed to update branch ${branchId}:`, error)
      throw error
    }
  },

  /**
   * Supprimer une branche (admin uniquement)
   */
  async deleteBranch(branchId: number): Promise<void> {
    try {
      await apiClient.delete(`/auth/branches/${branchId}/`)
      // Invalider le cache
      cachedBranches = null
    } catch (error) {
      console.error(`[branchService] Failed to delete branch ${branchId}:`, error)
      throw error
    }
  },

  /**
   * Invalider le cache (utile après une mutation)
   */
  invalidateCache(): void {
    cachedBranches = null
    cacheTimestamp = 0
  },
}
