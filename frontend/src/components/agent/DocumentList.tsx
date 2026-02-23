import React from 'react'
import { Eye, Download, Trash2, Share } from 'lucide-react'
import { Document, Folder } from '@/types/document'
import { Button } from '@/components/common'

interface DocumentListProps {
  documents: Document[]
  onView: (doc: Document) => void
  onDelete: (id: string) => void
  onReroute?: (doc: Document, folder: Folder) => void
  currentFolder?: Folder
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onView,
  onDelete,
  onReroute,
  currentFolder,
}) => {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Uploaded
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No documents found
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {doc.title}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {doc.file_format}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        doc.status === 'VALIDE'
                          ? 'bg-green-100 text-green-800'
                          : doc.status === 'REJETE'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(doc)}
                      title="View"
                    >
                      <Eye size={16} />
                    </Button>
                    <a href={doc.file} download>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Download"
                      >
                        <Download size={16} />
                      </Button>
                    </a>
                    {onReroute && currentFolder && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onReroute(doc, currentFolder)}
                        title="Re-route"
                      >
                        <Share size={16} className="text-blue-600" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(doc.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
