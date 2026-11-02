import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftDetail, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/types/api'
import { db, type StoredEvent } from './db'
import { nowIso } from './utils'

/**
 * Socket.IO server simulated with MSW's WebSocket interception + @mswjs/socket.io-binding.
 *
 * Transport: the real `socket.io-client` opens `ws(s)://<origin>/socket.io/?EIO=4&transport=websocket`
 * (polling is disabled on the client because MSW cannot intercept the long-polling XHR dance
 * in a way Socket.IO accepts). The binding encodes/decodes Engine.IO + Socket.IO packets so the
 * client sees a genuine Socket.IO server: handshake, `connect`, custom events, reconnection.
 *
 * Limitations (documented in ARCHITECTURE.md): no namespaces/rooms/acks, no binary payloads,
 * server-side pings are emitted manually (every 20 s) to keep the client from timing out.
 */

type IoConnection = ReturnType<typeof toSocketIo>

interface ClientRecord {
  io: IoConnection
  userId: string | null
  subscriptions: Set<string>
  ping: ReturnType<typeof setInterval>
  close: () => void
}

const clients = new Set<ClientRecord>()

/**
 * MSW strips the `/socket.io/` prefix from intercepted URLs, so Socket.IO links are matched by
 * origin. The client connects to ws://realtime.kurio.mock (see src/features/realtime/socket.ts);
 * the wss variant covers https deployments if VITE_SOCKET_URL is switched to a secure scheme.
 */
const socketLinks = [ws.link('ws://realtime.kurio.mock'), ws.link('wss://realtime.kurio.mock')]

export const realtimeHandlers = socketLinks.map((link) =>
  link.addEventListener('connection', (connection) => {
    if (import.meta.env.DEV) console.info('[mock-socket] connection', connection.client.url.href)
    const io = toSocketIo(connection)
    const record: ClientRecord = {
      io,
      userId: null,
      subscriptions: new Set(),
      ping: setInterval(() => {
        try {
          connection.client.send('2') // Engine.IO ping
        } catch {
          /* closed */
        }
      }, 20_000),
      close: () => connection.client.close(),
    }
    clients.add(record)

    io.client.on('auth', (_event, payload: { token: string | null }) => {
      const session = payload?.token ? db.state.sessions[payload.token] : undefined
      const valid = session && new Date(session.expiresAt).getTime() > Date.now()
      record.userId = valid ? session.userId : null
      io.client.emit('auth.ok', { userId: record.userId })
    })

    io.client.on('subscribe', (_event, payload: { resource: string; id: string }) => {
      if (payload?.resource && payload?.id) record.subscriptions.add(`${payload.resource}:${payload.id}`)
    })
    io.client.on('unsubscribe', (_event, payload: { resource: string; id: string }) => {
      if (payload?.resource && payload?.id) record.subscriptions.delete(`${payload.resource}:${payload.id}`)
    })

    connection.client.addEventListener('close', () => {
      clearInterval(record.ping)
      clients.delete(record)
    })
  }),
)

function nextEventId() {
  return `evt_${String(db.nextId('event')).padStart(5, '0')}`
}

function deliver(event: StoredEvent, predicate: (c: ClientRecord) => boolean) {
  for (const c of clients) {
    if (!predicate(c)) continue
    try {
      c.io.client.emit(event.resource === 'nft' ? 'nft.updated' : 'order.updated', event)
    } catch {
      /* ignore broken pipe */
    }
  }
}

export function emitNftUpdated(nft: NftDetail) {
  const event: NftUpdatedEvent = {
    eventId: nextEventId(),
    resource: 'nft',
    id: nft.id,
    version: nft.version,
    emittedAt: nowIso(),
    payload: {
      price: nft.price,
      available: nft.available,
      editions: nft.editions.map((e) => ({ id: e.id, price: e.price, available: e.available, status: e.status })),
    },
  }
  db.pushEvent(event)
  deliver(event, () => true)
  return event
}

export function emitOrderUpdated(order: Order) {
  const event: OrderUpdatedEvent = {
    eventId: nextEventId(),
    resource: 'order',
    id: order.id,
    version: order.version,
    emittedAt: nowIso(),
    payload: {
      status: order.status,
      txHash: order.txHash,
      explorerUrl: order.explorerUrl,
      failureReason: order.failureReason,
      settledAt: order.settledAt,
    },
  }
  db.pushEvent(event)
  // Only sockets authenticated as the order owner receive it — never another user's session.
  deliver(event, (c) => c.userId === order.userId)
  return event
}

/** Re-sends a past event verbatim (same eventId/version) to exercise duplicate/stale handling. */
export function replayEvent(eventId: string) {
  const event = db.state.eventLog.find((e) => e.eventId === eventId) ?? db.state.eventLog.at(-1)
  if (!event) return null
  if (event.resource === 'nft') deliver(event, () => true)
  else {
    const order = db.state.orders[event.id]
    deliver(event, (c) => !!order && c.userId === order.userId)
  }
  return event
}

/** Closes every intercepted socket; socket.io-client will reconnect on its own. */
export function disconnectAllSockets() {
  for (const c of Array.from(clients)) {
    try {
      c.close()
    } catch {
      /* ignore */
    }
  }
}

export function connectedSocketsCount() {
  return clients.size
}
