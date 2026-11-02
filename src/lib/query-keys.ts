import type { CatalogQuery } from '@/types/api'

/**
 * Query keys are namespaced by resource and, for private resources, by user id so that a
 * logout / user switch never serves another person's cached data.
 */
export const queryKeys = {
  session: ['session'] as const,
  catalog: {
    all: ['catalog'] as const,
    list: (query: CatalogQuery) => ['catalog', 'list', query] as const,
    highlights: ['catalog', 'highlights'] as const,
    detail: (id: string) => ['catalog', 'detail', id] as const,
    related: (id: string) => ['catalog', 'related', id] as const,
  },
  favorites: (userId: string | null) => ['favorites', userId] as const,
  cart: (ownerKey: string) => ['cart', ownerKey] as const,
  quote: (ownerKey: string, fingerprint: string) => ['quote', ownerKey, fingerprint] as const,
  orders: {
    all: (userId: string | null) => ['orders', userId] as const,
    detail: (userId: string | null, id: string) => ['orders', userId, id] as const,
  },
  profile: (userId: string | null) => ['profile', userId] as const,
  wallets: (userId: string | null) => ['wallets', userId] as const,
  mockStatus: ['mock', 'status'] as const,
}
