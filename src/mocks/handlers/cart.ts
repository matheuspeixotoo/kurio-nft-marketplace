import { http } from 'msw'
import type { AddCartItemInput } from '@/types/api'
import { db } from '../db'
import { HttpError, findSession, getGuestId, handler, json, readJson, requireUser } from '../utils'
import { cartKey, findCoupon, getOrCreateCart, hydrateCart, mergeCarts, upsertCartItem } from '../services'

function ownerKeyFor(request: Request) {
  const found = findSession(request)
  return cartKey(found?.user.id ?? null, getGuestId(request))
}

export const cartHandlers = [
  http.get(
    '/api/cart',
    handler(({ request }) => json(hydrateCart(getOrCreateCart(ownerKeyFor(request))))),
  ),

  http.post(
    '/api/cart/items',
    handler(async ({ request }) => {
      const body = await readJson<AddCartItemInput>(request)
      const quantity = Math.floor(Number(body.quantity))
      if (!body.nftId || !body.editionId || !Number.isInteger(quantity) || quantity < 1) {
        throw new HttpError(422, 'VALIDATION_ERROR', 'Informe NFT, edição e uma quantidade inteira maior que zero.')
      }
      const cart = getOrCreateCart(ownerKeyFor(request))
      upsertCartItem(cart, body.nftId, body.editionId, quantity, 'add')
      return json(hydrateCart(cart), { status: 201 })
    }),
  ),

  http.patch(
    '/api/cart/items/:itemId',
    handler(async ({ request, params }) => {
      const body = await readJson<{ quantity: number }>(request)
      const quantity = Math.floor(Number(body.quantity))
      if (!Number.isInteger(quantity) || quantity < 0) throw new HttpError(422, 'VALIDATION_ERROR', 'Quantidade inválida.')
      const cart = getOrCreateCart(ownerKeyFor(request))
      const item = cart.items.find((i) => i.id === params.itemId)
      if (!item) throw new HttpError(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
      upsertCartItem(cart, item.nftId, item.editionId, quantity, 'set')
      return json(hydrateCart(cart))
    }),
  ),

  http.delete(
    '/api/cart/items/:itemId',
    handler(({ request, params }) => {
      const cart = getOrCreateCart(ownerKeyFor(request))
      const before = cart.items.length
      cart.items = cart.items.filter((i) => i.id !== params.itemId)
      if (cart.items.length === before) throw new HttpError(404, 'NOT_FOUND', 'Item não encontrado no carrinho.')
      cart.version += 1
      db.persist()
      return json(hydrateCart(cart))
    }),
  ),

  http.put(
    '/api/cart/coupon',
    handler(async ({ request }) => {
      const body = await readJson<{ code: string }>(request)
      const code = (body.code ?? '').trim().toUpperCase()
      if (!code) throw new HttpError(422, 'VALIDATION_ERROR', 'Digite um código promocional.', { code: 'Digite um código promocional.' })
      const { coupon, status } = findCoupon(code)
      if (status === 'invalid' || !coupon) throw new HttpError(422, 'COUPON_INVALID', 'Código promocional inválido.', { code: 'Código promocional inválido.' })
      if (status === 'expired') throw new HttpError(422, 'COUPON_EXPIRED', 'Este código promocional expirou.', { code: 'Este código promocional expirou.' })
      const cart = getOrCreateCart(ownerKeyFor(request))
      cart.couponCode = coupon.code
      cart.version += 1
      db.persist()
      return json(hydrateCart(cart))
    }),
  ),

  http.delete(
    '/api/cart/coupon',
    handler(({ request }) => {
      const cart = getOrCreateCart(ownerKeyFor(request))
      cart.couponCode = null
      cart.version += 1
      db.persist()
      return json(hydrateCart(cart))
    }),
  ),

  http.post(
    '/api/cart/merge',
    handler(async ({ request }) => {
      const user = requireUser(request)
      const body = await readJson<{ guestId: string }>(request)
      const userCart = getOrCreateCart(cartKey(user.id, ''))
      const guestCart = body.guestId ? db.state.carts[cartKey(null, body.guestId)] : undefined
      if (guestCart && guestCart.items.length) mergeCarts(guestCart, userCart)
      return json(hydrateCart(userCart))
    }),
  ),
]
