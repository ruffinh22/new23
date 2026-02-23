import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { ToastProvider } from '@/contexts/ToastContext'
import * as Pages from '@/pages'

// ─── Types ──────────────────────────────────────────────────────
type UserRole = 'AGENT' | 'ADMIN'

interface RouteConfig {
  path: string
  element: React.ComponentType
  allowedRoles?: UserRole[]
  label?: string
  icon?: string
}

// ─── Loading Component ──────────────────────────────────────────
const LoadingPage = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-gray-200" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-gray-600 animate-pulse">
        Chargement...
      </p>
    </div>
  </div>
)

// ─── Protected Route Wrapper ────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [] 
}) => {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes((user?.role as string)?.toUpperCase() as UserRole)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

// ─── Route Configurations ───────────────────────────────────────

// Public routes (no auth required)
const publicRoutes: RouteConfig[] = [
  { path: '/login', element: Pages.Login, label: 'Connexion' },
  { path: '/register', element: Pages.Register, label: 'Inscription' },
]

// Agent routes
const agentRoutes: RouteConfig[] = [
  { 
    path: '/dashboard', 
    element: Pages.AgentDashboard, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Tableau de Bord',
    icon: '📊'
  },
  { 
    path: '/documents', 
    element: Pages.AgentDocuments, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Documents',
    icon: '📄'
  },
  { 
    path: '/documents/:id', 
    element: Pages.DocumentDetail, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Détail Document'
  },
  { 
    path: '/notifications', 
    element: Pages.Notifications, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Notifications',
    icon: '🔔'
  },
  { 
    path: '/tasks', 
    element: Pages.Tasks, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Tâches',
    icon: '✓'
  },
]

// Admin routes
const adminRoutes: RouteConfig[] = [
  { 
    path: '/admin/dashboard', 
    element: Pages.AdminDashboard, 
    allowedRoles: ['ADMIN'],
    label: 'Admin Dashboard',
    icon: '⚙️'
  },
  { 
    path: '/users', 
    element: Pages.Users, 
    allowedRoles: ['ADMIN'],
    label: 'Utilisateurs',
    icon: '👥'
  },
  { 
    path: '/branches', 
    element: Pages.Branches, 
    allowedRoles: ['ADMIN'],
    label: 'Filiales',
    icon: '🌍'
  },
  { 
    path: '/departments', 
    element: Pages.Departments, 
    allowedRoles: ['ADMIN'],
    label: 'Départements',
    icon: '🏢'
  },
  { 
    path: '/folders', 
    element: Pages.Folders, 
    allowedRoles: ['ADMIN'],
    label: 'Dossiers',
    icon: '📁'
  },
  { 
    path: '/routing-rules', 
    element: Pages.RoutingRules, 
    allowedRoles: ['ADMIN'],
    label: 'Règles de Routage',
    icon: '🔀'
  },
  { 
    path: '/file-type-configuration', 
    element: Pages.FileTypeConfiguration, 
    allowedRoles: ['ADMIN'],
    label: 'Configuration Types',
    icon: '📋'
  },
  { 
    path: '/file-type-requirements', 
    element: Pages.FileTypeRequirements, 
    allowedRoles: ['ADMIN'],
    label: 'Exigences Types',
    icon: '📝'
  },
  { 
    path: '/admin/documents', 
    element: Pages.DocumentsManagement, 
    allowedRoles: ['ADMIN'],
    label: 'Gestion Documents',
    icon: '📑'
  },
  {
    path: '/audit-logs',
    element: Pages.AuditLogs,
    allowedRoles: ['ADMIN'],
    label: 'Journaux d\'Audit',
    icon: '🔒'
  },
  {
    path: '/template-management',
    element: Pages.TemplateManagement,
    allowedRoles: ['ADMIN'],
    label: 'Gestion des Modèles',
    icon: '📋'
  },
  {
    path: '/document-types',
    element: Pages.DocumentTypesManagement,
    allowedRoles: ['ADMIN'],
    label: 'Types de Documents',
    icon: '📋'
  },
]

// Shared routes (accessible by both Agent and Admin)
const sharedRoutes: RouteConfig[] = [
  { 
    path: '/reports', 
    element: Pages.Reports, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Rapports',
    icon: '📈'
  },
  { 
    path: '/settings', 
    element: Pages.Settings, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Paramètres',
    icon: '⚙️'
  },
  { 
    path: '/profile', 
    element: Pages.Profile, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Profil',
    icon: '👤'
  },
  { 
    path: '/schedule', 
    element: Pages.Schedule, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Planning',
    icon: '📅'
  },
  { 
    path: '/templates', 
    element: Pages.Templates, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Modèles',
    icon: '📄'
  },
  { 
    path: '/guide', 
    element: Pages.TemplatesGuide, 
    allowedRoles: ['AGENT', 'ADMIN'],
    label: 'Guide Complet SGDRA',
    icon: '📖'
  },
]

// Error routes
const errorRoutes: RouteConfig[] = [
  { path: '/unauthorized', element: Pages.Unauthorized, label: 'Non Autorisé' },
  { path: '*', element: Pages.NotFound, label: '404' },
]

// ─── Route Generator ────────────────────────────────────────────
const generateRoutes = (routes: RouteConfig[]) => {
  return routes.map((route) => {
    const Element = route.element

    if (route.allowedRoles) {
      return (
        <Route
          key={route.path}
          path={route.path}
          element={
            <ProtectedRoute allowedRoles={route.allowedRoles}>
              <Element />
            </ProtectedRoute>
          }
        />
      )
    }

    return <Route key={route.path} path={route.path} element={<Element />} />
  })
}

// ─── Export route configs for use in navigation ────────────────
export const navigationConfig = {
  agent: agentRoutes.filter(r => r.icon), // Only routes with icons
  admin: adminRoutes.filter(r => r.icon),
  shared: sharedRoutes.filter(r => r.icon),
}

// ─── Main Routes Component ──────────────────────────────────────
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* Public Routes */}
      {generateRoutes(publicRoutes)}

      {/* Home Route */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Pages.Home />
          )
        }
      />

      {/* Agent Routes */}
      {generateRoutes(agentRoutes)}

      {/* Admin Routes */}
      {generateRoutes(adminRoutes)}

      {/* Shared Routes */}
      {generateRoutes(sharedRoutes)}

      {/* Error Routes */}
      {generateRoutes(errorRoutes)}
    </Routes>
  )
}

// ─── Main App Component ─────────────────────────────────────────
const App: React.FC = () => {
  return (
    <BrowserRouter 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <Suspense fallback={<LoadingPage />}>
              <AppRoutes />
            </Suspense>
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App