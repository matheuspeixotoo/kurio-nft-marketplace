/**
 * REST + Socket.IO contracts shared by the transport layer (Axios/socket.io-client),
 * the MSW mock server and the UI. ETH values are decimal strings; quantities are integers.
 */

export type EthString = string
export type ISODate = string

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'USERNAME_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'WRONG_PASSWORD'
  | 'AVAILABILITY_CONFLICT'
  | 'EDITION_UNAVAILABLE'
  | 'QUANTITY_LIMIT'
  | 'COUPON_INVALID'
  | 'COUPON_EXPIRED'
  | 'QUOTE_OUTDATED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'WALLET_REJECTED'
  | 'TRANSIENT_FAILURE'
  | 'RATE_LIMITED'

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    fieldErrors?: Record<string, string>
    details?: Record<string, unknown>
  }
}

// ---------------------------------------------------------------------------
// Session & account
// ---------------------------------------------------------------------------
export interface User {
  id: string
  username: string
  displayName: string
  email: string
  avatarUrl: string | null
  createdAt: ISODate
}

export interface Session {
  user: User
  token: string
  expiresAt: ISODate
}

export interface RegisterInput {
  username: string
  email: string
  password: string
}
export interface LoginInput {
  email: string
  password: string
}

export interface Profile {
  id: string
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
  updatedAt: ISODate
}
export type ProfileUpdateInput = Pick<Profile, 'displayName' | 'username' | 'email' | 'ensName' | 'walletNickname'>
export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
}

// ---------------------------------------------------------------------------
// Wallets
// ---------------------------------------------------------------------------
export type Network = 'ethereum' | 'polygon' | 'solana'
export type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'
export type WalletSlot = 'primary' | 'secondary'

export interface Wallet {
  id: string
  slot: WalletSlot
  nickname: string
  displayName: string
  profileName: string
  email: string
  network: Network
  address: string
  secondaryAddress: string
  provider: WalletProvider
  referralCode: string
  ensName: string
  sameAsPrimary?: boolean
  updatedAt: ISODate
}
export type WalletInput = Omit<Wallet, 'id' | 'slot' | 'updatedAt'>
export interface Wallets {
  primary: Wallet | null
  secondary: Wallet | null
}
/** Result of the simulated wallet-extension handshake (POST /wallets/connect). */
export interface WalletConnection {
  provider: WalletProvider
  network: Network
  address: string
  connectedAt: ISODate
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------
export type CategoryId = 'arte-digital' | 'fotografia' | 'musica' | 'arte-3d' | 'colecionaveis' | 'generativa' | 'jogos' | 'assinaturas' | 'utilidade'

export type EditionStatus = 'available' | 'sold_out' | 'unavailable'
export interface Edition {
  id: string
  label: string // "1/1", "1/10", "1/50", "ABERTA"
  price: EthString
  available: number // units left (open editions use a soft cap)
  total: number | null // null = open edition
  maxPerOrder: number
  status: EditionStatus
}

export interface NftSummary {
  id: string
  tokenId: string
  name: string
  collection: string
  category: CategoryId
  network: Network
  image: string
  imageAlt: string
  price: EthString
  compareAtPrice: EthString | null
  badge: 'raro' | null
  trending: boolean
  listedAt: ISODate
  available: number // total units available across editions
  version: number
}

export interface NftDetail extends NftSummary {
  description: string
  about: string
  gallery: string[]
  creator: string
  royaltyPercent: number
  contract: string
  standard: string
  attributes: string[]
  rating: number
  reviewsCount: number
  editions: Edition[]
  defaultEditionId: string
  priceUpdatedAt: ISODate
}

export type SortOption = 'recent' | 'price_asc' | 'price_desc' | 'name_asc' | 'trending'
export type CatalogTab = 'all' | 'new' | 'trending'

export interface CatalogQuery {
  q?: string
  category?: CategoryId[]
  network?: Network[]
  minPrice?: EthString
  maxPrice?: EthString
  sort?: SortOption
  tab?: CatalogTab
  page?: number
  pageSize?: number
}

export interface Facet<T extends string> {
  id: T
  label: string
  count: number
}

export interface CatalogPage {
  items: NftSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  facets: { categories: Facet<CategoryId>[]; networks: Facet<Network>[] }
  priceRange: { min: EthString; max: EthString }
  appliedQuery: CatalogQuery
}

export interface Highlights {
  hero: NftSummary[]
  spotlight: NftSummary
  promos: { id: string; title: string; description: string; image: string; href: string }[]
}

export interface Favorites {
  ids: string[]
}

// ---------------------------------------------------------------------------
// Cart & quote
// ---------------------------------------------------------------------------
export interface CartItem {
  id: string
  nftId: string
  editionId: string
  editionLabel: string
  name: string
  tokenId: string
  image: string
  network: Network
  quantity: number
  unitPrice: EthString
  lineTotal: EthString
  available: number
  maxPerOrder: number
  status: EditionStatus
  priceChangedFrom: EthString | null
  version: number
}

export interface Cart {
  id: string
  ownerType: 'guest' | 'user'
  items: CartItem[]
  couponCode: string | null
  totalQuantity: number
  updatedAt: ISODate
  version: number
}

export interface AddCartItemInput {
  nftId: string
  editionId: string
  quantity: number
}

export type QuoteIssueType = 'PRICE_CHANGED' | 'SOLD_OUT' | 'QUANTITY_REDUCED' | 'EDITION_UNAVAILABLE' | 'COUPON_EXPIRED' | 'COUPON_INVALID'

export interface QuoteIssue {
  type: QuoteIssueType
  nftId?: string
  editionId?: string
  message: string
  previous?: string
  current?: string
}

export interface QuoteLine {
  nftId: string
  editionId: string
  name: string
  tokenId: string
  image: string
  quantity: number
  unitPrice: EthString
  lineTotal: EthString
  available: number
}

export interface Quote {
  quoteId: string
  quoteHash: string
  lines: QuoteLine[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  currency: 'ETH'
  network: Network
  couponCode: string | null
  couponStatus: 'none' | 'applied' | 'invalid' | 'expired'
  issues: QuoteIssue[]
  issuedAt: ISODate
  expiresAt: ISODate
}

export interface QuoteInput {
  items: { nftId: string; editionId: string; quantity: number }[]
  couponCode?: string | null
  network?: Network
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export type OrderStatus = 'pending' | 'confirmed' | 'declined'

export interface CollectorInfo {
  displayName: string
  username: string
  profileName: string
  email: string
  network: Network
  walletAddress: string
  secondaryAddress: string
  walletProvider: WalletProvider
  referralCode: string
  ensName: string
  note: string
}

export interface CreateOrderInput {
  quoteId: string
  quoteHash: string
  items: { nftId: string; editionId: string; quantity: number }[]
  couponCode: string | null
  network: Network
  walletId: string
  walletProvider: WalletProvider
  collector: CollectorInfo
}

export interface OrderItemSnapshot {
  nftId: string
  editionId: string
  editionLabel: string
  name: string
  tokenId: string
  image: string
  quantity: number
  unitPrice: EthString
  lineTotal: EthString
}

export interface Order {
  id: string
  userId: string
  status: OrderStatus
  version: number
  items: OrderItemSnapshot[]
  subtotal: EthString
  discount: EthString
  networkFee: EthString
  total: EthString
  couponCode: string | null
  network: Network
  walletProvider: WalletProvider
  walletAddress: string
  txHash: string | null
  explorerUrl: string | null
  failureReason: string | null
  idempotencyKey: string
  createdAt: ISODate
  updatedAt: ISODate
  settledAt: ISODate | null
}

// ---------------------------------------------------------------------------
// Realtime (Socket.IO)
// ---------------------------------------------------------------------------
export interface RealtimeEnvelope<TResource extends string, TPayload> {
  eventId: string // stable identity (dedupe)
  resource: TResource
  id: string // affected resource id
  version: number // monotonic per resource
  emittedAt: ISODate
  payload: TPayload
}

export type NftUpdatedEvent = RealtimeEnvelope<
  'nft',
  {
    price: EthString
    available: number
    editions: Pick<Edition, 'id' | 'price' | 'available' | 'status'>[]
  }
>

export type OrderUpdatedEvent = RealtimeEnvelope<
  'order',
  {
    status: OrderStatus
    txHash: string | null
    explorerUrl: string | null
    failureReason: string | null
    settledAt: ISODate | null
  }
>

export interface ServerToClientEvents {
  'nft.updated': (event: NftUpdatedEvent) => void
  'order.updated': (event: OrderUpdatedEvent) => void
  'auth.ok': (payload: { userId: string | null }) => void
}

export interface ClientToServerEvents {
  auth: (payload: { token: string | null }) => void
  subscribe: (payload: { resource: 'order' | 'nft'; id: string }) => void
  unsubscribe: (payload: { resource: 'order' | 'nft'; id: string }) => void
}

// ---------------------------------------------------------------------------
// Mock control plane (only served by MSW)
// ---------------------------------------------------------------------------
export type ScenarioFlag =
  | 'slow'
  | 'variable-latency'
  | 'flaky'
  | 'offline'
  | 'timeout'
  | 'empty-catalog'
  | 'session-expired'
  | 'register-conflict'
  | 'coupon-expired'
  | 'price-change'
  | 'sold-out'
  | 'order-timeout'
  | 'payment-declined'
  | 'wallet-rejected'
  | 'favorites-fail'
  | 'profile-conflict'

export interface MockStatus {
  scenario: ScenarioFlag[]
  seed: string
  connectedSockets: number
  persisted: boolean
}

export type MockTrigger =
  | { type: 'nft.updated'; nftId: string; price?: EthString; available?: number }
  | { type: 'order.updated'; orderId: string; status: OrderStatus }
  | { type: 'socket.disconnect' }
  | { type: 'socket.replay'; eventId: string }
  | { type: 'session.expire' }
