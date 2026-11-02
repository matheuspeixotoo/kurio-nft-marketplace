import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthPage } from '@/features/auth/auth-page'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  component: LoginRoute,
})

function LoginRoute() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="login" redirect={redirect} />
}
