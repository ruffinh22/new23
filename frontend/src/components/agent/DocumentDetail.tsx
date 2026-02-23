import React from 'react'
import { Document, WorkflowStep } from '@/types/document'

interface DocumentDetailProps {
  document: Document
  workflow: WorkflowStep[]
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({
  document,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALIDE':
        return 'text-green-600'
      case 'REJETE':
        return 'text-red-600'
      case 'EN_COURS':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Document Info */}
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {document.title}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Document Type</p>
            <p className="text-lg font-medium text-gray-900">
              {document.document_type}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span className={`text-lg font-medium ${getStatusColor(document.status)}`}>
              {document.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-600">File Size</p>
            <p className="text-lg font-medium text-gray-900">
              {(document.file_size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">File Format</p>
            <p className="text-lg font-medium text-gray-900">
              {document.file_format.toUpperCase()}
            </p>
          </div>
        </div>

        {document.description && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">Description</p>
            <p className="text-gray-900">{document.description}</p>
          </div>
        )}
      </div>

      {/* Document Timeline */}
      <div className="card p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Document Timeline</h3>

        <div className="space-y-4">
          {document.created_at && (
            <div className="flex gap-4 pb-4 border-b border-gray-200">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium text-gray-900">Document Created</p>
                <p className="text-sm text-gray-600">
                  {new Date(document.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {document.opened_at && (
            <div className="flex gap-4 pb-4 border-b border-gray-200">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium text-gray-900">Document Opened</p>
                <p className="text-sm text-gray-600">
                  {new Date(document.opened_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {document.accepted_at && (
            <div className="flex gap-4 pb-4 border-b border-gray-200">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium text-gray-900">Document Accepted</p>
                <p className="text-sm text-gray-600">
                  {new Date(document.accepted_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {document.rejected_at && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  ✗
                </div>
              </div>
              <div className="flex-1 pt-1">
                <p className="font-medium text-gray-900">Document Rejected</p>
                <p className="text-sm text-gray-600">
                  {new Date(document.rejected_at).toLocaleString()}
                </p>
                {document.rejection_reason && (
                  <p className="text-sm text-red-600 mt-2">
                    Reason: {document.rejection_reason}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
