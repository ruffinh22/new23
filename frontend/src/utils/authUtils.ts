/**
 * Centralized authorization utility functions
 * ✅ Single source of truth for permission checks
 */

import { User, UserRole } from '@/types/auth'

/**
 * Checks if a user is an admin
 * ✅ Matches backend PermissionMixin.is_admin() logic
 * 
 * Returns true if ANY of these conditions are met:
 * 1. user.is_staff === true (Django staff flag)
 * 2. user.is_superuser === true (Django superuser flag)
 * 3. user.role === 'ADMIN' (custom role field)
 */
export function isAdmin(user?: User | null): boolean {
  if (!user) return false
  return user.is_staff === true || user.is_superuser === true || user.role === 'ADMIN'
}

/**
 * Checks if a user is a manager/supervisor
 */
export function isManager(user?: User | null): boolean {
  if (!user) return false
  return (
    user.role === 'POLE_MANAGER' ||
    user.role === 'FILIALE_MANAGER' ||
    user.role === 'SERVICE_MANAGER' ||
    user.role === 'DOCUMENT_MANAGER' ||
    isAdmin(user)
  )
}

/**
 * Gets the display name of a user
 */
export function getUserDisplayName(user?: User | null): string {
  if (!user) return 'Unknown User'
  const firstName = user.first_name || ''
  const lastName = user.last_name || ''
  return `${firstName} ${lastName}`.trim() || user.email || user.matricule || 'User'
}

/**
 * Gets the user's role display name
 */
export function getRoleDisplayName(role?: UserRole | string): string {
  const roleMap: Record<string, string> = {
    ADMIN: 'Administrateur',
    POLE_MANAGER: 'Gestionnaire Pôle',
    FILIALE_MANAGER: 'Gestionnaire Filiale',
    SERVICE_MANAGER: 'Gestionnaire Service',
    DOCUMENT_MANAGER: 'Gestionnaire Documents',
    AGENT: 'Agent',
    MANAGER: 'Gestionnaire',
    USER: 'Utilisateur',
  }
  return roleMap[role || ''] || role || 'Unknown Role'
}
