/**
 * Re-routing Action Hook
 * Handles re-routing logic for documents
 */

import { useState } from 'react';
import { Document, DocumentTransfer, Folder } from '@/types/document';

interface UseDocumentRerouteReturn {
  isOpen: boolean;
  currentDocument: Document | null;
  currentFolder: Folder | null;
  openRerouteModal: (document: Document, folder: Folder) => void;
  closeRerouteModal: () => void;
  onRerouteSuccess: (transfer: DocumentTransfer) => void;
}

export const useDocumentReroute = (
  onSuccess?: (transfer: DocumentTransfer) => void
): UseDocumentRerouteReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);

  const openRerouteModal = (document: Document, folder: Folder) => {
    setCurrentDocument(document);
    setCurrentFolder(folder);
    setIsOpen(true);
  };

  const closeRerouteModal = () => {
    setIsOpen(false);
    setCurrentDocument(null);
    setCurrentFolder(null);
  };

  const handleRerouteSuccess = (transfer: DocumentTransfer) => {
    if (onSuccess) {
      onSuccess(transfer);
    }
    closeRerouteModal();
  };

  return {
    isOpen,
    currentDocument,
    currentFolder,
    openRerouteModal,
    closeRerouteModal,
    onRerouteSuccess: handleRerouteSuccess,
  };
};

export default useDocumentReroute;
