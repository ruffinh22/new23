import React, { useState, useEffect } from 'react';
import { DocumentTransfer } from '@/types/document';
import { documentService } from '@/services/documentService';

interface DocumentTransferHistoryProps {
  documentId: string | number;
}

export const DocumentTransferHistory: React.FC<DocumentTransferHistoryProps> = ({
  documentId,
}) => {
  const [transfers, setTransfers] = useState<DocumentTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransferHistory();
  }, [documentId]);

  const loadTransferHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentService.getTransferHistory(String(documentId));
      setTransfers(data.results || []);
    } catch (err) {
      setError('Erreur lors du chargement de l\'historique');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun historique de transfert
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
              Date
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
              De
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
              Vers
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
              Type
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
              Par
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
              Raison
            </th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2 text-sm">
                {new Date(transfer.transferred_at).toLocaleDateString('fr-FR')}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm">
                {transfer.from_folder_name || '—'}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm">
                {transfer.to_folder_name}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm">
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  {transfer.transfer_type_display || transfer.transfer_type}
                </span>
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm">
                {transfer.transferred_by_name || '—'}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm">
                {transfer.reason || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DocumentTransferHistory;
