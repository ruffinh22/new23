/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Design tokens Media Contact - Enhanced & Modernized
      colors: {
        primary: {
          50: '#FFF0F2',
          100: '#FFE5E7',
          150: '#FFD4D8',
          200: '#FFCCCE',
          300: '#FF9999',
          400: '#FF6666',
          500: '#E30613',
          600: '#C40510',
          700: '#A5040E',
          800: '#86030B',
          900: '#670209',
          950: '#4A0107',
          DEFAULT: '#E30613',
        },
        secondary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          150: '#eff2f5',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#0a0e27',
        },
        accent: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
          DEFAULT: '#1a1a1a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#145231',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      
      // Espacements modernes
      spacing: {
        '128': '32rem',
        '144': '36rem',
        '160': '40rem',
        '192': '48rem',
      },
      
      // Typographie professionnelle modernisée
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em', fontWeight: '500' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.0125em', fontWeight: '400' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '400' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.0125em', fontWeight: '500' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.0125em', fontWeight: '600' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em', fontWeight: '600' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em', fontWeight: '700' }],
        '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.025em', fontWeight: '800' }],
        '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.025em', fontWeight: '800' }],
      },
      
      fontWeight: {
        'ultra-light': '100',
        'thin': '200',
        'extralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
        'extrabold': '800',
        'black': '900',
      },
      
      // Animations modernes et sophistiquées
      animation: {
        // Fade animations
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'fade-out': 'fadeOut 0.3s ease-in-out',
        'fade-in-lg': 'fadeIn 0.5s ease-in-out',
        
        // Slide animations
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        
        // Scale animations
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-up': 'scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        
        // Modern pulse and glow effects
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-border': 'pulseBorder 2s ease-in-out infinite',
        
        // Shimmer and gradient effects
        'shimmer': 'shimmer 2s infinite',
        'gradient-flow': 'gradientFlow 3s ease infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
        
        // Motion effects
        'float': 'float 3s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'sway': 'sway 3s ease-in-out infinite',
        
        // Dashboard & Admin specific
        'chart-grow': 'chartGrow 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'stat-pop': 'statPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      
      keyframes: {
        // Fade animations
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        
        // Slide animations
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        
        // Scale animations
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.5)' },
          '100%': { transform: 'scale(1)' },
        },
        
        // Pulse animations
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        pulseGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
            opacity: '1'
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.8)',
            opacity: '0.9'
          },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: 'rgba(59, 130, 246, 0.3)' },
          '50%': { borderColor: 'rgba(59, 130, 246, 0.8)' },
        },
        
        // Shimmer effect
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: 'calc(200% + 1px) 0' },
        },
        
        // Gradient animations
        gradientFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        
        // Motion effects
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        sway: {
          '0%, 100%': { transform: 'translateX(0px)' },
          '50%': { transform: 'translateX(2px)' },
        },
        
        // Dashboard specific animations
        chartGrow: {
          '0%': { transform: 'scaleY(0)', opacity: '0' },
          '100%': { transform: 'scaleY(1)', opacity: '1' },
        },
        statPop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      // Ombres modernes et professionnelles
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'base': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
        
        // Primary shadows
        'primary': '0 4px 14px 0 rgba(227, 6, 19, 0.20)',
        'primary-lg': '0 10px 28px 0 rgba(227, 6, 19, 0.25)',
        
        // Accent shadows
        'accent': '0 4px 14px 0 rgba(14, 165, 233, 0.20)',
        'accent-lg': '0 10px 28px 0 rgba(14, 165, 233, 0.25)',
        
        // Glassmorphism shadows
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-lg': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        
        // Success/Warning/Error shadows
        'success': '0 4px 14px 0 rgba(34, 197, 94, 0.20)',
        'warning': '0 4px 14px 0 rgba(245, 158, 11, 0.20)',
        'error': '0 4px 14px 0 rgba(239, 68, 68, 0.20)',
        
        // Elevation system for modern UI
        'elevation-1': '0 2px 4px rgba(0, 0, 0, 0.04)',
        'elevation-2': '0 4px 8px rgba(0, 0, 0, 0.08)',
        'elevation-3': '0 8px 16px rgba(0, 0, 0, 0.12)',
        'elevation-4': '0 12px 24px rgba(0, 0, 0, 0.16)',
        'elevation-5': '0 16px 32px rgba(0, 0, 0, 0.20)',
      },
      
      // Bordures arrondies modernes
      borderRadius: {
        'xs': '0.125rem',
        'sm': '0.25rem',
        'base': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        'full': '9999px',
      },
      
      // Glassmorphism backdrop filters
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'base': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
      
      // Transitions fluides modernes
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '350': '350ms',
        '400': '400ms',
        '500': '500ms',
      },
      
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'in': 'cubic-bezier(0.4, 0, 1, 1)',
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'elastic': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  
  // Plugins utilitaires et composants modernes
  plugins: [
    function({ addComponents, theme, addUtilities }) {
      // Boutons modernes
      addComponents({
        '.btn': {
          '@apply inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed': {},
        },
        '.btn-primary': {
          '@apply btn bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus:ring-primary-500 shadow-md hover:shadow-lg hover:scale-105 active:scale-95': {},
        },
        '.btn-secondary': {
          '@apply btn bg-secondary-100 text-secondary-900 hover:bg-secondary-200 active:bg-secondary-300 focus:ring-secondary-500': {},
        },
        '.btn-accent': {
          '@apply btn bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 focus:ring-accent-500 shadow-md hover:shadow-lg': {},
        },
        '.btn-outline': {
          '@apply btn border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 focus:ring-primary-500': {},
        },
        '.btn-outline-accent': {
          '@apply btn border-2 border-accent-500 text-accent-500 hover:bg-accent-50 active:bg-accent-100 focus:ring-accent-500': {},
        },
        '.btn-ghost': {
          '@apply btn text-secondary-700 hover:bg-secondary-100 active:bg-secondary-200 focus:ring-secondary-500': {},
        },
        '.btn-success': {
          '@apply btn bg-success-500 text-white hover:bg-success-600 active:bg-success-700 focus:ring-success-500': {},
        },
        '.btn-danger': {
          '@apply btn bg-error-500 text-white hover:bg-error-600 active:bg-error-700 focus:ring-error-500': {},
        },
        '.btn-warning': {
          '@apply btn bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 focus:ring-warning-500': {},
        },
        
        // Button sizes
        '.btn-xs': {
          '@apply px-2 py-1 text-xs': {},
        },
        '.btn-sm': {
          '@apply px-3 py-1.5 text-sm': {},
        },
        '.btn-lg': {
          '@apply px-6 py-3 text-lg': {},
        },
        '.btn-xl': {
          '@apply px-8 py-4 text-xl': {},
        },
        
        // Card components modernes
        '.card': {
          '@apply bg-white rounded-lg shadow-base border border-secondary-200 overflow-hidden transition-all duration-300': {},
        },
        '.card-hover': {
          '@apply card hover:shadow-lg hover:border-secondary-300 hover:scale-105': {},
        },
        '.card-body': {
          '@apply p-6': {},
        },
        '.card-header': {
          '@apply px-6 py-4 border-b border-secondary-200 flex items-center justify-between': {},
        },
        '.card-footer': {
          '@apply px-6 py-4 border-t border-secondary-200': {},
        },
        
        // Glassmorphism cards
        '.glass-card': {
          '@apply bg-white/70 backdrop-blur-md rounded-lg shadow-glass border border-white/20 overflow-hidden': {},
        },
        '.glass-card-hover': {
          '@apply glass-card hover:bg-white/80 hover:shadow-glass-lg transition-all duration-300': {},
        },
        
        // Input components
        '.input': {
          '@apply w-full px-4 py-2.5 border border-secondary-300 rounded-lg text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white': {},
        },
        '.input-accent': {
          '@apply input focus:ring-accent-500': {},
        },
        '.input-error': {
          '@apply input border-error-500 focus:ring-error-500': {},
        },
        '.input-success': {
          '@apply input border-success-500 focus:ring-success-500': {},
        },
        '.input-disabled': {
          '@apply input bg-secondary-50 cursor-not-allowed opacity-75': {},
        },
        
        // Textarea
        '.textarea': {
          '@apply w-full px-4 py-2.5 border border-secondary-300 rounded-lg text-secondary-900 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 bg-white resize-none': {},
        },
        
        // Badge components
        '.badge': {
          '@apply inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold': {},
        },
        '.badge-primary': {
          '@apply badge bg-primary-100 text-primary-800': {},
        },
        '.badge-secondary': {
          '@apply badge bg-secondary-100 text-secondary-800': {},
        },
        '.badge-success': {
          '@apply badge bg-success-100 text-success-800': {},
        },
        '.badge-warning': {
          '@apply badge bg-warning-100 text-warning-800': {},
        },
        '.badge-error': {
          '@apply badge bg-error-100 text-error-800': {},
        },
        '.badge-info': {
          '@apply badge bg-info-100 text-info-800': {},
        },
        '.badge-accent': {
          '@apply badge bg-accent-100 text-accent-800': {},
        },
        
        // Dashboard components
        '.dashboard-stat': {
          '@apply bg-white rounded-lg shadow-base p-6 border border-secondary-200 hover:shadow-lg transition-all duration-300': {},
        },
        '.dashboard-stat-value': {
          '@apply text-3xl font-bold text-primary-600': {},
        },
        '.dashboard-stat-label': {
          '@apply text-sm text-secondary-600 font-medium': {},
        },
        '.dashboard-chart': {
          '@apply bg-white rounded-lg shadow-base p-6 border border-secondary-200': {},
        },
        
        // Report components
        '.report-section': {
          '@apply bg-white rounded-lg shadow-base p-6 border border-secondary-200 mb-6': {},
        },
        '.report-title': {
          '@apply text-2xl font-bold text-secondary-900 mb-4': {},
        },
        '.report-subtitle': {
          '@apply text-sm text-secondary-600 font-medium': {},
        },
        '.report-table': {
          '@apply w-full text-left text-sm': {},
        },
        
        // Routing Rules Manager components
        '.routing-rule-card': {
          '@apply card-hover p-4': {},
        },
        '.routing-rule-status': {
          '@apply inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold': {},
        },
        '.routing-status-active': {
          '@apply bg-success-100 text-success-800': {},
        },
        '.routing-status-inactive': {
          '@apply bg-secondary-100 text-secondary-800': {},
        },
        '.routing-status-error': {
          '@apply bg-error-100 text-error-800': {},
        },
        
        // Table components
        '.table-header': {
          '@apply bg-secondary-50 text-secondary-700 font-semibold text-sm': {},
        },
        '.table-row': {
          '@apply border-b border-secondary-200 hover:bg-secondary-50 transition-colors duration-200': {},
        },
        '.table-cell': {
          '@apply px-6 py-4 text-secondary-900': {},
        },
        
        // Select/Dropdown department
        '.select-department': {
          '@apply px-6 py-3 rounded-xl font-bold text-base cursor-pointer border-2 border-accent-400 bg-accent-50 text-secondary-900 hover:bg-accent-100 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2': {},
        },
        
        // Modal components
        '.modal-overlay': {
          '@apply fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center': {},
        },
        '.modal-content': {
          '@apply bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4': {},
        },
        
        // Toast/Alert components
        '.alert': {
          '@apply rounded-lg p-4 flex items-start gap-3': {},
        },
        '.alert-success': {
          '@apply bg-success-50 border border-success-200 text-success-800': {},
        },
        '.alert-error': {
          '@apply bg-error-50 border border-error-200 text-error-800': {},
        },
        '.alert-warning': {
          '@apply bg-warning-50 border border-warning-200 text-warning-800': {},
        },
        '.alert-info': {
          '@apply bg-info-50 border border-info-200 text-info-800': {},
        },
      });
      
      // Utility classes modernes
      addUtilities({
        '.glass': {
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          borderTopColor: 'rgba(255, 255, 255, 0.2)',
          borderBottomColor: 'rgba(0, 0, 0, 0.1)',
        },
        '.glass-dark': {
          backgroundColor: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        '.text-gradient': {
          backgroundImage: 'linear-gradient(135deg, var(--tw-gradient-stops))',
          backgroundClip: 'text',
          color: 'transparent',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
        },
        '.glow': {
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
        },
        '.glow-primary': {
          boxShadow: '0 0 20px rgba(227, 6, 19, 0.3)',
        },
        '.glow-accent': {
          boxShadow: '0 0 20px rgba(14, 165, 233, 0.3)',
        },
      });
    },
  ],
  
  // Configuration pour production
  safelist: [
    // Colors safelist for dynamic classes
    'bg-primary-500',
    'bg-success-500',
    'bg-warning-500',
    'bg-error-500',
    'text-primary-600',
    'text-success-600',
    'text-warning-600',
    'text-error-600',
  ],
  
  // Optimisation CSS
  corePlugins: {
    preflight: true,
  },
}