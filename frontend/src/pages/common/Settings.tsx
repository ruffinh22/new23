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

interface SettingOption {
  key: keyof UserSettings
  icon: React.ReactNode
  label: string
  description: string
}

const SETTING_OPTIONS: SettingOption[] = [
  {
    key: 'notifications_enabled',
    icon: <Bell size={20} className="text-red-600" />,
    label: 'Notifications',
    description: 'Alertes importants du système'
  },
  {
    key: 'email_alerts_enabled',
    icon: <Bell size={20} className="text-red-600" />,
    label: 'Alertes Email',
    description: 'Notifications par email'
  },
  {
    key: 'dark_mode',
    icon: <Moon size={20} className="text-red-600" />,
    label: 'Mode Sombre',
    description: 'Thème sombre pour la nuit'
  },
  {
    key: 'two_factor_enabled',
    icon: <Shield size={20} className="text-red-600" />,
    label: '2FA',
    description: 'Sécurité supplémentaire'
  }
]

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
      console.log('Paramètres par défaut chargés:', err.response?.status)
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
      setSuccess(`✅ Paramètre mis à jour!`)
      
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      setError('❌ Erreur lors de la mise à jour')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <Zap size={32} className="text-red-600" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Paramètres</h1>
                <p className="text-slate-600 mt-1">Personnalisez votre expérience</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 animate-in fade-in">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 animate-in fade-in">
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Main Settings Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Settings Grid */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SETTING_OPTIONS.map((option) => (
                  <div
                    key={option.key}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/30 transition-all"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">{option.icon}</div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm">{option.label}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                      <input
                        type="checkbox"
                        checked={settings[option.key]}
                        onChange={() => handleToggle(option.key)}
                        disabled={isSaving}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
                    </label>
                  </div>
                ))}
              </div>

              {/* Info Section */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex gap-2 text-sm">
                    <span className="text-lg">💡</span>
                    <p className="text-slate-600">Modifications automatiquement sauvegardées</p>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <span className="text-lg">⚠️</span>
                    <p className="text-slate-600">Reconnexion requise pour certains paramètres</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            {isSaving && (
              <div className="bg-red-50 border-t border-red-200 px-8 py-3 flex items-center gap-2">
                <Zap className="text-red-600 animate-pulse" size={18} />
                <span className="text-sm font-medium text-red-700">Enregistrement...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
