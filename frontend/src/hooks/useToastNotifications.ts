import { useCallback, useState } from 'react'

export const useToastNotifications = () => {
  // 🔴 DISABLED: No longer polling for notifications
  // Notifications come from NotificationContext + WebSocket only
  // This hook now just provides empty toasts array for backward compatibility
  const [toasts] = useState<object[]>([])

  const removeToast = useCallback((_id: string) => {
    // Do nothing - toasts array is always empty
  }, [])

  return { toasts, removeToast }
}
