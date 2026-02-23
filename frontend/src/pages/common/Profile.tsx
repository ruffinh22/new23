import React, { useState, useEffect } from 'react'
import { Layout } from '@/components/common'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/services/api'
import {
  User, Mail, Phone, Building, Lock, Save, AlertCircle, CheckCircle
} from 'lucide-react'

export const Profile: React.FC = () => {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
      }

      await apiClient.patch(`/auth/users/${user?.id}/`, updateData)
      
      setSuccess('✅ Profil mis à jour avec succès!')
      setIsEditing(false)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError('❌ ' + (err.response?.data?.message || 'Erreur lors de la mise à jour'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-red-600 mb-2">👤 Mon Profil</h1>
            <p className="text-secondary-600">Gérez vos informations personnelles</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-bold text-red-900">Erreur</p>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-bold text-green-900">Succès</p>
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-secondary-200 overflow-hidden">
            {/* Avatar Section */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-3xl font-bold text-red-600 shadow-lg ring-4 ring-white/50">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {user?.first_name} {user?.last_name}
              </h2>
              <p className="text-white/80 text-sm mt-2">{user?.email}</p>
            </div>

            {/* Form Section */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Prénom */}
                <div>
                  <label className="block text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <User size={16} className="text-red-600" />
                    Prénom
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 rounded-lg border transition-all ${
                      isEditing
                        ? 'border-red-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent'
                        : 'border-secondary-200 bg-secondary-50 cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Nom */}
                <div>
                  <label className="block text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <User size={16} className="text-red-600" />
                    Nom
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 rounded-lg border transition-all ${
                      isEditing
                        ? 'border-red-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent'
                        : 'border-secondary-200 bg-secondary-50 cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <Mail size={16} className="text-red-600" />
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 rounded-lg border transition-all ${
                      isEditing
                        ? 'border-red-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent'
                        : 'border-secondary-200 bg-secondary-50 cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <Phone size={16} className="text-red-600" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full px-4 py-2 rounded-lg border transition-all ${
                      isEditing
                        ? 'border-red-300 bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent'
                        : 'border-secondary-200 bg-secondary-50 cursor-not-allowed'
                    }`}
                  />
                </div>

                {/* Département */}
                <div>
                  <label className="block text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <Building size={16} className="text-red-600" />
                    Département
                  </label>
                  <input
                    type="text"
                    value={user?.department_name || user?.department || 'Non assigné'}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-secondary-200 bg-secondary-50 cursor-not-allowed text-secondary-600"
                  />
                </div>

                {/* Filiale */}
                <div>
                  <label className="block text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <Building size={16} className="text-red-600" />
                    Filiale
                  </label>
                  <input
                    type="text"
                    value={user?.branch_name || user?.branch || 'Non assignée'}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-secondary-200 bg-secondary-50 cursor-not-allowed text-secondary-600"
                  />
                </div>

                {/* Matricule (Read-only) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <Lock size={16} className="text-red-600" />
                    Matricule
                  </label>
                  <input
                    type="text"
                    value={user?.matricule || ''}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border border-secondary-200 bg-secondary-50 cursor-not-allowed text-secondary-600 font-mono"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2 border-2 border-secondary-300 text-secondary-700 font-bold rounded-lg hover:bg-secondary-50 transition"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg hover:shadow-lg hover:from-red-700 hover:to-red-800 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save size={16} />
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg hover:shadow-lg hover:from-red-700 hover:to-red-800 transition"
                  >
                    ✏️ Modifier
                  </button>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-red-50 border-t border-red-200 p-6">
              <p className="text-sm text-red-800">
                <strong>💡 Info:</strong> Seuls votre prénom, nom, email et téléphone peuvent être modifiés. Votre matricule, département et filiale sont gérés par les administrateurs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
