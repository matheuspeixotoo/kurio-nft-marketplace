import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import type { CatalogQuery } from '@/types/api'
import { api } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/query-keys'

/**
 * Catalog queries. Every query receives TanStack Query's AbortSignal, which Axios honours:
 * when filters change quickly the superseded request is cancelled, and because results are
 * keyed by the exact parameters an out-of-order response can never be shown for a different query.
 */
export const catalogListOptions = (query: CatalogQuery) =>
  queryOptions({
    queryKey: queryKeys.catalog.list(query),
    queryFn: ({ signal }) => api.nfts.list(query, { signal }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const highlightsOptions = queryOptions({
  queryKey: queryKeys.catalog.highlights,
  queryFn: ({ signal }) => api.nfts.highlights({ signal }),
  staleTime: 5 * 60_000,
})

export const nftDetailOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.catalog.detail(id),
    queryFn: ({ signal }) => api.nfts.detail(id, { signal }),
    staleTime: 30_000,
    retry: false,
  })

export const relatedOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.catalog.related(id),
    queryFn: ({ signal }) => api.nfts.related(id, { signal }),
    staleTime: 5 * 60_000,
  })

export function useCatalog(query: CatalogQuery) {
  return useQuery(catalogListOptions(query))
}
export function useHighlights() {
  return useQuery(highlightsOptions)
}
export function useNft(id: string) {
  return useQuery(nftDetailOptions(id))
}
export function useRelated(id: string) {
  return useQuery(relatedOptions(id))
}
