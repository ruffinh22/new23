/**
 * WebSocket service pour les notifications en temps réel
 */

import { STORAGE_KEYS } from '@/utils/constants'

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

export interface NotificationPayload {
  id: number
  notification_type: string
  resource_url?: string
  is_read: boolean
  created_at: string
  [key: string]: any
}

class WebSocketService {
  private ws: WebSocket | null = null
  private url: string = ''
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private messageHandlers: Map<string, Function[]> = new Map()
  private isIntentionallyClosed = false

  constructor() {
    // Connect to backend WebSocket (port 8000), not frontend (port 5174)
    // Build correct URL: ws://localhost:8000/ws/notifications/
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const wsHost = `${host}:8000`  // Backend is on port 8000
    this.url = `${protocol}//${wsHost}/ws/notifications/`
    
    console.log(`[WebSocketService] Connecting to: ${this.url}`)
  }

  /**
   * Se connecter au serveur WebSocket
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isIntentionallyClosed = false
        const wsUrl = `${this.url}?token=${token}`
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('✅ WebSocket connecté')
          this.reconnectAttempts = 0
          this.setupHeartbeat()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Erreur parsing message WebSocket:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('❌ Erreur WebSocket:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('🔌 WebSocket fermé')
          if (!this.isIntentionallyClosed) {
            this.attemptReconnect()
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Se déconnecter
   */
  disconnect(): void {
    this.isIntentionallyClosed = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Enregistrer un handler pour un type de message
   */
  on(messageType: string, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, [])
    }
    this.messageHandlers.get(messageType)!.push(handler)
  }

  /**
   * Désenregistrer un handler
   */
  off(messageType: string, handler: Function): void {
    const handlers = this.messageHandlers.get(messageType) || []
    this.messageHandlers.set(messageType, handlers.filter(h => h !== handler))
  }

  /**
   * Envoyer un message au serveur
   */
  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket non connecté')
    }
  }

  /**
   * Marquer une notification comme lue
   */
  markAsRead(notificationId: number): void {
    this.send({
      action: 'mark_as_read',
      notification_id: notificationId,
    })
  }

  /**
   * Obtenir le nombre de notifications non lues
   */
  getUnreadCount(): void {
    this.send({
      action: 'get_unread_count',
    })
  }

  /**
   * Traiter les messages reçus
   */
  private handleMessage(message: WebSocketMessage): void {
    const { type, ...data } = message

    console.log(`📨 Message reçu: ${type}`, data)

    // Appeler tous les handlers registrés pour ce type
    const handlers = this.messageHandlers.get(type) || []
    handlers.forEach((handler) => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Erreur dans handler ${type}:`, error)
      }
    })
  }

  /**
   * Heartbeat pour maintenir la connexion
   */
  private setupHeartbeat(): void {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ action: 'ping' })
      }
    }, 30000) // Ping toutes les 30 secondes
  }

  /**
   * Tentative de reconnexion
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(
        `🔄 Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts} dans ${delay}ms...`
      )
      setTimeout(() => {
        const token = localStorage.getItem(STORAGE_KEYS.accessToken)
        if (token) {
          // IMPORTANT: Do NOT clear handlers - they need to be preserved across reconnections!
          this.connect(token).catch(() => {
            // Erreur, la prochaine tentative est gérée par le callback onclose
          })
        }
      }, delay)
    } else {
      console.error('❌ Impossible de se reconnecter au WebSocket')
    }
  }

  /**
   * Vérifier si connecté
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const wsService = new WebSocketService()
