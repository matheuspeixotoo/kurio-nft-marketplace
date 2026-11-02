import { createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { routeTree } from '@/routeTree.gen'
import { queryClient } from './query-client'
import type { AuthContextValue } from '@/features/auth/auth-context'
import { NotFoundPage } from '@/components/not-found'
import { RouteErrorPage } from '@/components/route-error'
import { PageSpinner } from '@/components/ui/spinner'

export interface RouterContext {
  queryClient: QueryClient
  auth: AuthContextValue
}

export const router = createRouter({
  routeTree,
  context: { queryClient, auth: undefined! },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: () => <NotFoundPage />,
  defaultErrorComponent: RouteErrorPage,
  defaultPendingComponent: PageSpinner,
  defaultPendingMs: 300,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
