import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/common'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import {
  Bell, Moon, Shield, AlertCircle, CheckCircle, Zap
} from 'lucide-react'

interface UserSettings {
  notifications_enabled: boolean
  email_alerts_enabled: boolean
  dark_mode: boolean
  two_factor_enabled: boolean
}

export const Settings: React.FC = () => {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    notifications_enabled: true,
    email_alerts_enabled: true,
    dark_mode: false,
    two_factor_enabled: false,
  })

  useEffect(() => {
    fetchSettings()
  }, [user?.id])

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get(`/auth/users/${user?.id}/settings/`)
      setSettings(response.data)
    } catch (err: any) {
      console.log('ParamETres par défaut chargés (erreur 404 normal si première visite):', err.response?.status)
    }
  }

  const handleToggle = async (key: keyof UserSettings) => {
    try {
      setIsSaving(true)
      setError(null)

      const newSettings = {
        ...settings,
        [key]: !settings[key]
      }

      await apiClient.patch(`/auth/users/${user?.id}/settings/`, newSettings)
      setSettings(newSettings)
      setSuccess(`✅ ${getSetting(key)} mis à jour!`)
      
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError('❌ Erreur lors de la mise à jour')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const getSetting = (key: keyof UserSettings): string => {
    const labels: Record<keyof UserSettings, string> = {
      notifications_enabled: 'Notifications',
      email_alerts_enabled: 'Alertes Email',
      dark_mode: 'Mode Sombre',
      two_factor_enabled: '2FA',
    }
    return labels[key]
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-red-600 mb-2">⚙️ Paramètres</h1>
            <p className="text-secondary-600">Personnalisez votre expérience utilisateur</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 animate-in fade-in">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-bold text-red-900">Erreur</p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 animate-in fade-in">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <div>
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          )}

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Notifications Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-secondary-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
                <div className="flex items-center gap-3">
                  <Bell className="text-white" size={28} />
                  <h2 className="text-2xl font-bold text-white">Notifications</h2>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Notifications Toggle */}
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h3 className="font-bold text-secondary-900">Activer les notifications</h3>
                    <p className="text-sm text-secondary-600">Recevez des alertes importants du système</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications_enabled}
                      onChange={() => handleToggle('notifications_enabled')}
                      disabled={isSaving}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-red-600" />
                  </label>
                </div>

                {/* Email Alerts Toggle */}
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h3 className="font-bold text-secondary-900">Alertes par email</h3>
                    <p className="text-sm text-secondary-600">Recevoir les notifications importantes par email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.email_alerts_enabled}
                      onChange={() => handleToggle('email_alerts_enabled')}
                      disabled={isSaving}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-red-600" />
                  </label>
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-secondary-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
                <div className="flex items-center gap-3">
                  <Moon className="text-white" size={28} />
                  <h2 className="text-2xl font-bold text-white">Apparence</h2>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h3 className="font-bold text-secondary-900">Mode sombre</h3>
                    <p className="text-sm text-secondary-600">Activer le thème sombre pour une meilleure visibilité nocturne</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dark_mode}
                      onChange={() => handleToggle('dark_mode')}
                      disabled={isSaving}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-red-600" />
                  </label>
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-2xl shadow-lg border border-secondary-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-8 py-6">
                <div className="flex items-center gap-3">
                  <Shield className="text-white" size={28} />
                  <h2 className="text-2xl font-bold text-white">Sécurité</h2>
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h3 className="font-bold text-secondary-900">Authentification à deux facteurs (2FA)</h3>
                    <p className="text-sm text-secondary-600">Ajouter une couche de sécurité supplémentaire à votre compte</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.two_factor_enabled}
                      onChange={() => handleToggle('two_factor_enabled')}
                      disabled={isSaving}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-red-600" />
                  </label>
                </div>
              </div>
            </div>

            {/* Info Messages */}
            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800">
                  <strong>💡 Info:</strong> Les modifications sont automatiquement sauvegardées.
                </p>
              </div>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Attention:</strong> Certains paramètres peuvent nécessiter une reconnexion pour prendre effet.
                </p>
              </div>
            </div>

            {/* Status Bar */}
            {isSaving && (
              <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-red-50 to-red-50 rounded-lg border border-red-200">
                <Zap className="text-red-600 animate-pulse" size={20} />
                <span className="text-sm font-medium text-red-700">Enregistrement en cours...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
