import { useEffect, useState, useCallback } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
}

interface AuthResult {
  error: AuthError | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    },
    []
  )

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      return { error }
    },
    []
  )

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!state.session,
  }
}
