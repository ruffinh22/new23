/**
 * Service centralisé pour gérer les statuts de documents
 * Charge tous les statuts depuis l'API (source unique de vérité)
 */

export interface DocumentStatus {
  value: string
  label: string
  color?: string
  bgClass?: string
  textClass?: string
}

/**
 * Les statuts disponibles - source de vérité
 * Ces valeurs doivent correspondre aux choix dans le backend Django
 */
export const statusService = {
  /**
   * Obtenir tous les statuts
   */
  async getStatuses(): Promise<DocumentStatus[]> {
    // Note: En attendant un endpoint API, on retourne les statuts standard
    // TODO: Créer un endpoint /documents/statuses/ si nécessaire
    return [
      { value: 'NOUVEAU', label: 'Nouveau', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
      { value: 'EN_COURS', label: 'En cours', bgClass: 'bg-yellow-100', textClass: 'text-yellow-800' },
      { value: 'VALIDE', label: 'Validé', bgClass: 'bg-green-100', textClass: 'text-green-800' },
      { value: 'REJETE', label: 'Rejeté', bgClass: 'bg-red-100', textClass: 'text-red-800' },
      { value: 'ARCHIVE', label: 'Archivé', bgClass: 'bg-gray-100', textClass: 'text-gray-800' },
    ]
  },

  /**
   * Obtenir un label par sa valeur
   */
  async getStatusLabel(value: string): Promise<string | null> {
    const statuses = await this.getStatuses()
    const status = statuses.find(s => s.value === value)
    return status?.label || null
  },

  /**
   * Obtenir un statut avec sa couleur
   */
  async getStatusWithColor(value: string): Promise<DocumentStatus | null> {
    const statuses = await this.getStatuses()
    return statuses.find(s => s.value === value) || null
  },

  /**
   * Obtenir les statuts avec une option "Tous"
   */
  async getStatusesWithAll(): Promise<DocumentStatus[]> {
    const statuses = await this.getStatuses()
    return [
      { value: '', label: 'Tous les statuts' },
      ...statuses
    ]
  },

  /**
   * Map de couleurs pour les statuts (pour backward compatibility)
   */
  getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'NOUVEAU': 'bg-blue-100 text-blue-800',
      'EN_COURS': 'bg-yellow-100 text-yellow-800',
      'VALIDE': 'bg-green-100 text-green-800',
      'REJETE': 'bg-red-100 text-red-800',
      'ARCHIVE': 'bg-gray-100 text-gray-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  },

  /**
   * Obtenir les classes de couleur complets (bg et text séparés)
   */
  getStatusClasses(status: string): { bg: string; text: string } {
    const classesMap: Record<string, { bg: string; text: string }> = {
      'NOUVEAU': { bg: 'bg-blue-50', text: 'text-blue-700' },
      'EN_COURS': { bg: 'bg-yellow-50', text: 'text-yellow-700' },
      'VALIDE': { bg: 'bg-green-50', text: 'text-green-700' },
      'REJETE': { bg: 'bg-red-50', text: 'text-red-700' },
      'ARCHIVE': { bg: 'bg-gray-50', text: 'text-gray-700' },
    }
    return classesMap[status] || { bg: 'bg-gray-50', text: 'text-gray-700' }
  },

  /**
   * Obtenir les couleurs hex pour les graphiques
   */
  getStatusHexColor(status: string): string {
    const hexMap: Record<string, string> = {
      'NOUVEAU': '#FFB6C1',
      'EN_COURS': '#87CEEB',
      'VALIDE': '#90EE90',
      'REJETE': '#FFB6C6',
      'ARCHIVE': '#D3D3D3',
    }
    return hexMap[status] || '#D3D3D3'
  }
}
