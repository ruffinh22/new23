/**
 * useAlert Hook
 * Hook pour afficher des alertes simples
 */

import { useCallback } from 'react'
import { useNotification } from './useNotification'

interface UseAlertResult {
  showAlert: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

export const useAlert = (): UseAlertResult => {
  const { addNotification } = useNotification()

  const showAlert = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      addNotification({
        type,
        title: type.charAt(0).toUpperCase() + type.slice(1),
        message,
        duration: 4000,
      })
    },
    [addNotification]
  )

  return { showAlert }
}
