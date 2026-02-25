/**
 * Service centralisé pour gérer les types de documents
 * Charge tous les types depuis l'API (source unique de vérité)
 */

import { apiClient } from './api'

export interface DocumentType {
  id: number
  name: string
  display_name: string
  description?: string
  is_active: boolean
  icon?: string
  color?: string
}

let cachedDocumentTypes: DocumentType[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Récupère la liste des types de documents depuis l'API
 */
export const documentTypeService = {
  /**
   * Obtenir tous les types de documents actifs
   */
  async getDocumentTypes(): Promise<DocumentType[]> {
    // Retourner le cache s'il est valide
    if (cachedDocumentTypes && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedDocumentTypes
    }

    try {
      // Récupérer tous les types de documents depuis l'API
      const response = await apiClient.get('/documents/types/')
      const allTypes = Array.isArray(response.data) ? response.data : (response.data.results || response.data || [])
      
      // Filtrer les types actifs
      const documentTypes = allTypes.filter((item: DocumentType) => item.is_active)
        .sort((a: DocumentType, b: DocumentType) => 
          a.display_name.localeCompare(b.display_name)
        )
      
      // Mettre en cache
      cachedDocumentTypes = documentTypes
      cacheTimestamp = Date.now()
      
      console.log(`✅ ${documentTypes.length} types de documents chargés depuis l'API`)
      return documentTypes
    } catch (error) {
      console.error('❌ Erreur lors du chargement des types:', error)
      // Retourner un tableau vide en cas d'erreur
      return []
    }
  },

  /**
   * Obtenir un type par son ID ou son nom
   */
  async getDocumentTypeById(id: number): Promise<DocumentType | null> {
    const types = await this.getDocumentTypes()
    return types.find(t => t.id === id) || null
  },

  async getDocumentTypeByName(name: string): Promise<DocumentType | null> {
    const types = await this.getDocumentTypes()
    return types.find(t => t.name === name) || null
  },

  /**
   * Invalider le cache
   */
  invalidateCache(): void {
    cachedDocumentTypes = null
    cacheTimestamp = 0
    console.log('🔄 Cache des types invalidé')
  },

  /**
   * Obtenir les types formatés pour dropdowns
   */
  async getDocumentTypesForSelect() {
    const types = await this.getDocumentTypes()
    return types.map(type => ({
      label: type.display_name,
      value: type.id,
      icon: type.icon,
      color: type.color,
    }))
  }
}
