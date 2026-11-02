import { createRootRouteWithContext, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'
import type { RouterContext } from '@/app/router'
import { AUTH_EXPIRED_EVENT, PRIVATE_PREFIXES } from '@/features/auth/auth-context'
import { Header, MobileNav } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { NotFoundPage } from '@/components/not-found'

const DevPanel = lazy(() => import('@/components/dev-panel').then((m) => ({ default: m.DevPanel })))
const Devtools = import.meta.env.DEV ? lazy(() => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools }))) : () => null

const BARE_ROUTES = ['/login', '/register', '/checkout', '/orders/']

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => <NotFoundPage />,
})

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const bare = BARE_ROUTES.some((p) => pathname.startsWith(p))

  // Session expired (401 from the API): leave private screens for /login, preserving the destination.
  useEffect(() => {
    const onExpired = (e: Event) => {
      const returnTo = (e as CustomEvent<{ returnTo: string | null }>).detail?.returnTo
      const current = window.location.pathname
      if (PRIVATE_PREFIXES.some((p) => current.startsWith(p))) {
        void navigate({ to: '/login', search: { redirect: returnTo ?? current }, replace: true })
      }
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [navigate])
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="flex-1 min-h-[calc(100dvh-72px)] pb-20 lg:min-h-[calc(100dvh-82px)] lg:pb-0" tabIndex={-1}>
        <Outlet />
      </main>
      {!bare && <Footer />}
      <MobileNav />
      <Suspense fallback={null}>
        <DevPanel />
        <Devtools buttonPosition="bottom-right" initialIsOpen={false} />
      </Suspense>
    </div>
  )
}
