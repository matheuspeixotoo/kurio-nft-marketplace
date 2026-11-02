import axios from 'axios'
import { getGuestId, getToken, setToken } from '@/lib/storage'
import { toApiError } from './errors'

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Every REST call goes through this Axios instance.
 * - Authorization: Bearer <token> (session token kept in localStorage; never the password).
 * - X-Guest-Id identifies an anonymous cart until the visitor authenticates.
 * - 401 responses clear the local token and broadcast `kurio:session-expired` so the
 *   router can preserve the current location and redirect to /login.
 */
export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(import.meta.env.VITE_HTTP_TIMEOUT_MS ?? 8000),
  headers: { Accept: 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  config.headers = config.headers ?? {}
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Guest-Id'] = getGuestId()
  return config
})

export const SESSION_EXPIRED_EVENT = 'kurio:session-expired'

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const apiError = toApiError(error)
    const url: string = error?.config?.url ?? ''
    const isCredentialCall = url.includes('/auth/login') || url.includes('/auth/register')
    if (apiError.status === 401 && getToken() && !isCredentialCall) {
      setToken(null)
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { code: apiError.code } }))
    }
    return Promise.reject(apiError)
  },
)
