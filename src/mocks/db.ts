import type { Cart, NftDetail, NftUpdatedEvent, Order, OrderUpdatedEvent, Profile, Wallets } from '@/types/api'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'
import { buildCatalog } from './fixtures/catalog'
import { profiles as seedProfiles, users as seedUsers, wallets as seedWallets, type UserRecord } from './fixtures/accounts'

export const DB_VERSION = 8
export const DB_SEED = 'kurio-2026-11'

export interface SessionRecord {
  token: string
  userId: string
  createdAt: string
  expiresAt: string
}

export interface CartRecord extends Cart {
  ownerKey: string // "guest:<id>" | "user:<id>"
}

export interface IdempotencyRecord {
  key: string
  userId: string
  fingerprint: string
  orderId: string
  createdAt: string
}

export type StoredEvent = NftUpdatedEvent | OrderUpdatedEvent

export interface DbState {
  version: number
  seed: string
  nfts: Record<string, NftDetail>
  users: Record<string, UserRecord>
  sessions: Record<string, SessionRecord>
  profiles: Record<string, Profile>
  wallets: Record<string, Wallets>
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  orders: Record<string, Order>
  idempotency: Record<string, IdempotencyRecord>
  eventLog: StoredEvent[]
  counters: Record<string, number>
}

function seedState(): DbState {
  const nfts: Record<string, NftDetail> = {}
  for (const nft of buildCatalog()) nfts[nft.id] = nft
  const users: Record<string, UserRecord> = {}
  for (const u of seedUsers) users[u.id] = { ...u }

  const seededOrder: Order = {
    id: 'ord_seed_ana_01',
    userId: 'usr_ana',
    status: 'confirmed',
    version: 3,
    items: [
      {
        nftId: 'golden-beat-207',
        editionId: '1of50',
        editionLabel: '1/50',
        name: 'Golden Beat #207',
        tokenId: '0207',
        image: '/nfts/golden.webp',
        quantity: 1,
        unitPrice: '0.99',
        lineTotal: '0.99',
      },
    ],
    subtotal: '0.99',
    discount: '0',
    networkFee: '0.002',
    total: '0.992',
    couponCode: null,
    network: 'solana',
    walletProvider: 'metamask',
    walletAddress: '0xA91F3c8D2e7B4a0f9C6d5E1b8A7f2C3d4E5b6E82',
    txHash: '0xA91F2b7c4d9e8f1a3b5c7d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2E82C',
    explorerUrl: 'https://etherscan.io/tx/0xA91F2b7c4d9e8f1a3b5c7d9e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2E82C',
    failureReason: null,
    idempotencyKey: 'seed-ana-01',
    createdAt: '2026-07-29T15:10:00.000Z',
    updatedAt: '2026-07-29T15:10:09.000Z',
    settledAt: '2026-07-29T15:10:09.000Z',
  }

  return {
    version: DB_VERSION,
    seed: DB_SEED,
    nfts,
    users,
    sessions: {},
    profiles: structuredClone(seedProfiles),
    wallets: structuredClone(seedWallets),
    favorites: { usr_ana: ['emerald-ape-042', 'neon-vessel-552'], usr_bruno: [] },
    carts: {},
    orders: { [seededOrder.id]: seededOrder },
    idempotency: {},
    eventLog: [],
    counters: { order: 1, event: 0 },
  }
}

class MockDb {
  state: DbState = seedState()
  persisted = false
  private saveScheduled = false

  load() {
    const raw = readStorage(STORAGE_KEYS.mockDb)
    if (!raw) {
      this.state = seedState()
      this.persist()
      return
    }
    try {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.version !== DB_VERSION || parsed.seed !== DB_SEED) throw new Error('stale')
      this.state = parsed
      this.persisted = true
    } catch {
      this.state = seedState()
      this.persist()
    }
  }

  reset() {
    this.state = seedState()
    this.persist()
  }

  /** Persist after each mutation (batched in a microtask) so a refresh keeps the scenario state. */
  persist() {
    if (this.saveScheduled) return
    this.saveScheduled = true
    queueMicrotask(() => {
      this.saveScheduled = false
      try {
        writeStorage(STORAGE_KEYS.mockDb, JSON.stringify(this.state))
        this.persisted = true
      } catch {
        this.persisted = false
      }
    })
  }

  nextId(kind: 'order' | 'event') {
    const n = (this.state.counters[kind] ?? 0) + 1
    this.state.counters[kind] = n
    return n
  }

  pushEvent(event: StoredEvent) {
    this.state.eventLog.push(event)
    if (this.state.eventLog.length > 60) this.state.eventLog.splice(0, this.state.eventLog.length - 60)
    this.persist()
  }
}

export const db = new MockDb()
