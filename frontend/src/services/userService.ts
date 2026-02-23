/**
 * User Service
 * Service pour les opérations utilisateur
 */

import { apiClient } from './api';
import { User, PaginatedResponse } from '../types';
import { USER_ENDPOINTS } from '../utils/constants';

export const userService = {
  /**
   * Get list of users
   */
  async getUsers(params?: Record<string, any>): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<PaginatedResponse<User>>(
      USER_ENDPOINTS.list,
      { params }
    );
    return response.data;
  },

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User> {
    const response = await apiClient.get<User>(USER_ENDPOINTS.detail(id));
    return response.data;
  },

  /**
   * Update user
   */
  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const response = await apiClient.patch<User>(
      USER_ENDPOINTS.update(id),
      data
    );
    return response.data;
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(id: string, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post<User>(
      USER_ENDPOINTS.avatar(id),
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
   * Delete user (admin only)
   */
  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(USER_ENDPOINTS.detail(id));
  },
};
