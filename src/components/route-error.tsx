import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { ErrorState } from './ui/state-blocks'

export function RouteErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <section className="container-page py-16">
      <ErrorState
        error={error}
        title="Algo deu errado ao abrir esta página"
        onRetry={() => {
          reset()
          void router.invalidate()
        }}
      />
    </section>
  )
}
