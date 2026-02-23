import React, { useState, useEffect } from 'react';
import { Document, DocumentTransfer, DocumentTransferRequest, Folder, DocumentTransferType } from '@/types/document';
import { documentService } from '@/services/documentService';
import { folderService } from '@/services/folderService';
import { Modal, Button } from '@/components/common';

interface DocumentRerouteModalProps {
  document: Document;
  currentFolder: Folder;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transfer: DocumentTransfer) => void;
}

const TRANSFER_TYPES: { value: DocumentTransferType; label: string }[] = [
  { value: 'MANUAL_TRANSFER', label: 'Transfer manuel' },
  { value: 'AUTO_ROUTING', label: 'Routage automatique' },
  { value: 'CROSS_POLE', label: 'Transfer entre Pôles' },
  { value: 'CROSS_FILIALE', label: 'Transfer entre Filiales' },
  { value: 'CROSS_SERVICE', label: 'Transfer entre Services' },
  { value: 'COMPLIANCE_MOVE', label: 'Mouvement pour conformité' },
  { value: 'OTHER', label: 'Autre raison' },
];

export const DocumentRerouteModal: React.FC<DocumentRerouteModalProps> = ({
  document,
  currentFolder,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | number>('');
  const [transferType, setTransferType] = useState<DocumentTransferType>('MANUAL_TRANSFER');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const data = await folderService.getFolders();
      // Filtrer les dossiers (ne pas inclure le dossier courant)
      const filtered = data.filter(f => f.id !== currentFolder.id);
      setFolders(filtered);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des dossiers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFolderId) {
      setError('Veuillez sélectionner un dossier de destination');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: DocumentTransferRequest = {
        to_folder_id: selectedFolderId,
        transfer_type: transferType,
        reason: reason || undefined,
      };

      const transfer = await documentService.rerouteDocument(document.id, request);
      setSuccess('Document re-routé avec succès');
      
      setTimeout(() => {
        onSuccess(transfer);
        handleClose();
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors du re-routing';
      setError(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFolderId('');
    setTransferType('MANUAL_TRANSFER');
    setReason('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Re-router le document">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Document Info */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div>
            <label className="text-sm font-medium text-gray-700">Document</label>
            <p className="text-gray-900">{document.title}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Localisation actuelle</label>
            <p className="text-gray-900">{currentFolder.name}</p>
          </div>
        </div>

        {/* Destination Folder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dossier de destination *
          </label>
          <select
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Sélectionner un dossier --</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.full_path || folder.name}
              </option>
            ))}
          </select>
        </div>

        {/* Transfer Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type de transfer
          </label>
          <select
            value={transferType}
            onChange={(e) => setTransferType(e.target.value as DocumentTransferType)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TRANSFER_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Raison (optionnel)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            placeholder="Entrez la raison du re-routing..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            onClick={handleClose}
            disabled={loading}
            variant="secondary"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading || !selectedFolderId}
            isLoading={loading}
          >
            Re-router
          </Button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            {success}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default DocumentRerouteModal;
