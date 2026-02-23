/**
 * Re-routing Document Access Indicator
 * Affiche les informations sur l'accès et les capacités de re-routing
 */

import React from 'react';
import { User } from '@/types/auth';
import { Folder } from '@/types/document';

interface RerouteAccessIndicatorProps {
  user?: User;
  folder?: Folder;
}

export const RerouteAccessIndicator: React.FC<RerouteAccessIndicatorProps> = ({
  user,
  folder,
}) => {
  if (!user) {
    return null;
  }

  // Get role and access level from user
  const role = (user as any).role || 'AGENT';
  const accessLevel = (user as any).access_level || 4; // Default to AGENT (level 4)
  
  // Permissions based on role
  const canReroute = [
    'ADMIN',
    'POLE_MANAGER',
    'FILIALE_MANAGER',
    'SERVICE_MANAGER',
    'DOCUMENT_MANAGER',
  ].includes(role);

  const getRoleLabel = (role: string): string => {
    const roleMap: Record<string, string> = {
      ADMIN: 'Administrateur',
      POLE_MANAGER: 'Gestionnaire Pôle',
      FILIALE_MANAGER: 'Gestionnaire Filiale',
      SERVICE_MANAGER: 'Gestionnaire Service',
      DOCUMENT_MANAGER: 'Gestionnaire Document',
      AGENT: 'Agent',
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string): string => {
    const colorMap: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-800',
      POLE_MANAGER: 'bg-purple-100 text-purple-800',
      FILIALE_MANAGER: 'bg-blue-100 text-blue-800',
      SERVICE_MANAGER: 'bg-green-100 text-green-800',
      DOCUMENT_MANAGER: 'bg-orange-100 text-orange-800',
      AGENT: 'bg-gray-100 text-gray-800',
    };
    return colorMap[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      {/* User & Role */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👤</span>
          <span className="font-medium text-gray-900">
            {user.first_name} {user.last_name}
          </span>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleColor(role)}`}>
          {getRoleLabel(role)}
        </span>
      </div>

      {/* Access Level */}
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <span className="text-sm text-gray-700">
          Access Level: <span className="font-semibold">{accessLevel}</span>
        </span>
      </div>

      {/* Re-routing Capability */}
      <div className="flex items-center gap-2">
        {canReroute ? (
          <>
            <span className="text-lg">✅</span>
            <span className="text-sm text-green-700 font-medium">
              Peut re-router les documents
            </span>
          </>
        ) : (
          <>
            <span className="text-lg">❌</span>
            <span className="text-sm text-red-700 font-medium">
              Pas de permission de re-routing
            </span>
          </>
        )}
      </div>

      {/* Current Folder (if provided) */}
      {folder && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">🗂️</span>
          <span className="text-gray-600">
            Dossier courant: <span className="font-medium text-gray-900">{folder.name}</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default RerouteAccessIndicator;
