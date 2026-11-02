import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LoginInput, RegisterInput, User } from '@/types/api'
import { api } from '@/lib/api/endpoints'
import { SESSION_EXPIRED_EVENT } from '@/lib/api/http'
import { toApiError } from '@/lib/api/errors'
import { getGuestId, getToken, rotateGuestId, setToken, STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { queryKeys } from '@/lib/query-keys'
import { toast } from '@/components/ui/toast'

export interface AuthContextValue {
  /** Session token currently held (synchronously readable by route guards). */
  token: string | null
  user: User | null
  userId: string | null
  isAuthenticated: boolean
  /** True while the stored token is being validated against the API on boot. */
  isLoading: boolean
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  /** Called by route guards and interceptors when the API reports an expired session. */
  expire: (reason?: string) => void
  /** Where to go back to after authenticating (set when the session expires mid-flow). */
  consumeReturnTo: () => string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const RETURN_TO_KEY = 'kurio:return-to'
export const AUTH_EXPIRED_EVENT = 'kurio:auth-expired'
export const PRIVATE_PREFIXES = ['/account', '/checkout', '/orders']

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const tokenRef = useRef(token)
  tokenRef.current = token

  const sessionQuery = useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => api.auth.session({ signal }),
    enabled: !!token,
    staleTime: 60_000,
    retry: (count, error) => toApiError(error).isRetryable && count < 1,
  })

  const applyToken = useCallback((next: string | null) => {
    setToken(next)
    setTokenState(next)
  }, [])

  const clearPrivateCache = useCallback(() => {
    // Drop every cached private resource so a different user never sees stale data.
    queryClient.removeQueries({
      predicate: (q) => {
        const root = q.queryKey[0]
        return root !== 'catalog' && root !== 'mock'
      },
    })
  }, [queryClient])

  const expire = useCallback(
    (reason?: string) => {
      if (!tokenRef.current) return
      const { pathname, search } = window.location
      const returnTo = !pathname.startsWith('/login') && !pathname.startsWith('/register') ? `${pathname}${search}` : null
      if (returnTo) writeStorage(RETURN_TO_KEY, returnTo)
      applyToken(null)
      clearPrivateCache()
      rotateGuestId()
      toast({
        title: 'Sessão expirada',
        description: reason ?? 'Entre novamente para continuar de onde parou.',
        variant: 'warning',
      })
      window.dispatchEvent(new CustomEvent('kurio:auth-changed', { detail: { token: null } }))
      // The router (inside the provider tree) redirects private routes to /login, keeping the target.
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { returnTo } }))
    },
    [applyToken, clearPrivateCache],
  )

  useEffect(() => {
    const onExpired = () => expire()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [expire])

  // If the stored token turns out invalid on boot, forget it (the interceptor already cleared storage).
  useEffect(() => {
    if (sessionQuery.isError && toApiError(sessionQuery.error).status === 401) {
      setTokenState(null)
    }
  }, [sessionQuery.isError, sessionQuery.error])

  const afterLogin = useCallback(
    async (session: { user: User; token: string; expiresAt: string }) => {
      const guestId = getGuestId()
      clearPrivateCache()
      applyToken(session.token)
      queryClient.setQueryData(queryKeys.session, { user: session.user, expiresAt: session.expiresAt })
      try {
        // Preserve the visitor's cart: merge it into the account cart, then forget the guest id.
        const merged = await api.cart.merge(guestId)
        queryClient.setQueryData(queryKeys.cart(`user:${session.user.id}`), merged)
      } catch {
        /* the cart query will refetch anyway */
      }
      // The user cart may have been fetched concurrently with the merge: refetch to be safe.
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      rotateGuestId()
      window.dispatchEvent(new CustomEvent('kurio:auth-changed', { detail: { token: session.token } }))
      return session.user
    },
    [applyToken, clearPrivateCache, queryClient],
  )

  const login = useCallback(async (input: LoginInput) => afterLogin(await api.auth.login(input)), [afterLogin])
  const register = useCallback(async (input: RegisterInput) => afterLogin(await api.auth.register(input)), [afterLogin])

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } catch {
      /* local logout still proceeds */
    }
    applyToken(null)
    clearPrivateCache()
    rotateGuestId()
    writeStorage(STORAGE_KEYS.checkoutDraft, null)
    writeStorage(STORAGE_KEYS.pendingOrder, null)
    window.dispatchEvent(new CustomEvent('kurio:auth-changed', { detail: { token: null } }))
  }, [applyToken, clearPrivateCache])

  const consumeReturnTo = useCallback(() => {
    const value = window.localStorage.getItem(RETURN_TO_KEY)
    if (value) window.localStorage.removeItem(RETURN_TO_KEY)
    return value
  }, [])

  const user = token ? (sessionQuery.data?.user ?? null) : null
  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      userId: user?.id ?? null,
      isAuthenticated: !!token && !!user,
      isLoading: !!token && sessionQuery.isPending,
      login,
      register,
      logout,
      expire,
      consumeReturnTo,
    }),
    [token, user, sessionQuery.isPending, login, register, logout, expire, consumeReturnTo],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
