/**
 * Quick Upload Zone Component
 * Professional drag-and-drop zone for quick document uploads
 */

import React, { useState, useRef } from 'react'
import { Upload, X, CheckCircle } from 'lucide-react'
import { apiClient } from '@/services/api'
import { useNavigate } from 'react-router-dom'

interface QuickUploadZoneProps {
  onUploadSuccess?: (document: any) => void
  onUploadError?: (error: string) => void
}

export const QuickUploadZone: React.FC<QuickUploadZoneProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelection(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleFileSelection = (file: File) => {
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('Le fichier est trop volumineux. Maximum 50MB.')
      return
    }

    setUploadedFile(file)
    setUploadSuccess(false)
    setError('')
  }

  const handleUpload = async () => {
    if (!uploadedFile) {
      setError('Veuillez sélectionner un fichier')
      return
    }

    setIsUploading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)
      formData.append('title', uploadedFile.name.replace(/\.[^.]+$/, ''))
      formData.append('document_type', 'DONNEES_AGENTS')
      formData.append('description', 'Upload rapide depuis le dashboard')

      const response = await apiClient.post('/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setUploadSuccess(true)
      onUploadSuccess?.(response.data)

      // Redirect to documents page after success
      setTimeout(() => {
        navigate('/documents')
      }, 1500)
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || 'Erreur lors de l\'upload du fichier'
      setError(errorMessage)
      setUploadSuccess(false)
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleClear = () => {
    setUploadedFile(null)
    setUploadSuccess(false)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8 mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Rapide</h2>
        <p className="text-sm text-gray-600">Déposez un document ou cliquez pour sélectionner</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={!isUploading ? handleClick : undefined}
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200 ${
          !isUploading ? 'cursor-pointer' : ''
        } ${
          isDragging
            ? 'border-primary-500 bg-primary-50 scale-105'
            : uploadSuccess
            ? 'border-green-300 bg-green-50'
            : uploadedFile
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xlsx,.xls"
          disabled={isUploading}
        />

        {!uploadedFile && !uploadSuccess && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-50 rounded-lg flex items-center justify-center">
                <Upload size={32} className="text-primary-600" />
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Déposez votre document ici</p>
            <p className="text-sm text-gray-600 mb-4">ou cliquez pour parcourir</p>
            <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX • Max 50MB</p>
          </>
        )}

        {uploadedFile && !uploadSuccess && (
          <>
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${isUploading ? 'bg-blue-100 animate-pulse' : 'bg-blue-100'}`}>
                <Upload size={32} className="text-blue-600" />
              </div>
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-2">
              {isUploading ? 'Upload en cours...' : 'Prêt à uploader'}
            </p>
            <p className="text-sm text-gray-600 mb-4 truncate">{uploadedFile.name}</p>
            {isUploading && (
              <div className="max-w-xs mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}
          </>
        )}

        {uploadSuccess && uploadedFile && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center animate-bounce">
                <CheckCircle size={32} className="text-green-600" />
              </div>
            </div>
            <p className="text-lg font-semibold text-green-700 mb-2">Upload réussi!</p>
            <p className="text-sm text-gray-600">Redirection vers les documents...</p>
          </>
        )}
      </div>

      {uploadedFile && !uploadSuccess && (
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleUpload()
            }}
            disabled={isUploading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin">⏳</div>
                Upload en cours...
              </>
            ) : (
              <>
                <Upload size={16} />
                Uploader
              </>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            disabled={isUploading}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <X size={16} />
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
