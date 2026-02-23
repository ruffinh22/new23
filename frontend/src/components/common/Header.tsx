import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, Menu, X, BookOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationBadge } from './NotificationBadge'

// Custom hamburger icon with 4 lines - all aligned to left
const CustomHamburger = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="5" x2="18" y2="5" />
    <line x1="4" y1="11" x2="12" y2="11" />
    <line x1="4" y1="17" x2="18" y2="17" />
    <line x1="4" y1="23" x2="12" y2="23" />
  </svg>
)

interface HeaderProps {
  onMobileMenuToggle?: (open: boolean) => void
  mobileMenuOpen?: boolean
  sidebarCollapsed?: boolean
  onSidebarToggle?: (collapsed: boolean) => void
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle, mobileMenuOpen = false, sidebarCollapsed = false, onSidebarToggle }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleMenuToggle = () => {
    onMobileMenuToggle?.(!mobileMenuOpen)
  }

  return (
    <header className="sticky top-0 z-50 h-14 bg-white/95 backdrop-blur-lg border-b border-secondary-200 shadow-lg">
      <div className="h-full px-3 lg:px-6 py-0 flex items-center gap-2 lg:gap-4">
          {/* Toggle Sidebar Button - Hidden on mobile, visible on desktop */}
          <button 
            onClick={() => onSidebarToggle?.(!sidebarCollapsed)}
            className="hidden sm:flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700 hover:text-gray-900 flex-shrink-0"
            title={sidebarCollapsed ? 'Développer' : 'Replier'}
          >
            <CustomHamburger />
          </button>

          {/* Title - Responsive */}
          <div className="flex-shrink-0 flex items-center gap-1 lg:gap-3 min-w-0">
            <div className="flex flex-col items-start gap-0.5 lg:gap-1">
              <h1 className="text-[10px] sm:text-xs md:text-sm lg:text-xl xl:text-2xl font-bold text-gray-800 tracking-tight lg:tracking-wide truncate leading-tight">
                GESTION<br className="sm:hidden" /> DOCUMENTAIRE
              </h1>
              <div className="h-0.5 lg:h-1 w-12 sm:w-16 md:w-20 lg:w-32 bg-gradient-to-r from-blue-500 via-orange-400 to-red-500 rounded-full"></div>
            </div>
            <div className="hidden sm:flex items-center gap-0.5 lg:gap-2 flex-shrink-0">
              <div className="w-1.5 lg:w-3 h-1.5 lg:h-3 rounded-full bg-blue-500 shadow-md"></div>
              <div className="w-1.5 lg:w-3 h-1.5 lg:h-3 rounded-full bg-orange-400 shadow-md"></div>
              <div className="w-1.5 lg:w-3 h-1.5 lg:h-3 rounded-full bg-red-500 shadow-md"></div>
            </div>
          </div>

          {/* Mobile Menu Toggle & Notification */}
          <div className="flex lg:hidden items-center gap-1 ml-auto flex-shrink-0">
            <NotificationBadge onClick={() => navigate('/notifications')} />
            
            <button
              onClick={handleMenuToggle}
              className="p-2 hover:bg-primary-50 rounded-lg transition duration-200 text-secondary-700 hover:text-primary-600 flex-shrink-0"
              title={mobileMenuOpen ? 'Fermer menu' : 'Ouvrir menu'}
            >
              {mobileMenuOpen ? (
                <X size={20} />
              ) : (
                <Menu size={20} />
              )}
            </button>
          </div>

          {/* Right Section - User Menu (Desktop Only) */}
          <div className="hidden lg:flex items-center gap-3 ml-auto flex-shrink-0">
            <NotificationBadge onClick={() => navigate('/notifications')} />
            
            <button
              onClick={() => navigate('/guide')}
              className="p-2 hover:bg-blue-50 rounded-lg transition duration-200 text-secondary-700 hover:text-blue-600 transform hover:scale-110"
              title="Guide Complet SGDRA"
            >
              <BookOpen size={18} />
            </button>
            
            <button
              className="p-2 hover:bg-primary-50 rounded-lg transition duration-200 text-secondary-700 hover:text-primary-600 transform hover:scale-110"
              title="Settings"
            >
              <Settings size={18} />
            </button>
            
            <div className="h-5 w-px bg-secondary-300"></div>
            
            <span className="text-xs text-secondary-700 whitespace-nowrap font-bold">
              {user?.first_name}
            </span>

            <button
              onClick={handleLogout}
              className="p-2 hover:bg-error-50 rounded-lg transition duration-200 text-secondary-700 hover:text-error-600 transform hover:scale-110"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
      </div>
    </header>
  )
}
