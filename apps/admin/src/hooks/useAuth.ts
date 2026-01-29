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
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
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

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    selectTenant,
    isAuthenticated: !!state.session,
  }
}
