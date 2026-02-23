/**
 * Auth Service
 * Service pour les opérations d'authentification
 */

import { apiClient } from './api'
import {
  User,
  AuthResponse,
  RegisterRequest,
  PasswordResetRequest,
} from '../types/auth'
import { AUTH_ENDPOINTS, STORAGE_KEYS } from '../utils/constants'

export const authService = {
  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.login, {
      email,
      password,
    });

    const { access, refresh, user } = response.data;

    // Store tokens
    localStorage.setItem(STORAGE_KEYS.accessToken, access);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

    return response.data;
  },

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.register, data);

    const { access, refresh, user } = response.data;

    // Store tokens
    localStorage.setItem(STORAGE_KEYS.accessToken, access);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(AUTH_ENDPOINTS.logout);
    } finally {
      // Clear tokens
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  },

  /**
   * Get current user
   */
  async getMe(): Promise<User> {
    const response = await apiClient.get<User>(AUTH_ENDPOINTS.me);
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refresh: string): Promise<{ access: string }> {
    const response = await apiClient.post<{ access: string }>(AUTH_ENDPOINTS.refresh, {
      refresh,
    });

    const { access } = response.data;

    // Update token
    localStorage.setItem(STORAGE_KEYS.accessToken, access);

    return response.data;
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(data: PasswordResetRequest): Promise<{ detail: string }> {
    const response = await apiClient.post(AUTH_ENDPOINTS.passwordReset, data);
    return response.data;
  },

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(data: PasswordResetRequest): Promise<{ detail: string }> {
    const response = await apiClient.post(AUTH_ENDPOINTS.passwordReset, data);
    return response.data;
  },

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem(STORAGE_KEYS.user);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
