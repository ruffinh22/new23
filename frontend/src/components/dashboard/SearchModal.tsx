import React, { useState, useEffect } from 'react'
import { Search, X, FileText, Clock, User } from 'lucide-react'
import { apiClient } from '@/services/api'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  id: number
  name: string
  reference: string
  status: string
  created_at: string
  agent_username?: string
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    const searchDocuments = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.get('/documents/', {
          params: { search: searchQuery }
        })
        const data = Array.isArray(response.data) ? response.data : response.data?.results || []
        setResults(data.slice(0, 10)) // Limit to 10 results
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const timer = setTimeout(searchDocuments, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Search size={24} className="text-white" />
              <h2 className="text-xl font-bold text-white">Recherche Avancée</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Cherchez par référence, nom, agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin">
                  <div className="h-8 w-8 border-4 border-blue-300 border-t-blue-500 rounded-full"></div>
                </div>
                <p className="mt-2 text-gray-600">Recherche en cours...</p>
              </div>
            )}

            {!isLoading && searchQuery && results.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <FileText size={40} className="mx-auto mb-3 opacity-50" />
                <p>Aucun document trouvé pour "{searchQuery}"</p>
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <div className="divide-y divide-gray-200">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <FileText size={18} className="mt-1 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{result.name}</h3>
                        <p className="text-sm text-gray-600">Ref: {result.reference}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="inline-block px-2 py-1 bg-gray-100 rounded">
                            {result.status}
                          </span>
                          {result.agent_username && (
                            <div className="flex items-center gap-1">
                              <User size={14} />
                              {result.agent_username}
                            </div>
                          )}
                          {result.created_at && (
                            <div className="flex items-center gap-1">
                              <Clock size={14} />
                              {new Date(result.created_at).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && !searchQuery && (
              <div className="p-8 text-center text-gray-500">
                <Search size={40} className="mx-auto mb-3 opacity-50" />
                <p>Commencez à taper pour rechercher des documents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
