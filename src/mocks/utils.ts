import { HttpResponse, delay, type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw'
import type { ApiErrorBody, ApiErrorCode, User } from '@/types/api'
import { db, type SessionRecord } from './db'
import { BASE_LATENCY_MS, SLOW_LATENCY_MS, getFlags, nextRandom } from './scenario'

export class HttpError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fieldErrors?: Record<string, string>
  readonly details?: Record<string, unknown>
  constructor(status: number, code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>, details?: Record<string, unknown>) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

export function errorResponse(status: number, code: ApiErrorCode, message: string, fieldErrors?: Record<string, string>, details?: Record<string, unknown>) {
  const body: ApiErrorBody = { error: { code, message, fieldErrors, details } }
  return HttpResponse.json(body, { status })
}

export function json<T>(body: T, init?: ResponseInit) {
  return HttpResponse.json(body as unknown as DefaultBodyType, init)
}

export function noContent() {
  return new HttpResponse(null, { status: 204 })
}

export async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Non-cryptographic fingerprint (FNV-1a) used for quote hashes and idempotency fingerprints. */
export function fingerprint(input: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function nowIso() {
  return new Date().toISOString()
}

export function publicUser(record: User & { salt?: string; passwordHash?: string }): User {
  const { id, username, displayName, email, avatarUrl, createdAt } = record
  return { id, username, displayName, email, avatarUrl, createdAt }
}

export function getBearer(request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  return scheme?.toLowerCase() === 'bearer' && token ? token : null
}

export function getGuestId(request: Request) {
  return request.headers.get('x-guest-id') ?? 'guest:anonymous'
}

export function findSession(request: Request): { session: SessionRecord; user: User } | null {
  const token = getBearer(request)
  if (!token) return null
  const session = db.state.sessions[token]
  if (!session) return null
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    delete db.state.sessions[token]
    db.persist()
    throw new HttpError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
  }
  const user = db.state.users[session.userId]
  if (!user) return null
  return { session, user: publicUser(user) }
}

export function requireUser(request: Request): User {
  const found = findSession(request)
  if (!found) {
    if (getBearer(request)) throw new HttpError(401, 'SESSION_EXPIRED', 'Sua sessão expirou. Entre novamente para continuar.')
    throw new HttpError(401, 'UNAUTHENTICATED', 'Entre na sua conta para continuar.')
  }
  return found.user
}

const flakyHits = new Map<string, number>()
export function resetFlaky() {
  flakyHits.clear()
}

/**
 * Applies the active scenario flags to a request: latency, connection failures and
 * transient 5xx. Returns a Response to short-circuit the handler, or null to continue.
 */
export async function applyScenario(request: Request): Promise<Response | null> {
  const flags = getFlags()
  const url = new URL(request.url)
  const isControl = url.pathname.startsWith('/api/_mock')
  if (isControl) return null

  if (flags.includes('offline')) {
    await delay(120)
    return HttpResponse.error()
  }
  if (flags.includes('timeout')) {
    await delay('infinite')
    return null
  }
  if (flags.includes('slow')) await delay(SLOW_LATENCY_MS)
  else if (flags.includes('variable-latency')) await delay(150 + Math.round(nextRandom() * 2450))
  else await delay(BASE_LATENCY_MS)

  if (flags.includes('flaky')) {
    const key = `${request.method} ${url.pathname}`
    const hits = (flakyHits.get(key) ?? 0) + 1
    flakyHits.set(key, hits)
    // Three consecutive failures exhaust TanStack Query's automatic retries (2) so the UI shows its
    // error state; the next manual "Tentar novamente" succeeds.
    if (hits <= 3) return errorResponse(503, 'TRANSIENT_FAILURE', 'Falha temporária do serviço. Tente novamente em instantes.')
  }
  return null
}

type Resolver<P extends PathParams = PathParams, B extends DefaultBodyType = DefaultBodyType> = HttpResponseResolver<P, B, DefaultBodyType>

/** Wraps a resolver with scenario handling + HttpError → JSON error translation. */
export function handler<P extends PathParams = PathParams, B extends DefaultBodyType = DefaultBodyType>(resolver: Resolver<P, B>): Resolver<P, B> {
  return async (info) => {
    const short = await applyScenario(info.request)
    if (short) return short
    try {
      return await resolver(info)
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.status, err.code, err.message, err.fieldErrors, err.details)
      console.error('[msw] unhandled error', err)
      return errorResponse(500, 'TRANSIENT_FAILURE', 'Erro interno do servidor simulado.')
    }
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Corpo da requisição inválido.')
  }
}
