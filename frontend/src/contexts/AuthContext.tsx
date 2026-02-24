import React, { createContext, useContext } from 'react'
import type { User } from '@/types/auth'
import { STORAGE_KEYS, AUTH_ENDPOINTS } from '@/utils/constants'
import { apiClient } from '@/services/api'

// Decode JWT token without external library
const decodeToken = (token: string) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode token:', error)
    return null
  }
}

export interface RegisterRequest {
  nom: string
  prenom: string
  matricule: string
  email: string
  password: string
  password_confirm: string
  role?: string
  pole?: number | null
  branche?: number | null
  filiale?: number | null
  departement?: string | number | null
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (matricule: string, password: string) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  refreshUser: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // Load user from localStorage on mount
  React.useEffect(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.user)
    const storedToken = localStorage.getItem(STORAGE_KEYS.accessToken)
    
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        // Restore auth header
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      } catch (error) {
        console.error('Failed to parse stored user:', error)
        localStorage.removeItem(STORAGE_KEYS.user)
      }
    }
  }, [])

  const login = async (matricule: string, password: string) => {
    setIsLoading(true)
    try {
      console.log('[AuthContext] Calling auth token endpoint', { matricule })
      const tokenResponse = await apiClient.post<{ access: string; refresh: string }>(AUTH_ENDPOINTS.login, {
        matricule,
        password,
      })

      const { access, refresh } = tokenResponse.data
      console.log('[AuthContext] Got tokens, access token length:', access.length)

      // Store tokens
      localStorage.setItem(STORAGE_KEYS.accessToken, access)
      localStorage.setItem(STORAGE_KEYS.refreshToken, refresh)

      // Set default header for future requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`

      // ✅ OPTIMIZED: Extract user data from JWT token instead of making another API call
      // The token now includes user data: matricule, first_name, last_name, role, department_id, etc.
      const decodedToken = decodeToken(access)
      if (!decodedToken) {
        throw new Error('Failed to decode authentication token')
      }

      const userData: User = {
        id: decodedToken.user_id || decodedToken.sub,
        matricule: decodedToken.matricule,
        email: decodedToken.email,
        first_name: decodedToken.first_name || '',
        last_name: decodedToken.last_name || '',
        role: (decodedToken.role || 'AGENT').toUpperCase() as any,
        access_level: decodedToken.access_level,
        pole_id: decodedToken.pole_id,
        pole_name: decodedToken.pole_name,
        branch_id: decodedToken.branch_id,
        branch_name: decodedToken.branch_name,
        service_id: decodedToken.service_id,
        service_name: decodedToken.service_name,
        department: decodedToken.department,
        department_name: decodedToken.department_name || null,
        branch: decodedToken.branch || null,
        phone: decodedToken.phone || '',
        avatar: decodedToken.avatar || null,
        is_staff: decodedToken.is_staff || false,
        is_superuser: decodedToken.is_superuser || false,
      }

      console.log('[AuthContext] Got user data from token:', userData.matricule)

      // Update state (this triggers re-renders in ALL components using this context)
      setUser(userData)
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData))
      console.log('[AuthContext] Login successful, user state updated')
    } catch (error) {
      console.error('[AuthContext] Login failed:', error)
      // Clean up on failure
      localStorage.removeItem(STORAGE_KEYS.accessToken)
      localStorage.removeItem(STORAGE_KEYS.refreshToken)
      localStorage.removeItem(STORAGE_KEYS.user)
      delete apiClient.defaults.headers.common['Authorization']
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterRequest) => {
    setIsLoading(true)
    try {
      console.log('[AuthContext] Calling register endpoint', JSON.stringify(data, null, 2))
      const payload: any = {
        first_name: data.prenom,
        last_name: data.nom,
        matricule: data.matricule,
        email: data.email,
        password: data.password,
        password_confirm: data.password_confirm,
      }

      // Ajouter les champs conditionnels selon le rôle
      if (data.role) payload.role = data.role
      if (data.pole) payload.pole = data.pole
      if (data.branche || data.filiale) payload.branch = data.branche || data.filiale
      if (data.departement) payload.department = data.departement

      console.log('[AuthContext] Payload being sent:', JSON.stringify(payload, null, 2))
      const response = await apiClient.post('/auth/users/register/', payload)
      
      const { access, refresh } = response.data
      console.log('[AuthContext] Got tokens, access token length:', access.length)
      
      // Store tokens
      localStorage.setItem(STORAGE_KEYS.accessToken, access)
      localStorage.setItem(STORAGE_KEYS.refreshToken, refresh)
      
      // Set default header for future requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access}`
      
      // Extract user data from JWT token
      const decodedToken = decodeToken(access)
      if (!decodedToken) {
        throw new Error('Failed to decode authentication token')
      }
      
      const userData: User = {
        id: decodedToken.user_id || decodedToken.sub,
        matricule: decodedToken.matricule,
        email: decodedToken.email,
        first_name: decodedToken.first_name || '',
        last_name: decodedToken.last_name || '',
        role: (decodedToken.role || 'AGENT').toUpperCase() as any,
        access_level: decodedToken.access_level,
        pole_id: decodedToken.pole_id,
        pole_name: decodedToken.pole_name,
        branch_id: decodedToken.branch_id,
        branch_name: decodedToken.branch_name,
        filiale_id: decodedToken.filiale_id,
        filiale_name: decodedToken.filiale_name,
        service_id: decodedToken.service_id,
        service_name: decodedToken.service_name,
        department: decodedToken.department,
        department_name: decodedToken.department_name || null,
        branch: decodedToken.branch || null,
        phone: decodedToken.phone || '',
        avatar: decodedToken.avatar || null,
        is_staff: decodedToken.is_staff || false,
        is_superuser: decodedToken.is_superuser || false,
      }
      
      console.log('[AuthContext] Got user data from token:', userData.matricule)
      setUser(userData)
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData))
      console.log('[AuthContext] Register successful, user state updated')
    } catch (error) {
      console.error('[AuthContext] Register failed:', error)
      // Clean up on failure
      localStorage.removeItem(STORAGE_KEYS.accessToken)
      localStorage.removeItem(STORAGE_KEYS.refreshToken)
      localStorage.removeItem(STORAGE_KEYS.user)
      delete apiClient.defaults.headers.common['Authorization']
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEYS.user)
    localStorage.removeItem(STORAGE_KEYS.accessToken)
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    delete apiClient.defaults.headers.common['Authorization']
  }

  const refreshUser = React.useCallback(async () => {
    try {
      console.log('[AuthContext] Refreshing user from API...')
      
      // Call the /me endpoint to get fresh user data from the API
      const response = await apiClient.get('/auth/users/me/')
      const userData = response.data as User
      
      // If the API returns more detailed fields, make sure they're set
      if (!userData.pole_name && userData.pole) {
        console.log('[AuthContext] Pole ID found but no name, setting from decoded token')
      }

      console.log('[AuthContext] User data refreshed from API:', userData.matricule)
      setUser(userData)
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData))
    } catch (error) {
      console.error('[AuthContext] Failed to refresh user from API:', error)
      // Fallback: try to update from JWT token
      const token = localStorage.getItem(STORAGE_KEYS.accessToken)
      if (token) {
        try {
          const decodedToken = decodeToken(token)
          if (decodedToken) {
            const userData: User = {
              id: decodedToken.user_id || decodedToken.sub,
              matricule: decodedToken.matricule,
              email: decodedToken.email,
              first_name: decodedToken.first_name || '',
              last_name: decodedToken.last_name || '',
              role: (decodedToken.role || 'AGENT').toUpperCase() as any,
              access_level: decodedToken.access_level,
              pole_id: decodedToken.pole_id,
              pole_name: decodedToken.pole_name,
              branch_id: decodedToken.branch_id,
              branch_name: decodedToken.branch_name,
              service_id: decodedToken.service_id,
              service_name: decodedToken.service_name,
              department: decodedToken.department,
              department_name: decodedToken.department_name || null,
              branch: decodedToken.branch || null,
              phone: decodedToken.phone || '',
              avatar: decodedToken.avatar || null,
              is_staff: decodedToken.is_staff || false,
              is_superuser: decodedToken.is_superuser || false,
            }
            setUser(userData)
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(userData))
          }
        } catch (decodeError) {
          console.error('[AuthContext] Failed to decode token fallback:', decodeError)
        }
      }
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout, refreshUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
