import { http } from 'msw'
import type { CatalogPage, CatalogQuery, CatalogTab, CategoryId, Facet, Favorites, Highlights, Network, NftDetail, NftSummary, SortOption } from '@/types/api'
import { eth } from '@/lib/eth'
import { db } from '../db'
import { CATEGORY_LABELS } from '../fixtures/catalog'
import { NETWORK_LABELS } from '@/lib/networks'
import { hasFlag } from '../scenario'
import { HttpError, handler, json, requireUser } from '../utils'
import { getNft } from '../services'

const PAGE_SIZE = 9
const SORTS = new Set<SortOption>(['recent', 'price_asc', 'price_desc', 'name_asc', 'trending'])
const TABS = new Set<CatalogTab>(['all', 'new', 'trending'])
const CATEGORIES = new Set<CategoryId>(Object.keys(CATEGORY_LABELS) as CategoryId[])
const NETWORKS = new Set<Network>(['ethereum', 'polygon', 'solana'])
const NEW_WINDOW_MS = 14 * 86_400_000
const CATALOG_NOW = Date.UTC(2026, 9, 28, 12, 0, 0)

export function toSummary(nft: NftDetail): NftSummary {
  const { id, tokenId, name, collection, category, network, image, imageAlt, price, compareAtPrice, badge, trending, listedAt, available, version } = nft
  return { id, tokenId, name, collection, category, network, image, imageAlt, price, compareAtPrice, badge, trending, listedAt, available, version }
}

function parseQuery(url: URL): CatalogQuery {
  const q = url.searchParams.get('q')?.trim() ?? ''
  const category = url.searchParams.getAll('category').filter((c): c is CategoryId => CATEGORIES.has(c as CategoryId))
  const network = url.searchParams.getAll('network').filter((n): n is Network => NETWORKS.has(n as Network))
  const minPrice = url.searchParams.get('minPrice') ?? undefined
  const maxPrice = url.searchParams.get('maxPrice') ?? undefined
  const sortRaw = url.searchParams.get('sort') as SortOption | null
  const tabRaw = url.searchParams.get('tab') as CatalogTab | null
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(24, Math.max(3, Number(url.searchParams.get('pageSize') ?? PAGE_SIZE) || PAGE_SIZE))
  return {
    q: q || undefined,
    category: category.length ? category : undefined,
    network: network.length ? network : undefined,
    minPrice: minPrice && eth.isValid(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice && eth.isValid(maxPrice) ? maxPrice : undefined,
    sort: sortRaw && SORTS.has(sortRaw) ? sortRaw : 'recent',
    tab: tabRaw && TABS.has(tabRaw) ? tabRaw : 'all',
    page,
    pageSize,
  }
}

function sortItems(items: NftDetail[], sort: SortOption) {
  const copy = [...items]
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => eth.cmp(a.price, b.price) || a.name.localeCompare(b.name))
    case 'price_desc':
      return copy.sort((a, b) => eth.cmp(b.price, a.price) || a.name.localeCompare(b.name))
    case 'name_asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    case 'trending':
      return copy.sort((a, b) => Number(b.trending) - Number(a.trending) || b.listedAt.localeCompare(a.listedAt))
    case 'recent':
    default:
      return copy.sort((a, b) => b.listedAt.localeCompare(a.listedAt))
  }
}

export function listCatalog(query: CatalogQuery): CatalogPage {
  const all = Object.values(db.state.nfts)
  const pool = hasFlag('empty-catalog') ? [] : all
  const q = query.q?.toLowerCase()
  const filtered = pool.filter((nft) => {
    if (q && !`${nft.name} ${nft.collection} ${nft.creator} ${nft.tokenId}`.toLowerCase().includes(q)) return false
    if (query.category?.length && !query.category.includes(nft.category)) return false
    if (query.network?.length && !query.network.includes(nft.network)) return false
    if (query.minPrice && eth.cmp(nft.price, query.minPrice) < 0) return false
    if (query.maxPrice && eth.cmp(nft.price, query.maxPrice) > 0) return false
    if (query.tab === 'new' && CATALOG_NOW - new Date(nft.listedAt).getTime() > NEW_WINDOW_MS) return false
    if (query.tab === 'trending' && !nft.trending) return false
    return true
  })
  const sorted = sortItems(filtered, query.sort ?? 'recent')
  const pageSize = query.pageSize ?? PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(query.page ?? 1, totalPages)
  const start = (page - 1) * pageSize
  const facetCount = <T extends string>(ids: T[], pick: (n: NftDetail) => T, labels: Record<T, string>): Facet<T>[] =>
    ids.map((id) => ({ id, label: labels[id], count: all.filter((n) => pick(n) === id).length }))
  const prices = all.map((n) => n.price)
  const min = prices.reduce((acc, p) => (eth.cmp(p, acc) < 0 ? p : acc), prices[0] ?? '0')
  const max = prices.reduce((acc, p) => (eth.cmp(p, acc) > 0 ? p : acc), prices[0] ?? '0')
  return {
    items: sorted.slice(start, start + pageSize).map(toSummary),
    page,
    pageSize,
    total: sorted.length,
    totalPages,
    facets: {
      categories: facetCount(Array.from(CATEGORIES), (n) => n.category, CATEGORY_LABELS),
      networks: facetCount(Array.from(NETWORKS), (n) => n.network, NETWORK_LABELS),
    },
    priceRange: { min, max },
    appliedQuery: { ...query, page },
  }
}

export const catalogHandlers = [
  http.get(
    '/api/nfts/highlights',
    handler(() => {
      const pick = (id: string) => toSummary(getNft(id))
      const body: Highlights = {
        hero: [pick('emerald-ape-042'), pick('sage-nomad-009'), pick('neon-vessel-552')],
        spotlight: pick('sage-nomad-009'),
        promos: [
          {
            id: 'genesis',
            title: 'Lançamentos gênesis de edição limitada',
            description: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
            image: '/nfts/emerald-md.webp',
            href: '/?tab=new',
          },
          {
            id: 'curated',
            title: 'Arte digital selecionada e muito mais',
            description: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
            image: '/nfts/ivory-md.webp',
            href: '/?category=arte-digital',
          },
        ],
      }
      return json(body)
    }),
  ),

  http.get(
    '/api/nfts',
    handler(({ request }) => json(listCatalog(parseQuery(new URL(request.url))))),
  ),

  http.get(
    '/api/nfts/:id/related',
    handler(({ params }) => {
      const nft = getNft(String(params.id))
      const related = Object.values(db.state.nfts)
        .filter((n) => n.id !== nft.id)
        .sort((a, b) => {
          const score = (n: NftDetail) => (n.collection === nft.collection ? 2 : 0) + (n.category === nft.category ? 1 : 0)
          return score(b) - score(a) || a.name.localeCompare(b.name)
        })
        .slice(0, 10)
        .map(toSummary)
      return json(related)
    }),
  ),

  http.get(
    '/api/nfts/:id',
    handler(({ params }) => json(getNft(String(params.id)))),
  ),

  // Favorites -----------------------------------------------------------------
  http.get(
    '/api/favorites',
    handler(({ request }) => {
      const user = requireUser(request)
      const body: Favorites = { ids: db.state.favorites[user.id] ?? [] }
      return json(body)
    }),
  ),
  http.put(
    '/api/favorites/:nftId',
    handler(({ request, params }) => {
      const user = requireUser(request)
      if (hasFlag('favorites-fail')) throw new HttpError(500, 'TRANSIENT_FAILURE', 'Não foi possível salvar o favorito agora.')
      const nft = getNft(String(params.nftId))
      const list = new Set(db.state.favorites[user.id] ?? [])
      list.add(nft.id)
      const ids = Array.from(list)
      db.state.favorites[user.id] = ids
      db.persist()
      return json({ ids } satisfies Favorites)
    }),
  ),
  http.delete(
    '/api/favorites/:nftId',
    handler(({ request, params }) => {
      const user = requireUser(request)
      if (hasFlag('favorites-fail')) throw new HttpError(500, 'TRANSIENT_FAILURE', 'Não foi possível remover o favorito agora.')
      const ids = (db.state.favorites[user.id] ?? []).filter((id) => id !== String(params.nftId))
      db.state.favorites[user.id] = ids
      db.persist()
      return json({ ids } satisfies Favorites)
    }),
  ),
]
