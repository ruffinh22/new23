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
   * Decode JWT token to get payload
   * @param token JWT token to decode
   * @returns Decoded payload or null if invalid
   */
  _decodeToken(token: string): any {
    try {
      // JWT format: xxx.yyy.zzz
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Decode the payload (second part)
      const payload = parts[1];
      const decoded = JSON.parse(
        decodeURIComponent(
          atob(payload)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );

      return decoded;
    } catch (error) {
      console.error('❌ Error decoding JWT:', error);
      return null;
    }
  },

  /**
   * Check if token is expired
   * @param token JWT token to check
   * @returns true if expired, false otherwise
   */
  _isTokenExpired(token: string): boolean {
    const payload = this._decodeToken(token);
    if (!payload || !payload.exp) return true;

    // Convert exp to milliseconds and compare with current time
    // Add 60 seconds buffer (refresh if expiring in next minute)
    const expirationTime = (payload.exp * 1000) - (60 * 1000);
    return Date.now() > expirationTime;
  },

  /**
   * Ensure access token is valid, refresh if needed
   * @returns Valid access token or null if refresh failed
   */
  async ensureValidToken(): Promise<string | null> {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
      
      if (!accessToken) {
        console.warn('⚠️ No access token available');
        return null;
      }

      // Check if token is expired or about to expire
      if (!this._isTokenExpired(accessToken)) {
        return accessToken; // Token is still valid
      }

      console.log('🔄 Access token expired, attempting refresh...');
      
      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
      if (!refreshToken) {
        console.warn('⚠️ No refresh token available');
        return null;
      }

      // Try to refresh the token
      try {
        const result = await this.refreshToken(refreshToken);
        console.log('✅ Token refreshed successfully');
        return result.access;
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        return null;
      }
    } catch (error) {
      console.error('❌ Error ensuring valid token:', error);
      return null;
    }
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
