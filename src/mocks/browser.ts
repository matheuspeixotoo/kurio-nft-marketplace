import { setupWorker } from 'msw/browser'
import { STORAGE_KEYS, writeStorage } from '@/lib/storage'
import { db } from './db'
import { handlers } from './handlers'
import { resumePendingOrders } from './handlers/commerce'
import { parseFlags, setFlags } from './scenario'

export const worker = setupWorker(...handlers)

/**
 * Boots the mock layer. Enabled when VITE_ENABLE_MOCKS !== 'false' (default on, including the
 * production/demo build). URL switches handled here, before the app renders:
 *   ?scenario=slow,flaky   → sets the scenario flags (persisted in localStorage)
 *   ?scenario=             → clears the flags
 *   ?reset=1               → restores the seed state (catalog, users, carts, orders)
 */
export async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') return false
  const url = new URL(window.location.href)
  let touched = false
  if (url.searchParams.has('scenario')) {
    setFlags(parseFlags(url.searchParams.get('scenario')))
    url.searchParams.delete('scenario')
    touched = true
  }
  if (url.searchParams.get('reset') === '1') {
    writeStorage(STORAGE_KEYS.mockDb, null)
    writeStorage(STORAGE_KEYS.token, null)
    writeStorage(STORAGE_KEYS.pendingOrder, null)
    writeStorage(STORAGE_KEYS.checkoutDraft, null)
    url.searchParams.delete('reset')
    touched = true
  }
  if (touched) window.history.replaceState(window.history.state, '', url.toString())

  db.load()
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  resumePendingOrders()
  if (import.meta.env.DEV) (window as unknown as { __kurioWorker?: typeof worker }).__kurioWorker = worker
  return true
}
