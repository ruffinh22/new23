/**
 * Service centralisé pour gérer les départements
 * Charge tous les départements depuis l'API (source unique de vérité)
 */

import { apiClient } from './api'

export interface Department {
  id?: number
  value?: string
  label?: string
  name?: string
  code?: string
  description?: string
  folder?: object
  folder_name?: string
  branch?: number | string  // ID de la filiale
  branch_name?: string  // Nom de la filiale
  users_count?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

let cachedDepartments: Department[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Récupère la liste des départements depuis l'API
 * Utilise le cache local pour éviter les requêtes répétées
 */
export const departmentService = {
  /**
   * Obtenir tous les départements
   */
  async getDepartments(): Promise<Department[]> {
    // Retourner le cache s'il est valide
    if (cachedDepartments && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedDepartments
    }

    try {
      // Essayer d'abord la nouvelle API
      let response = await apiClient.get('/auth/departments/')
      let departments: Department[] = response.data.results || response.data || []
      
      // Transformer les données pour le format attendu
      departments = departments.map(dept => ({
        ...dept,
        value: dept.name,  // ✅ Envoyer le NOM du département, pas l'ID
        label: `${dept.name} (${dept.code})`,
      }))
      
      // Mettre en cache
      cachedDepartments = departments
      cacheTimestamp = Date.now()
      
      console.log(`✅ ${departments.length} départements chargés depuis l'API`)
      return departments
    } catch (error) {
      console.error('❌ Erreur lors du chargement des départements:', error)
      // Retourner un tableau vide en cas d'erreur
      return []
    }
  },

  /**
   * Obtenir les choix de département
   */
  async getDepartmentChoices(): Promise<Department[]> {
    try {
      const response = await apiClient.get('/auth/departments/choices/')
      const choices: Department[] = response.data || []
      
      return choices.map(dept => ({
        ...dept,
        value: String(dept.id),
        label: dept.name,
      }))
    } catch (error) {
      console.error('❌ Erreur lors du chargement des choix:', error)
      return []
    }
  },

  /**
   * Obtenir un département par sa valeur
   */
  async getDepartmentLabel(value: string): Promise<string | null> {
    const departments = await this.getDepartments()
    const dept = departments.find(d => d.value === value || String(d.id) === value)
    return dept?.label || null
  },

  /**
   * Créer un nouveau département
   */
  async createDepartment(data: {
    name: string
    code: string
    description?: string
    is_active?: boolean
    branch?: number | string
  }): Promise<Department | null> {
    try {
      const response = await apiClient.post('/auth/departments/', data)
      this.invalidateCache()
      console.log('✅ Département créé avec succès')
      return response.data
    } catch (error) {
      console.error('❌ Erreur lors de la création du département:', error)
      throw error
    }
  },

  /**
   * Mettre à jour un département
   */
  async updateDepartment(id: number, data: Partial<Department>): Promise<Department | null> {
    try {
      const response = await apiClient.patch(`/auth/departments/${id}/`, data)
      this.invalidateCache()
      console.log('✅ Département mis à jour avec succès')
      return response.data
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du département:', error)
      throw error
    }
  },

  /**
   * Supprimer un département
   */
  async deleteDepartment(id: number): Promise<void> {
    try {
      await apiClient.delete(`/auth/departments/${id}/`)
      this.invalidateCache()
      console.log('✅ Département supprimé avec succès')
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du département:', error)
      throw error
    }
  },

  /**
   * Obtenir les détails d'un département
   */
  async getDepartmentDetail(id: number): Promise<Department | null> {
    try {
      const response = await apiClient.get(`/auth/departments/${id}/`)
      return response.data
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du département:', error)
      return null
    }
  },

  /**
   * Obtenir les utilisateurs d'un département
   */
  async getDepartmentUsers(id: number): Promise<any[]> {
    try {
      const response = await apiClient.get(`/auth/departments/${id}/users/`)
      return response.data
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des utilisateurs:', error)
      return []
    }
  },

  /**
   * Invalider le cache (à appeler après une mise à jour)
   */
  invalidateCache(): void {
    cachedDepartments = null
    cacheTimestamp = 0
    console.log('🔄 Cache des départements invalidé')
  },

  /**
   * Obtenir les départements avec une option "Tous"
   */
  async getDepartmentsWithAll(): Promise<Department[]> {
    const departments = await this.getDepartments()
    return [
      { value: '', label: 'Tous les départements' },
      ...departments
    ]
  }
}
