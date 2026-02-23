/**
 * Application Constants
 * Constantes globales pour l'application
 */

// API Configuration
// Use relative URLs so it works on any domain (localhost, production, etc)
const apiUrl = (import.meta as any).env?.VITE_API_URL || '/api'
export const API_BASE_URL = apiUrl
export const HEALTH_CHECK_URL = `${API_BASE_URL.replace('/api', '')}/health/`

// Auth Endpoints
export const AUTH_ENDPOINTS = {
  login: 'auth/token/',
  logout: 'auth/logout/',
  register: 'auth/users/',
  refresh: 'auth/token/refresh/',
  me: 'auth/users/me/',
  passwordReset: 'auth/password-reset/',
  passwordResetConfirm: 'auth/password-reset-confirm/',
} as const;

// Document Endpoints
export const DOCUMENT_ENDPOINTS = {
  list: 'documents/',
  create: 'documents/',
  detail: (id: string) => `documents/${id}/`,
  update: (id: string) => `documents/${id}/`,
  delete: (id: string) => `documents/${id}/`,
  upload: 'documents/upload/',
  folders: 'folders/',
  search: 'documents/search/',
} as const;

// Workflow Endpoints
export const WORKFLOW_ENDPOINTS = {
  timeline: (documentId: string) => `documents/${documentId}/workflow/`,
  approve: (documentId: string) => `documents/${documentId}/approve/`,
  reject: (documentId: string) => `documents/${documentId}/reject/`,
  requestChanges: (documentId: string) => `documents/${documentId}/request-changes/`,
  reroute: (documentId: string) => `documents/${documentId}/reroute/`,
  transfers: (documentId: string) => `documents/${documentId}/transfers/`,
} as const;

// User Endpoints
export const USER_ENDPOINTS = {
  list: 'auth/users/',
  detail: (id: string) => `auth/users/${id}/`,
  update: (id: string) => `auth/users/${id}/`,
  avatar: (id: string) => `auth/users/${id}/avatar/`,
} as const;

// Branch Endpoints
export const BRANCH_ENDPOINTS = {
  list: 'auth/branches/',
  create: 'auth/branches/',
  detail: (id: number | string) => `auth/branches/${id}/`,
  update: (id: number | string) => `auth/branches/${id}/`,
  delete: (id: number | string) => `auth/branches/${id}/`,
  choices: 'auth/branches/choices/',
  departments: (id: number | string) => `auth/branches/${id}/departments/`,
  users: (id: number | string) => `auth/branches/${id}/users/`,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  accessToken: 'sgdra_access_token',
  refreshToken: 'sgdra_refresh_token',
  user: 'sgdra_user',
  preferences: 'sgdra_preferences',
  filters: 'sgdra_filters',
} as const;

// Token Expiration
export const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
export const TOKEN_WARNING_TIME = 30 * 1000; // 30 seconds before expiration

// File Upload
export const MAX_FILE_SIZE = 104 * 1024 * 1024; // 104MB (from .env.production)
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv',
];

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Session Timeout
export const SESSION_TIMEOUT = 1800000; // 30 minutes (1800 seconds from .env.production)
export const SESSION_WARNING_TIME = 300000; // 5 minutes before timeout

// UI Constants
export const NOTIFICATION_DURATION = 4000; // 4 seconds
export const DEBOUNCE_DELAY = 300; // milliseconds
export const REQUEST_TIMEOUT = 30000; // 30 seconds

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
} as const;

// Document Status
export const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published',
} as const;

// Workflow Actions
export const WORKFLOW_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  REQUEST_CHANGES: 'request_changes',
  SUBMIT: 'submit',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erreur réseau. Vérifiez votre connexion.',
  UNAUTHORIZED: 'Non autorisé. Veuillez vous reconnecter.',
  FORBIDDEN: 'Accès refusé.',
  NOT_FOUND: 'Ressource non trouvée.',
  VALIDATION_ERROR: 'Erreur de validation. Vérifiez vos données.',
  SERVER_ERROR: 'Erreur serveur. Veuillez réessayer.',
  FILE_TOO_LARGE: `La taille du fichier dépasse ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
  INVALID_FILE_TYPE: 'Type de fichier non autorisé.',
  SESSION_EXPIRED: 'Votre session a expiré. Veuillez vous reconnecter.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Connexion réussie.',
  LOGOUT_SUCCESS: 'Déconnexion réussie.',
  REGISTER_SUCCESS: 'Inscription réussie. Veuillez vous connecter.',
  DOCUMENT_CREATED: 'Document créé avec succès.',
  DOCUMENT_UPDATED: 'Document mis à jour avec succès.',
  DOCUMENT_DELETED: 'Document supprimé avec succès.',
  DOCUMENT_UPLOADED: 'Document téléchargé avec succès.',
  APPROVAL_SUCCESS: 'Document approuvé avec succès.',
  REJECTION_SUCCESS: 'Document rejeté avec succès.',
} as const;

// Routes
export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password/:token',
  DASHBOARD: '/dashboard',
  DOCUMENTS: '/documents',
  DOCUMENT_DETAIL: '/documents/:id',
  DOCUMENT_UPLOAD: '/documents/upload',
  DOCUMENT_EDIT: '/documents/:id/edit',
  APPROVALS: '/approvals',
  APPROVAL_DETAIL: '/approvals/:id',
  USERS: '/users',
  USER_PROFILE: '/profile',
  SETTINGS: '/settings',
  ADMIN: '/admin',
  NOT_FOUND: '/*',
} as const;
