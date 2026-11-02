import type { Cart, CartItem, Edition, Network, NftDetail, Quote, QuoteInput, QuoteIssue, QuoteLine } from '@/types/api'
import { eth } from '@/lib/eth'
import { NETWORK_FEES, coupons, type Coupon } from './fixtures/accounts'
import { db, type CartRecord } from './db'
import { HttpError, fingerprint, nowIso } from './utils'
import { hasFlag } from './scenario'
import { emitNftUpdated } from './socket'

// ---------------------------------------------------------------------------
// Catalog helpers
// ---------------------------------------------------------------------------
export function getNft(id: string): NftDetail {
  const nft = db.state.nfts[id]
  if (!nft) throw new HttpError(404, 'NOT_FOUND', 'NFT não encontrado.')
  return nft
}

export function getEdition(nft: NftDetail, editionId: string): Edition {
  const edition = nft.editions.find((e) => e.id === editionId)
  if (!edition) throw new HttpError(404, 'NOT_FOUND', 'Edição não encontrada.')
  return edition
}

export function recomputeNft(nft: NftDetail) {
  nft.available = nft.editions.filter((e) => e.status === 'available').reduce((acc, e) => acc + Math.min(e.available, 50), 0)
  const def = nft.editions.find((e) => e.id === nft.defaultEditionId)
  if (def) nft.price = def.price
}

/** Mutates an NFT (price and/or availability), bumps its version and emits `nft.updated`. */
export function applyNftChange(nftId: string, change: { editionId?: string; price?: string; available?: number }) {
  const nft = getNft(nftId)
  const edition = getEdition(nft, change.editionId ?? nft.defaultEditionId)
  if (change.price !== undefined) {
    edition.price = eth.normalize(change.price)
    nft.priceUpdatedAt = nowIso()
  }
  if (change.available !== undefined) {
    edition.available = Math.max(0, change.available)
    edition.status = edition.available <= 0 ? 'sold_out' : edition.status === 'unavailable' ? 'unavailable' : 'available'
  }
  recomputeNft(nft)
  nft.version += 1
  db.persist()
  emitNftUpdated(nft)
  return nft
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------
export function findCoupon(code: string | null | undefined): { coupon: Coupon | null; status: Quote['couponStatus'] } {
  if (!code) return { coupon: null, status: 'none' }
  const coupon = coupons.find((c) => c.code.toLowerCase() === code.trim().toLowerCase()) ?? null
  if (!coupon) return { coupon: null, status: 'invalid' }
  const expired = hasFlag('coupon-expired') || (coupon.expiresAt !== null && new Date(coupon.expiresAt).getTime() < Date.now())
  if (expired) return { coupon, status: 'expired' }
  return { coupon, status: 'applied' }
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------
export function cartKey(userId: string | null, guestId: string) {
  return userId ? `user:${userId}` : `guest:${guestId}`
}

export function getOrCreateCart(ownerKey: string): CartRecord {
  let cart = db.state.carts[ownerKey]
  if (!cart) {
    cart = {
      id: `cart_${fingerprint(ownerKey)}`,
      ownerKey,
      ownerType: ownerKey.startsWith('user:') ? 'user' : 'guest',
      items: [],
      couponCode: null,
      totalQuantity: 0,
      updatedAt: nowIso(),
      version: 1,
    }
    db.state.carts[ownerKey] = cart
    db.persist()
  }
  return cart
}

/** Re-reads prices/availability from the catalog so the cart always mirrors the current state. */
export function hydrateCart(cart: CartRecord): Cart {
  let changed = false
  const items: CartItem[] = []
  for (const item of cart.items) {
    const nft = db.state.nfts[item.nftId]
    if (!nft) {
      changed = true
      continue
    }
    const edition = nft.editions.find((e) => e.id === item.editionId)
    if (!edition) {
      changed = true
      continue
    }
    const previousPrice = item.unitPrice
    const unitPrice = edition.price
    const priceChangedFrom = eth.cmp(previousPrice, unitPrice) !== 0 ? previousPrice : item.priceChangedFrom
    const next: CartItem = {
      ...item,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      network: nft.network,
      editionLabel: edition.label,
      unitPrice,
      lineTotal: eth.mul(unitPrice, item.quantity),
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      status: edition.status,
      priceChangedFrom,
      version: nft.version,
    }
    if (JSON.stringify(next) !== JSON.stringify(item)) changed = true
    items.push(next)
  }
  if (changed) {
    cart.items = items
    cart.updatedAt = nowIso()
    db.persist()
  }
  cart.totalQuantity = items.reduce((acc, i) => acc + i.quantity, 0)
  const { ownerKey: _ownerKey, ...publicCart } = cart
  return { ...publicCart, items }
}

export function clampQuantity(edition: Edition, requested: number) {
  if (edition.status !== 'available') return 0
  return Math.max(0, Math.min(requested, edition.available, edition.maxPerOrder))
}

export function upsertCartItem(cart: CartRecord, nftId: string, editionId: string, quantity: number, mode: 'add' | 'set') {
  const nft = getNft(nftId)
  const edition = getEdition(nft, editionId)
  if (edition.status === 'unavailable') throw new HttpError(409, 'EDITION_UNAVAILABLE', 'Esta edição não está disponível para compra.')
  if (edition.status === 'sold_out') throw new HttpError(409, 'AVAILABILITY_CONFLICT', 'Esta edição está esgotada.')
  const existing = cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)
  const target = mode === 'add' ? (existing?.quantity ?? 0) + quantity : quantity
  const limit = Math.min(edition.available, edition.maxPerOrder)
  if (target > limit) {
    throw new HttpError(409, 'QUANTITY_LIMIT', `Limite de ${limit} unidade${limit === 1 ? '' : 's'} para esta edição.`, undefined, {
      limit,
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
    })
  }
  if (target <= 0) {
    cart.items = cart.items.filter((i) => i !== existing)
  } else if (existing) {
    existing.quantity = target
    existing.priceChangedFrom = null
    existing.unitPrice = edition.price
  } else {
    cart.items.push({
      id: `ci_${fingerprint(`${cart.id}:${nftId}:${editionId}`)}`,
      nftId,
      editionId,
      editionLabel: edition.label,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      network: nft.network,
      quantity: target,
      unitPrice: edition.price,
      lineTotal: eth.mul(edition.price, target),
      available: edition.available,
      maxPerOrder: edition.maxPerOrder,
      status: edition.status,
      priceChangedFrom: null,
      version: nft.version,
    })
  }
  cart.updatedAt = nowIso()
  cart.version += 1
  db.persist()
}

export function mergeCarts(from: CartRecord, into: CartRecord) {
  for (const item of from.items) {
    const nft = db.state.nfts[item.nftId]
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition || edition.status !== 'available') continue
    const existing = into.items.find((i) => i.nftId === item.nftId && i.editionId === item.editionId)
    const limit = Math.min(edition.available, edition.maxPerOrder)
    const target = Math.min(limit, (existing?.quantity ?? 0) + item.quantity)
    if (target <= 0) continue
    if (existing) existing.quantity = target
    else into.items.push({ ...item, id: `ci_${fingerprint(`${into.id}:${item.nftId}:${item.editionId}`)}`, quantity: target })
  }
  if (!into.couponCode && from.couponCode) into.couponCode = from.couponCode
  into.updatedAt = nowIso()
  into.version += 1
  delete db.state.carts[from.ownerKey]
  db.persist()
}

// ---------------------------------------------------------------------------
// Quote
// ---------------------------------------------------------------------------
export function computeQuote(input: QuoteInput): Quote {
  const issues: QuoteIssue[] = []
  const lines: QuoteLine[] = []
  for (const req of input.items) {
    const nft = db.state.nfts[req.nftId]
    if (!nft) {
      issues.push({ type: 'EDITION_UNAVAILABLE', nftId: req.nftId, message: 'Item removido do catálogo.' })
      continue
    }
    const edition = nft.editions.find((e) => e.id === req.editionId)
    if (!edition || edition.status === 'unavailable') {
      issues.push({ type: 'EDITION_UNAVAILABLE', nftId: nft.id, editionId: req.editionId, message: `${nft.name}: edição indisponível.` })
      continue
    }
    if (edition.status === 'sold_out' || edition.available <= 0) {
      issues.push({ type: 'SOLD_OUT', nftId: nft.id, editionId: edition.id, message: `${nft.name} (${edition.label}) esgotou.` })
      continue
    }
    let quantity = Math.max(0, Math.floor(req.quantity))
    const limit = Math.min(edition.available, edition.maxPerOrder)
    if (quantity > limit) {
      issues.push({
        type: 'QUANTITY_REDUCED',
        nftId: nft.id,
        editionId: edition.id,
        message: `${nft.name}: quantidade ajustada para ${limit}.`,
        previous: String(quantity),
        current: String(limit),
      })
      quantity = limit
    }
    if (quantity <= 0) continue
    lines.push({
      nftId: nft.id,
      editionId: edition.id,
      name: nft.name,
      tokenId: nft.tokenId,
      image: nft.image,
      quantity,
      unitPrice: edition.price,
      lineTotal: eth.mul(edition.price, quantity),
      available: edition.available,
    })
  }

  const network: Network = input.network ?? 'ethereum'
  const subtotal = eth.sum(lines.map((l) => l.lineTotal))
  const { coupon, status } = findCoupon(input.couponCode)
  if (status === 'expired') issues.push({ type: 'COUPON_EXPIRED', message: `O cupom ${input.couponCode?.toUpperCase()} expirou e foi removido.` })
  if (status === 'invalid') issues.push({ type: 'COUPON_INVALID', message: `O cupom ${input.couponCode?.toUpperCase()} não é válido.` })
  const discount = coupon && status === 'applied' ? eth.percentOf(subtotal, coupon.percent) : '0'
  const networkFee = lines.length ? NETWORK_FEES[network] : '0'
  const total = eth.add(eth.sub(subtotal, discount), networkFee)
  const issuedAt = new Date()
  const quoteHash = fingerprint(
    JSON.stringify({
      lines: lines.map((l) => [l.nftId, l.editionId, l.quantity, l.unitPrice]),
      coupon: status === 'applied' ? coupon?.code : null,
      networkFee,
      network,
    }),
  )
  return {
    quoteId: `q_${quoteHash}_${issuedAt.getTime().toString(36)}`,
    quoteHash,
    lines,
    subtotal,
    discount,
    networkFee,
    total,
    currency: 'ETH',
    network,
    couponCode: status === 'applied' ? (coupon?.code ?? null) : null,
    couponStatus: status,
    issues,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + 10 * 60_000).toISOString(),
  }
}
