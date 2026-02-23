import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Trash2, Share } from 'lucide-react'
import { Layout, Button } from '@/components/common'
import { Document, User, Folder } from '@/types/document'
import { DocumentRerouteModal, DocumentTransferHistory, RerouteAccessIndicator } from '@/components/documents'
import { statusService } from '@/services/statusService'
import { useAuth } from '@/contexts/AuthContext'

// Mock user for agent
const mockUser: User = {
  id: '1',
  matricule: 'MAT001',
  email: 'john@example.com',
  first_name: 'John',
  last_name: 'Doe',
  department: 'TECHNIQUE',
  role: 'AGENT',
  phone: '+212 6xx',
  avatar: '',
  is_active: true,
  is_staff: false,
  date_joined: '2024-01-15',
  last_login: '2026-01-22',
}

// Mock document with agent as User object
const mockDocument: Document = {
  id: '1',
  title: 'Rapport Q1 2026',
  file: '/documents/rapport-q1.pdf',
  document_type: 'RAPPORT',
  description: 'Rapport trimestriel de performance',
  agent: mockUser,
  folder_id: '1',
  specification_id: '1',
  status: 'EN_COURS',
  created_at: '2026-01-20',
  opened_at: '2026-01-21',
  accepted_at: null,
  rejected_at: null,
  archived_at: null,
  rejection_reason: '',
  file_size: 2048576,
  mime_type: 'application/pdf',
  file_format: 'pdf',
  excel_sheet_name: '',
  excel_row_count: 0,
  excel_column_count: 0,
  routed_automatically: false,
  routing_rule_applied_id: undefined,
  updated_at: '2026-01-21',
}

// Utiliser statusService.getStatusClasses() au lieu de cette constante en dur
// const statusColors = ... (supprimée - remplacée par statusService)

// Helper to get agent name
const getAgentName = (agent?: (User | string) | null): string => {
  if (!agent) return 'Unknown'
  if (typeof agent === 'string') return agent
  return `${agent.first_name} ${agent.last_name}`
}

// Helper to convert Date to string if needed
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR')
}

export const DocumentDetail: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [document] = useState<Document>(mockDocument)
  const [isRerouteModalOpen, setIsRerouteModalOpen] = useState(false)
  const [showTransferHistory, setShowTransferHistory] = useState(false)

  // Mock folder for document - in real use, this would come from the document's folder_id
  const mockFolder: Folder = {
    id: '1',
    name: 'Bénin / Commercial',
    description: 'Dossier commercial de Bénin',
    created_at: new Date(),
    updated_at: new Date(),
    is_active: true,
  }

  const handleDownload = () => {
    // TODO: Implement download
    window.open(document.file, '_blank')
  }

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document?')) {
      // TODO: Implement delete
      navigate('/documents')
    }
  }

  const handleRerouteSuccess = () => {
    setIsRerouteModalOpen(false)
    // Show success message and refresh document
    alert('Document re-routé avec succès!')
  }

  const color = statusService.getStatusClasses(document.status)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
        </div>

        {/* Document Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          {/* Title & Status */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{document.title}</h1>
              <p className="text-gray-600">{document.description}</p>
            </div>
            <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${color.bg} ${color.text} font-medium text-sm`}>
              {document.status}
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de document</label>
              <p className="text-gray-900">{document.document_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent soumetteur</label>
              <p className="text-gray-900">{getAgentName(document.agent)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taille du fichier</label>
              <p className="text-gray-900">{(document.file_size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <p className="text-gray-900">{document.file_format.toUpperCase()}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique du workflow</h3>
            <div className="space-y-4">
              {/* Created */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <div className="w-0.5 h-12 bg-gray-300 mt-1"></div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Document créé</p>
                  <p className="text-sm text-gray-600">{formatDate(document.created_at)}</p>
                </div>
              </div>

              {/* Opened */}
              {document.opened_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                    <div className="w-0.5 h-12 bg-gray-300 mt-1"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">En cours de révision</p>
                    <p className="text-sm text-gray-600">{formatDate(document.opened_at)}</p>
                  </div>
                </div>
              )}

              {/* Accepted */}
              {document.accepted_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    <div className="w-0.5 h-12 bg-gray-300 mt-1"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Validé</p>
                    <p className="text-sm text-gray-600">{formatDate(document.accepted_at)}</p>
                  </div>
                </div>
              )}

              {/* Rejected */}
              {document.rejected_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                    <div className="w-0.5 h-12 bg-gray-300 mt-1"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Rejeté</p>
                    <p className="text-sm text-gray-600">{formatDate(document.rejected_at)}</p>
                    {document.rejection_reason && (
                      <p className="text-sm text-red-600 mt-1">Raison: {document.rejection_reason}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Archived */}
              {document.archived_at && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Archivé</p>
                    <p className="text-sm text-gray-600">{formatDate(document.archived_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="primary" onClick={handleDownload} className="flex items-center gap-2">
              <Download size={18} />
              Télécharger
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => setIsRerouteModalOpen(true)} 
              className="flex items-center gap-2"
            >
              <Share size={18} />
              Re-router
            </Button>
            <Button variant="danger" onClick={handleDelete} className="flex items-center gap-2">
              <Trash2 size={18} />
              Supprimer
            </Button>
          </div>
        </div>

        {/* Access Indicator */}
        {user && (
          <div className="mb-8">
            <RerouteAccessIndicator user={user} folder={mockFolder} />
          </div>
        )}

        {/* Transfer History */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Historique des transferts</h2>
            <button
              onClick={() => setShowTransferHistory(!showTransferHistory)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showTransferHistory ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          {showTransferHistory && (
            <DocumentTransferHistory documentId={document.id} />
          )}
        </div>

        {/* Re-routing Modal */}
        {user && (
          <DocumentRerouteModal
            document={document}
            currentFolder={mockFolder}
            isOpen={isRerouteModalOpen}
            onClose={() => setIsRerouteModalOpen(false)}
            onSuccess={handleRerouteSuccess}
          />
        )}
      </div>
    </Layout>
  )
}
