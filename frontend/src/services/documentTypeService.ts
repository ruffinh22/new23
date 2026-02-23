/**
 * Service centralisé pour gérer les types de documents
 * Charge tous les types depuis l'API (source unique de vérité)
 */

import { apiClient } from './api'

export interface DocumentType {
  value: string
  label: string
  description?: string
}

let cachedDocumentTypes: DocumentType[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Récupère la liste des types de documents depuis l'API
 */
export const documentTypeService = {
  /**
   * Obtenir tous les types de documents
   */
  async getDocumentTypes(): Promise<DocumentType[]> {
    // Retourner le cache s'il est valide
    if (cachedDocumentTypes && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedDocumentTypes
    }

    try {
      // Récupérer tous les types de documents depuis l'API
      const response = await apiClient.get('/documents/specifications/')
      const allTypes = Array.isArray(response.data) ? response.data : (response.data.results || response.data || [])
      
      // Transformer les types
      const documentTypes = allTypes.map((item: any) => ({
        value: item.document_type,
        label: item.display_name || item.document_type,
        description: item.description
      })).sort((a: DocumentType, b: DocumentType) => 
        a.label.localeCompare(b.label)
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
   * Obtenir un type par sa valeur
   */
  async getDocumentTypeLabel(value: string): Promise<string | null> {
    const types = await this.getDocumentTypes()
    const type = types.find(t => t.value === value)
    return type?.label || null
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
   * Obtenir les types avec une option "Tous"
   */
  async getDocumentTypesWithAll(): Promise<DocumentType[]> {
    const types = await this.getDocumentTypes()
    return [
      { value: '', label: 'Tous les types' },
      ...types
    ]
  }
}
