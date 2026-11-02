import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CatalogPage, NftDetail, NftSummary, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/types/api'
import { getToken } from '@/lib/storage'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/features/auth/auth-context'
import { useAnnounce } from '@/components/live-announcer'
import { formatEth } from '@/lib/eth'
import type { AppSocket } from './socket'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

interface RealtimeContextValue {
  status: RealtimeStatus
  /** Monotonic counter of reconnections (used by screens to reconcile with REST). */
  reconnects: number
  lastEventAt: number | null
  subscribe: (resource: 'order' | 'nft', id: string) => () => void
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

const MAX_SEEN_EVENTS = 500

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { token, userId } = useAuth()
  const announce = useAnnounce()
  const socketRef = useRef<AppSocket | null>(null)
  const seenEvents = useRef<Set<string>>(new Set())
  const versions = useRef<Map<string, number>>(new Map())
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const [reconnects, setReconnects] = useState(0)
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const userIdRef = useRef(userId)
  userIdRef.current = userId

  /** Returns false for duplicates and for events older than the last applied version. */
  const accept = useCallback((event: { eventId: string; resource: string; id: string; version: number }) => {
    if (seenEvents.current.has(event.eventId)) return false
    const key = `${event.resource}:${event.id}`
    const seenVersion = versions.current.get(key) ?? 0
    if (event.version <= seenVersion) {
      seenEvents.current.add(event.eventId)
      return false
    }
    seenEvents.current.add(event.eventId)
    if (seenEvents.current.size > MAX_SEEN_EVENTS) {
      const first = seenEvents.current.values().next().value
      if (first) seenEvents.current.delete(first)
    }
    versions.current.set(key, event.version)
    return true
  }, [])

  const applyNftUpdate = useCallback(
    (event: NftUpdatedEvent) => {
      if (!accept(event)) return
      setLastEventAt(Date.now())
      const patchSummary = <T extends NftSummary>(nft: T): T =>
        nft.id === event.id && nft.version < event.version
          ? { ...nft, price: event.payload.price, available: event.payload.available, version: event.version }
          : nft

      queryClient.setQueriesData<CatalogPage>({ queryKey: queryKeys.catalog.all, exact: false }, (data) => {
        if (!data || !('items' in data) || !Array.isArray(data.items)) return data
        return { ...data, items: data.items.map(patchSummary) }
      })
      queryClient.setQueriesData<NftSummary[]>({ queryKey: ['catalog', 'related'], exact: false }, (data) =>
        Array.isArray(data) ? data.map(patchSummary) : data,
      )
      queryClient.setQueryData<NftDetail>(queryKeys.catalog.detail(event.id), (nft) => {
        if (!nft || nft.version >= event.version) return nft
        return {
          ...nft,
          price: event.payload.price,
          available: event.payload.available,
          version: event.version,
          editions: nft.editions.map((e) => {
            const patch = event.payload.editions.find((p) => p.id === e.id)
            return patch ? { ...e, ...patch } : e
          }),
        }
      })
      // Cart and quote are server-computed: refetch so the summary reflects the new price/availability.
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
      announce(`Atualização em tempo real: preço agora ${formatEth(event.payload.price)}, ${event.payload.available} unidades disponíveis.`)
    },
    [accept, announce, queryClient],
  )

  const applyOrderUpdate = useCallback(
    (event: OrderUpdatedEvent) => {
      if (!accept(event)) return
      setLastEventAt(Date.now())
      const uid = userIdRef.current
      queryClient.setQueryData<Order>(queryKeys.orders.detail(uid, event.id), (order) => {
        if (!order || order.version >= event.version) return order
        return { ...order, ...event.payload, version: event.version, updatedAt: event.emittedAt }
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(uid, event.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all(uid) })
      if (event.payload.status !== 'pending') {
        // Confirmed: purchased units left the cart; declined: stock was restored. Both touch cart/catalog.
        void queryClient.invalidateQueries({ queryKey: ['cart'] })
        void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all })
      }
      const label = event.payload.status === 'confirmed' ? 'confirmado' : event.payload.status === 'declined' ? 'recusado' : 'pendente'
      announce(`Pedido ${event.id} ${label}.`, 'assertive')
    },
    [accept, announce, queryClient],
  )

  useEffect(() => {
    let socket: AppSocket | null = null
    let disposed = false
    let wasConnected = false

    // socket.io-client is loaded lazily: engine.io-client captures globalThis.WebSocket when its
    // module is evaluated, and by the time this effect runs MSW has already patched it (see main.tsx).
    void import('./socket').then(({ createSocket }) => {
      if (disposed) return
      socket = createSocket()
      socketRef.current = socket
      attach(socket)
      socket.connect()
    })

    const attach = (socket: AppSocket) => {
      socket.on('connect', () => {
        setStatus('connected')
        socket.emit('auth', { token: getToken() })
        if (wasConnected) {
          // Reconciliation after a reconnect: events may have been missed → refetch what is on screen.
          setReconnects((n) => n + 1)
          void queryClient.invalidateQueries({ refetchType: 'active' })
        }
        wasConnected = true
      })
      socket.on('disconnect', () => setStatus('disconnected'))
      socket.io.on('reconnect_attempt', () => setStatus('connecting'))
      socket.on('nft.updated', applyNftUpdate)
      socket.on('order.updated', applyOrderUpdate)
    }

    return () => {
      disposed = true
      if (!socket) return
      socket.off('nft.updated', applyNftUpdate)
      socket.off('order.updated', applyOrderUpdate)
      socket.removeAllListeners()
      socket.io.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [applyNftUpdate, applyOrderUpdate, queryClient])

  // Re-authenticate the live connection whenever the session changes (login/logout/expiry),
  // and forget per-user version bookkeeping so a previous session cannot shadow the new one.
  useEffect(() => {
    const socket = socketRef.current
    versions.current.forEach((_v, key) => {
      if (key.startsWith('order:')) versions.current.delete(key)
    })
    if (socket?.connected) socket.emit('auth', { token })
  }, [token])

  const subscribe = useCallback((resource: 'order' | 'nft', id: string) => {
    const socket = socketRef.current
    socket?.emit('subscribe', { resource, id })
    return () => socket?.emit('unsubscribe', { resource, id })
  }, [])

  const value = useMemo<RealtimeContextValue>(() => ({ status, reconnects, lastEventAt, subscribe }), [status, reconnects, lastEventAt, subscribe])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider')
  return ctx
}

/** Subscribes to a resource for the lifetime of the component. */
export function useRealtimeSubscription(resource: 'order' | 'nft', id: string | null | undefined) {
  const { subscribe } = useRealtime()
  useEffect(() => {
    if (!id) return
    return subscribe(resource, id)
  }, [subscribe, resource, id])
}
