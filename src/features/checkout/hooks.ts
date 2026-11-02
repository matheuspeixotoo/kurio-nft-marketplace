import { useCallback, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Cart, CreateOrderInput, Network, Order, Quote } from '@/types/api'
import { api } from '@/lib/api/endpoints'
import { http } from '@/lib/api/http'
import { queryKeys } from '@/lib/query-keys'
import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage'
import { uid } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth-context'
import { toApiError } from '@/lib/api/errors'

export function quoteFingerprint(cart: Cart | undefined, network: Network) {
  if (!cart) return 'empty'
  return JSON.stringify({ items: cart.items.map((i) => [i.nftId, i.editionId, i.quantity]), coupon: cart.couponCode, network, v: cart.version })
}

/**
 * Server quote for the current cart. `X-Checkout: 1` tells the mock that this is the checkout
 * revalidation (used by the price-change / sold-out scenarios). The query refetches whenever the
 * cart or network changes and when a realtime `nft.updated` invalidates it.
 */
export function useQuote(cart: Cart | undefined, network: Network, enabled = true) {
  const { userId } = useAuth()
  const fp = quoteFingerprint(cart, network)
  return useQuery({
    queryKey: queryKeys.quote(userId ?? 'guest', fp),
    queryFn: async ({ signal }) => {
      const res = await http.post<Quote>(
        '/quote',
        { items: cart!.items.map((i) => ({ nftId: i.nftId, editionId: i.editionId, quantity: i.quantity })), couponCode: cart!.couponCode, network },
        { signal, headers: { 'X-Checkout': '1' } },
      )
      return res.data
    },
    enabled: enabled && !!cart && cart.items.length > 0,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  })
}

interface PendingOrderRef {
  orderId: string | null
  idempotencyKey: string
  quoteHash: string
  userId: string
  createdAt: string
}

/**
 * Order creation with an idempotency key that survives refreshes and timeouts: the key is
 * generated once per quote hash and persisted; retries reuse it, so the mock returns the same order.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()

  const getKeyFor = useCallback(
    (quoteHash: string) => {
      const existing = readJson<PendingOrderRef | null>(STORAGE_KEYS.idempotency, null)
      if (existing && existing.quoteHash === quoteHash && existing.userId === userId) return existing
      const fresh: PendingOrderRef = { orderId: null, idempotencyKey: uid('idem'), quoteHash, userId: userId ?? '', createdAt: new Date().toISOString() }
      writeJson(STORAGE_KEYS.idempotency, fresh)
      return fresh
    },
    [userId],
  )

  const mutation = useMutation({
    mutationFn: async (input: CreateOrderInput) => {
      const ref = getKeyFor(input.quoteHash)
      const order = await api.orders.create(input, ref.idempotencyKey, { timeout: 8000 })
      writeJson(STORAGE_KEYS.idempotency, { ...ref, orderId: order.id })
      return order
    },
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.orders.detail(userId, order.id), order)
      writeJson(STORAGE_KEYS.pendingOrder, { orderId: order.id, userId })
      writeJson(STORAGE_KEYS.idempotency, null)
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalog.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all(userId) })
    },
  })

  const outdatedQuote = useMemo(() => {
    const e = mutation.error ? toApiError(mutation.error) : null
    return e?.code === 'QUOTE_OUTDATED' ? ((e.details.quote as Quote | undefined) ?? null) : null
  }, [mutation.error])

  return { ...mutation, outdatedQuote }
}

export function useOrder(orderId: string | undefined, opts: { poll?: boolean } = {}) {
  const { userId, isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.orders.detail(userId, orderId ?? ''),
    queryFn: ({ signal }) => api.orders.get(orderId!, { signal }),
    enabled: isAuthenticated && !!orderId,
    // Pending orders are reconciled with REST every 4 s in addition to the socket, so a lost
    // connection never leaves the user stuck.
    refetchInterval: (query) => (opts.poll !== false && query.state.data?.status === 'pending' ? 4000 : false),
    retry: (count, error) => toApiError(error).status !== 404 && toApiError(error).status !== 403 && count < 2,
  })
}

export function useOrders() {
  const { userId, isAuthenticated } = useAuth()
  return useQuery({ queryKey: queryKeys.orders.all(userId), queryFn: ({ signal }) => api.orders.list({ signal }), enabled: isAuthenticated })
}

export function readPendingOrder(userId: string | null) {
  const ref = readJson<{ orderId: string; userId: string | null } | null>(STORAGE_KEYS.pendingOrder, null)
  return ref && ref.userId === userId ? ref.orderId : null
}

export function clearPendingOrder() {
  writeJson(STORAGE_KEYS.pendingOrder, null)
}

export type { Order }
