/**
 * Authentication Types
 * Définit les interfaces pour l'authentification
 */

export type UserRole = 
  | 'ADMIN' 
  | 'POLE_MANAGER' 
  | 'FILIALE_MANAGER' 
  | 'SERVICE_MANAGER' 
  | 'DOCUMENT_MANAGER' 
  | 'AGENT';

export interface User {
  id: string;
  matricule: string;
  email: string;
  first_name: string;
  last_name: string;
  department?: 'RH' | 'FINANCE' | 'COMMERCIAL' | 'TECHNIQUE' | 'LOGISTIQUE' | 'DIRECTION' | null;
  department_id?: number | null;
  department_name?: string | null;
  branch?: number | null;
  branch_id?: number | null;
  branch_name?: string | null;
  role: UserRole;
  access_level?: number; // 0=ADMIN, 1=POLE_MANAGER, 2=FILIALE_MANAGER, 3=SERVICE_MANAGER, 4=AGENT
  pole?: number | null; // For POLE_MANAGER
  pole_id?: number | null;
  pole_name?: string | null;
  filiale?: number | null; // For FILIALE_MANAGER
  filiale_id?: number | null;
  filiale_name?: string | null;
  service?: number | null; // For SERVICE_MANAGER
  service_id?: number | null;
  service_name?: string | null;
  phone?: string;
  avatar?: string | null;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  date_joined?: string;
  last_login?: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  matricule: string;
  nom?: string; // alias for last_name
  prenom?: string; // alias for first_name
  role?: UserRole;
  pole?: number | null; // For POLE_MANAGER
  branche?: number | null; // For FILIALE_MANAGER, AGENT
  filiale?: number | null; // alias for branche
  departement?: string | number | null; // For SERVICE_MANAGER, AGENT (can be folder ID or name)
  department?: 'RH' | 'FINANCE' | 'COMMERCIAL' | 'TECHNIQUE' | 'LOGISTIQUE' | 'DIRECTION' | null; // Legacy
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
  password_confirm: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (token: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}
