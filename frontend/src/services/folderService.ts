/**
 * Folder Service
 * Service pour les opérations sur les dossiers (Pôles, Filiales, Services)
 */

import { apiClient } from './api';
import { Folder } from '../types/document';

const FOLDER_ENDPOINTS = {
  list: 'folders/',
  detail: (id: string | number) => `folders/${id}/`,
  create: 'folders/',
  update: (id: string | number) => `folders/${id}/`,
  delete: (id: string | number) => `folders/${id}/`,
  poles: 'folders/poles/',
  filiales: 'folders/filiales/',
  services: 'folders/services/',
  byParent: (parentId: string | number) => `folders/folders?parent_id=${parentId}`,
} as const;

export const folderService = {
  /**
   * Get all folders
   */
  async getFolders(params?: Record<string, any>): Promise<Folder[]> {
    const response = await apiClient.get<{ results: Folder[] } | Folder[]>(
      FOLDER_ENDPOINTS.list,
      { params }
    );
    // Handle both paginated and non-paginated responses
    const data = response.data;
    return Array.isArray(data) ? data : (data.results || []);
  },

  /**
   * Get folder by ID
   */
  async getFolder(id: string | number): Promise<Folder> {
    const response = await apiClient.get<Folder>(FOLDER_ENDPOINTS.detail(id));
    return response.data;
  },

  /**
   * Get all poles (Pôles)
   */
  async getPoles(): Promise<Folder[]> {
    const response = await apiClient.get<{ results: Folder[] } | Folder[]>(
      FOLDER_ENDPOINTS.poles
    );
    const data = response.data;
    return Array.isArray(data) ? data : (data.results || []);
  },

  /**
   * Get all filiales (Filiales)
   */
  async getFiliales(poleId?: string | number): Promise<Folder[]> {
    let url: string = FOLDER_ENDPOINTS.filiales;
    if (poleId) {
      url = `${FOLDER_ENDPOINTS.filiales}?parent_id=${poleId}`;
    }
    const response = await apiClient.get<{ results: Folder[] } | Folder[]>(url);
    const data = response.data;
    return Array.isArray(data) ? data : (data.results || []);
  },

  /**
   * Get all services (Services)
   */
  async getServices(filialeId?: string | number): Promise<Folder[]> {
    let url: string = FOLDER_ENDPOINTS.services;
    if (filialeId) {
      url = `${FOLDER_ENDPOINTS.services}?parent_id=${filialeId}`;
    }
    const response = await apiClient.get<{ results: Folder[] } | Folder[]>(url);
    const data = response.data;
    return Array.isArray(data) ? data : (data.results || []);
  },

  /**
   * Get folders by parent
   */
  async getChildFolders(parentId: string | number): Promise<Folder[]> {
    const response = await apiClient.get<{ results: Folder[] } | Folder[]>(
      FOLDER_ENDPOINTS.byParent(parentId)
    );
    const data = response.data;
    return Array.isArray(data) ? data : (data.results || []);
  },

  /**
   * Create folder
   */
  async createFolder(data: Partial<Folder>): Promise<Folder> {
    const response = await apiClient.post<Folder>(FOLDER_ENDPOINTS.create, data);
    return response.data;
  },

  /**
   * Update folder
   */
  async updateFolder(id: string | number, data: Partial<Folder>): Promise<Folder> {
    const response = await apiClient.patch<Folder>(
      FOLDER_ENDPOINTS.update(id),
      data
    );
    return response.data;
  },

  /**
   * Delete folder
   */
  async deleteFolder(id: string | number): Promise<void> {
    await apiClient.delete(FOLDER_ENDPOINTS.delete(id));
  },

  /**
   * Get poles with statistics
   */
  async getPolesWithStats(): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(
        'folders/poles/with_counts/'
      );
      return response.data;
    } catch (error) {
      console.error('Erreur récupération pôles avec stats:', error);
      throw error;
    }
  },

  /**
   * Get filiales grouped by pole
   */
  async getFiliairesByPole(): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(
        'folders/filiales/by_pole/'
      );
      return response.data;
    } catch (error) {
      console.error('Erreur filiales par pôle:', error);
      throw error;
    }
  },

  /**
   * Get services grouped by filiale
   */
  async getServicesByFiliales(): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(
        'folders/services/by_filiale/'
      );
      return response.data;
    } catch (error) {
      console.error('Erreur services par filiale:', error);
      throw error;
    }
  },

  /**
   * Get complete hierarchy tree (Poles → Filiales → Services)
   * Combines multiple API calls into one tree structure
   */
  async getHierarchyTree(): Promise<any> {
    try {
      // Get all poles
      const polesWithStats = await this.getPolesWithStats();
      
      // For each pole, get filiales
      const polesWithChildren = await Promise.all(
        polesWithStats.map(async (pole) => {
          try {
            const filiales = await this.getFiliales(pole.id);
            
            // For each filiale, get services
            const filiaireWithServices = await Promise.all(
              filiales.map(async (filiale) => {
                try {
                  const services = await this.getServices(filiale.id);
                  return {
                    ...filiale,
                    children: services,
                  };
                } catch (error) {
                  console.error(`Erreur services filiale ${filiale.id}:`, error);
                  return { ...filiale, children: [] };
                }
              })
            );
            
            return {
              ...pole,
              children: filiaireWithServices,
            };
          } catch (error) {
            console.error(`Erreur filiales pôle ${pole.id}:`, error);
            return { ...pole, children: [] };
          }
        })
      );
      
      return { poles: polesWithChildren };
    } catch (error) {
      console.error('Erreur récupération hiérarchie complète:', error);
      throw error;
    }
  },

  /**
   * Get accessible folders for current user
   */
  async getAccessibleFolders(userId?: number): Promise<Folder[]> {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await apiClient.get<{ results: Folder[] } | Folder[]>(
        'folders/accessible/',
        { params }
      );
      const data = response.data;
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error('Erreur dossiers accessibles:', error);
      throw error;
    }
  },

  /**
   * Search folders by name/code
   */
  async searchFolders(query: string): Promise<Folder[]> {
    try {
      const response = await apiClient.get<{ results: Folder[] } | Folder[]>(
        'folders/search/',
        { params: { q: query } }
      );
      const data = response.data;
      return Array.isArray(data) ? data : (data.results || []);
    } catch (error) {
      console.error(`Erreur recherche "${query}":`, error);
      throw error;
    }
  },

  /**
   * Get folder ancestors (parent chain)
   */
  async getFolderAncestors(folderId: number): Promise<Folder[]> {
    try {
      const response = await apiClient.get<Folder[]>(
        `folders/${folderId}/ancestors/`
      );
      return response.data;
    } catch (error) {
      console.error(`Erreur ancêtres dossier ${folderId}:`, error);
      throw error;
    }
  },

  /**
   * Get folder descendants (all children recursively)
   */
  async getFolderDescendants(folderId: number): Promise<Folder[]> {
    try {
      const response = await apiClient.get<Folder[]>(
        `folders/${folderId}/descendants/`
      );
      return response.data;
    } catch (error) {
      console.error(`Erreur descendants dossier ${folderId}:`, error);
      throw error;
    }
  },
};

export default folderService;
