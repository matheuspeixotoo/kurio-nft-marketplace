import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/api'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

/**
 * Real `socket.io-client` instance. In the demo build the connection is intercepted by MSW
 * (see src/mocks/socket.ts); against a real backend only VITE_SOCKET_URL changes.
 * WebSocket-only transport: Socket.IO's HTTP long-polling fallback is not interceptable by MSW.
 */
/**
 * Default realtime origin. `realtime.kurio.mock` never resolves on the network: the WebSocket is
 * intercepted by MSW before any DNS lookup, so the same build works locally and on Vercel.
 * Point VITE_SOCKET_URL to a real Socket.IO server to leave the mock.
 */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'ws://realtime.kurio.mock'

export function createSocket(): AppSocket {
  return io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 3000,
    timeout: 8000,
  })
}
