import { redirect } from '@tanstack/react-router'
import type { RouterContext } from '@/app/router'

/**
 * Route guard for private flows. The token is read synchronously from the auth context; if it
 * is missing the user goes to /login with the intended destination preserved in `redirect`.
 * (Expired tokens are caught by the Axios interceptor, which re-runs this flow via `auth.expire`.)
 */
export function requireAuth(ctx: RouterContext, location: { href: string }) {
  if (!ctx.auth.token) {
    throw redirect({ to: '/login', search: { redirect: location.href } })
  }
}
