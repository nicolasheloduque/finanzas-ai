import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: SupabaseUser | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  googleAccessToken: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.provider_token) {
        setGoogleAccessToken(session.provider_token)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.provider_token) {
          setGoogleAccessToken(session.provider_token)
          // Store the token in the database for later use
          if (session.user) {
            await supabase.from('user_tokens').upsert({
              user_id: session.user.id,
              google_access_token: session.provider_token,
              google_refresh_token: session.provider_refresh_token,
              updated_at: new Date().toISOString()
            })
          }
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/gmail.readonly',
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setGoogleAccessToken(null)
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      // Forzar logout limpiando estado
      setUser(null)
      setSession(null)
      setGoogleAccessToken(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signInWithGoogle, 
      signOut,
      googleAccessToken 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
