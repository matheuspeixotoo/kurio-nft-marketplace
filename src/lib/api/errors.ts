import axios, { type AxiosError } from 'axios'
import type { ApiErrorBody, ApiErrorCode } from '@/types/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'CANCELLED' | 'UNKNOWN'
  readonly fieldErrors: Record<string, string>
  readonly details: Record<string, unknown>

  constructor(init: { status: number; code: ApiError['code']; message: string; fieldErrors?: Record<string, string>; details?: Record<string, unknown> }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors ?? {}
    this.details = init.details ?? {}
  }

  get isAuthError() {
    return this.status === 401
  }
  get isNetwork() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT'
  }
  get isCancelled() {
    return this.code === 'CANCELLED'
  }
  get isRetryable() {
    return this.isNetwork || this.status >= 500 || this.code === 'RATE_LIMITED'
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (axios.isCancel(err)) {
    return new ApiError({ status: 0, code: 'CANCELLED', message: 'Requisição cancelada.' })
  }
  if (axios.isAxiosError(err)) {
    const e = err as AxiosError<ApiErrorBody>
    if (e.code === 'ECONNABORTED' || e.code === 'ETIMEDOUT') {
      return new ApiError({ status: 0, code: 'TIMEOUT', message: 'A requisição demorou demais. Verifique sua conexão e tente novamente.' })
    }
    if (!e.response) {
      return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Não foi possível conectar ao servidor.' })
    }
    const body = e.response.data
    if (body && typeof body === 'object' && 'error' in body && body.error) {
      return new ApiError({
        status: e.response.status,
        code: body.error.code,
        message: body.error.message,
        fieldErrors: body.error.fieldErrors,
        details: body.error.details,
      })
    }
    return new ApiError({ status: e.response.status, code: 'UNKNOWN', message: `Erro inesperado (${e.response.status}).` })
  }
  if (err instanceof Error) return new ApiError({ status: 0, code: 'UNKNOWN', message: err.message })
  return new ApiError({ status: 0, code: 'UNKNOWN', message: 'Erro desconhecido.' })
}

export function getErrorMessage(err: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  const e = toApiError(err)
  return e.message || fallback
}
