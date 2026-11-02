/**
 * Thin, defensive wrappers around localStorage. Every read/write is guarded because
 * storage can be unavailable (private mode, blocked site data, Playwright contexts).
 */
export const STORAGE_KEYS = {
  token: 'kurio:token',
  guestId: 'kurio:guest-id',
  scenario: 'kurio:scenario',
  mockDb: 'kurio:mock-db',
  checkoutDraft: 'kurio:checkout-draft',
  pendingOrder: 'kurio:pending-order',
  idempotency: 'kurio:idempotency',
} as const

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const raw = readStorage(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  writeStorage(key, value === null || value === undefined ? null : JSON.stringify(value))
}

export function getToken() {
  return readStorage(STORAGE_KEYS.token)
}
export function setToken(token: string | null) {
  writeStorage(STORAGE_KEYS.token, token)
}

export function getGuestId() {
  let id = readStorage(STORAGE_KEYS.guestId)
  if (!id) {
    id = `guest_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
    writeStorage(STORAGE_KEYS.guestId, id)
  }
  return id
}
export function rotateGuestId() {
  writeStorage(STORAGE_KEYS.guestId, null)
  return getGuestId()
}
