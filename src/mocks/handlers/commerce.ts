import { http, delay } from 'msw'
import type { CreateOrderInput, Network, Order, QuoteInput, WalletConnection, WalletProvider } from '@/types/api'
import { eth } from '@/lib/eth'
import { db } from '../db'
import { hasFlag } from '../scenario'
import { HttpError, fingerprint, handler, json, nowIso, readJson, requireUser } from '../utils'
import { applyNftChange, cartKey, computeQuote, getEdition, getNft, getOrCreateCart } from '../services'
import { emitOrderUpdated } from '../socket'

const SETTLE_DELAY_MS = 3000
const scenarioFired = new Set<string>()
export function resetScenarioMemory() {
  scenarioFired.clear()
}

function fakeTxHash(seed: string) {
  const a = fingerprint(seed)
  const b = fingerprint(seed + ':b')
  const c = fingerprint(seed + ':c')
  return `0xA91F${a}${b}${c}${fingerprint(seed + ':d')}${fingerprint(seed + ':e')}${fingerprint(seed + ':f')}${fingerprint(seed + ':g')}E82C`.slice(0, 66)
}

const EXPLORERS: Record<Network, string> = {
  ethereum: 'https://etherscan.io/tx/',
  polygon: 'https://polygonscan.com/tx/',
  solana: 'https://solscan.io/tx/',
}

const settleTimers = new Map<string, ReturnType<typeof setTimeout>>()

/** Settles a pending order (confirmed by default, declined under the `payment-declined` flag). */
export function scheduleSettlement(orderId: string, delayMs = SETTLE_DELAY_MS) {
  if (settleTimers.has(orderId)) return
  const timer = setTimeout(() => {
    settleTimers.delete(orderId)
    const order = db.state.orders[orderId]
    if (!order || order.status !== 'pending') return
    const declined = hasFlag('payment-declined')
    order.status = declined ? 'declined' : 'confirmed'
    order.version += 1
    order.updatedAt = nowIso()
    order.settledAt = order.updatedAt
    if (declined) {
      order.failureReason = 'A rede recusou a transação: saldo insuficiente na carteira conectada.'
      // Return the reserved units to the catalog.
      for (const item of order.items) {
        const nft = db.state.nfts[item.nftId]
        const edition = nft?.editions.find((e) => e.id === item.editionId)
        if (nft && edition) {
          const restored = edition.available + item.quantity
          applyNftChange(nft.id, { editionId: edition.id, available: restored })
        }
      }
    } else {
      order.txHash = fakeTxHash(order.id)
      order.explorerUrl = `${EXPLORERS[order.network]}${order.txHash}`
      removePurchasedFromCart(order)
    }
    db.persist()
    emitOrderUpdated(order)
  }, delayMs)
  settleTimers.set(orderId, timer)
}

/** After confirmation, remove only the purchased items/quantities from the buyer's cart. */
function removePurchasedFromCart(order: Order) {
  const cart = getOrCreateCart(cartKey(order.userId, ''))
  cart.items = cart.items
    .map((item) => {
      const bought = order.items.find((l) => l.nftId === item.nftId && l.editionId === item.editionId)
      return bought ? { ...item, quantity: item.quantity - bought.quantity } : item
    })
    .filter((item) => item.quantity > 0)
  if (!cart.items.length) cart.couponCode = null
  cart.version += 1
  db.persist()
}

/** Called on boot: pending orders left behind by a refresh are settled shortly after reload. */
export function resumePendingOrders() {
  for (const order of Object.values(db.state.orders)) {
    if (order.status === 'pending') scheduleSettlement(order.id, 2500)
  }
}

export function settleNow(orderId: string, status: Order['status']) {
  const timer = settleTimers.get(orderId)
  if (timer) clearTimeout(timer)
  settleTimers.delete(orderId)
  const order = db.state.orders[orderId]
  if (!order || order.status !== 'pending') return order ?? null
  order.status = status
  order.version += 1
  order.updatedAt = nowIso()
  order.settledAt = order.updatedAt
  if (status === 'confirmed') {
    order.txHash = fakeTxHash(order.id)
    order.explorerUrl = `${EXPLORERS[order.network]}${order.txHash}`
    removePurchasedFromCart(order)
  } else if (status === 'declined') {
    order.failureReason = 'Pagamento recusado pela simulação.'
    for (const item of order.items) {
      const nft = db.state.nfts[item.nftId]
      const edition = nft?.editions.find((e) => e.id === item.editionId)
      if (nft && edition) applyNftChange(nft.id, { editionId: edition.id, available: edition.available + item.quantity })
    }
  }
  db.persist()
  emitOrderUpdated(order)
  return order
}

function maybeFireCheckoutScenario(input: QuoteInput) {
  const first = input.items[0]
  if (!first) return
  if (hasFlag('price-change') && !scenarioFired.has('price-change')) {
    scenarioFired.add('price-change')
    setTimeout(() => {
      const nft = getNft(first.nftId)
      const edition = getEdition(nft, first.editionId)
      applyNftChange(nft.id, { editionId: edition.id, price: eth.of(edition.price).times(1.1).toDecimalPlaces(2).toString() })
    }, 1500)
  }
  if (hasFlag('sold-out') && !scenarioFired.has('sold-out')) {
    scenarioFired.add('sold-out')
    setTimeout(() => {
      const nft = getNft(first.nftId)
      applyNftChange(nft.id, { editionId: first.editionId, available: 0 })
    }, 1500)
  }
}

export const commerceHandlers = [
  http.post(
    '/api/quote',
    handler(async ({ request }) => {
      const body = await readJson<QuoteInput>(request)
      if (!Array.isArray(body.items)) throw new HttpError(422, 'VALIDATION_ERROR', 'Itens inválidos.')
      const quote = computeQuote(body)
      if (request.headers.get('x-checkout') === '1') maybeFireCheckoutScenario(body)
      return json(quote)
    }),
  ),

  http.post(
    '/api/wallets/connect',
    handler(async ({ request }) => {
      const user = requireUser(request)
      const body = await readJson<{ provider: WalletProvider; network: Network }>(request)
      if (hasFlag('wallet-rejected'))
        throw new HttpError(403, 'WALLET_REJECTED', 'A carteira recusou a conexão. Aprove a solicitação no provedor e tente novamente.')
      const wallets = db.state.wallets[user.id]
      const saved = [wallets?.primary, wallets?.secondary].find((w) => w && w.provider === body.provider) ?? wallets?.primary ?? null
      const address =
        saved?.address ??
        `0x${fingerprint(`${user.id}:${body.provider}`)}${fingerprint(body.network)}${fingerprint(user.id)}${fingerprint(body.provider)}${fingerprint('kurio')}`.slice(
          0,
          42,
        )
      const body2: WalletConnection = { provider: body.provider, network: body.network, address, connectedAt: nowIso() }
      return json(body2)
    }),
  ),

  http.post(
    '/api/orders',
    handler(async ({ request }) => {
      const user = requireUser(request)
      const key = request.headers.get('idempotency-key')
      if (!key) throw new HttpError(400, 'VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.')
      const body = await readJson<CreateOrderInput>(request)
      const fp = fingerprint(JSON.stringify({ items: body.items, coupon: body.couponCode, hash: body.quoteHash, wallet: body.walletId, network: body.network }))
      const recordKey = `${user.id}:${key}`
      const existing = db.state.idempotency[recordKey]
      if (existing) {
        if (existing.fingerprint !== fp) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT', 'Esta chave de idempotência já foi usada com outro conteúdo.')
        const order = db.state.orders[existing.orderId]
        if (order) return json(order, { status: 200 })
      }

      const fieldErrors: Record<string, string> = {}
      if (!body.collector?.displayName?.trim()) fieldErrors['collector.displayName'] = 'Informe o nome de exibição.'
      if (!body.collector?.email?.trim()) fieldErrors['collector.email'] = 'Informe o e-mail.'
      if (!body.walletProvider) fieldErrors.walletProvider = 'Selecione uma carteira.'
      if (!body.network) fieldErrors.network = 'Selecione uma rede.'
      if (!body.items?.length) fieldErrors.items = 'O pedido precisa ter ao menos um item.'
      if (Object.keys(fieldErrors).length) throw new HttpError(422, 'VALIDATION_ERROR', 'Revise os dados do pedido.', fieldErrors)

      // Revalidate price, availability, coupon and fees against the catalog right now.
      const fresh = computeQuote({ items: body.items, couponCode: body.couponCode, network: body.network })
      if (fresh.quoteHash !== body.quoteHash || fresh.issues.length) {
        throw new HttpError(409, 'QUOTE_OUTDATED', 'A cotação mudou. Revise os valores atualizados antes de confirmar.', undefined, { quote: fresh })
      }

      const n = db.nextId('order')
      const createdAt = nowIso()
      const order: Order = {
        id: `ord_${createdAt.slice(0, 10).replaceAll('-', '')}_${String(n).padStart(4, '0')}`,
        userId: user.id,
        status: 'pending',
        version: 1,
        items: fresh.lines.map((l) => {
          const nft = getNft(l.nftId)
          const edition = getEdition(nft, l.editionId)
          return {
            nftId: l.nftId,
            editionId: l.editionId,
            editionLabel: edition.label,
            name: l.name,
            tokenId: l.tokenId,
            image: l.image,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          }
        }),
        subtotal: fresh.subtotal,
        discount: fresh.discount,
        networkFee: fresh.networkFee,
        total: fresh.total,
        couponCode: fresh.couponCode,
        network: fresh.network,
        walletProvider: body.walletProvider,
        walletAddress: body.collector.walletAddress,
        txHash: null,
        explorerUrl: null,
        failureReason: null,
        idempotencyKey: key,
        createdAt,
        updatedAt: createdAt,
        settledAt: null,
      }
      db.state.orders[order.id] = order
      db.state.idempotency[recordKey] = { key, userId: user.id, fingerprint: fp, orderId: order.id, createdAt }

      // Reserve units (emits nft.updated for each affected NFT).
      for (const line of fresh.lines) {
        const nft = getNft(line.nftId)
        const edition = getEdition(nft, line.editionId)
        applyNftChange(nft.id, { editionId: edition.id, available: edition.available - line.quantity })
      }
      // Cart items are preserved while the order is pending; they are removed only on confirmation.
      db.persist()

      scheduleSettlement(order.id)

      if (hasFlag('order-timeout') && !scenarioFired.has(`order-timeout:${key}`)) {
        scenarioFired.add(`order-timeout:${key}`)
        await delay('infinite') // first attempt never answers; the retry with the same key recovers the order
      }
      return json(order, { status: 202 })
    }),
  ),

  http.get(
    '/api/orders',
    handler(({ request }) => {
      const user = requireUser(request)
      const orders = Object.values(db.state.orders)
        .filter((o) => o.userId === user.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return json(orders)
    }),
  ),

  http.get(
    '/api/orders/:id',
    handler(({ request, params }) => {
      const user = requireUser(request)
      const order = db.state.orders[String(params.id)]
      if (!order) throw new HttpError(404, 'NOT_FOUND', 'Pedido não encontrado.')
      if (order.userId !== user.id) throw new HttpError(403, 'FORBIDDEN', 'Este pedido pertence a outro colecionador.')
      return json(order)
    }),
  ),
]
