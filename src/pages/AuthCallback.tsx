import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth callback error:', error)
        navigate('/login')
        return
      }

      if (session) {
        // Store the Google token if available
        if (session.provider_token) {
          await supabase.from('user_tokens').upsert({
            user_id: session.user.id,
            google_access_token: session.provider_token,
            google_refresh_token: session.provider_refresh_token || null,
            updated_at: new Date().toISOString()
          })
        }
        navigate('/dashboard')
      } else {
        navigate('/login')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin mx-auto mb-4" />
        <p className="text-mist">Conectando tu cuenta...</p>
      </div>
    </div>
  )
}
