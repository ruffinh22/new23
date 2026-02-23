import React from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, Eye, EyeOff, Shield, Zap, Globe } from 'lucide-react'
import logo from '@/assets/logos/logo_transparent.png'

const loginSchema = z.object({
  matricule: z.string().min(1, 'Le matricule est requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

type LoginForm = z.infer<typeof loginSchema>

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError('')
    setIsLoading(true)

    try {
      await login(data.matricule, data.password)
      
      setTimeout(() => {
        navigate('/dashboard')
      }, 100)
    } catch (err) {
      console.error('[Login] Login error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Matricule ou mot de passe invalide'
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
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-primary-500/20 to-transparent rounded-full blur-3xl animate-pulse-subtle" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-success-500/15 to-transparent rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-warning-500/10 to-transparent rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '2s' }} />

      {/* Geometric Pattern Overlay */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.03) 35px, rgba(255,255,255,.03) 70px)`
      }} />

      <div className="relative z-10 w-full max-w-7xl grid lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-12 items-center px-2 sm:px-4 pb-20 sm:pb-24 lg:pb-28" style={{ willChange: 'transform' }}>
        {/* Left Panel - Premium Brand Presentation */}
        <div className="hidden lg:flex flex-col justify-center space-y-6 lg:space-y-8 px-4 lg:px-6 xl:px-8" style={{ willChange: 'transform' }}>
          {/* Logo & Brand */}
          <div className="space-y-4 lg:space-y-6">
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="inline-flex items-center justify-center w-20 h-20 lg:w-28 lg:h-28 flex-shrink-0 bg-gradient-to-br from-primary-200 to-primary-200 rounded-2xl lg:rounded-3xl shadow-2xl shadow-primary-500/30 overflow-hidden">
                <img src={logo} alt="SGDRA" className="w-12 lg:w-20 h-12 lg:h-20 object-contain" /></div>
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
                Connectez-vous pour accéder à la plateforme interne de gestion 
                documentaire sécurisée de GMC.
              </p>
            </div>
          </div>

          {/* Premium Features Grid */}
          <div className="grid grid-cols-1 gap-3 lg:gap-4">
            {[
              { 
                icon: Globe, 
                title: 'Accès Sécurisé', 
                desc: 'Connexion protégée avec authentification d\'entreprise',
                color: 'from-success-500 to-success-600'
              },
              { 
                icon: Shield, 
                title: 'Gestion Centralisée', 
                desc: 'Accès aux documents de votre département',
                color: 'from-primary-500 to-primary-600'
              },
              { 
                icon: Zap, 
                title: 'Organisation Efficace', 
                desc: 'Classement et archivage intelligent des documents',
                color: 'from-warning-500 to-warning-600'
              }
            ].map((feature, idx) => (
              <div 
                key={idx} 
                className="group relative p-4 lg:p-5 bg-white/5 backdrop-blur-xl rounded-xl lg:rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl lg:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-start gap-3 lg:gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br ${feature.color} rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-5 lg:w-6 h-5 lg:h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 space-y-0.5 lg:space-y-1">
                    <h3 className="text-white font-bold text-sm lg:text-lg">{feature.title}</h3>
                    <p className="text-white/60 text-xs lg:text-sm leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Badge */}
          <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-5 bg-white/5 backdrop-blur-xl rounded-xl lg:rounded-2xl border border-white/10">
            <div className="flex -space-x-2 lg:-space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold">
                  {i === 1 ? '100+' : i === 2 ? '500+' : '24/7'}
                </div>
              ))}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm lg:text-base">Documentation Interne</p>
              <p className="text-white/60 text-xs lg:text-sm">Accès 24/7 aux documents de l'entreprise</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto px-2 sm:px-3 lg:px-0" style={{ willChange: 'transform' }}>
          {/* Premium Card with Glassmorphism */}
          <div className="relative group">
            {/* Glow Effect */}
            <div className="absolute -inset-0.5 sm:-inset-1 bg-gradient-to-r from-primary-500 via-warning-500 to-success-500 rounded-lg sm:rounded-xl opacity-20 blur-lg sm:blur-xl group-hover:opacity-30 transition-opacity duration-500" />
            
            {/* Main Card */}
            <div className="relative bg-white/95 backdrop-blur-2xl rounded-lg sm:rounded-xl sm:rounded-t-3xl shadow-2xl p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-5 border border-white/20">
              {/* Header */}
              <div className="text-center space-y-2 sm:space-y-3 lg:space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 lg:gap-4 mb-1 sm:mb-2">
                  <div className="inline-flex items-center justify-center w-14 sm:w-16 lg:w-20 h-14 sm:h-16 lg:h-20 bg-gradient-to-br from-primary-200 to-primary-200 rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl shadow-primary-500/30 flex-shrink-0">
                    <img src={logo} alt="SGDRA" className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 object-contain" />
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                    Connexion
                  </h2>
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-slate-600 font-medium px-2">
                  Accédez à votre espace SGDRA
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="relative overflow-hidden p-3 sm:p-4 bg-gradient-to-r from-error-50 to-error-100/50 border-l-4 border-error-500 rounded-lg sm:rounded-xl shadow-sm animate-slide-down">
                  <div className="absolute inset-0 bg-error-500/5" />
                  <div className="relative flex items-center gap-2 sm:gap-3">
                    <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-error-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">!</span>
                    </div>
                    <p className="text-error-700 font-semibold text-xs sm:text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5 sm:space-y-3 lg:space-y-4" noValidate>
                {/* Matricule Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    <Mail className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-primary-500" />
                    Matricule
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-lg sm:rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                    <input
                      type="text"
                      placeholder="Ex: ADMIN001"
                      autoFocus
                      className="relative w-full px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm lg:text-base bg-slate-50/80 border-2 border-slate-200 rounded-lg sm:rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
                      {...register('matricule')}
                    />
                  </div>
                  {errors.matricule && (
                    <p className="flex items-center gap-1 text-xs text-error-600 font-semibold animate-slide-down">
                      <span className="w-0.5 h-0.5 bg-error-600 rounded-full" />
                      {errors.matricule.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    <Lock className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-primary-500" />
                    Mot de passe
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-transparent rounded-lg sm:rounded-2xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-300" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Entrez votre mot de passe"
                      className="relative w-full px-3 sm:px-4 py-2 sm:py-2.5 pr-9 sm:pr-10 lg:pr-12 text-xs sm:text-sm lg:text-base bg-slate-50/80 border-2 border-slate-200 rounded-lg sm:rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/20 transition-all duration-300"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 p-1 sm:p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                    >
                      {showPassword ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="flex items-center gap-1 text-xs text-error-600 font-semibold animate-slide-down">
                      <span className="w-0.5 h-0.5 bg-error-600 rounded-full" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full py-2.5 sm:py-3 mt-2 sm:mt-4 lg:mt-6 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white font-black text-xs sm:text-sm lg:text-base rounded-lg sm:rounded-lg shadow-xl shadow-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/60 hover:scale-105 active:scale-100 transform transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
                  style={{ backgroundSize: '200% 100%' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  <span className="relative flex items-center justify-center gap-2 sm:gap-3">
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="hidden sm:inline">Connexion en cours...</span>
                        <span className="sm:hidden">Connexion...</span>
                      </>
                    ) : (
                      <>
                        <img src={logo} alt="" className="w-4 sm:w-5 h-4 sm:h-5 object-contain" />
                        <span>Se connecter</span>
                      </>
                    )}
                  </span>
                </button>

                {/* Divider */}
                <div className="relative py-2.5 sm:py-3 lg:py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 sm:px-3 lg:px-4 text-xs font-bold text-slate-400 bg-white uppercase tracking-wider">
                      ou
                    </span>
                  </div>
                </div>

                {/* Sign up link */}
                <div className="text-center p-2.5 sm:p-3 lg:p-4 bg-slate-50 rounded-lg sm:rounded-2xl border-2 border-slate-100">
                  <p className="text-xs sm:text-sm text-slate-700 font-medium">
                    Nouveau sur SGDRA?{' '}
                    <Link
                      to="/register"
                      className="text-primary-600 hover:text-primary-700 font-black transition-colors inline-flex items-center gap-1 group"
                    >
                      Créer un compte
                      <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Mobile Brand (visible only on small screens) */}
          <div className="lg:hidden text-center mt-4 sm:mt-6 lg:mt-8 space-y-2 sm:space-y-3 lg:space-y-4 animate-fade-in">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">SGDRA</h2>
            <p className="text-xs sm:text-sm lg:text-base text-white/80 font-light">Système de Gestion Documentaire</p>
            <div className="flex justify-center gap-1.5 sm:gap-2">
              <div className="h-0.5 sm:h-1 w-6 sm:w-8 bg-primary-500 rounded-full" />
              <div className="h-0.5 sm:h-1 w-6 sm:w-8 bg-warning-500 rounded-full" />
              <div className="h-0.5 sm:h-1 w-6 sm:w-8 bg-success-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Badge */}
      <div className="fixed bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto px-2 sm:px-4">
        <div className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 lg:py-3 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 text-white/80 text-xs font-semibold tracking-wide shadow-xl hover:bg-white/15 transition-all duration-300 whitespace-nowrap">
          🌍 Media Contact • Excellence Panafricaine
        </div>
      </div>
    </div>
  )
}