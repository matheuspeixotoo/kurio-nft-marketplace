import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toApiError } from '@/lib/api/errors'

/**
 * Cache policy (documented in ARCHITECTURE.md):
 * - staleTime 30s for catalog; private resources are refetched on focus/reconnect.
 * - retries: only transient failures (network/5xx), max 2, exponential backoff; never 4xx.
 * - mutations never retry automatically (idempotency is handled explicitly for orders).
 * - gcTime 5 min; logout calls queryClient.clear() so private data never leaks across users.
 */
export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: 'always',
        refetchOnReconnect: 'always',
        retry: (failureCount, error) => {
          const e = toApiError(error)
          if (e.isCancelled) return false
          if (!e.isRetryable) return false
          return failureCount < 2
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
        throwOnError: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export const queryClient = createQueryClient()
