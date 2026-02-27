import React, { useState } from 'react'
import { Layout } from '@/components/common'
import { 
  Zap, Globe, Calendar, HardDrive, Mail, Lock, Database, 
  AlertCircle, CheckCircle, Clock, Server, Shield
} from 'lucide-react'

interface Setting {
  key: string
  label: string
  value: string | number | boolean
  type: 'text' | 'number' | 'email' | 'select' | 'toggle' | 'textarea'
  description: string
  category: string
  readonly?: boolean
}

interface SettingCategory {
  name: string
  icon: React.ReactNode
  description: string
}

const SETTING_CATEGORIES: Record<string, SettingCategory> = {
  'timezone': {
    name: '🌍 Fuseau Horaire',
    icon: <Globe size={24} />,
    description: 'Configuration du timezone du système'
  },
  'date-format': {
    name: '📅 Formats de Date',
    icon: <Calendar size={24} />,
    description: 'Formats d\'affichage pour dates et nombres'
  },
  'storage': {
    name: '💾 Limites de Stockage',
    icon: <HardDrive size={24} />,
    description: 'limites de stockage par utilisateur et dossier'
  },
  'retention': {
    name: '♻️ Rétention des Données',
    icon: <Clock size={24} />,
    description: 'Règles de conservation des données'
  },
  'email': {
    name: '📧 Configuration Email',
    icon: <Mail size={24} />,
    description: 'Paramètres SMTP et notifications'
  },
  'integrations': {
    name: '🔗 Intégrations Externes',
    icon: <Server size={24} />,
    description: 'APIs et webhooks externes'
  },
  'security': {
    name: '🔐 Sécurité & SSL',
    icon: <Lock size={24} />,
    description: 'Certificats et configurations SSL/TLS'
  },
  'backups': {
    name: '📦 Sauvegardes',
    icon: <Database size={24} />,
    description: 'Configuration des sauvegardes automatiques'
  },
}

const DEFAULT_SETTINGS: Setting[] = [
  // Timezone
  {
    key: 'TIME_ZONE',
    label: 'Fuseau Horaire',
    value: 'Africa/Dakar',
    type: 'select',
    description: 'Fuseau horaire utilisé pour tous les timestamps',
    category: 'timezone'
  },
  {
    key: 'USE_TZ',
    label: 'Timezone-aware Datetimes',
    value: true,
    type: 'toggle',
    description: 'Utiliser des datetimes conscients du timezone',
    category: 'timezone'
  },

  // Date Format
  {
    key: 'DATE_FORMAT',
    label: 'Format de Date',
    value: 'd/m/Y',
    type: 'text',
    description: 'Format d\'affichage des dates (ex: 27/02/2026)',
    category: 'date-format'
  },
  {
    key: 'TIME_FORMAT',
    label: 'Format de l\'Heure',
    value: 'H:i:s',
    type: 'text',
    description: 'Format d\'affichage de l\'heure (ex: 14:30:45)',
    category: 'date-format'
  },
  {
    key: 'DATETIME_FORMAT',
    label: 'Format Date + Heure',
    value: 'd/m/Y H:i:s',
    type: 'text',
    description: 'Format complet (ex: 27/02/2026 14:30:45)',
    category: 'date-format'
  },
  {
    key: 'DECIMAL_SEPARATOR',
    label: 'Séparateur Décimal',
    value: ',',
    type: 'text',
    description: 'Caractère pour les décimales (ex: , pour français)',
    category: 'date-format'
  },
  {
    key: 'THOUSAND_SEPARATOR',
    label: 'Séparateur de Milliers',
    value: ' ',
    type: 'text',
    description: 'Caractère pour les milliers',
    category: 'date-format'
  },

  // Storage Limits
  {
    key: 'MAX_UPLOAD_SIZE',
    label: 'Taille Max Upload (MB)',
    value: 100,
    type: 'number',
    description: 'Taille maximale par fichier en MB',
    category: 'storage'
  },
  {
    key: 'MAX_STORAGE_PER_USER_GB',
    label: 'Stockage Max par Utilisateur (GB)',
    value: 5,
    type: 'number',
    description: 'Limite de stockage total par utilisateur',
    category: 'storage'
  },
  {
    key: 'MAX_STORAGE_PER_FOLDER_GB',
    label: 'Stockage Max par Dossier (GB)',
    value: 10,
    type: 'number',
    description: 'Limite de stockage par dossier/service',
    category: 'storage'
  },
  {
    key: 'MAX_STORAGE_TOTAL_GB',
    label: 'Stockage Total Système (GB)',
    value: 100,
    type: 'number',
    description: 'limite de stockage globale du système',
    category: 'storage'
  },

  // Data Retention
  {
    key: 'RETENTION_AUDIT_LOGS',
    label: 'Rétention Audit Logs (jours)',
    value: 90,
    type: 'number',
    description: 'Combien de jours garder les logs d\'audit',
    category: 'retention'
  },
  {
    key: 'RETENTION_ERROR_LOGS',
    label: 'Rétention Error Logs (jours)',
    value: 30,
    type: 'number',
    description: 'Combien de jours garder les logs d\'erreurs',
    category: 'retention'
  },
  {
    key: 'RETENTION_DOCUMENTS',
    label: 'Rétention Documents (jours)',
    value: 1825,
    type: 'number',
    description: 'Combien de jours garder les documents (5 ans = 1825)',
    category: 'retention'
  },
  {
    key: 'RETENTION_DELETED_DOCS',
    label: 'Rétention Documents Supprimés (jours)',
    value: 90,
    type: 'number',
    description: 'Nb de jours avant suppression permanente',
    category: 'retention'
  },
  {
    key: 'ENABLE_DATA_CLEANUP',
    label: 'Nettoyage Auto des Données',
    value: true,
    type: 'toggle',
    description: 'Activer le nettoyage automatique des données anciennes',
    category: 'retention'
  },

  // Email Settings
  {
    key: 'EMAIL_HOST',
    label: 'Serveur SMTP',
    value: 'ssl0.ovh.net',
    type: 'text',
    description: 'Serveur SMTP pour envoi d\'emails',
    category: 'email',
    readonly: true
  },
  {
    key: 'EMAIL_PORT',
    label: 'Port SMTP',
    value: 465,
    type: 'number',
    description: 'Port de connexion SMTP',
    category: 'email',
    readonly: true
  },
  {
    key: 'EMAIL_USE_SSL',
    label: 'Utiliser SSL',
    value: true,
    type: 'toggle',
    description: 'Utiliser SSL pour la connexion SMTP',
    category: 'email',
    readonly: true
  },
  {
    key: 'DEFAULT_FROM_EMAIL',
    label: 'Email Expéditeur',
    value: 'noreply@sgdra.local',
    type: 'email',
    description: 'Adresse email expéditrice par défaut',
    category: 'email'
  },
  {
    key: 'EMAIL_TIMEOUT',
    label: 'Timeout Email (secondes)',
    value: 10,
    type: 'number',
    description: 'Délai maximum pour envoyer un email',
    category: 'email'
  },
  {
    key: 'SEND_EMAILS_ASYNC',
    label: 'Envoi Asynchrone',
    value: true,
    type: 'toggle',
    description: 'Envoyer les emails de manière asynchrone (Celery)',
    category: 'email'
  },

  // Security
  {
    key: 'SECURE_SSL_REDIRECT',
    label: 'Redirection HTTPS',
    value: true,
    type: 'toggle',
    description: 'Forcer la redirection HTTP → HTTPS',
    category: 'security'
  },
  {
    key: 'SESSION_COOKIE_SECURE',
    label: 'Session Cookie Secure',
    value: true,
    type: 'toggle',
    description: 'Envoyer les session cookies seulement en HTTPS',
    category: 'security'
  },
  {
    key: 'CSRF_COOKIE_SECURE',
    label: 'CSRF Cookie Secure',
    value: true,
    type: 'toggle',
    description: 'Envoyer les CSRF cookies seulement en HTTPS',
    category: 'security'
  },

  // Backups
  {
    key: 'BACKUP_ENABLED',
    label: 'Sauvegardes Activées',
    value: true,
    type: 'toggle',
    description: 'Activer les sauvegardes automatiques',
    category: 'backups'
  },
  {
    key: 'BACKUP_DATABASE',
    label: 'Backup Base de Données',
    value: true,
    type: 'toggle',
    description: 'Inclure la base de données dans les backups',
    category: 'backups'
  },
  {
    key: 'BACKUP_MEDIA_FILES',
    label: 'Backup Fichiers Uploadés',
    value: true,
    type: 'toggle',
    description: 'Inclure les fichiers uploadés dans les backups',
    category: 'backups'
  },
  {
    key: 'BACKUP_LOGS',
    label: 'Backup Fichiers Logs',
    value: true,
    type: 'toggle',
    description: 'Inclure les logs dans les backups',
    category: 'backups'
  },
  {
    key: 'BACKUP_RETENTION_DAYS',
    label: 'Rétention Backups (jours)',
    value: 30,
    type: 'number',
    description: 'Combien de jours garder les anciennes sauvegardes',
    category: 'backups'
  },
]

export const AdvancedSettings: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>(DEFAULT_SETTINGS)
  const [activeCategory, setActiveCategory] = useState('timezone')
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const visibleSettings = settings.filter(s => s.category === activeCategory)
  const categories = Object.entries(SETTING_CATEGORIES)

  const handleSettingChange = (key: string, value: any) => {
    setSettings(settings.map(s => 
      s.key === key ? { ...s, value } : s
    ))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Simuler l'envoi au backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-red-500 via-red-600 to-orange-600 rounded-2xl shadow-2xl">
                <Zap size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                  ⚙️ Configuration Avancée
                </h1>
                <p className="text-lg text-slate-600 mt-2">
                  Paramètres système et configuration globale du system
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar - Categories */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Catégories</h2>
                <div className="space-y-2">
                  {categories.map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                        activeCategory === key
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span className="text-sm">{cat.name.split(' ')[0]}</span>
                      <div className="text-xs opacity-75">{cat.name.split(' ').slice(1).join(' ')}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Category Header */}
              <div className="bg-white rounded-2xl shadow-lg p-8 border-l-4 border-red-600">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                      {SETTING_CATEGORIES[activeCategory].name}
                    </h2>
                    <p className="text-slate-600">
                      {SETTING_CATEGORIES[activeCategory].description}
                    </p>
                  </div>
                  <div className="text-5xl">
                    {SETTING_CATEGORIES[activeCategory].icon}
                  </div>
                </div>
              </div>

              {/* Settings Form */}
              <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
                {visibleSettings.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">Aucun paramètre dans cette catégorie</p>
                  </div>
                ) : (
                  visibleSettings.map((setting) => (
                    <div key={setting.key} className="border-b border-slate-200 pb-6 last:border-0 last:pb-0">
                      <label className="block">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-slate-900">{setting.label}</span>
                            <p className="text-sm text-slate-500 mt-1">{setting.description}</p>
                          </div>
                          {setting.readonly && (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                              Lecture seule
                            </span>
                          )}
                        </div>

                        {/* Input based on type */}
                        {setting.type === 'toggle' ? (
                          <input
                            type="checkbox"
                            checked={setting.value as boolean}
                            onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                            disabled={setting.readonly}
                            className="w-6 h-6 rounded border-slate-300 cursor-pointer"
                          />
                        ) : setting.type === 'select' ? (
                          <select
                            value={typeof setting.value === 'boolean' ? '' : setting.value}
                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                            disabled={setting.readonly}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-slate-100"
                          >
                            {setting.key === 'TIME_ZONE' && (
                              <>
                                <option>Africa/Dakar</option>
                                <option>Africa/Lagos</option>
                                <option>Africa/Cairo</option>
                                <option>Europe/Paris</option>
                                <option>UTC</option>
                              </>
                            )}
                          </select>
                        ) : (
                          <input
                            type={setting.type}
                            value={typeof setting.value === 'boolean' ? '' : setting.value}
                            onChange={(e) => handleSettingChange(setting.key, 
                              setting.type === 'number' ? parseInt(e.target.value) : e.target.value
                            )}
                            disabled={setting.readonly}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-slate-100"
                          />
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>

              {/* Save Button */}
              <div className="flex gap-3 justify-end">
                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                    <CheckCircle size={18} />
                    Paramètres sauvegardés !
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                    <AlertCircle size={18} />
                    Erreur lors de la sauvegarde
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Sauvegarde...' : 'Sauvegarder les Paramètres'}
                </button>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <Shield size={28} className="text-red-600 mb-4" />
              <h3 className="font-bold text-red-900 mb-2">Sécurité</h3>
              <p className="text-sm text-red-800">
                Les paramètres de sécurité nécessitent un redémarrage du serveur pour être appliqués.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <Clock size={28} className="text-amber-600 mb-4" />
              <h3 className="font-bold text-amber-900 mb-2">Timezone</h3>
              <p className="text-sm text-amber-800">
                Le changement de timezone affecte tous les timestamps du système.
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <Database size={28} className="text-purple-600 mb-4" />
              <h3 className="font-bold text-purple-900 mb-2">Données</h3>
              <p className="text-sm text-purple-800">
                Les modifications de rétention s'appliquent aux nouveaux nettoyages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
