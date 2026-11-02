import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddCartItemInput, Cart } from '@/types/api'
import { api } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/query-keys'
import { getErrorMessage, toApiError } from '@/lib/api/errors'
import { getGuestId } from '@/lib/storage'
import { eth } from '@/lib/eth'
import { useAuth } from '@/features/auth/auth-context'
import { toast } from '@/components/ui/toast'
import { useAnnounce } from '@/components/live-announcer'

/** Cart cache is keyed by owner (user id or guest id) so switching users never mixes carts. */
export function useCartKey() {
  const { userId } = useAuth()
  return queryKeys.cart(userId ? `user:${userId}` : `guest:${getGuestId()}`)
}

export function useCart() {
  const key = useCartKey()
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => api.cart.get({ signal }),
    staleTime: 15_000,
  })
}

function useCartMutationHelpers() {
  const queryClient = useQueryClient()
  const key = useCartKey()
  const announce = useAnnounce()
  return {
    key,
    queryClient,
    announce,
    onError: (error: unknown, fallback: string) => {
      const e = toApiError(error)
      toast({ title: fallback, description: e.message, variant: 'error' })
      announce(`${fallback}: ${e.message}`, 'assertive')
    },
    settle: () => queryClient.invalidateQueries({ queryKey: key }),
  }
}

export function useAddToCart() {
  const { key, queryClient, announce, onError, settle } = useCartMutationHelpers()
  return useMutation({
    mutationFn: (input: AddCartItemInput & { name?: string; silent?: boolean }) =>
      api.cart.addItem({ nftId: input.nftId, editionId: input.editionId, quantity: input.quantity }),
    onSuccess: (cart, vars) => {
      queryClient.setQueryData(key, cart)
      if (!vars.silent) toast({ title: 'Adicionado ao carrinho', description: `${vars.name ?? 'NFT'} × ${vars.quantity}`, variant: 'success' })
      announce(`${vars.name ?? 'NFT'} adicionado ao carrinho. ${cart.totalQuantity} itens no total.`)
    },
    onError: (error) => onError(error, 'Não foi possível adicionar ao carrinho'),
    onSettled: settle,
  })
}

/** Optimistic quantity update with rollback (the second optimistic interaction besides favorites). */
export function useUpdateCartItem() {
  const { key, queryClient, announce, onError, settle } = useCartMutationHelpers()
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => api.cart.updateItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      queryClient.setQueryData<Cart>(key, (cart) => {
        if (!cart) return cart
        const items = cart.items.map((i) => (i.id === itemId ? { ...i, quantity, lineTotal: eth.mul(i.unitPrice, quantity) } : i)).filter((i) => i.quantity > 0)
        return { ...cart, items, totalQuantity: items.reduce((a, i) => a + i.quantity, 0) }
      })
      return { previous }
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous)
      onError(error, 'Não foi possível alterar a quantidade')
    },
    onSuccess: (cart) => {
      queryClient.setQueryData(key, cart)
      announce('Quantidade atualizada.')
    },
    onSettled: settle,
  })
}

export function useRemoveCartItem() {
  const { key, queryClient, announce, onError, settle } = useCartMutationHelpers()
  return useMutation({
    mutationFn: ({ itemId }: { itemId: string; name?: string }) => api.cart.removeItem(itemId),
    onSuccess: (cart, vars) => {
      queryClient.setQueryData(key, cart)
      announce(`${vars.name ?? 'Item'} removido do carrinho.`)
    },
    onError: (error) => onError(error, 'Não foi possível remover o item'),
    onSettled: settle,
  })
}

export function useApplyCoupon() {
  const { key, queryClient, announce, settle } = useCartMutationHelpers()
  return useMutation({
    mutationFn: (code: string) => api.cart.applyCoupon(code),
    onSuccess: (cart) => {
      queryClient.setQueryData(key, cart)
      toast({ title: 'Cupom aplicado', description: cart.couponCode ?? undefined, variant: 'success' })
      announce(`Cupom ${cart.couponCode} aplicado.`)
    },
    onError: (error) => announce(getErrorMessage(error), 'assertive'),
    onSettled: settle,
  })
}

export function useRemoveCoupon() {
  const { key, queryClient, announce, onError, settle } = useCartMutationHelpers()
  return useMutation({
    mutationFn: () => api.cart.removeCoupon(),
    onSuccess: (cart) => {
      queryClient.setQueryData(key, cart)
      announce('Cupom removido.')
    },
    onError: (error) => onError(error, 'Não foi possível remover o cupom'),
    onSettled: settle,
  })
}
