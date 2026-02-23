/**
 * API Types
 * Définit les interfaces communes pour les réponses API
 */

export interface ApiError {
  detail?: string;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
  code?: string;
  status: number;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
  page_size?: number;
  current_page?: number;
  total_pages?: number;
}

export interface HealthCheck {
  status: 'ok' | 'error';
  version: string;
  timestamp: string;
  database: 'ok' | 'error';
  cache: 'ok' | 'error';
}
