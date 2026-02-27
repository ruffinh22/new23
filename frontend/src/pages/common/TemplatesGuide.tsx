import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Layout } from '@/components/common'
import { isAdmin } from '@/utils/authUtils'
import {
  FileText, Settings, Upload,
  BookOpen, ChevronRight, Menu, X,
  LogIn, BarChart3, Bell, Folder, Shield,
  FileUp, CheckCircle, Lightbulb,
  Video, Code, Lock, Star, Sparkles,
  Trophy, Eye, Zap, Calendar, Mail, Plus
} from 'lucide-react'

interface Section {
  id: string
  title: string
  icon: React.ReactNode
  description: string
  requiredRole?: 'agent' | 'admin' | 'both'
}

const sections: Section[] = [
  {
    id: 'getting-started',
    title: 'Accès & Configuration',
    icon: <LogIn size={24} />,
    description: 'Connectez-vous et configurez votre profil',
    requiredRole: 'both'
  },
  {
    id: 'dashboard',
    title: 'Tableaux de Bord',
    icon: <BarChart3 size={24} />,
    description: 'Vue d\'ensemble de votre activité',
    requiredRole: 'both'
  },
  {
    id: 'documents',
    title: 'Gestion des Documents',
    icon: <FileText size={24} />,
    description: 'Uploader, organiser et router les documents',
    requiredRole: 'both'
  },
  {
    id: 'templates',
    title: 'Modèles de Documents',
    icon: <FileUp size={24} />,
    description: 'Créer et partager les templates',
    requiredRole: 'both'
  },
  {
    id: 'scheduling',
    title: 'Calendrier & Planning',
    icon: <Calendar size={24} />,
    description: 'Gérer les événements et planifier les emails',
    requiredRole: 'both'
  },
  {
    id: 'admin',
    title: 'Administration',
    icon: <Shield size={24} />,
    description: 'Gérer les utilisateurs et la configuration',
    requiredRole: 'admin'
  },
  {
    id: 'notifications',
    title: 'Notifications & Alertes',
    icon: <Bell size={24} />,
    description: 'Rester informé en temps réel',
    requiredRole: 'both'
  },
]

export const TemplatesGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<'agent' | 'admin'>('agent')
  
  // Récupérer l'utilisateur depuis le contexte d'authentification
  const { user } = useAuth()
  
  useEffect(() => {
    // ✅ UTILISE authUtils.isAdmin() - single source of truth
    if (isAdmin(user)) {
      setUserRole('admin')
    } else {
      setUserRole('agent')
    }
  }, [user])
  
  // Filtrer les sections selon le rôle
  const visibleSections = sections.filter(section => 
    section.requiredRole === 'both' || section.requiredRole === userRole
  )

  
  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return <GettingStartedSection userRole={userRole} />
      case 'dashboard':
        return <DashboardSection userRole={userRole} />
      case 'documents':
        return <DocumentsSection userRole={userRole} />
      case 'templates':
        return <TemplatesSection userRole={userRole} />
      case 'scheduling':
        return <SchedulingSection userRole={userRole} />
      case 'admin':
        return <AdminSection userRole={userRole} />
      case 'notifications':
        return <NotificationsSection userRole={userRole} />
      default:
        return null
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto py-8 px-4">
          {/* Header Premium */}
          <div className="mb-12 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-blue-500/10 rounded-3xl blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600 rounded-2xl shadow-2xl transform hover:scale-105 transition-transform">
                  <BookOpen size={32} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-5xl font-black bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent">
                      Guide Complet SGDRA
                    </h1>
                    <div className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full">
                      <Sparkles size={16} className="text-white inline" />
                    </div>
                  </div>
                  <p className="text-lg text-secondary-600 mt-2">
                    🏢 Système de Gestion Documentaire et Routage Automatique
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      <Trophy size={16} />
                      Version 2.0
                    </span>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      {userRole === 'admin' ? <Shield size={16} /> : <Eye size={16} />}
                      {userRole === 'admin' ? 'Mode Administrateur' : 'Mode Agent'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation Premium */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-secondary-200 overflow-hidden sticky top-8 hover:shadow-2xl transition-shadow">
                {/* Mobile Toggle */}
                <div className="lg:hidden p-4 border-b border-secondary-200 flex items-center justify-between bg-gradient-to-r from-primary-50 to-blue-50">
                  <span className="font-bold text-secondary-900 flex items-center gap-2">
                    <Menu size={20} /> Menu
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="text-secondary-600 hover:text-secondary-900 transition"
                  >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                  </button>
                </div>

                {/* Menu Items */}
                <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block divide-y divide-secondary-100`}>
                  {visibleSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id)
                        setMobileMenuOpen(false)
                      }}
                      className={`w-full text-left px-6 py-4 border-l-4 transition-all flex items-center gap-3 group ${
                        activeSection === section.id
                          ? 'bg-gradient-to-r from-primary-50 to-blue-50 border-primary-600 text-primary-600 font-bold shadow-md'
                          : 'border-transparent text-secondary-700 hover:bg-slate-50 hover:border-primary-300'
                      }`}
                    >
                      <span className={`text-xl transition-transform ${activeSection === section.id ? 'scale-125' : 'group-hover:scale-110'}`}>
                        {section.icon}
                      </span>
                      <div>
                        <p className="font-medium">{section.title}</p>
                        <p className="text-xs text-secondary-500 hidden sm:block line-clamp-1">{section.description}</p>
                      </div>
                      {activeSection === section.id && (
                        <ChevronRight size={16} className="ml-auto" />
                      )}
                    </button>
                  ))}
                </nav>

                {/* Info Box */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-t border-secondary-200">
                  <div className="flex items-start gap-3 text-xs">
                    <Lightbulb size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-secondary-700">
                      <strong>💡 Besoin d'aide?</strong> Contactez votre administrateur ou consultez la documentation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area Premium */}
            <div className="lg:col-span-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-secondary-200 overflow-hidden hover:shadow-2xl transition-shadow">
                <div className="p-8 bg-gradient-to-br from-white via-slate-50 to-white">
                  {renderContent()}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Premium */}
          <div className="mt-12 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-blue-500/5 rounded-2xl" />
            <div className="relative text-center py-8 border-t border-secondary-200">
              <p className="font-bold text-secondary-900 text-lg">✨ SGDRA - Guide Officiel</p>
              <p className="text-sm text-secondary-600 mt-2">
                Dernière mise à jour: Février 2026 • Version 2.0
              </p>
              <div className="mt-4 text-xs text-secondary-500">
                Pour toute question, contactez votre <strong>administrateur système</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// ─── Section Components ──────────────────────────────────────────

interface SectionProps {
  userRole: 'agent' | 'admin'
}

const TipBox: React.FC<{ type: 'info' | 'warning' | 'success' | 'tip', children: React.ReactNode }> = ({ type, children }) => {
  const configs = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'ℹ️', text: 'text-blue-800' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: '⚠️', text: 'text-yellow-800' },
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: '✅', text: 'text-green-800' },
    tip: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '💡', text: 'text-purple-800' }
  }
  const config = configs[type]
  return (
    <div className={`${config.bg} border-l-4 ${config.border} p-6 rounded-lg flex gap-3`}>
      <span className="text-xl flex-shrink-0">{config.icon}</span>
      <div className={`${config.text} text-sm`}>{children}</div>
    </div>
  )
}

const GettingStartedSection: React.FC<SectionProps> = () => (
  <div className="space-y-8">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-blue-500/5 rounded-2xl" />
      <div className="relative">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-transparent mb-2">
          🔐 Accès & Configuration
        </h2>
        <p className="text-secondary-700 mb-4">Connectez-vous et configurez votre profil utilisateur complet</p>
      </div>
    </div>

    <div className="space-y-6">
      <TipBox type="info">
        <strong>Nouveau sur SGDRA?</strong> Suivez ce guide étape par étape pour maîtriser toutes les fonctionnalités essentielles.
      </TipBox>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-primary-600 flex items-center gap-2">
          <LogIn size={24} /> 1. Connexion à votre Compte
        </h3>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border border-blue-100">
              <p className="font-bold text-blue-900 mb-2">👤 Identifiant</p>
              <p className="text-sm text-blue-800">Votre matricule unique (ex: EMP001)</p>
            </div>
            <div className="bg-white p-4 rounded border border-blue-100">
              <p className="font-bold text-blue-900 mb-2">🔑 Mot de Passe</p>
              <p className="text-sm text-blue-800">Votre mot de passe sécurisé</p>
            </div>
          </div>
          <div className="bg-white/50 p-4 rounded border-l-4 border-blue-600">
            <p className="text-sm text-blue-900">
              💡 <strong>Conseil:</strong> Si vous avez oublié vos identifiants, contactez immédiatement votre administrateur. Vous ne pouvez pas réinitialiser vous-même.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-primary-600 flex items-center gap-2">
          <Settings size={24} /> 2. Configuration de Votre Profil
        </h3>
        <div className="space-y-3">
          {[
            { icon: '👤', title: 'Informations Personnelles', desc: 'Nom complet, prénom, date de naissance' },
            { icon: '📧', title: 'Coordonnées', desc: 'Email, téléphone et adresse professionnelle' },
            { icon: '🏢', title: 'Département', desc: 'Votre département et section d\'affectation' },
            { icon: '🔔', title: 'Préférences Notifications', desc: 'Choisissez comment être notifié (email, système)' },
            { icon: '🔐', title: 'Sécurité', desc: 'Changez votre mot de passe régulièrement' },
            { icon: '🌐', title: 'Langue & Fuseau', desc: 'Sélectionnez votre langue et fuseau horaire' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg flex gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-bold text-green-900">{item.title}</p>
                <p className="text-sm text-green-800">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TipBox type="warning">
        <strong>Important!</strong> Certaines informations (département, matricule) ne peuvent pas être modifiées. Contactez l'administrateur en cas d'erreur.
      </TipBox>

      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 text-center border-2 border-dashed border-slate-400 h-64 flex items-center justify-center">
        <div>
          <Video className="mx-auto text-slate-500 mb-3" size={48} />
          <p className="text-slate-600 font-medium">📹 VIDEO TUTORIAL: Page de Connexion & Profil</p>
          <p className="text-sm text-slate-500 mt-2">Durée: 3 minutes</p>
        </div>
      </div>
    </div>
  </div>
)

const DashboardSection: React.FC<SectionProps> = ({ userRole }) => (
  <div className="space-y-8">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl" />
      <div className="relative">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          📊 Tableaux de Bord Personnalisés
        </h2>
        <p className="text-secondary-700">Interface adaptée à votre rôle et réseau d'accès</p>
      </div>
    </div>

    <div className="space-y-6">
      <TipBox type="info">
        <strong>Votre tableau de bord se met à jour automatiquement</strong> en temps réel selon votre rôle et vos permissions dans le système.
      </TipBox>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-purple-600 flex items-center gap-2">👥 Dashboard Agent</h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            { title: '📤 Mes Documents', desc: 'Vue complète de tous les documents que vous avez uploadés avec leur statut' },
            { title: '📍 Statuts en Temps Réel', desc: 'Suivez le traitement de chaque document: reçu, en révision, approuvé, rejeté' },
            { title: '🔔 Notifications', desc: 'Alertes immédiates sur les actions administrateur concernant vos documents' },
            { title: '📋 Modèles Disponibles', desc: 'Accédez aux templates de votre département pour vos uploads' },
            { title: '📊 Mes Statistiques', desc: 'Voir vos documents uploadés ce mois, documents approuvés, taux d\'erreur' },
            { title: '📞 Support', desc: 'Accédez rapidement au formulaire de contact pour les admins' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-lg flex gap-3 hover:shadow-md transition">
              <div className="flex-grow">
                <p className="font-bold text-purple-900">{item.title}</p>
                <p className="text-sm text-purple-800">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <TipBox type="tip">
          Les agents voient <strong>uniquement leurs propres documents</strong> et les modèles de leur département.
        </TipBox>
      </div>

      {userRole === 'admin' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <Shield size={24} /> 👨‍💼 Dashboard Administrateur (Accès Complet)
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {[
              { title: '🌍 Vue Globale Complète', desc: 'Statistiques agrégées de TOUS les documents du système' },
              { title: '✋ Révision des Documents', desc: 'Documents en attente d\'approbation de tous les départements' },
              { title: '📈 Tableaux de Bord Avancés', desc: 'Analytics détaillés, graphiques, tendances, KPIs' },
              { title: '⚙️ Panneau de Configuration', desc: 'Accès complet à tous les paramètres système' },
              { title: '👥 Gestion Utilisateurs', desc: 'Créer, modifier, supprimer comptes, assigner départements' },
              { title: '🏢 Gestion Départements', desc: 'Créer structures, définir le routage, assigner responsables' },
              { title: '🔄 Règles de Routage', desc: 'Créer et modifier les règles de routage automatique' },
              { title: '📋 Modèles Avancés', desc: 'Créer, éditer, distribuer les templates à tous les utilisateurs' },
              { title: '🔍 Audit & Logs', desc: 'Consulter tous les logs d\'action du système' },
              { title: '📊 Export de Données', desc: 'Exporter rapports en PDF, Excel, CSV' },
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 rounded-lg flex gap-3 hover:shadow-md transition">
                <Lock size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-grow">
                  <p className="font-bold text-orange-900">{item.title}</p>
                  <p className="text-sm text-orange-800">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-red-100 to-orange-100 border-l-4 border-red-600 p-6 rounded-lg">
            <p className="text-red-900 font-bold mb-2">⚠️ Responsabilités Administrateur</p>
            <p className="text-red-800 text-sm">
              En tant qu'administrateur, vous avez accès à TOUTES les données. Gérez ces permissions avec responsabilité et en respect des politiques de confidentialité.
            </p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 text-center border-2 border-dashed border-slate-400 h-64 flex items-center justify-center">
        <div>
          <Video className="mx-auto text-slate-500 mb-3" size={48} />
          <p className="text-slate-600 font-medium">📹 VIDEO TUTORIAL: Votre Tableau de Bord</p>
          <p className="text-sm text-slate-500 mt-2">Durée: 5 minutes</p>
        </div>
      </div>
    </div>
  </div>
)

const DocumentsSection: React.FC<SectionProps> = ({ userRole }) => (
  <div className="space-y-8">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl" />
      <div className="relative">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
          📄 Gestion Complète des Documents
        </h2>
        <p className="text-secondary-700">Créer, organiser, valider et router vos documents</p>
      </div>
    </div>

    <div className="space-y-6">
      <TipBox type="success">
        <strong>Format acceptés:</strong> PDF, DOCX, XLSX, PPTX, TXT (max 50 MB par document)
      </TipBox>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-cyan-600 flex items-center gap-2">
          <Upload size={24} /> Uploader & Créer
        </h3>
        <div className="space-y-3">
          {[
            { step: '1️⃣', title: 'Cliquez sur "Nouveau Document"', desc: 'Bouton rouge en haut à gauche du tableau de bord' },
            { step: '2️⃣', title: 'Sélectionnez le Type', desc: 'Rapport, Demande, Facture, Fiche de Paie, etc.' },
            { step: '3️⃣', title: 'Uploadez votre Fichier', desc: 'Glissez-déposez ou cliquez pour charger' },
            { step: '4️⃣', title: 'Remplissez les Métadonnées', desc: 'Titre, description, date, confidentialité' },
            { step: '5️⃣', title: 'Validez l\'Upload', desc: 'Cliquez "Soumettre" - le système configure automatiquement' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 p-4 rounded-lg flex gap-3">
              <span className="text-2xl">{item.step}</span>
              <div>
                <p className="font-bold text-cyan-900">{item.title}</p>
                <p className="text-sm text-cyan-800">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-cyan-600 flex items-center gap-2">
          <Folder size={24} /> Organisation par Dossiers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 p-4 rounded-lg">
            <p className="font-bold text-indigo-900 mb-2">📊 Structure Hiérarchique</p>
            <p className="text-sm text-indigo-800">
              Documents organisés par Département → Type → Sous-type <br />
              <code className="text-xs bg-white px-2 py-1 rounded mt-2 block">RH/Paies/2025/Janvier.xlsx</code>
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-lg">
            <p className="font-bold text-purple-900 mb-2">🔍 Modes de Consultation</p>
            <p className="text-sm text-purple-800">
              Vue plate: Tous les fichiers d'un coup <br />
              Vue arborescente: Naviguez par dossiers <br />
              Vue recherche: Trouvez rapidement
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-cyan-600 flex items-center gap-2">
          <CheckCircle size={24} /> Validation Automatique
        </h3>
        <TipBox type="warning">
          <strong>Le système valide automatiquement tous les documents.</strong> Si votre document est rejeté, un message d'erreur vous indique exactement ce qui ne va pas.
        </TipBox>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: '📁', title: 'Format du Fichier', desc: 'Doit être un format accepté (PDF, DOCX, etc.)' },
            { icon: '⚖️', title: 'Taille Fichier', desc: 'Ne doit pas dépasser 50 MB' },
            { icon: '📊', title: 'Contenu Excel', desc: 'Vérifie les colonnes requises, nombre de lignes' },
            { icon: '📝', title: 'Métadonnées', desc: 'Titre et description obligatoires' },
            { icon: '🗓️', title: 'Date de Fin', desc: 'La date doit être valide' },
            { icon: '🔐', title: 'Permissions', desc: 'Votre profil doit avoir accès au dossier cible' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-br from-lime-50 to-green-50 border border-lime-200 p-4 rounded-lg">
              <p className="font-bold text-lime-900 flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                {item.title}
              </p>
              <p className="text-sm text-lime-800 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-cyan-600 flex items-center gap-2">
          <Zap size={24} /> Routage Rapide
        </h3>
        <TipBox type="tip">
          <strong>Après validation,</strong> votre document est automatiquement routé vers les bons bureaux selon les règles configurées. Pas besoin d'actions manuelles!
        </TipBox>
      </div>

      {userRole === 'agent' && (
        <TipBox type="info">
          <strong>💡 Conseil pour Agents:</strong> Utilisez les modèles disponibles pour éviter les erreurs de validation. Consultez le guide des templates pour plus de détails.
        </TipBox>
      )}

      {userRole === 'admin' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <Lock size={24} /> Fonctionnalités Administrateur
          </h3>
          <div className="space-y-2">
            {[
              '🔍 Voir TOUS les documents de tous les utilisateurs',
              '✏️ Éditer les métadonnées de n\'importe quel document',
              '🗑️ Archiver ou supprimer des documents',
              '🔄 Rediriger manually un document vers un autre dossier',
              '📊 Générer des rapports d\'audit sur tous les documents',
              '🔐 Modifier les permissions d\'accès aux dossiers',
            ].map((item, i) => (
              <div key={i} className="bg-orange-50 border border-orange-200 p-2 rounded text-orange-800 text-sm">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
          <Folder size={24} /> Recevoir des Documents
        </h3>
        <TipBox type="success">
          <strong>Les collègues peuvent vous envoyer des documents directement!</strong> Ils apparaîtront automatiquement dans votre dossier personnel <code className="bg-white px-2 py-1 rounded">"Received - Votre Nom"</code>
        </TipBox>
        <div className="space-y-3">
          {[
            { step: '📥', title: 'Vous Recevez un Document', desc: 'Un collègue l\'envoie directement via l\'option "Envoyer vers un destinataire" → Utilisateur' },
            { step: '📂', title: 'Accédez à votre Dossier Reçu', desc: 'Dans la barre latérale Documents, vous verrez "Received - [Votre Nom]"' },
            { step: '👁️', title: 'Visualisez les Documents', desc: 'Cliquez sur le document pour voir son contenu ou le télécharger' },
            { step: '🔄', title: 'Organisez vos Reçus', desc: 'Vous pouvez créer des sous-dossiers dans "Received" pour mieux organiser' },
            { step: '💾', title: 'Archivez ou Supprimez', desc: 'Gérez vos documents reçus - ils restent accessibles dans l\'historique' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-lg flex gap-3">
              <span className="text-2xl">{item.step}</span>
              <div>
                <p className="font-bold text-emerald-900">{item.title}</p>
                <p className="text-sm text-emerald-800">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <FileUp size={24} /> Envoyer un Document à un Destinataire
        </h3>
        <TipBox type="tip">
          <strong>Comment partager un document avec un collègue:</strong>
        </TipBox>
        <div className="space-y-3">
          {[
            { step: '1️⃣', title: 'Ouvrez le formulaire de création', desc: 'Documents → "Nouveau Document" (bouton "Uploader un Document")' },
            { step: '2️⃣', title: 'Activez "Envoyer vers un destinataire"', desc: 'Toggle le switch bleu: "📤 Envoyer vers un destinataire"' },
            { step: '3️⃣', title: 'Sélectionnez le type de destinataire', desc: 'Choisissez entre: 🌍 Pôle, 🏢 Filiale, 📂 Service, ou 👤 Utilisateur' },
            { step: '4️⃣', title: 'Sélectionnez le destinataire', desc: 'Choisissez le nom de l\'utilisateur dans la liste déroulante' },
            { step: '5️⃣', title: 'Uploadez et validez', desc: 'Le document sera directement placé dans le dossier spécial du destinataire' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg flex gap-3">
              <span className="text-2xl">{item.step}</span>
              <div>
                <p className="font-bold text-blue-900">{item.title}</p>
                <p className="text-sm text-blue-800">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-lg">
          <p className="font-bold text-amber-900 mb-2">⚡ Important</p>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Quand vous envoyez vers un destinataire, les champs "Pôle", "Filiale" et "Service" sont masqués (ce n'est pas nécessaire)</li>
            <li>• Le destinataire recevra le document IMMÉDIATEMENT dans son dossier "Received - [Son Nom]"</li>
            <li>• Le document ne subit PAS les routages automatiques habituels</li>
            <li>• Le destinataire peut visualiser, télécharger et archiver le document</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 text-center border-2 border-dashed border-slate-400 h-64 flex items-center justify-center">
        <div>
          <Video className="mx-auto text-slate-500 mb-3" size={48} />
          <p className="text-slate-600 font-medium">📹 VIDEO TUTORIAL: Upload & Gestion des Documents</p>
          <p className="text-sm text-slate-500 mt-2">Durée: 7 minutes</p>
        </div>
      </div>
    </div>
  </div>
)

const SchedulingSection: React.FC<SectionProps> = ({ userRole }) => (
  <div className="space-y-8">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-red-500/5 rounded-2xl" />
      <div className="relative">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent mb-2">
          📅 Calendrier & Planification
        </h2>
        <p className="text-secondary-700">Organisez vos événements et planifiez vos envois emails</p>
      </div>
    </div>

    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-rose-600 flex items-center gap-2">
          <Calendar size={24} /> Calendrier Central
        </h3>
        <TipBox type="success">
          <strong>Consultez tous les événements et emails planifiés</strong> au même endroit. Vue mensuelle intuitive avec filtres intelligents.
        </TipBox>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 p-4 rounded-lg">
            <p className="font-bold text-rose-900 mb-2">📊 Vue Mensuelle</p>
            <p className="text-sm text-rose-800">
              Grille traditionnelle avec tous les événements du mois. Jours surlignés selon l'importance des événements.
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4 rounded-lg">
            <p className="font-bold text-orange-900 mb-2">📋 Liste À Venir</p>
            <p className="text-sm text-orange-800">
              Tous les événements à venir triés par date. Statuts visuels pour une identification rapide.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { icon: '🖱️', step: 'Naviguez', desc: 'Utilisez les flèches pour passer d\'un mois à l\'autre' },
            { icon: '👁️', step: 'Explorez', desc: 'Passez la souris sur un jour pour voir les événements. Cliquez pour plus de détails' },
            { icon: '📌', step: 'Épinglez', desc: 'Le jour actuel est surlighté en rouge avec une barre supérieure visuelle' },
            { icon: '🎨', step: 'Identifiez', desc: 'Code couleur: points bleus pour emails, points rouges pour événements' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 p-3 rounded-lg flex gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-bold text-rose-900 text-sm">{item.step}</p>
                <p className="text-xs text-rose-800">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
          <Plus size={24} /> Créer de Nouveaux Événements
        </h3>
        <TipBox type="tip">
          <strong>Tous les utilisateurs peuvent créer des événements personnels.</strong> Les événements publics sont visibles par tous.
        </TipBox>
        <div className="space-y-3">
          {[
            { step: '1️⃣', title: 'Cliquez sur "Nouvel événement"', desc: 'Bouton rouge en haut à droite du calendrier' },
            { step: '2️⃣', title: 'Remplissez les informations', desc: 'Titre (obligatoire) et date (obligatoire)' },
            { step: '3️⃣', title: 'Ajoutez les détails', desc: 'Horaires optionnels, lieu, description détaillée' },
            { step: '4️⃣', title: 'Définissez la visibilité', desc: 'Privé (vous seul) ou Public (tous les utilisateurs)' },
            { step: '5️⃣', title: 'Validez la création', desc: 'Cliquez "Créer l\'événement". L\'événement apparaît immédiatement en calendrier' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 p-4 rounded-lg flex gap-3">
              <span className="text-2xl">{item.step}</span>
              <div>
                <p className="font-bold text-blue-900">{item.title}</p>
                <p className="text-sm text-blue-800">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {userRole === 'admin' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-purple-600 flex items-center gap-2">
            <Mail size={24} /> Planification des Emails
          </h3>
          <TipBox type="info">
            <strong>🔐 Fonction réservée aux administrateurs et managers</strong> - Planifiez des envois d'emails en masse à certains utilisateurs ou départements.
          </TipBox>
          <div className="space-y-3">
            {[
              { step: '1️⃣', title: 'Accédez à la planification', desc: 'Calendrier → Bouton "Planification emails" (réservé aux managers)' },
              { step: '2️⃣', title: 'Créez un nouvel email', desc: 'Remplissez l\'objet, le corps du message, destinataires' },
              { step: '3️⃣', title: 'Définissez des règles', desc: 'Filtrez par département, pôle, filiale ou utilisateurs spécifiques' },
              { step: '4️⃣', title: 'Planifiez la date/heure', desc: 'L\'email s\'enverra automatiquement à l\'heure programmée' },
              { step: '5️⃣', title: 'Suivi', desc: 'Voir le statut: Brouillon → Programmé → Envoyé. Annulation possible avant l\'envoi' },
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 p-4 rounded-lg flex gap-3">
                <span className="text-2xl">{item.step}</span>
                <div>
                  <p className="font-bold text-purple-900">{item.title}</p>
                  <p className="text-sm text-purple-800">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 p-4 rounded-lg">
            <p className="font-bold text-orange-900 mb-3">⚡ Statuts des Emails</p>
            <div className="space-y-2 text-sm text-orange-800">
              <div><span className="font-bold text-gray-500">Brouillon:</span> Email en cours de rédaction (modifiable)</div>
              <div><span className="font-bold text-blue-600">Programmé:</span> En attente de la date/heure programmée</div>
              <div><span className="font-bold text-green-600">Envoyé:</span> Email livré avec succès</div>
              <div><span className="font-bold text-red-600">Échoué:</span> Erreur lors de l\'envoi (impossible à renvoyer)</div>
              <div><span className="font-bold text-purple-600">Annulé:</span> Annulation avant l\'envoi</div>
            </div>
          </div>
        </div>
      )}

      {userRole === 'admin' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <Settings size={24} /> Gestion Complète des Événements
          </h3>
          <TipBox type="warning">
            <strong>🔐 Réservé aux administrateurs</strong> - Interface complète pour créer, modifier, archiver des événements.
          </TipBox>
          <div className="space-y-3">
            {[
              '✏️ Créer des événements pour les autres utilisateurs',
              '🔄 Modifier ou archiver des événements existants',
              '👥 Assigner des événements à plusieurs utilisateurs',
              '📢 Marquer comme "Événement Général" (visible par tous)',
              '🎯 Planifier des récurrences (quotidien, hebdomadaire, mensuel)',
              '🔐 Contrôler les permissions d\'accès',
              '📊 Générer des rapports d\'utilisation',
              '📤 Exporter les événements en format iCalendar',
            ].map((item, i) => (
              <div key={i} className="bg-indigo-50 border border-indigo-200 p-3 rounded text-indigo-800 text-sm flex items-center gap-2">
                <span>{item.split(' ')[0]}</span>
                <span>{item.substring(item.indexOf(' ')).trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 text-center border-2 border-dashed border-slate-400 h-64 flex items-center justify-center">
        <div>
          <Video className="mx-auto text-slate-500 mb-3" size={48} />
          <p className="text-slate-600 font-medium">📹 VIDEO: Utiliser le Calendrier</p>
          <p className="text-sm text-slate-500 mt-2">Durée: 5 minutes</p>
        </div>
      </div>
    </div>
  </div>
)

const TemplatesSection: React.FC<SectionProps> = ({ userRole }) => (
  <div className="space-y-8">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/5 to-pink-500/5 rounded-2xl" />
      <div className="relative">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-fuchsia-600 to-pink-600 bg-clip-text text-transparent mb-2">
          📋 Modèles de Documents
        </h2>
        <p className="text-secondary-700">Créer et utiliser des templates professionnels</p>
      </div>
    </div>

    <div className="space-y-6">
      <TipBox type="success">
        <strong>Les modèles simplifient votre travail</strong> et réduisent les erreurs de validation. Utilisez-les autant que possible!
      </TipBox>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-fuchsia-600 flex items-center gap-2">
          👥 Pour les Agents
        </h3>
        <div className="space-y-3">
          {[
            { icon: '📍', step: 'Accès', desc: 'Menu principal → Onglet **Documents** → Section **Modèles Disponibles**' },
            { icon: '👁️', step: 'Explorez', desc: 'Consultez tous les templates disponibles pour votre département' },
            { icon: '⬇️', step: 'Téléchargez', desc: 'Cliquez sur le bouton **Télécharger** (icône flèche vers le bas) pour récupérer le fichier template' },
            { icon: '✏️', step: 'Remplissez', desc: 'Complétez le formulaire ou la feuille Excel selon les instructions du modèle' },
            { icon: '✅', step: 'Validez', desc: 'Vérifiez que tout est correct et conforme au template avant submission' },
            { icon: '⬆️', step: 'Uploadez', desc: 'Allez dans **Documents → Onglet Upload** et uploadez votre fichier rempli' },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-r from-fuchsia-50 to-pink-50 border border-fuchsia-200 p-4 rounded-lg flex gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-bold text-fuchsia-900">{item.step}</p>
                <p className="text-sm text-fuchsia-800">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <TipBox type="tip">
          Les templates incluent des instructions détaillées. Lisez-les attentivement!
        </TipBox>

        <div className="bg-gradient-to-br from-fuchsia-100 to-pink-100 border border-fuchsia-300 p-6 rounded-lg">
          <p className="font-bold text-fuchsia-900 mb-3">📋 Types de Templates Disponibles:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              '📊 Feuilles de Paie (Excel)',
              '📝 Rapports Mensuels',
              '👥 Fiches Individuelles',
              '💰 Justificatifs de Frais',
              '📦 Inventaires',
              '🎯 Planifications',
              '📅 Calendriers de Présence',
              '🏆 Évaluations de Performance',
            ].map((t, i) => (
              <div key={i} className="bg-white p-3 rounded border border-fuchsia-200 text-fuchsia-700 text-sm flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <Lock size={24} /> Pour les Administrateurs
          </h3>
          
          <TipBox type="warning">
            <strong>Accès complet à la gestion des templates.</strong> Vous pouvez créer, modifier, distribuer et supprimer tous les modèles.
          </TipBox>

          <div className="space-y-3">
            {[
              { icon: '➕', step: 'Créer', desc: 'Menu **Gestion des Modèles** (sidebar) → Bouton **+ Nouveau Template**' },
              { icon: '✏️', step: 'Éditer', desc: 'Clic droit sur un template ou bouton **Éditer** (icône crayon) pour modifier' },
              { icon: '👁️', step: 'Visibilité', desc: 'Lors de la création, sélectionnez les départements autorisés à voir ce template' },
              { icon: '🔄', step: 'Versionnage', desc: 'Utilisez le système de versions: marquez comme v1.0, puis créez v1.1, v2.0' },
              { icon: '📤', step: 'Distribuer', desc: 'Le template apparaît automatiquement dans **Documents → Modèles** pour les departements assignés' },
              { icon: '🗑️', step: 'Archiver', desc: 'Marquez comme "Archivé" au lieu de supprimer (conservation de l\'historique)' },
              { icon: '📊', step: 'Analytics', desc: 'Voir les statistiques d\'utilisation dans le menu **Gestion des Modèles** (sidebar)' },
            ].map((item, i) => (
              <div key={i} className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 rounded-lg flex gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-bold text-orange-900">{item.step}</p>
                  <p className="text-sm text-orange-800">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-orange-50 border-l-4 border-rose-600 p-6 rounded-lg">
            <p className="font-bold text-rose-900 mb-3">⚙️ Configuration Avancée des Templates</p>
            <ul className="space-y-2 text-rose-800 text-sm">
              <li>✓ <strong>Règles de Validation:</strong> Définir quels champs sont obligatoires</li>
              <li>✓ <strong>Formats Excel:</strong> Spécifier types de colonnes, formats de dates</li>
              <li>✓ <strong>Permissions:</strong> Qui peut télécharger, modifier, soumettre</li>
              <li>✓ <strong>Routage Auto:</strong> Diriger automatiquement vers le bon département</li>
              <li>✓ <strong>Notifications:</strong> Alerter admins quand template soumis</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 text-center border-2 border-dashed border-slate-400 h-48 flex items-center justify-center">
            <div>
              <Code className="mx-auto text-slate-500 mb-3" size={48} />
              <p className="text-slate-600 font-medium">💻 DOCUMENTATION: API Templates (pour DEV)</p>
              <p className="text-sm text-slate-500 mt-2">Intégrations personnalisées</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 text-center border-2 border-dashed border-slate-400 h-64 flex items-center justify-center">
        <div>
          <Video className="mx-auto text-slate-500 mb-3" size={48} />
          <p className="text-slate-600 font-medium">📹 VIDEO TUTORIAL: Utilisation des Templates</p>
          <p className="text-sm text-slate-500 mt-2">Durée: 4 minutes</p>
        </div>
      </div>
    </div>
  </div>
)

const AdminSection: React.FC<SectionProps> = ({ userRole }) => {
  const [expandedStep, setExpandedStep] = useState<string | null>('setup-branches')

  if (userRole !== 'admin') {
    return (
      <div className="space-y-8">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 rounded-2xl" />
          <div className="relative">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-4">
              🔒 Accès Restreint
            </h2>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-100 to-orange-100 border-l-4 border-red-600 p-8 rounded-lg text-center">
          <Lock size={48} className="mx-auto text-red-600 mb-4" />
          <p className="text-red-900 font-bold text-lg mb-2">Cette section est réservée aux administrateurs</p>
          <p className="text-red-800">
            Vous n'avez pas les permissions nécessaires pour accéder au guide d'administration. 
            Contactez votre administrateur système si vous pensez que c'est une erreur.
          </p>
        </div>
      </div>
    )
  }

  const setupSteps = [
    {
      id: 'setup-folders',
      title: '📁 ÉTAPE 1: Créer et Organiser les Dossiers (Hiérarchie)',
      icon: '🗂️',
      description: 'Définir la hiérarchie des dossiers (Pôle → Filiale → Service)',
      content: (
        <div className="space-y-4">
          <TipBox type="info">
            <strong>Dossiers = Hiérarchie d'organisation</strong> (ex: Pôle Operations → Filiale Dakar → Service RH)
          </TipBox>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 p-6 rounded-lg space-y-4">
            <p className="font-bold text-blue-900">📁 Comment Créer et Organiser les Dossiers:</p>
            <ol className="space-y-3 text-blue-800 text-sm">
              <li className="flex gap-3">
                <span className="font-bold bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <span>Cliquez sur le menu <strong>Folders</strong> dans la barre latérale</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <span>Créez d'abord les <strong>Pôles</strong> (divisions principales de votre organisation)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <span>Sous chaque Pôle, créez les <strong>Filiales</strong> (localisations/branches)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                <span>Sous chaque Filiale, créez les <strong>Services</strong> (divisions fonctionnelles)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-blue-200 text-blue-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">5</span>
                <span>Cliquez <strong>Enregistrer</strong> ou <strong>Créer</strong> pour confirmer chaque dossier</span>
              </li>
            </ol>
          </div>

          <div className="bg-white border border-blue-200 p-4 rounded space-y-2">
            <p className="font-bold text-blue-900">Exemple de Hiérarchie:</p>
            <div className="text-sm text-blue-800 space-y-1 pl-4 border-l-4 border-blue-300 font-mono">
              <p>📦 Pôle Operations</p>
              <p className="ml-4">└─ 🏪 Filiale Dakar</p>
              <p className="ml-8">├─ 📊 Service RH</p>
              <p className="ml-8">├─ 💰 Service Finance</p>
              <p className="ml-8">└─ 🚚 Service Logistique</p>
              <p className="ml-4">└─ 🏪 Filiale Saint-Louis</p>
              <p className="ml-8">├─ 📊 Service RH</p>
              <p className="ml-8">└─ 🎯 Service Ventes</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'setup-document-types',
      title: '📄 ÉTAPE 2: Créer les Types de Documents',
      icon: '📋',
      description: 'Catégoriser les types de documents acceptés',
      content: (
        <div className="space-y-4">
          <TipBox type="info">
            <strong>Type de Document = Catégorie de fichier</strong> (ex: Attestation, Contrat, Rapports, CV, Paiement)
          </TipBox>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 rounded-lg space-y-4">
            <p className="font-bold text-green-900">📝 Comment Créer un Type de Document:</p>
            <ol className="space-y-3 text-green-800 text-sm">
              <li className="flex gap-3">
                <span className="font-bold bg-green-200 text-green-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <span>Cliquez sur le menu <strong>Types de Documents</strong> dans la barre latérale (Administration)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-green-200 text-green-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <span>Cliquez sur le bouton <strong>+ Créer Type Document</strong> ou <strong>+ Ajouter</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-green-200 text-green-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <span>Remplissez: <strong>Nom</strong> (ex: Attestation Travail), sélectionnez le <strong>Département</strong> responsable</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-green-200 text-green-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                <span>Optionnel: Configurez les <strong>Champs Obligatoires</strong> additionnels si nécessaire</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-green-200 text-green-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">5</span>
                <span>Cliquez <strong>Créer</strong> ou <strong>Enregistrer</strong> pour valider</span>
              </li>
            </ol>
          </div>

          <div className="bg-white border border-green-200 p-4 rounded space-y-2">
            <p className="font-bold text-green-900">Types de Documents Courants:</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
              <div>📋 Attestations</div>
              <div>📜 Contrats</div>
              <div>📊 Rapports</div>
              <div>📄 Factures</div>
              <div>👤 CVs</div>
              <div>🎓 Certificats</div>
              <div>📸 Captures</div>
              <div>🔐 Documents Confidentiels</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'setup-file-types',
      title: '⚙️ ÉTAPE 3: Configurer les Types de Fichiers (Formats)',
      icon: '⚙️',
      description: 'Définir les formats acceptés et leurs validations',
      content: (
        <div className="space-y-4">
          <TipBox type="info">
            <strong>Type de Fichier = Format</strong> (ex: PDF, Excel, Word) avec règles de validation
          </TipBox>
          
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 p-6 rounded-lg space-y-4">
            <p className="font-bold text-orange-900">⚙️ Comment Configurer les Formats de Fichiers:</p>
            <ol className="space-y-3 text-orange-800 text-sm">
              <li className="flex gap-3">
                <span className="font-bold bg-orange-200 text-orange-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <span>Cliquez sur le menu <strong>File Type Config</strong> dans la barre latérale (Administration)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-orange-200 text-orange-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <span>Consultez les formats existants ou cliquez <strong>+ Ajouter Format</strong> pour en créer un nouveau</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-orange-200 text-orange-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <span>Remplissez: <strong>Extension</strong> (.pdf, .xlsx, .docx), <strong>Taille Max</strong> (en MB)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-orange-200 text-orange-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                <span>Optionnel: Configurez des <strong>Validations</strong> (contenu, signatures, colonnes)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-orange-200 text-orange-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">5</span>
                <span>Cliquez <strong>Enregistrer</strong> ou <strong>Créer</strong></span>
              </li>
            </ol>
          </div>

          <div className="bg-white border border-orange-200 p-4 rounded space-y-3">
            <p className="font-bold text-orange-900">Exemple de Configuration PDF:</p>
            <div className="text-sm text-orange-800 space-y-1 bg-orange-50 p-3 rounded">
              <p>📄 <strong>Extension:</strong> .pdf</p>
              <p>📄 <strong>Type MIME:</strong> application/pdf</p>
              <p>📄 <strong>Taille Max:</strong> 50 MB</p>
              <p>📄 <strong>Validations:</strong> Signature électronique requise</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'setup-associations',
      title: '🔗 ÉTAPE 4: Configurer les Règles de Routage et Associations',
      icon: '🔗',
      description: 'Lier les formats acceptés à chaque type de document',
      content: (
        <div className="space-y-4">
          <TipBox type="info">
            <strong>Association = Règle</strong> (ex: Type "Attestation" accepte seulement PDF et DOCX, max 10MB)
          </TipBox>
          
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-6 rounded-lg space-y-4">
            <p className="font-bold text-indigo-900">🔗 Comment Associer (Lier Types Fichiers et Types Documents):</p>
            <ol className="space-y-3 text-indigo-800 text-sm">
              <li className="flex gap-3">
                <span className="font-bold bg-indigo-200 text-indigo-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <span>Cliquez sur le menu <strong>Routing Rules</strong> dans la barre latérale (Administration)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-indigo-200 text-indigo-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <span>Créez une nouvelle règle: sélectionnez un <strong>Service/Dossier source</strong> et un <strong>Type de Document</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-indigo-200 text-indigo-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <span>Définissez le <strong>Dossier de destination</strong> où les documents de ce type seront routés automatiquement</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-indigo-200 text-indigo-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                <span>Optionnel: Configurez des <strong>conditions supplémentaires</strong> (par utilisateur, zone horaire, etc.)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-indigo-200 text-indigo-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">5</span>
                <span>Cliquez <strong>Enregistrer</strong> ou <strong>Créer la Règle</strong> pour activer le routage</span>
              </li>
            </ol>
          </div>

          <div className="bg-white border border-indigo-200 p-4 rounded space-y-3">
            <p className="font-bold text-indigo-900">Exemple d'Association:</p>
            <div className="text-sm text-indigo-800 space-y-2">
              <div className="bg-indigo-50 p-3 rounded">
                <p className="font-bold">Type: Attestation Travail</p>
                <p className="text-xs">Accepte: PDF ✓ | DOCX ✓ | XLS ✗</p>
                <p className="text-xs">Taille max: 10 MB</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded">
                <p className="font-bold">Type: Rapport Financier</p>
                <p className="text-xs">Accepte: XLSX ✓ | CSV ✓ | PDF ✓</p>
                <p className="text-xs">Taille max: 50 MB</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'promote-to-admin',
      title: '👑 ÉTAPE 5: Gérer les Utilisateurs et Promouvoir en Administrateur',
      icon: '⬆️',
      description: 'Changer le rôle après l\'inscription',
      content: (
        <div className="space-y-4">
          <TipBox type="warning">
            <strong>⚠️ Attention!</strong> Promouvoir un agent en admin lui donne accès à TOUTES les données et fonctionnalités d'administration. À faire avec prudence!
          </TipBox>
          
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 p-6 rounded-lg space-y-4">
            <p className="font-bold text-red-900">👑 Comment Promouvoir un Agent:</p>
            <ol className="space-y-3 text-red-800 text-sm">
              <li className="flex gap-3">
                <span className="font-bold bg-red-200 text-red-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <span>Allez dans le menu <strong>Utilisateurs</strong> (sidebar)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-red-200 text-red-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <span>Trouvez l'agent à promouvoir (utilisez la barre de recherche)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-red-200 text-red-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <span>Cliquez sur <strong>Modifier</strong> (icône crayon)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-red-200 text-red-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                <span>Localisez le champ <strong>Rôle</strong> (actuellement "AGENT")</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-red-200 text-red-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">5</span>
                <span>Changez-le en <strong>"ADMIN"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-red-200 text-red-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">6</span>
                <span>Cochez <strong>"Est Staff"</strong> (pour lui donner accès au back-office)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-red-200 text-red-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">7</span>
                <span>Cliquez <strong>Enregistrer les modifications</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-red-200 text-red-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">8</span>
                <span>L'agent voit immédiatement son rôle changé (refresh du navigateur)</span>
              </li>
            </ol>
          </div>

          <TipBox type="success">
            💡 L'agent doit se déconnecter et se reconnecter pour voir l'interface administrateur complète.
          </TipBox>

          <div className="bg-white border border-red-200 p-4 rounded space-y-2">
            <p className="font-bold text-red-900">Après Promotion:</p>
            <div className="text-sm text-red-800 space-y-2">
              <p>✓ Accès au menu <strong>Admin</strong> (onglet supplémentaire)</p>
              <p>✓ Voir tous les utilisateurs, dossiers, règles de routage</p>
              <p>✓ Créer des types de documents, configurer fichiers</p>
              <p>✓ Voir les logs d'audit et rapports complets</p>
              <p>✗ Ne peut pas revenir en AGENT (demander à super-admin)</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'audit-logs',
      title: '🔒 ÉTAPE 6 (Optionnel): Consulter les Logs d\'Audit',
      icon: '📋',
      description: 'Vérifier toutes les actions effectuées dans le système',
      content: (
        <div className="space-y-4">
          <TipBox type="info">
            <strong>Audit Logs = Historique complet</strong> de toutes les actions: créations, modifications, suppressions, téléchargements, erreurs
          </TipBox>
          
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 p-6 rounded-lg space-y-4">
            <p className="font-bold text-slate-900">📋 Comment Consulter les Logs d'Audit:</p>
            <ol className="space-y-3 text-slate-800 text-sm">
              <li className="flex gap-3">
                <span className="font-bold bg-slate-200 text-slate-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <span>Cliquez sur le menu <strong>Audit Logs</strong> dans la barre latérale (Administration)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-slate-200 text-slate-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <span>Vous verrez une liste complète de toutes les actions:</span>
              </li>
              <li className="ml-8 text-xs text-slate-700 space-y-1">
                <p>📝 <strong>Créations:</strong> nouveau document, nouvel utilisateur, nouveau type de document</p>
                <p>✏️ <strong>Modifications:</strong> mise à jour de données, changements de rôle</p>
                <p>🗑️ <strong>Suppressions:</strong> documents, utilisateurs et configurations supprimés</p>
                <p>📥 <strong>Téléchargements:</strong> fichiers téléchargés pour consultation</p>
                <p>⚠️ <strong>Erreurs:</strong> erreurs lors du routage, validations échouées</p>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-slate-200 text-slate-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <span>Utilisez les <strong>filtres</strong> pour rechercher par date, utilisateur, type d'action</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-slate-200 text-slate-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                <span>Cliquez sur une ligne pour voir les <strong>détails complets</strong> de l'action</span>
              </li>
            </ol>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded space-y-3">
            <p className="font-bold text-slate-900">Informations Disponibles dans les Logs:</p>
            <div className="text-sm text-slate-800 space-y-2">
              <div className="bg-slate-50 p-3 rounded">
                <p className="font-bold">🕐 <strong>Timestamp:</strong> Date et heure exacte de l'action</p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="font-bold">👤 <strong>Utilisateur:</strong> Qui a effectué l'action</p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="font-bold">⚡ <strong>Action:</strong> Type d'action (CREATE, UPDATE, DELETE, DOWNLOAD)</p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="font-bold">📄 <strong>Ressource:</strong> Quel élément a été modifié (Document, User, DocType)</p>
              </div>
              <div className="bg-slate-50 p-3 rounded">
                <p className="font-bold">📊 <strong>Statut:</strong> Succès (✓) ou Erreur (✗)</p>
              </div>
            </div>
          </div>

          <TipBox type="success">
            💡 Utilisez les logs régulièrement pour vérifier la conformité, identifier les problèmes et audit les accès aux documents sensibles.
          </TipBox>
        </div>
      )
    },
    {
      id: 'settings-advanced',
      title: '⚡ ÉTAPE 7 (Optionnel): Configuration Avancée du Système',
      icon: '⚙️',
      description: 'Ajuster les paramètres globaux du système',
      content: (
        <div className="space-y-4">
          <TipBox type="warning">
            <strong>⚠️ Attention!</strong> Les paramètres avancés affectent le fonctionnement global du système. À configurer avec soin!
          </TipBox>
          
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 p-6 rounded-lg space-y-4">
            <p className="font-bold text-indigo-900">⚙️ Comment Accéder à la Configuration Avancée:</p>
            <ol className="space-y-3 text-indigo-800 text-sm">
              <li className="flex gap-3">
                <span className="font-bold bg-indigo-200 text-indigo-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                <span>(Optionnel) Accédez à <strong>Django Admin</strong> (URL: /admin/) si vous avez les droits super-admin</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-indigo-200 text-indigo-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                <span>Les paramètres principaux sont gérés via des <strong>variables d'environnement</strong> ou le fichier <strong>settings.py</strong> (backend)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold bg-indigo-200 text-indigo-900 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                <span>Contactez l'équipe technique pour modifier les paramètres critiques</span>
              </li>
            </ol>
          </div>

          <div className="bg-white border border-indigo-200 p-4 rounded space-y-3">
            <p className="font-bold text-indigo-900">Paramètres Configurable:</p>
            <div className="text-sm text-indigo-800 space-y-2">
              <div className="bg-indigo-50 p-3 rounded border-l-4 border-indigo-300">
                <p className="font-bold">🌍 <strong>Fuseau Horaire (TIMEZONE):</strong></p>
                <p className="text-xs">Exemple: Africa/Dakar, Africa/Lagos</p>
                <p className="text-xs">Affecte: Tous les timestamps, planifications emails</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded border-l-4 border-indigo-300">
                <p className="font-bold">📅 <strong>Format de Date (DATE_FORMAT):</strong></p>
                <p className="text-xs">Exemple: dd/mm/yyyy, yyyy-mm-dd</p>
                <p className="text-xs">Affecte: Affichage partout dans l'interface</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded border-l-4 border-indigo-300">
                <p className="font-bold">💾 <strong>Limites de Stockage (MAX_UPLOAD_SIZE):</strong></p>
                <p className="text-xs">Exemple: 100MB par document, 1GB par utilisateur</p>
                <p className="text-xs">Affecte: Validation lors de l'upload</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded border-l-4 border-indigo-300">
                <p className="font-bold">📧 <strong>Configuration SMTP (Email):</strong></p>
                <p className="text-xs">Email serveur: smtp.ovh.net, Port: 465, SSL: True</p>
                <p className="text-xs">Affecte: Envoi de notifications et planifications</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded border-l-4 border-indigo-300">
                <p className="font-bold">♻️ <strong>Rétention des Données (DATA_RETENTION):</strong></p>
                <p className="text-xs">Exemple: Garder logs 90 jours, documents 5 ans</p>
                <p className="text-xs">Affecte: Nettoyage automatique des données anciennes</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded border-l-4 border-indigo-300">
                <p className="font-bold">🔗 <strong>Intégrations (EXTERNAL_APIS):</strong></p>
                <p className="text-xs">APIs externes, webhooks, systèmes tiers</p>
                <p className="text-xs">Affecte: Synchronisation avec autres outils</p>
              </div>
            </div>
          </div>

          <TipBox type="success">
            💡 Les changements de configuration nécessitent souvent un redémarrage du serveur. Coordonnez avec l'équipe technique pour les modifications critiques.
          </TipBox>
        </div>
      )
    },
  ]

  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 rounded-2xl" />
        <div className="relative">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
            ⚙️ Guide Complet d'Administration
          </h2>
          <p className="text-secondary-700">Configuration complète du système depuis zéro</p>
        </div>
      </div>

      <TipBox type="warning">
        <strong>⚠️ Important!</strong> Suivez les étapes 1-6 dans l'ordre. La configuration du système dépend de la hiérarchie: Dossiers (Pôle → Filiale → Service) → Types Documents → Types Fichiers → Routing Rules → Utilisateurs → Audit Logs. L'étape 7 (Configuration Avancée) est optionnelle.
      </TipBox>

      {/* Setup Steps Accordion */}
      <div className="space-y-3">
        {setupSteps.map((step) => (
          <div key={step.id} className="border border-secondary-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              className="w-full p-4 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4 text-left">
                <span className="text-3xl">{step.icon}</span>
                <div>
                  <p className="font-bold text-orange-900">{step.title}</p>
                  <p className="text-sm text-orange-700">{step.description}</p>
                </div>
              </div>
              <ChevronRight 
                size={24} 
                className={`text-orange-600 transition-transform ${expandedStep === step.id ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedStep === step.id && (
              <div className="p-6 bg-white border-t border-secondary-200">
                {step.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Additional Admin Features */}
      {[
        {
          title: '👥 Gestion des Utilisateurs',
          icon: '👥',
          description: 'Créer, modifier et gérer les comptes utilisateur',
          items: [
            '✓ Créer de nouveaux utilisateurs (Agents, Responsables, Admins)',
            '✓ Modifier les informations personnelles',
            '✓ Assigner à un ou plusieurs départements',
            '✓ Définir le rôle et les permissions',
            '✓ Générer des accès temporaires (ex: consultants)',
            '✓ Réinitialiser les mots de passe',
            '✓ Désactiver/Réactiver des comptes',
            '✓ Supprimer des utilisateurs (avec archivage des données)',
            '✓ Voir l\'historique de connexion',
          ]
        },
        {
          title: '📁 Gestion de la Structure Hiérarchique (Folders)',
          icon: '📁',
          description: 'Organiser Pôle → Filiale → Service',
          items: [
            '✓ Créer la structure hiérarchique (Pôle, Filiale, Service) via menu Folders',
            '✓ Assigner les responsables et chefs de service',
            '✓ Configurer les permissions d\'accès par dossier',
            '✓ Activer/Désactiver les dossiers',
            '✓ Archiver les anciens dossiers/services',
            '✓ Voir les statistiques par dossier/département',
            '✓ Gérer les quotas de stockage',
          ]
        },
        {
          title: '� Routage Automatique & Règles (Routing Rules)',
          icon: '🔄',
          description: 'Configurer le flux de travail automatique',
          items: [
            '✓ Créer des règles de routage via menu Routing Rules',
            '✓ Lier type de document → dossier de destination',
            '✓ Définir des conditions (département source, type document)',
            '✓ Routage automatique vers le bon dossier/service',
            '✓ Gérer les exceptions et cas spéciaux',
            '✓ Tester les règles avant activation',
            '✓ Activer/Désactiver les règles',
            '✓ Voir les statistiques de routage',
          ]
        },
        {
          title: '� Types de Documents',
          icon: '📄',
          description: 'Définir et gérer les catégories de documents',
          items: [
            '✓ Accéder via le menu Types de Documents (Administration)',
            '✓ Créer de nouveaux types de documents (Attestation, Contrat, etc)',
            '✓ Éditer les types existants',
            '✓ Définir les champs obligatoires pour chaque type',
            '✓ Assigner à un service/département responsable',
            '✓ Activer/Désactiver les types selon les besoins',
            '✓ Voir combien de documents de chaque type',
          ]
        },
        {
          title: '⚙️ Configuration Types de Fichiers (File Type Config)',
          icon: '⚙️',
          description: 'Configurer les formats et validations de fichiers',
          items: [
            '✓ Accéder via le menu File Type Config (Administration)',
            '✓ Créer/éditer les formats acceptés (PDF, XLSX, DOCX, etc)',
            '✓ Définir la taille maximale par format',
            '✓ Configurer les validations (signatures, contenu, etc)',
            '✓ Associer les formats aux types de documents',
            '✓ Activer/Désactiver les formats selon les besoins',
            '✓ Voir le taux d\'adoption de chaque format',
          ]
        },
        {
          title: '📋 Gestion des Modèles (Modèles)',
          icon: '📋',
          description: 'Créer et distribuer les templates de documents',
          items: [
            '✓ Accéder via le menu Modèles (Administration)',
            '✓ Créer de nouveaux templates document',
            '✓ Éditer et améliorer les templates existants',
            '✓ Configurer la visibilité (tous/service/groupe)',
            '✓ Gérer les versions (v1.0, v1.1, v2.0)',
            '✓ Définir les règles de validation du contenu',
            '✓ Publier/Archiver les modèles',
          ]
        },
        {
          title: '📊 Rapports & Analytics (Reports)',
          icon: '📊',
          description: 'Générer des rapports et analyser les données',
          items: [
            '✓ Accéder via le menu Reports de la barre latérale',
            '✓ Voir tous les documents (comptabilité complète)',
            '✓ Générer des rapports par service/dossier',
            '✓ Analytics d\'utilisation (uploads, approbations)',
            '✓ Voir les statistiques par type de document',
            '✓ Exporter en PDF, Excel, CSV',
            '✓ Voir les tendances d\'utilisation',
          ]
        },
        {
          title: '🔍 Audit & Logs (Audit Logs)',
          icon: '🔍',
          description: 'Suivre toutes les actions du système',
          items: [
            '✓ Accéder via le menu Audit Logs (Administration)',
            '✓ Consulter tous les logs d\'action',
            '✓ Voir qui a uploadé, modifié, téléchargé',
            '✓ Timestamps et détails de chaque action',
            '✓ Tracer les modifications de documents',
            '✓ Filtrer par date, utilisateur, type d\'action',
            '✓ Exporter les historiques pour conformité',
          ]
        },
        {
          title: '⚡ Configuration Avancée (Settings)',
          icon: '⚙️',
          description: 'Paramètres système et configuration globale',
          items: [
            '✓ Accéder via Django Admin ou Settings (si accessible)',
            '✓ Fuseau horaire du système (Timezone)',
            '✓ Formats de date et nombre (Locale)',
            '✓ Limites de stockage par utilisateur/dossier',
            '✓ Règles de conservation des données (Rétention)',
            '✓ Configuration emails SMTP pour notifications',
            '✓ Intégrations externes (APIs, webhooks)',
            '✓ Logs d\'erreurs système et monitoring',
            '✓ Permissions et rôles par défaut',
            '✓ Sauvegardes automatiques (Backups)',
          ]
        },
      ].map((section: any, idx: number) => (
        <div key={idx}>
          <h3 className="text-2xl font-bold text-orange-600 flex items-center gap-3 mb-4">
            <span className="text-3xl">{section.icon}</span> {section.title}
          </h3>
          <p className="text-secondary-700 mb-4">{section.description}</p>
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg overflow-hidden">
            <ul className="divide-y divide-orange-100">
              {section.items.map((item: string, i: number) => (
                <li key={i} className="p-3 text-orange-900 text-sm flex items-start gap-3 hover:bg-orange-100 transition">
                  <ChevronRight size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      <div className="bg-gradient-to-br from-red-100 to-orange-100 border-l-4 border-red-600 p-8 rounded-lg">
        <p className="font-bold text-red-900 mb-3">🚨 Responsabilités de l'Administrateur</p>
        <ul className="space-y-2 text-red-800 text-sm">
          <li>✓ <strong>Confidentialité:</strong> Respecter la confidentialité de TOUTES les données</li>
          <li>✓ <strong>Sécurité:</strong> Maintenir la sécurité du système et des données</li>
          <li>✓ <strong>Intégrité:</strong> Ne pas modifier les données des autres pour des raisons personnelles</li>
          <li>✓ <strong>Comptes Rendus:</strong> Documenter les actions administratives</li>
          <li>✓ <strong>Backups:</strong> S'assurer que les sauvegardes fonctionnent régulièrement</li>
          <li>✓ <strong>Formation:</strong> Aider les utilisateurs à comprendre le système</li>
        </ul>
      </div>

      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 text-center border-2 border-dashed border-slate-400 h-64 flex items-center justify-center">
        <div>
          <Video className="mx-auto text-slate-500 mb-3" size={48} />
          <p className="text-slate-600 font-medium">📹 VIDEO TUTORIAL: Panneau d'Administration</p>
          <p className="text-sm text-slate-500 mt-2">Durée: 15 minutes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 p-6 rounded-lg">
          <p className="font-bold text-blue-900 mb-2">📞 Support Technique</p>
          <p className="text-sm text-blue-800">Email: support@sgdra.local</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 rounded-lg">
          <p className="font-bold text-green-900 mb-2">📖 Documentation</p>
          <p className="text-sm text-green-800">Wiki interne: /admin/docs</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 p-6 rounded-lg">
          <p className="font-bold text-purple-900 mb-2">🔄 Mises à Jour</p>
          <p className="text-sm text-purple-800">Chaque 1ᵉʳ mercredi du mois</p>
        </div>
      </div>
    </div>
  )
}

const NotificationsSection: React.FC<SectionProps> = ({ userRole }) => (
  <div className="space-y-8">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-2xl" />
      <div className="relative">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          🔔 Notifications & Alertes en Temps Réel
        </h2>
        <p className="text-secondary-700">Restez informé de toutes les actions importantes</p>
      </div>
    </div>

    <div className="space-y-6">
      <TipBox type="success">
        <strong>Activez les notifications</strong> pour ne jamais manquer une mise à jour importante sur vos documents.
      </TipBox>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-green-600 flex items-center gap-2">
          📢 Types de Notifications
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: '⬆️', title: 'Document Uploadé', desc: 'Quand un agent soumet un nouveau document' },
            { icon: '✅', title: 'Document Approuvé', desc: 'Quand votre document a été accepté par l\'administrateur' },
            { icon: '❌', title: 'Document Rejeté', desc: 'Quand votre document ne respecte pas les critères (correction nécessaire)' },
            { icon: '⚠️', title: 'Erreur de Validation', desc: 'Détails des problèmes rencontrés lors de la validation' },
            { icon: '🔄', title: 'Action Requise', desc: 'Quand le système ou un admin a besoin de votre intervention' },
            { icon: '📝', title: 'Modification', desc: 'Quand un document a été modifié par un administrateur' },
            { icon: '📊', title: 'Rapport Disponible', desc: 'Quand un rapport demandé est prêt' },
            { icon: '🔐', title: 'Alerte de Sécurité', desc: 'Accès non autorisé, changement de permissions, etc.' },
          ].map((notif, idx) => (
            <div key={idx} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg flex gap-3 hover:shadow-md transition">
              <span className="text-3xl">{notif.icon}</span>
              <div>
                <p className="font-bold text-green-900">{notif.title}</p>
                <p className="text-sm text-green-800">{notif.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-green-600 flex items-center gap-2">
          ⚙️ Configurer vos Préférences
        </h3>
        
        <TipBox type="info">
          Chacun peut personnaliser comment il reçoit les notifications. Accédez à: <strong>Profil → Préférences Notifications</strong>
        </TipBox>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 p-6 rounded-lg">
            <p className="font-bold text-blue-900 mb-3">📧 Par Email</p>
            <p className="text-sm text-blue-800 mb-2">Recevez les notifications dans votre boîte email</p>
            <div className="space-y-2 text-sm text-blue-700 bg-white p-3 rounded">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked readOnly /> Document uploadé
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked readOnly /> Document approuvé/rejeté
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" readOnly /> Rapports disponibles
              </label>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 p-6 rounded-lg">
            <p className="font-bold text-purple-900 mb-3">🔔 Système (Application)</p>
            <p className="text-sm text-purple-800 mb-2">Voir les notifications directement dans l'app</p>
            <div className="space-y-2 text-sm text-purple-700 bg-white p-3 rounded">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked readOnly /> Toutes les notifications
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked readOnly /> Son d'alerte
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked readOnly /> Badge de compteur
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-green-600 flex items-center gap-2">
          📬 Centre de Notifications
        </h3>
        
        <div className="bg-gradient-to-br from-green-100 to-emerald-100 border border-green-300 p-6 rounded-lg">
          <p className="font-bold text-green-900 mb-3">Accessible via: Menu principal → Notifications</p>
          <div className="space-y-3 text-green-800 text-sm">
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="font-bold mb-1">👁️ Filtrer par Type</p>
              <p>Voir uniquement: Documents, Approvals, System, etc.</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="font-bold mb-1">✅ Marquer comme Lues</p>
              <p>Marquez individuellement ou marquez tout comme lu</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="font-bold mb-1">🗑️ Supprimer Anciennes</p>
              <p>Supprimez automatiquement après 30 jours</p>
            </div>
            <div className="bg-white p-3 rounded border border-green-200">
              <p className="font-bold mb-1">🔍 Rechercher</p>
              <p>Trouvez une notification spécifique par mot-clé</p>
            </div>
          </div>
        </div>
      </div>

      {userRole === 'admin' && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <Lock size={24} /> Outils Administrateur
          </h3>
          
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 rounded-lg">
              <p className="font-bold text-orange-900 mb-2">📢 Envoyer une Notification Globale</p>
              <p className="text-sm text-orange-800">Communiquer un message important à tous les utilisateurs du système</p>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 rounded-lg">
              <p className="font-bold text-orange-900 mb-2">📋 Notifications par Département</p>
              <p className="text-sm text-orange-800">Envoyer des alertes ciblées à un département spécifique</p>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 rounded-lg">
              <p className="font-bold text-orange-900 mb-2">📊 Historique Complet</p>
              <p className="text-sm text-orange-800">Voir les notifications de TOUS les utilisateurs (audit)</p>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 p-4 rounded-lg">
              <p className="font-bold text-orange-900 mb-2">⚙️ Configurer les Modèles</p>
              <p className="text-sm text-orange-800">Créer des templates de notification pour les automations</p>
            </div>
          </div>
        </div>
      )}

      <TipBox type="tip">
        <strong>💡 Conseil:</strong> Vérifiez régulièrement votre centre de notifications même si vous n'avez pas activé les emails. Les informations y restent plus longtemps.
      </TipBox>

      <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg p-8 text-center border-2 border-dashed border-slate-400 h-64 flex items-center justify-center">
        <div>
          <Video className="mx-auto text-slate-500 mb-3" size={48} />
          <p className="text-slate-600 font-medium">📹 VIDEO TUTORIAL: Notifications & Préférences</p>
          <p className="text-sm text-slate-500 mt-2">Durée: 3 minutes</p>
        </div>
      </div>
    </div>
  </div>
)
