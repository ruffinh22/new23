import React, { useState } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
// ToastContainer removed - notifications come from NotificationContext via dropdown only

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-gray-200 flex flex-col">
      <Header mobileMenuOpen={mobileMenuOpen} onMobileMenuToggle={setMobileMenuOpen} sidebarCollapsed={sidebarCollapsed} onSidebarToggle={setSidebarCollapsed} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          mobileMenuOpen={mobileMenuOpen}   
          onMobileMenuToggle={setMobileMenuOpen}
          isCollapsed={sidebarCollapsed}
          onCollapseChange={setSidebarCollapsed}
        />
        <main className={`flex-1 overflow-auto pl-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-56'
        }`}>
          <div className="w-full max-w-7xl mx-auto p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Toast Notifications Disabled - All notifications show in dropdown only */}
    </div>
  )
}
