import { z } from 'zod'
import type { CatalogQuery, CatalogTab, CategoryId, Network, SortOption } from '@/types/api'

export const CATEGORY_IDS = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const satisfies readonly CategoryId[]
export const NETWORK_IDS = ['ethereum', 'polygon', 'solana'] as const satisfies readonly Network[]
export const SORT_IDS = ['recent', 'price_asc', 'price_desc', 'name_asc', 'trending'] as const satisfies readonly SortOption[]
export const TAB_IDS = ['all', 'new', 'trending'] as const satisfies readonly CatalogTab[]

export const SORT_LABELS: Record<SortOption, string> = {
  recent: 'Listados recentemente',
  price_asc: 'Menor preço',
  price_desc: 'Maior preço',
  name_asc: 'Nome (A–Z)',
  trending: 'Em alta',
}

const csv = <T extends string>(allowed: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter((x): x is T => (allowed as readonly string[]).includes(x)) : []))
    .transform((arr) => (arr.length ? Array.from(new Set(arr)).join(',') : undefined))
    .catch(undefined)

const price = z
  .string()
  .regex(/^\d+(\.\d+)?$/)
  .optional()
  .catch(undefined)

/**
 * URL search state of the catalog. Everything is optional and resilient (`catch`) so a hand-edited
 * or outdated URL never breaks the page. Categories/networks are comma-separated for readable URLs.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().min(1).optional().catch(undefined),
  category: csv(CATEGORY_IDS),
  network: csv(NETWORK_IDS),
  min: price,
  max: price,
  sort: z.enum(SORT_IDS).optional().catch(undefined),
  tab: z.enum(TAB_IDS).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export function searchToQuery(search: CatalogSearch): CatalogQuery {
  return {
    q: search.q,
    category: search.category ? (search.category.split(',') as CategoryId[]) : undefined,
    network: search.network ? (search.network.split(',') as Network[]) : undefined,
    minPrice: search.min,
    maxPrice: search.max,
    sort: search.sort ?? 'recent',
    tab: search.tab ?? 'all',
    page: search.page ?? 1,
    pageSize: 9,
  }
}

export function toggleCsv(current: string | undefined, value: string) {
  const set = new Set(current ? current.split(',') : [])
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return set.size ? Array.from(set).join(',') : undefined
}

export function countActiveFilters(search: CatalogSearch) {
  let n = 0
  if (search.category) n += search.category.split(',').length
  if (search.network) n += search.network.split(',').length
  if (search.min || search.max) n += 1
  return n
}
