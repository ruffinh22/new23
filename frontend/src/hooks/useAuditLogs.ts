/**
 * Hook WebSocket pour les logs d'audit en temps réel
 * ✅ ADMIN ONLY - Accessibilité restreinte
 * ✅ Connexion persistante + synchronisation
 * ✅ Support filtrage par type d'action
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { STORAGE_KEYS } from '@/utils/constants';

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  model_name: string;
  object_id: number;
  object_str: string;
  description: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

export interface AuditLogMessage {
  type: string;
  logs?: AuditLog[];
  log?: AuditLog;
  status?: string;
  error?: string;
}

interface UseAuditLogsReturn {
  logs: AuditLog[];
  isConnected: boolean;
  getRecentLogs: (limit?: number) => void;
  filterByActionType: (actionType: string) => void;
  filterByUser: (userId: number) => void;
  filterByModel: (modelName: string) => void;
}

export const useAuditLogs = (): UseAuditLogsReturn => {
  const { user, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  /**
   * Vérifier si l'utilisateur est admin
   */
  useEffect(() => {
    const adminStatus = user?.is_staff || user?.is_superuser || user?.role === 'ADMIN';
    setIsAdmin(adminStatus || false);
  }, [user]);

  /**
   * Récupérer les logs récents
   */
  const getRecentLogs = useCallback((limit: number = 50) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          action: 'get_recent',
          limit,
        })
      );
    }
  }, []);

  /**
   * Filtrer par type d'action
   */
  const filterByActionType = useCallback((actionType: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          action: 'filter',
          filter_type: 'action',
          filter_value: actionType,
        })
      );
    }
  }, []);

  /**
   * Filtrer par utilisateur
   */
  const filterByUser = useCallback((userId: number) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          action: 'filter',
          filter_type: 'user_id',
          filter_value: userId,
        })
      );
    }
  }, []);

  /**
   * Filtrer par modèle
   */
  const filterByModel = useCallback((modelName: string) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(
        JSON.stringify({
          action: 'filter',
          filter_type: 'model_name',
          filter_value: modelName,
        })
      );
    }
  }, []);

  /**
   * Se reconnecter au WebSocket (avec backoff exponentiel)
   */
  const reconnect = useCallback((attemptNumber: number = 0) => {
    const authToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!isAuthenticated || !authToken || !isAdmin) {
      return;
    }

    // Backoff exponentiel: 1s, 2s, 4s, 8s, max 30s
    const delay = Math.min(1000 * Math.pow(2, attemptNumber), 30000);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (websocketRef.current?.readyState !== WebSocket.OPEN) {
        connectWebSocket(attemptNumber);
      }
    }, delay);
  }, [isAuthenticated, isAdmin]);

  /**
   * Connecter au WebSocket
   */
  const connectWebSocket = useCallback((attemptNumber: number = 0) => {
    const authToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!isAuthenticated || !authToken || !isAdmin || websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname
      const wsHost = `${host}:8000`  // Backend is on port 8000
      const wsUrl = `${protocol}//${wsHost}/ws/auditlog/?token=${authToken}`;
      
      const ws = new WebSocket(wsUrl);

      ws.addEventListener('open', () => {
        console.log('[AuditDashboard] WebSocket connecté');
        setIsConnected(true);
        attemptNumber = 0; // Reset attempt counter on success
      });

      ws.addEventListener('message', (event) => {
        try {
          const data: AuditLogMessage = JSON.parse(event.data);

          switch (data.type) {
            case 'initial_logs':
              // Recevoir les logs initiales
              if (Array.isArray(data.logs)) {
                setLogs(data.logs);
              }
              break;

            case 'auditlog':
              // Nouveau log d'audit reçu
              if (data.log) {
                setLogs(prev => [data.log!, ...prev]);
              }
              break;

            case 'error':
              console.error('[AuditDashboard] Erreur serveur:', data.error);
              break;

            default:
              console.warn('[AuditDashboard] Message de type inconnu:', data.type);
          }
        } catch (error) {
          console.error('[AuditDashboard] Erreur parsing message:', error);
        }
      });

      ws.addEventListener('close', () => {
        console.log('[AuditDashboard] WebSocket fermé');
        setIsConnected(false);
        websocketRef.current = null;
        reconnect(attemptNumber + 1);
      });

      ws.addEventListener('error', (error) => {
        console.error('[AuditDashboard] Erreur WebSocket:', error);
        setIsConnected(false);
        // La reconnexion se fera automatiquement via l'event 'close'
      });

      websocketRef.current = ws;
    } catch (error) {
      console.error('[AuditDashboard] Erreur lors de la connexion:', error);
      reconnect(attemptNumber + 1);
    }
  }, [isAuthenticated, isAdmin, reconnect]);

  /**
   * Effet principal: gérer la connexion WebSocket
   */
  useEffect(() => {
    const authToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!isAuthenticated || !authToken || !isAdmin) {
      // Fermer la connexion si l'utilisateur se déconnecte ou n'est pas admin
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isMounted = true;

    const initializeConnection = async () => {
      // Get token from localStorage
      const authToken = localStorage.getItem(STORAGE_KEYS.accessToken)
      if (!authToken) {
        console.warn('[useAuditLogs] Could not get access token')
        return
      }

      if (!isMounted) return;

      // Connecter au WebSocket with fresh token
      connectWebSocket();
    }

    initializeConnection();

    // Cleanup
    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, [isAuthenticated, isAdmin, connectWebSocket]);

  return {
    logs,
    isConnected,
    getRecentLogs,
    filterByActionType,
    filterByUser,
    filterByModel,
  };
};
