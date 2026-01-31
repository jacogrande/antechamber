import { useEffect, useState, useCallback } from 'react'
import type { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { setTenantId, clearTenantId } from '@/lib/api/client'

interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
}

export interface TenantInfo {
  id: string
  name: string
  slug: string
  role: 'admin' | 'editor' | 'viewer'
}

interface AuthResult {
  error: AuthError | null
  tenants?: TenantInfo[]
}

interface LoginApiResponse {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; name: string | null }
  tenants: TenantInfo[]
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
      try {
        // Call our API login endpoint which returns tenants
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          return {
            error: {
              name: 'AuthApiError',
              message: errorData?.error?.message ?? 'Login failed',
              status: response.status,
            } as AuthError,
          }
        }

        const data: LoginApiResponse = await response.json()

        // Set the session in Supabase client so subsequent requests use it
        await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        })

        // Auto-select tenant if only one
        if (data.tenants.length === 1) {
          setTenantId(data.tenants[0].id)
        }

        return { error: null, tenants: data.tenants }
      } catch (err) {
        return {
          error: {
            name: 'AuthApiError',
            message: err instanceof Error ? err.message : 'Login failed',
            status: 500,
          } as AuthError,
        }
      }
    },
    []
  )

  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      // Debug logging - check browser console
      console.log('[signUp] Supabase response:', {
        error,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          confirmed_at: data.user.confirmed_at,
          identities: data.user.identities,
          email_confirmed_at: data.user.email_confirmed_at,
        } : null,
        session: data.session ? 'exists' : null,
      })

      // Check for "fake success" - user exists but no identities means duplicate email
      if (!error && data.user && data.user.identities?.length === 0) {
        return {
          error: {
            name: 'AuthApiError',
            message: 'An account with this email already exists',
            status: 400,
          } as AuthError,
        }
      }

      return { error }
    },
    []
  )

  const signOut = useCallback(async (): Promise<AuthResult> => {
    clearTenantId()
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  const selectTenant = useCallback((tenantId: string) => {
    setTenantId(tenantId)
  }, [])

  const changePassword = useCallback(
    async (newPassword: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      return { error }
    },
    []
  )

  const resendVerificationEmail = useCallback(
    async (email: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      return { error }
    },
    []
  )

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    selectTenant,
    changePassword,
    resendVerificationEmail,
    isAuthenticated: !!state.session,
  }
}
