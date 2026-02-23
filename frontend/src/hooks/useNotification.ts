/**
 * useNotification Hook
 * Hook pour gérer les notifications dans l'application
 */

import { useCallback, useState } from 'react';
import { NotificationConfig } from '../types/common';
import { generateUUID } from '../utils/helpers';

export interface Notification extends NotificationConfig {
  id: string;
}

interface UseNotificationResult {
  notifications: Notification[];
  addNotification: (config: Omit<NotificationConfig, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useNotification = (): UseNotificationResult => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((config: Omit<NotificationConfig, 'id'>) => {
    const id = generateUUID();
    const notification: Notification = {
      ...config,
      id,
      duration: config.duration || 4000,
    };

    setNotifications((prev) => [...prev, notification]);

    // Auto-remove notification after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
};
