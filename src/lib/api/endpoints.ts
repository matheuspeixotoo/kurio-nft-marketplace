import type {
  AddCartItemInput,
  Cart,
  CatalogPage,
  CatalogQuery,
  CreateOrderInput,
  Favorites,
  Highlights,
  LoginInput,
  MockStatus,
  MockTrigger,
  Network,
  NftDetail,
  NftSummary,
  Order,
  PasswordChangeInput,
  Profile,
  ProfileUpdateInput,
  Quote,
  QuoteInput,
  RegisterInput,
  ScenarioFlag,
  Session,
  User,
  WalletConnection,
  WalletInput,
  WalletProvider,
  WalletSlot,
  Wallets,
} from '@/types/api'
import { http } from './http'

type Opts = { signal?: AbortSignal }

function catalogParams(q: CatalogQuery) {
  const params = new URLSearchParams()
  if (q.q) params.set('q', q.q)
  q.category?.forEach((c) => params.append('category', c))
  q.network?.forEach((n) => params.append('network', n))
  if (q.minPrice) params.set('minPrice', q.minPrice)
  if (q.maxPrice) params.set('maxPrice', q.maxPrice)
  if (q.sort) params.set('sort', q.sort)
  if (q.tab) params.set('tab', q.tab)
  if (q.page) params.set('page', String(q.page))
  if (q.pageSize) params.set('pageSize', String(q.pageSize))
  return params
}

export const api = {
  auth: {
    register: (input: RegisterInput) => http.post<Session>('/auth/register', input).then((r) => r.data),
    login: (input: LoginInput) => http.post<Session>('/auth/login', input).then((r) => r.data),
    session: (o?: Opts) => http.get<{ user: User; expiresAt: string }>('/auth/session', o).then((r) => r.data),
    logout: () => http.post<void>('/auth/logout').then(() => undefined),
  },
  nfts: {
    list: (query: CatalogQuery, o?: Opts) => http.get<CatalogPage>('/nfts', { params: catalogParams(query), ...o }).then((r) => r.data),
    highlights: (o?: Opts) => http.get<Highlights>('/nfts/highlights', o).then((r) => r.data),
    detail: (id: string, o?: Opts) => http.get<NftDetail>(`/nfts/${encodeURIComponent(id)}`, o).then((r) => r.data),
    related: (id: string, o?: Opts) => http.get<NftSummary[]>(`/nfts/${encodeURIComponent(id)}/related`, o).then((r) => r.data),
  },
  favorites: {
    list: (o?: Opts) => http.get<Favorites>('/favorites', o).then((r) => r.data),
    add: (nftId: string) => http.put<Favorites>(`/favorites/${encodeURIComponent(nftId)}`).then((r) => r.data),
    remove: (nftId: string) => http.delete<Favorites>(`/favorites/${encodeURIComponent(nftId)}`).then((r) => r.data),
  },
  cart: {
    get: (o?: Opts) => http.get<Cart>('/cart', o).then((r) => r.data),
    addItem: (input: AddCartItemInput) => http.post<Cart>('/cart/items', input).then((r) => r.data),
    updateItem: (itemId: string, quantity: number) => http.patch<Cart>(`/cart/items/${encodeURIComponent(itemId)}`, { quantity }).then((r) => r.data),
    removeItem: (itemId: string) => http.delete<Cart>(`/cart/items/${encodeURIComponent(itemId)}`).then((r) => r.data),
    applyCoupon: (code: string) => http.put<Cart>('/cart/coupon', { code }).then((r) => r.data),
    removeCoupon: () => http.delete<Cart>('/cart/coupon').then((r) => r.data),
    merge: (guestId: string) => http.post<Cart>('/cart/merge', { guestId }).then((r) => r.data),
  },
  quote: {
    create: (input: QuoteInput, o?: Opts) => http.post<Quote>('/quote', input, o).then((r) => r.data),
  },
  orders: {
    create: (input: CreateOrderInput, idempotencyKey: string, o?: Opts & { timeout?: number }) =>
      http.post<Order>('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey }, ...o }).then((r) => r.data),
    get: (id: string, o?: Opts) => http.get<Order>(`/orders/${encodeURIComponent(id)}`, o).then((r) => r.data),
    list: (o?: Opts) => http.get<Order[]>('/orders', o).then((r) => r.data),
  },
  profile: {
    get: (o?: Opts) => http.get<Profile>('/profile', o).then((r) => r.data),
    update: (input: ProfileUpdateInput) => http.patch<Profile>('/profile', input).then((r) => r.data),
    setAvatar: (dataUrl: string) => http.put<Profile>('/profile/avatar', { dataUrl }).then((r) => r.data),
    removeAvatar: () => http.delete<Profile>('/profile/avatar').then((r) => r.data),
    changePassword: (input: PasswordChangeInput) => http.post<void>('/profile/password', input).then(() => undefined),
  },
  wallets: {
    list: (o?: Opts) => http.get<Wallets>('/wallets', o).then((r) => r.data),
    save: (slot: WalletSlot, input: Partial<WalletInput>) => http.put<Wallets>(`/wallets/${slot}`, input).then((r) => r.data),
    remove: (slot: WalletSlot) => http.delete<Wallets>(`/wallets/${slot}`).then((r) => r.data),
    connect: (input: { provider: WalletProvider; network: Network }) => http.post<WalletConnection>('/wallets/connect', input).then((r) => r.data),
  },
  mock: {
    status: () => http.get<MockStatus>('/_mock/status').then((r) => r.data),
    setScenario: (flags: ScenarioFlag[]) => http.put<MockStatus>('/_mock/scenario', { flags }).then((r) => r.data),
    reset: () => http.post<MockStatus>('/_mock/reset').then((r) => r.data),
    trigger: (trigger: MockTrigger) => http.post<{ ok: true }>('/_mock/trigger', trigger).then((r) => r.data),
  },
}
