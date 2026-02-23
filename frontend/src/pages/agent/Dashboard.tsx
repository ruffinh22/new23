import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/common'
import { UniversalDashboard } from '@/components/dashboard/UniversalDashboard'
import { SearchModal } from '@/components/dashboard/SearchModal'
import { useAuth } from '@/contexts/AuthContext'

export const AgentDashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handleUploadDocument = () => {
    navigate('/documents?action=upload')
  }

  const handleSearch = () => {
    setIsSearchOpen(true)
  }

  const handleViewReports = () => {
    navigate('/reports')
  }

  const handleSettings = () => {
    navigate('/settings')
  }

  const handleTemplates = () => {
    navigate('/templates')
  }

  return (
    <Layout>
      <UniversalDashboard
        userName={user?.first_name || 'Utilisateur'}
        onUploadDocument={handleUploadDocument}
        onSearch={handleSearch}
        onViewReports={handleViewReports}
        onSettings={handleSettings}
        onTemplates={handleTemplates}
      />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </Layout>
  )
}
