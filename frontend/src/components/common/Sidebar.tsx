import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Users, 
  Settings,
  BarChart3, 
  Home, 
  FolderOpen, 
  Bell, 
  Zap, 
  Shield, 
  LogOut, 
  User, 
  ChevronDown,
  Sparkles,
  Building,
  Lock
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import logoSgdra from '@/assets/logos/MediaContact_Logo.svg'
import iconSgdra from '@/assets/logos/MediaContact_Icon.svg'

interface NavItem {
  label: string
  path?: string
  icon?: React.ReactNode
  roles: string[]
  badge?: string
  isSection?: boolean
  sectionLabel?: string
}

interface SidebarProps {
  mobileMenuOpen?: boolean
  onMobileMenuToggle?: (open: boolean) => void
  isCollapsed?: boolean
  onCollapseChange?: (collapsed: boolean) => void
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <Home size={20} />,
    roles: ['AGENT', 'ADMIN'],
    sectionLabel: 'Principal'
  },
  {
    label: 'Documents',
    path: '/documents',
    icon: <FileText size={20} />,
    roles: ['AGENT'],
  },
  {
    label: 'Documents',
    path: '/admin/documents',
    icon: <FileText size={20} />,
    roles: ['ADMIN'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <BarChart3 size={20} />,
    roles: ['AGENT', 'ADMIN'],
  },
  {
    label: 'Schedule',
    path: '/schedule',
    icon: <Bell size={20} />,
    roles: ['AGENT', 'ADMIN'],
  },
  {
    label: 'Templates',
    path: '/templates',
    icon: <FileText size={20} />,
    roles: ['AGENT', 'ADMIN'],
  },
  {
    label: 'Guide Complet SGDRA',
    path: '/guide',
    icon: <Sparkles size={20} />,
    roles: ['AGENT', 'ADMIN'],
  },
  {
    label: 'Users',
    path: '/users',
    icon: <Users size={20} />,
    roles: ['ADMIN'],
    sectionLabel: 'Administration'
  },
  {
    label: 'Departments',
    path: '/departments',
    icon: <Building size={20} />,
    roles: ['ADMIN'],
  },
  {
    label: 'Folders',
    path: '/folders',
    icon: <FolderOpen size={20} />,
    roles: ['ADMIN'],
  },
  {
    label: 'Modèles',
    path: '/template-management',
    icon: <FileText size={20} />,
    roles: ['ADMIN'],
  },
  {
    label: 'Types de Documents',
    path: '/document-types',
    icon: <FileText size={20} />,
    roles: ['ADMIN'],
  },
  {
    label: 'File Type Config',
    path: '/file-type-configuration',
    icon: <Shield size={20} />,
    roles: ['ADMIN'],
  },
  {
    label: 'Routing Rules',
    path: '/routing-rules',
    icon: <Zap size={20} />,
    roles: ['ADMIN'],
  },
  {
    label: 'Audit Logs',
    path: '/audit-logs',
    icon: <Lock size={20} />,
    roles: ['ADMIN'],
  },
 ]

export const Sidebar: React.FC<SidebarProps> = ({ 
  mobileMenuOpen = false,
  onCollapseChange,
  isCollapsed: collapsedProp = false,
  onMobileMenuToggle
}) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(collapsedProp)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Synchroniser avec mobileMenuOpen du Layout
  useEffect(() => {
    setIsOpen(mobileMenuOpen || window.innerWidth >= 1024)
  }, [mobileMenuOpen])

  // Synchroniser avec le collapse du Header
  useEffect(() => {
    setIsCollapsed(collapsedProp)
  }, [collapsedProp])

  // Notifier le Layout quand le collapse change
  useEffect(() => {
    onCollapseChange?.(isCollapsed)
  }, [isCollapsed, onCollapseChange])

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user?.role || '')
  )

  // Grouper les items par section
  const groupedItems: { section?: string; items: NavItem[] }[] = []
  let currentSection: { section?: string; items: NavItem[] } = { items: [] }

  visibleItems.forEach((item) => {
    if (item.sectionLabel && currentSection.items.length > 0) {
      groupedItems.push(currentSection)
      currentSection = { section: item.sectionLabel, items: [item] }
    } else {
      currentSection.items.push(item)
    }
  })
  
  if (currentSection.items.length > 0) {
    groupedItems.push(currentSection)
  }

  const handleMobileClose = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(false)
      onMobileMenuToggle?.(false)
    }
  }

  return (
    <>
      {/* Sidebar avec design ultra-moderne */}
      <aside
        className={`
          fixed left-0 top-0 h-screen pt-16 
          bg-gradient-to-br from-primary-600 via-primary-600 to-primary-700
          transition-all duration-300 ease-out
          lg:translate-x-0 z-30 overflow-hidden flex flex-col
          border-r border-primary-500/50
          shadow-[4px_0_24px_rgba(227,6,19,0.15)]
          ${isOpen || mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Header Section - Logo */}
        <div className={`
          flex items-center justify-center px-4 py-4 
          border-b border-primary-500/30
          bg-primary-700/30 backdrop-blur-xl
        `}>
          {/* Logo avec effet premium */}
          <Link 
            to="/" 
            className="flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="relative group">
              {/* Glow effect au hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-accent-500/30 to-white/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Logo container */}
              <div className="relative bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-all duration-300 border border-white/80 ring-1 ring-white/50">
                <img 
                  src={isCollapsed ? iconSgdra : logoSgdra} 
                  alt="MEDIA CONTACT" 
                  className={`transition-all duration-300 ${isCollapsed ? 'h-7 w-auto' : 'h-11 w-auto'}`} 
                />
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation avec sections organisées */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary-400/50 scrollbar-track-transparent hover:scrollbar-thumb-primary-400/70 scrollbar-thumb-rounded-full">
          {groupedItems.map((group, groupIdx) => (
            <div key={groupIdx} className={`${groupIdx > 0 ? 'mt-6 pt-2' : ''}`}>
              {/* Section Label avec effet premium */}
              {group.section && !isCollapsed && (
                <div className="px-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-white/95 flex-shrink-0 animate-pulse-subtle" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white drop-shadow-sm">
                      {group.section}
                    </h3>
                  </div>
                  {/* Trait évolutif bleu → orange → rouge */}
                  <div className="mt-2 h-1.5 bg-gradient-to-r from-blue-400 via-orange-400 to-red-400 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                </div>
              )}

              {/* Navigation Items avec micro-interactions */}
              {group.items.map((item) => {
                const isActive = item.path && location.pathname === item.path
                const isHovered = hoveredItem === item.path

                return (
                  <Link
                    key={item.path}
                    to={item.path || '#'}
                    onClick={handleMobileClose}
                    onMouseEnter={() => setHoveredItem(item.path || null)}
                    onMouseLeave={() => setHoveredItem(null)}
                    title={isCollapsed ? item.label : ''}
                    className={`
                      group relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl 
                      transition-all duration-200 ease-out
                      ${isCollapsed ? 'justify-center px-0' : 'justify-start'}
                      ${isActive 
                        ? 'bg-white text-primary-700 font-semibold shadow-lg ring-1 ring-white/80' 
                        : 'text-white/90 hover:bg-white/45 hover:text-white'
                      }
                      ${isHovered && !isActive ? 'scale-[1.02]' : 'scale-100'}
                    `}
                  >
                    {/* Active Indicator - Barre verticale gauche */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-accent-500 via-accent-600 to-primary-600 rounded-r-full shadow-[0_0_12px_rgba(14,165,233,0.5)]" />
                    )}

                    {/* Icon avec animation */}
                    <div className={`
                      flex-shrink-0 transition-all duration-200
                      ${isActive 
                        ? 'text-primary-600' 
                        : 'text-white/80 group-hover:text-white'
                      }
                      ${isHovered && !isActive ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}
                    `}>
                      {item.icon}
                    </div>

                    {/* Label */}
                    {!isCollapsed && (
                      <span className={`
                        flex-1 text-sm font-semibold truncate transition-all duration-200 drop-shadow-sm
                        ${isActive 
                          ? 'text-primary-700' 
                          : 'text-white group-hover:text-white/95'
                        }
                      `}>
                        {item.label}
                      </span>
                    )}

                    {/* Badge avec dégradé premium */}
                    {item.badge && !isCollapsed && (
                      <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-bold bg-gradient-to-r from-accent-500 to-accent-600 text-white rounded-full shadow-lg animate-pulse-subtle">
                        {item.badge}
                      </span>
                    )}

                    {/* Hover background subtil */}
                    {!isActive && isHovered && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 rounded-xl -z-10 animate-fade-in" />
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Section - Design premium sur fond rouge */}
        <div className="relative border-t border-primary-500/50 bg-primary-600/50 backdrop-blur-xl">
          <div className="p-3">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl 
                transition-all duration-300 group
                border border-white/30
                shadow-lg hover:shadow-xl hover:scale-[1.02]
                ${isCollapsed ? 'justify-center px-2' : 'justify-between'}
                ${isUserMenuOpen 
                  ? 'bg-gray-200 hover:bg-gray-300 border-gray-400' 
                  : 'bg-white/15 backdrop-blur-sm hover:bg-white/30 hover:border-white/40'
                }
              `}
            >
              {/* Avatar avec effets premium */}
              <div className="relative flex-shrink-0">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white to-accent-400 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                
                {/* Avatar */}
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-white via-gray-100 to-accent-100 flex items-center justify-center text-primary-700 font-bold text-sm shadow-lg ring-2 ring-white/50 group-hover:scale-110 group-hover:ring-white/80 transform transition-all duration-300">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              </div>

              {/* User Info */}
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className={`text-sm font-bold truncate drop-shadow-sm transition-colors ${isUserMenuOpen ? 'text-gray-700' : 'text-white'}`}>
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className={`text-xs truncate font-medium transition-colors ${isUserMenuOpen ? 'text-gray-600' : 'text-white/80'}`}>
                    {user?.role}
                  </p>
                </div>
              )}

              {/* Chevron avec rotation */}
              {!isCollapsed && (
                <ChevronDown 
                  size={16} 
                  className={`
                    flex-shrink-0 
                    transition-all duration-300
                    ${isUserMenuOpen 
                      ? 'text-gray-700 rotate-180' 
                      : 'text-white/80 group-hover:text-white rotate-0'
                    }
                  `} 
                />
              )}
            </button>

            {/* Dropdown Menu Ultra-Premium */}
            {isUserMenuOpen && (
              <div 
                className={`
                  absolute bottom-full mb-2 
                  bg-gray-200 backdrop-blur-xl rounded-xl 
                  shadow-[0_20px_50px_rgba(0,0,0,0.2)]
                  border border-gray-300
                  overflow-hidden z-50
                  ring-1 ring-gray-400/50
                  animate-slide-up
                  ${isCollapsed ? 'left-2 right-2' : 'left-3 right-3'}
                `}
              >
                <div className="p-1.5">
                  {/* Profile Button */}
                  <button
                    onClick={() => {
                      navigate('/profile')
                      setIsUserMenuOpen(false)
                      handleMobileClose()
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      text-red-600 font-semibold
                      hover:bg-gray-300
                      hover:text-red-700 hover:shadow-md
                      transition-all duration-200 text-sm group
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <User size={16} className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                    {!isCollapsed && 'Mon Profil'}
                  </button>

                  {/* Settings Button */}
                  <button
                    onClick={() => {
                      navigate('/settings')
                      setIsUserMenuOpen(false)
                      handleMobileClose()
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      text-red-600 font-semibold
                      hover:bg-gray-300
                      hover:text-red-700 hover:shadow-md
                      transition-all duration-200 text-sm group
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Settings size={16} className="flex-shrink-0 group-hover:rotate-90 transition-transform duration-300" />
                    {!isCollapsed && 'Paramètres'}
                  </button>

                  {/* Divider premium */}
                  <div className="my-1.5 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent" />

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      logout()
                      setIsUserMenuOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      text-red-600 font-semibold
                      hover:bg-gray-300
                      hover:text-red-700 hover:shadow-md
                      transition-all duration-200 text-sm group
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <LogOut size={16} className="flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200" />
                    {!isCollapsed && 'Déconnexion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay avec effet premium */}
      {(isOpen || mobileMenuOpen) && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-sm z-20 lg:hidden transition-all duration-300 animate-fade-in"
          onClick={handleMobileClose}
        />
      )}
    </>
  )
}