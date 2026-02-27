import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { folderService } from '@/services/folderService'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, Eye, EyeOff, User, Building2, Globe, Shield, CheckCircle2, AlertCircle } from 'lucide-react'
import logo from '@/assets/logos/logo_transparent.png'

const registerSchema = z.object({
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  matricule: z.string().min(1, 'Le matricule est requis'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string().min(6, 'La confirmation est requise'),
  role: z.string().min(1, 'Le rôle est requis'),
  pole: z.string().min(1, 'Le pôle est requis'),
  branche: z.string().min(1, 'La filiale est requise'),
  departement: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [error, setError] = React.useState<string>('')
  const [success, setSuccess] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [poles, setPoles] = React.useState<any[]>([])
  const [filiales, setFiliales] = React.useState<any[]>([])
  const [services, setServices] = React.useState<any[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const poleValue = watch('pole')
  const brancheValue = watch('branche')
  const password = watch('password')

  // Load poles on mount
  React.useEffect(() => {
    const loadPoles = async () => {
      try {
        const polesData = await folderService.getPoles()
        setPoles(polesData)
      } catch (err) {
        console.error('Error loading poles:', err)
        setPoles([])
      }
    }
    loadPoles()
  }, [])

  // Load filiales when pole changes
  React.useEffect(() => {
    if (!poleValue) {
      setFiliales([])
      return
    }
    const loadFiliales = async () => {
      try {
        const filialesData = await folderService.getFiliales(poleValue)
        setFiliales(filialesData)
      } catch (err) {
        console.error('Error loading filiales:', err)
        setFiliales([])
      }
    }
    loadFiliales()
  }, [poleValue])

  // Load services when branche changes
  React.useEffect(() => {
    if (!brancheValue) {
      setServices([])
      return
    }
    const loadServices = async () => {
      try {
        const servicesData = await folderService.getServices(brancheValue)
        setServices(servicesData)
      } catch (err) {
        console.error('Error loading services:', err)
        setServices([])
      }
    }
    loadServices()
  }, [brancheValue])

  // Password strength calculation
  const passwordStrength = React.useMemo(() => {
    if (!password) return { level: 0, text: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    const levels = [
      { level: 0, text: 'Très faible', color: 'bg-error-500' },
      { level: 1, text: 'Faible', color: 'bg-warning-500' },
      { level: 2, text: 'Moyen', color: 'bg-warning-400' },
      { level: 3, text: 'Bon', color: 'bg-success-400' },
      { level: 4, text: 'Fort', color: 'bg-success-500' },
      { level: 5, text: 'Excellent', color: 'bg-success-600' },
    ]

    return levels[strength] || levels[0]
  }, [password])

  const onSubmit = async (data: RegisterForm) => {
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      console.log('[Register] Form data received:', JSON.stringify(data, null, 2))
      const registerData: any = {
        nom: data.nom,
        prenom: data.prenom,
        matricule: data.matricule,
        email: data.email,
        password: data.password,
        password_confirm: data.confirmPassword,
        role: data.role,
      }

      // Add conditional fields
      if (data.pole) registerData.pole = parseInt(data.pole)
      if (data.branche) registerData.branche = parseInt(data.branche)
      if (data.departement) registerData.departement = data.departement

      await registerUser(registerData)
      
      setSuccess('Inscription réussie ! Redirection vers la connexion...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      console.error('[Register] Registration error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'inscription'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" style={{ contain: 'layout' }}>
      {/* Dynamic Background with Image Overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          filter: 'grayscale(30%) brightness(0.7)',
        }}
      />
      
      {/* Animated Gradient Orbs - Pan-African Colors */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary-500/20 to-transparent rounded-full blur-3xl animate-pulse-subtle" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-primary-500/15 to-transparent rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-gradient-to-l from-warning-500/10 to-transparent rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '2s' }} />

      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.03) 35px, rgba(255,255,255,.03) 70px)`
      }} />

      <div className="relative z-10 w-full max-w-7xl grid lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-12 items-center px-2 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-24 lg:pb-28" style={{ willChange: 'transform' }}>
        {/* Left Panel - Registration Benefits */}
        <div className="hidden lg:flex flex-col justify-center space-y-6 lg:space-y-8 px-4 lg:px-6 xl:px-8" style={{ willChange: 'transform' }}>
          {/* Brand Header */}
          <div className="space-y-4 lg:space-y-6">
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="inline-flex items-center justify-center w-20 h-20 lg:w-28 lg:h-28 flex-shrink-0 bg-gradient-to-br from-primary-200 to-primary-200 rounded-2xl lg:rounded-3xl shadow-2xl shadow-primary-500/30 overflow-hidden"><img src={logo} alt="SGDRA" className="w-12 lg:w-20 h-12 lg:h-20 object-contain" /></div>
              <div className="space-y-2 lg:space-y-3">
                <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight">
                  SGDRA
                </h1>
                <div className="h-1 lg:h-1.5 w-20 bg-gradient-to-r from-primary-500 via-warning-500 to-success-500 rounded-full" />
              </div>
            </div>
            
            <div className="space-y-2 lg:space-y-3">
              <p className="text-lg lg:text-2xl font-light text-white/90 tracking-wide">
                Système de Gestion Documentaire
              </p>
              <p className="text-xs lg:text-base text-white/60 leading-relaxed max-w-md">
                Créez votre compte pour accéder à la plateforme interne de gestion 
                documentaire sécurisée de GMC.
              </p>
            </div>
          </div>

          {/* Benefits List */}
          <div className="space-y-4">
            {[
              {
                icon: Shield,
                title: 'Accès Sécurisé',
                desc: 'Connexion protégée avec authentification d\'entreprise',
                gradient: 'from-success-500 to-success-600'
              },
              {
                icon: Building2,
                title: 'Gestion Centralisée',
                desc: 'Accès aux documents de votre département',
                gradient: 'from-primary-500 to-primary-600'
              },
              {
                icon: CheckCircle2,
                title: 'Organisation Efficace',
                desc: 'Classement et archivage intelligent des documents',
                gradient: 'from-warning-500 to-warning-600'
              }
            ].map((benefit, idx) => (
              <div 
                key={idx}
                className="group relative p-5 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br ${benefit.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <benefit.icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-white font-bold text-lg">{benefit.title}</h3>
                    <p className="text-white/60 text-sm leading-relaxed">{benefit.desc}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
            {[
              { value: '100+', label: 'Utilisateurs' },
              { value: '500+', label: 'Documents' },
              { value: '24/7', label: 'Disponibilité' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center space-y-1">
                <div className="text-3xl font-black text-white">{stat.value}</div>
                <div className="text-xs text-white/60 font-semibold uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Registration Form */}
        <div className="w-full max-w-2xl mx-auto px-0 sm:px-4" style={{ willChange: 'transform' }}>
          {/* Premium Card */}
          <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-200 via-warning-500 to-success-100 rounded-xl opacity-20 blur-xl group-hover:opacity-30 transition-opacity duration-500" />
            
            {/* Main Card */}
            <div className="relative bg-white/95 backdrop-blur-2xl rounded-xl rounded-t-3xl sm:rounded-xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 border border-white/20">
              {/* Header */}
              <div className="text-center space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
                  <div className="inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-primary-200 to-primary-200 rounded-2xl shadow-xl shadow-primary-500/30 flex-shrink-0">
                    <img src={logo} alt="SGDRA" className="w-10 sm:w-12 h-10 sm:h-12 object-contain" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Créer un compte
                  </h2>
                </div>
                <p className="text-sm sm:text-base text-slate-600 font-medium">
                  Commencez votre expérience SGDRA dès maintenant
                </p>
              </div>

              {/* Success Alert */}
              {success && (
                <div className="relative overflow-hidden p-4 bg-gradient-to-r from-primary-50 to-primary-100/50 border-l-4 border-primary-500 rounded-xl shadow-sm animate-slide-down">
                  <div className="absolute inset-0 bg-primary-500/5" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <p className="text-primary-700 font-semibold text-sm">{success}</p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="relative overflow-hidden p-4 bg-gradient-to-r from-error-50 to-error-100/50 border-l-4 border-error-500 rounded-xl shadow-sm animate-slide-down">
                  <div className="absolute inset-0 bg-error-500/5" />
                  <div className="relative flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-error-500 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <p className="text-error-700 font-semibold text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Name Fields - Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Nom */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                      <User className="w-4 h-4 text-primary-500" />
                      Nom
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                      <input
                        type="text"
                        placeholder="Votre nom"
                        className="relative w-full px-4 py-2.5 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
                        {...register('nom')}
                      />
                    </div>
                    {errors.nom && (
                      <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                        <span className="w-1 h-1 bg-error-600 rounded-full" />
                        {errors.nom.message}
                      </p>
                    )}
                  </div>

                  {/* Prénom */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                      <User className="w-4 h-4 text-primary-500" />
                      Prénom
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                      <input
                        type="text"
                        placeholder="Votre prénom"
                        className="relative w-full px-4 py-2.5 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
                        {...register('prenom')}
                      />
                    </div>
                    {errors.prenom && (
                      <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                        <span className="w-1 h-1 bg-error-600 rounded-full" />
                        {errors.prenom.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Matricule & Email - Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Matricule */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                      <Shield className="w-4 h-4 text-primary-500" />
                      Matricule
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                      <input
                        type="text"
                        placeholder="Ex: EMP001"
                        className="relative w-full px-4 py-2.5 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
                        {...register('matricule')}
                      />
                    </div>
                    {errors.matricule && (
                      <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                        <span className="w-1 h-1 bg-error-600 rounded-full" />
                        {errors.matricule.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                      <Mail className="w-4 h-4 text-primary-500" />
                      Email
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                      <input
                        type="email"
                        placeholder="votre.email@exemple.com"
                        className="relative w-full px-4 py-2.5 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && (
                      <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                        <span className="w-1 h-1 bg-error-600 rounded-full" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                    <Shield className="w-4 h-4 text-primary-500" />
                    Rôle
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                    <select
                      className="relative w-full px-4 py-2.5 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-500 font-medium focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 appearance-none cursor-pointer"
                      {...register('role')}
                    >
                      <option value="">Sélectionnez votre rôle</option>
                      <option value="AGENT" className="text-slate-900">Agent</option>
                      <option value="SERVICE_MANAGER" className="text-slate-900">Gestionnaire Service</option>
                      <option value="FILIALE_MANAGER" className="text-slate-900">Gestionnaire Filiale</option>
                      <option value="POLE_MANAGER" className="text-slate-900">Gestionnaire Pôle</option>
                      <option value="DOCUMENT_MANAGER" className="text-slate-900">Gestionnaire Document</option>
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.role && (
                    <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                      <span className="w-1 h-1 bg-error-600 rounded-full" />
                      {errors.role.message}
                    </p>
                  )}
                </div>

                {/* Pôle - ALWAYS SHOWN AND REQUIRED */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                    <Globe className="w-4 h-4 text-primary-500" />
                    Pôle
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                    <select
                      className="relative w-full px-4 py-2.5 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-500 font-medium focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 appearance-none cursor-pointer"
                      {...register('pole')}
                    >
                      <option value="">-- Sélectionner un Pôle --</option>
                      {poles.map((pole: any) => (
                        <option key={pole.id} value={pole.id} className="text-slate-900">
                          {pole.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {errors.pole && (
                    <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                      <span className="w-1 h-1 bg-error-600 rounded-full" />
                      {errors.pole.message}
                    </p>
                  )}
                </div>

                {/* Filiale - Shown when Pôle is selected, REQUIRED */}
                {poleValue && (
                  <div className="space-y-2 animate-slide-down">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                      <Globe className="w-4 h-4 text-primary-500" />
                      Filiale
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                      <select
                        className="relative w-full px-4 py-2.5 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-500 font-medium focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 appearance-none cursor-pointer"
                        {...register('branche')}
                      >
                        <option value="">-- Sélectionner une Filiale --</option>
                        {filiales.map((filiale: any) => (
                          <option key={filiale.id} value={filiale.id} className="text-slate-900">
                            {filiale.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    {errors.branche && (
                      <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                        <span className="w-1 h-1 bg-error-600 rounded-full" />
                        {errors.branche.message}
                      </p>
                    )}
                  </div>
                )}

                {/* Service - Optional, shown when Filiale is selected */}
                {brancheValue && (
                  <div className="space-y-2 animate-slide-down">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                      <Building2 className="w-4 h-4 text-primary-500" />
                      Service (Optionnel)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                      <select
                        className="relative w-full px-4 py-2.5 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-500 font-medium focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 appearance-none cursor-pointer"
                        {...register('departement')}
                      >
                        <option value="">-- Sélectionner un Service --</option>
                        {services.map((service: any) => (
                          <option key={service.id} value={service.id} className="text-slate-900">
                            {service.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Password Fields */}
                <div className="space-y-4">
                  {/* Password */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                      <Lock className="w-4 h-4 text-primary-500" />
                      Mot de passe
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Créez un mot de passe fort"
                        className="relative w-full px-4 py-2.5 pr-12 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                      >
                        {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2 animate-slide-down">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${passwordStrength.color} transition-all duration-300`}
                              style={{ width: `${(passwordStrength.level / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-600 min-w-[80px]">
                            {passwordStrength.text}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {errors.password && (
                      <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                        <span className="w-1 h-1 bg-error-600 rounded-full" />
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-900 uppercase tracking-wide">
                      <Lock className="w-4 h-4 text-primary-500" />
                      Confirmer le mot de passe
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirmez votre mot de passe"
                        className="relative w-full px-4 py-2.5 pr-12 bg-slate-50/80 border-2 border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
                        {...register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                      >
                        {showConfirmPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="flex items-center gap-1.5 text-xs text-error-600 font-semibold animate-slide-down">
                        <span className="w-1 h-1 bg-error-600 rounded-full" />
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full py-3 mt-6 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-black text-base rounded-lg shadow-xl shadow-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/60 hover:scale-105 active:scale-100 transform transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                  style={{ backgroundSize: '200% 100%' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  <span className="relative flex items-center justify-center gap-3">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Création en cours...</span>
                      </>
                    ) : (
                      <>
                        <img src={logo} alt="" className="w-5 h-5 object-contain" />
                        <span>Créer mon compte</span>
                      </>
                    )}
                  </span>
                </button>

                {/* Divider */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 text-xs font-bold text-slate-400 bg-white uppercase tracking-wider">
                      Déjà inscrit ?
                    </span>
                  </div>
                </div>

                {/* Login link */}
                <div className="text-center p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <p className="text-slate-700 font-medium">
                    Vous avez déjà un compte?{' '}
                    <Link
                      to="/login"
                      className="text-primary-600 hover:text-primary-700 font-black transition-colors inline-flex items-center gap-1 group"
                    >
                      Se connecter
                      <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Mobile Brand */}
          <div className="lg:hidden text-center mt-8 space-y-4 animate-fade-in">
            <h2 className="text-4xl font-black text-white">SGDRA</h2>
            <p className="text-white/80 font-light">Système de Gestion Documentaire</p>
            <div className="flex justify-center gap-2">
              <div className="h-1 w-8 bg-success-500 rounded-full" />
              <div className="h-1 w-8 bg-warning-500 rounded-full" />
              <div className="h-1 w-8 bg-primary-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Badge */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto">
        <div className="px-6 py-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 text-white/80 text-xs font-semibold tracking-wide shadow-xl hover:bg-white/15 transition-all duration-300">
          🌍 Media Contact • Excellence Panafricaine
        </div>
      </div>
    </div>
  )
}
