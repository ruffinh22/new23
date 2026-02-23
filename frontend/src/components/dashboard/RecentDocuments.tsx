/**
 * Recent Documents Component
 * Affiche la liste des documents récents avec un style moderne (inspiré FolderExplorer)
 */

import React from 'react'
import { ArrowRight, FileText, Eye, Download, File, FileJson, FileCode, Image, Music, Video } from 'lucide-react'
import { DocumentStat } from '@/services/dashboardService'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface RecentDocumentsProps {
  documents: DocumentStat[]
  isLoading?: boolean
  userRole?: 'ADMIN' | 'AGENT'
  onView?: (id: string) => void
  onDownload?: (id: string) => void
  onValidate?: (id: string) => void
  onReject?: (id: string) => void
}

// Get file icon based on file format
const getFileIcon = (fileFormat?: string) => {
  const format = fileFormat?.toLowerCase().replace(/^\./, '') || 'txt'
  
  switch(format) {
    // Documents
    case 'pdf': 
      return <FileText size={20} className="text-red-500" />
    case 'doc':
    case 'docx': 
      return <FileText size={20} className="text-blue-500" />
    case 'xls':
    case 'xlsx': 
      return <FileText size={20} className="text-green-500" />
    case 'ppt':
    case 'pptx': 
      return <FileText size={20} className="text-orange-500" />
    case 'csv': 
      return <FileText size={20} className="text-teal-500" />
    case 'txt': 
      return <FileCode size={20} className="text-gray-500" />
    case 'json': 
      return <FileJson size={20} className="text-yellow-600" />
    // Images
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return <Image size={20} className="text-purple-500" />
    // Media
    case 'mp3':
    case 'wav':
    case 'flac':
      return <Music size={20} className="text-pink-500" />
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'mkv':
      return <Video size={20} className="text-indigo-500" />
    // Archives
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <File size={20} className="text-amber-600" />
    // Unknown
    default: 
      return <File size={20} className="text-gray-400" />
  }
}

// Status configuration with colors
const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  'NOUVEAU': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Nouveau' },
  'EN_COURS': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En cours' },
  'VALIDE': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Validé' },
  'APPROUVE': { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approuvé' },
  'REJETE': { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Rejeté' },
  'EN_ATTENTE': { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
  'ARCHIVE': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Archivé' },
}

export const RecentDocuments: React.FC<RecentDocumentsProps> = ({
  documents,
  isLoading = false,
  userRole = 'AGENT',
  onView,
  onDownload,
  onValidate,
  onReject,
}) => {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-elevation-2">
        <div className="bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 px-6 py-5 border-b border-primary-500">
          <h3 className="text-white font-bold text-lg drop-shadow-sm">Documents Récents</h3>
        </div>
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-elevation-2">
        <div className="bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 px-6 py-5 border-b border-primary-500">
          <h3 className="text-white font-bold text-lg drop-shadow-sm">Documents Récents</h3>
        </div>
        <div className="p-12 text-center">
          <p className="text-gray-600 font-medium">Aucun document pour le moment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-elevation-2">
      {/* Header Moderne - Style FolderExplorer */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700 px-6 py-5 border-b border-primary-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={22} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg drop-shadow-sm">Documents Récents</h3>
              <p className="text-white/80 text-sm font-medium">Vos derniers téléchargements</p>
            </div>
          </div>
          <a
            href="/documents"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 hover:bg-white/30 transition-all duration-200 text-white border border-white/20 group"
          >
            Voir tous
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>

      {/* Table View - Moderne */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-gray-200 to-gray-300 border-b-2 border-gray-300">
              <th className="px-4 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300 w-10"></th>
              <th className="px-4 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300 flex-1 min-w-[200px]">Titre</th>
              <th className="px-4 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300 hidden sm:table-cell w-24">Référence</th>
              <th className="px-4 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300 w-28">Statut</th>
              <th className="px-4 py-4 text-left font-bold text-gray-800 text-xs uppercase tracking-wider border-r border-gray-300 hidden md:table-cell w-32">Date</th>
              <th className="px-4 py-4 text-center font-bold text-gray-800 text-xs uppercase tracking-wider w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(Array.isArray(documents) ? documents : []).map((doc, idx) => {
              const config = statusConfig[doc.status] || statusConfig['NOUVEAU']
              return (
                <tr
                  key={doc.id}
                  className={`
                    transition-all duration-200 group
                    ${idx % 2 === 0 ? 'bg-white hover:bg-blue-50/30' : 'bg-gray-50/50 hover:bg-blue-50/40'}
                  `}
                >
                  {/* Icon */}
                  <td className="px-4 py-3.5 border-r border-gray-200 w-10">
                    <span className="transition-transform duration-200 group-hover:scale-110 inline-block">
                      {getFileIcon(doc.file_format)}
                    </span>
                  </td>

                  {/* Title */}
                  <td className="px-4 py-3.5 border-r border-gray-200 flex-1 min-w-[200px]">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors duration-200 truncate block">
                        {doc.title}
                      </span>
                      {doc.department && (
                        <span className="text-xs text-gray-500 font-medium hidden sm:inline-block">
                          {doc.department}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Reference - Hidden on mobile */}
                  <td className="px-4 py-3.5 border-r border-gray-200 hidden sm:table-cell w-24">
                    <code className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono bg-gray-100 text-gray-700 group-hover:bg-gray-200 transition-colors whitespace-nowrap">
                      {doc.reference}
                    </code>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 border-r border-gray-200 w-28">
                    <span className={`
                      inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold
                      ${config.bg} ${config.text}
                      group-hover:shadow-md transition-all duration-200 whitespace-nowrap
                    `}>
                      {config.label}
                    </span>
                  </td>

                  {/* Date - Hidden on small screens */}
                  <td className="px-4 py-3.5 text-gray-700 border-r border-gray-200 hidden md:table-cell w-32">
                    <span className="text-xs font-medium whitespace-nowrap">
                      {formatDistanceToNow(new Date(doc.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-center w-24 relative">
                    <div className="flex items-center justify-center gap-1">
                      {/* Voir button */}
                      <button
                        onClick={() => onView?.(doc.id)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-all duration-200 text-gray-600 hover:text-blue-600" 
                        title="Voir le document"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {/* Télécharger button */}
                      <button
                        onClick={() => onDownload?.(doc.id)}
                        className="p-1.5 hover:bg-green-100 rounded-lg transition-all duration-200 text-gray-600 hover:text-green-600"
                        title="Télécharger"
                      >
                        <Download size={16} />
                      </button>
                      
                      {/* Options menu - Only for ADMIN */}
                      {userRole === 'ADMIN' && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === doc.id ? null : doc.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-900"
                            title="Plus d'options"
                          >
                            <span className="text-base font-bold">+</span>
                          </button>
                          
                          {/* Dropdown Menu */}
                          {openMenuId === doc.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[140px]">
                              <button
                                onClick={() => {
                                  onValidate?.(doc.id)
                                  setOpenMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors first:rounded-t-lg"
                              >
                                ✓ Valider
                              </button>
                              <button
                                onClick={() => {
                                  onReject?.(doc.id)
                                  setOpenMenuId(null)
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors last:rounded-b-lg border-t border-gray-100"
                              >
                                ✗ Rejeter
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
