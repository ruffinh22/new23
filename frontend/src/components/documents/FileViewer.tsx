import React, { useState, useEffect } from 'react'
import { X, Download, Loader, AlertCircle } from 'lucide-react'
import { apiClient } from '@/services/api'

interface FileViewerProps {
  documentId?: string | number
  filePath?: string
  fileName: string
  fileFormat?: string
  onClose: () => void
}

interface FileContent {
  type: 'text' | 'pdf' | 'csv' | 'excel' | 'docx'
  data: any
  sheetNames?: string[]
}

// Helper function to get file extension
const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

// Load text files
const loadTextContent = async (response: Response): Promise<FileContent> => {
  const text = await response.text()
  return {
    type: 'text',
    data: text
  }
}

// Load CSV files
const loadCSVContent = async (response: Response): Promise<FileContent> => {
  const text = await response.text()
  const lines = text.split('\n').filter(line => line.trim())
  const data = lines.map(line => 
    line.split(',').map(cell => cell.trim())
  )
  return {
    type: 'csv',
    data: data
  }
}

// Load Excel files
const loadExcelContent = async (response: Response): Promise<FileContent> => {
  try {
    const { read, utils } = await import('xlsx')
    const arrayBuffer = await response.arrayBuffer()
    const workbook = read(arrayBuffer)
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = utils.sheet_to_json(firstSheet, { header: 1 })
    
    return {
      type: 'excel',
      data: data,
      sheetNames: workbook.SheetNames
    }
  } catch (err) {
    throw new Error('Erreur lors de la lecture du fichier Excel')
  }
}

// Load PDF files
const loadPDFContent = async (response: Response): Promise<FileContent> => {
  try {
    const arrayBuffer = await response.arrayBuffer()
    
    // Store the blob URL for displaying in iframe
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blob)
    
    return {
      type: 'pdf',
      data: blobUrl  // Store the object URL for iframe rendering
    }
  } catch (err) {
    throw new Error('Erreur lors de la lecture du fichier PDF')
  }
}

// Load DOCX files
const loadDOCXContent = async (response: Response): Promise<FileContent> => {
  try {
    const mammoth = await import('mammoth')
    const arrayBuffer = await response.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    
    return {
      type: 'docx',
      data: result.value
    }
  } catch (err) {
    throw new Error('Erreur lors de la lecture du fichier DOCX')
  }
}

export const FileViewer: React.FC<FileViewerProps> = ({ documentId, filePath, fileName, fileFormat, onClose }) => {
  const [content, setContent] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Determine file extension from fileFormat first, then from fileName
  const fileExtension = fileFormat ? fileFormat.toLowerCase().replace(/^\./, '') : getFileExtension(fileName)

  useEffect(() => {
    loadFile()
  }, [documentId, filePath, fileExtension])

  const loadFile = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('🔍 FileViewer: Tentative de chargement du fichier')
      console.log('📝 Extension:', fileExtension)
      
      let response
      
      // Si on a un document ID, utiliser l'endpoint de téléchargement par ID
      if (documentId) {
        console.log('📋 Document ID:', documentId)
        response = await apiClient.get(`/documents/${documentId}/download/`, {
          responseType: 'blob'
        })
      } else if (filePath) {
        // Fallback au chemin si fourni
        console.log('📁 Chemin reçu:', filePath)
        response = await apiClient.get(`/documents/view/?path=${encodeURIComponent(filePath)}`, {
          responseType: 'blob'
        })
      } else {
        throw new Error('Document ID ou chemin requis')
      }
      
      console.log('✅ Fichier chargé avec succès')
      
      // Créer un Response objet à partir du blob
      const blobResponse = new Response(response.data)

      // Traiter selon le format du fichier
      let loadedContent: FileContent
      if (['xlsx', 'xls'].includes(fileExtension)) {
        loadedContent = await loadExcelContent(blobResponse)
      } else if (fileExtension === 'csv') {
        loadedContent = await loadCSVContent(blobResponse)
      } else if (fileExtension === 'txt') {
        loadedContent = await loadTextContent(blobResponse)
      } else if (fileExtension === 'pdf') {
        loadedContent = await loadPDFContent(blobResponse)
      } else if (['docx', 'doc'].includes(fileExtension)) {
        loadedContent = await loadDOCXContent(blobResponse)
      } else {
        throw new Error(`Format .${fileExtension} non supporté. Formats supportés: Excel, PDF, DOCX, TXT, CSV`)
      }
      
      setContent(loadedContent)
    } catch (err) {
      console.error('❌ Erreur FileViewer:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du fichier')
    } finally {
      setLoading(false)
    }
  }

  const renderTextContent = () => (
    <div className="prose prose-sm max-w-none h-full">
      <pre className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg overflow-auto h-full text-xs font-mono border border-slate-200 shadow-sm">
        {content?.data}
      </pre>
    </div>
  )

  const renderPDFContent = () => (
    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-200">
      <iframe
        src={content?.data}
        className="w-full h-full bg-gradient-to-br from-slate-50 to-white"
        title="PDF Viewer"
      />
    </div>
  )

  const renderTableContent = () => (
    <div className="overflow-x-auto rounded border border-slate-200 shadow-sm">
      <table className="w-full border-collapse text-xs">
        <tbody>
          {content?.data.slice(0, 100).map((row: any[], idx: number) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white hover:bg-red-50/20 transition-colors' : 'bg-slate-50 hover:bg-red-50/30 transition-colors'}>
              {row.map((cell: any, cellIdx: number) => (
                <td
                  key={cellIdx}
                  className="border border-slate-200 px-2 py-1.5 text-slate-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {content?.data.length > 100 && (
        <div className="mt-2 p-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded text-xs text-amber-800 font-medium">
          ℹ️ Affichage des 100 premières lignes
        </div>
      )}
    </div>
  )

  const renderDocxContent = () => (
    <div className="prose prose-xs max-w-none bg-white p-3 rounded border border-slate-200 overflow-auto">
      <div dangerouslySetInnerHTML={{ __html: content?.data }} />
    </div>
  )

  const renderContent = () => {
    if (!content) return null

    switch (content.type) {
      case 'text':
        return renderTextContent()

      case 'pdf':
        return renderPDFContent()

      case 'csv':
      case 'excel':
        return renderTableContent()

      case 'docx':
        return renderDocxContent()

      default:
        return null
    }
  }

  const handleDownload = async () => {
    try {
      let endpoint
      if (documentId) {
        console.log('📥 Téléchargement par ID:', documentId)
        endpoint = `/documents/${documentId}/download/`
      } else if (filePath) {
        console.log('📥 Téléchargement par chemin:', filePath)
        endpoint = `/documents/download/?path=${encodeURIComponent(filePath)}`
      } else {
        throw new Error('Document ID ou chemin requis')
      }
      
      const response = await apiClient.get(endpoint, {
        responseType: 'blob'
      })
      
      console.log('✅ Téléchargement réussi')
      const blob = response.data
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
    } catch (err: any) {
      console.error('❌ Erreur téléchargement:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      })
      alert(`Erreur lors du téléchargement: ${err.response?.statusText || err.message}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[95vh] flex flex-col border border-slate-200">
        {/* Header - Compact */}
        <div className="flex items-center justify-between p-2.5 sm:p-3 bg-gradient-to-r from-red-600 to-red-700 rounded-t-xl gap-2 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white truncate">{fileName}</h2>
            <p className="text-red-100 text-xs sm:text-xs mt-0.5 flex items-center gap-1">
              <span className="inline-block bg-red-500 rounded-full px-1.5 py-0.5 text-xs font-semibold">{fileExtension.toUpperCase()}</span>
            </p>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handleDownload}
              className="p-1.5 hover:bg-red-500 bg-red-500/40 text-white rounded-lg transition-all duration-200 hover:scale-105"
              title="Télécharger"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-500 bg-red-500/40 text-white rounded-lg transition-all duration-200 hover:scale-105"
              title="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Area - Full Height */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-gradient-to-br from-slate-50 via-white to-slate-50 min-h-0">
          {loading && (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="relative w-12 h-12 mx-auto mb-3">
                  <Loader className="animate-spin text-red-600 absolute inset-0" size={32} />
                </div>
                <p className="text-slate-700 font-medium">Chargement...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3 shadow-sm">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-bold text-red-900 text-sm">Erreur de chargement</p>
                <p className="text-red-700 text-xs mt-1 mb-3">{error}</p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded text-sm hover:from-red-700 hover:to-red-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                >
                  <Download size={14} />
                  Télécharger
                </button>
              </div>
            </div>
          )}

          {!loading && !error && content && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 h-full overflow-auto">
              {renderContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
