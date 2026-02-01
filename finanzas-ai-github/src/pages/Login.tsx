import { useAuth } from '../hooks/useAuth'
import { Mail, Shield, Zap, TrendingUp } from 'lucide-react'

export default function Login() {
  const { signInWithGoogle, loading } = useAuth()

  const handleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-mint/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-mint to-mint-dark mb-4">
            <TrendingUp className="w-8 h-8 text-midnight" />
          </div>
          <h1 className="font-display text-4xl font-bold text-snow mb-2">
            Finanzas<span className="gradient-text">AI</span>
          </h1>
          <p className="text-mist">
            Tu CFO personal impulsado por inteligencia artificial
          </p>
        </div>

        {/* Login card */}
        <div className="glass rounded-3xl p-8 animate-slide-up">
          <div className="space-y-6">
            {/* Features */}
            <div className="space-y-4 mb-8">
              <Feature 
                icon={<Mail className="w-5 h-5" />}
                title="Sincroniza tu correo"
                description="Conectamos con Gmail para leer tus notificaciones bancarias"
              />
              <Feature 
                icon={<Zap className="w-5 h-5" />}
                title="Análisis automático"
                description="IA categoriza y analiza cada transacción en tiempo real"
              />
              <Feature 
                icon={<Shield className="w-5 h-5" />}
                title="100% Seguro"
                description="Solo leemos emails de bancos, nunca almacenamos contraseñas"
              />
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-snow text-midnight font-medium py-4 px-6 rounded-xl hover:bg-cloud transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? 'Conectando...' : 'Continuar con Google'}
            </button>

            <p className="text-center text-sm text-mist">
              Al continuar, aceptas que leamos tus emails de Bancolombia y Nubank
              para analizar tus finanzas.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-mist/50 mt-6">
          Hecho con 💚 para tomar mejores decisiones financieras
        </p>
      </div>
    </div>
  )
}

function Feature({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-mint/10 flex items-center justify-center text-mint">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-snow">{title}</h3>
        <p className="text-sm text-mist">{description}</p>
      </div>
    </div>
  )
}
