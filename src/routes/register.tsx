import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { AuthPage } from '@/features/auth/auth-page'

export const Route = createFileRoute('/register')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  component: RegisterRoute,
})

function RegisterRoute() {
  const { redirect } = Route.useSearch()
  return <AuthPage mode="register" redirect={redirect} />
}
