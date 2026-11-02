import { http } from 'msw'
import type { LoginInput, RegisterInput, Session } from '@/types/api'
import { db } from '../db'
import { hasFlag } from '../scenario'
import { HttpError, findSession, getBearer, handler, json, noContent, nowIso, publicUser, readJson, sha256Hex } from '../utils'
import { profiles as seedProfiles } from '../fixtures/accounts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USERNAME_RE = /^[a-z0-9][a-z0-9._]{2,23}$/

export function validatePassword(password: string | undefined): string | null {
  if (!password || password.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Use letras e números na senha.'
  return null
}

function sessionTtlMs() {
  return hasFlag('session-expired') ? 20_000 : 8 * 60 * 60_000
}

function createSession(userId: string): Session {
  const token = `tok_${userId}_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + sessionTtlMs()).toISOString()
  db.state.sessions[token] = { token, userId, createdAt, expiresAt }
  db.persist()
  const user = db.state.users[userId]!
  return { user: publicUser(user), token, expiresAt }
}

export const authHandlers = [
  http.post(
    '/api/auth/register',
    handler(async ({ request }) => {
      const body = await readJson<RegisterInput>(request)
      const fieldErrors: Record<string, string> = {}
      const username = (body.username ?? '').trim().toLowerCase()
      const email = (body.email ?? '').trim().toLowerCase()
      if (!USERNAME_RE.test(username)) fieldErrors.username = 'Use de 3 a 24 caracteres: letras minúsculas, números, ponto ou sublinhado.'
      if (!EMAIL_RE.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
      const pw = validatePassword(body.password)
      if (pw) fieldErrors.password = pw
      if (Object.keys(fieldErrors).length) throw new HttpError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)

      const users = Object.values(db.state.users)
      if (hasFlag('register-conflict') || users.some((u) => u.email.toLowerCase() === email)) {
        throw new HttpError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', {
          email: 'Este e-mail já está cadastrado. Entre ou use outro endereço.',
        })
      }
      if (users.some((u) => u.username.toLowerCase() === username)) {
        throw new HttpError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { username: 'Nome de usuário indisponível.' })
      }

      const id = `usr_${Math.random().toString(36).slice(2, 10)}`
      const salt = `salt_${Math.random().toString(36).slice(2, 10)}`
      const passwordHash = await sha256Hex(`${salt}:${body.password}`)
      const createdAt = nowIso()
      db.state.users[id] = { id, username, displayName: username, email, avatarUrl: null, createdAt, salt, passwordHash }
      db.state.profiles[id] = {
        ...seedProfiles.usr_bruno!,
        id,
        username,
        displayName: username,
        email,
        ensName: '',
        walletNickname: '',
        avatarUrl: null,
        updatedAt: createdAt,
      }
      db.state.wallets[id] = { primary: null, secondary: null }
      db.state.favorites[id] = []
      db.persist()
      return json(createSession(id), { status: 201 })
    }),
  ),

  http.post(
    '/api/auth/login',
    handler(async ({ request }) => {
      const body = await readJson<LoginInput>(request)
      const email = (body.email ?? '').trim().toLowerCase()
      const fieldErrors: Record<string, string> = {}
      if (!EMAIL_RE.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
      if (!body.password) fieldErrors.password = 'Informe sua senha.'
      if (Object.keys(fieldErrors).length) throw new HttpError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)
      const user = Object.values(db.state.users).find((u) => u.email.toLowerCase() === email)
      if (!user) throw new HttpError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
      const hash = await sha256Hex(`${user.salt}:${body.password}`)
      if (hash !== user.passwordHash) throw new HttpError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')
      return json(createSession(user.id))
    }),
  ),

  http.get(
    '/api/auth/session',
    handler(({ request }) => {
      const found = findSession(request)
      if (!found) {
        throw new HttpError(
          401,
          getBearer(request) ? 'SESSION_EXPIRED' : 'UNAUTHENTICATED',
          getBearer(request) ? 'Sua sessão expirou.' : 'Nenhuma sessão ativa.',
        )
      }
      return json({ user: found.user, expiresAt: found.session.expiresAt })
    }),
  ),

  http.post(
    '/api/auth/logout',
    handler(({ request }) => {
      const token = getBearer(request)
      if (token && db.state.sessions[token]) {
        delete db.state.sessions[token]
        db.persist()
      }
      return noContent()
    }),
  ),
]
