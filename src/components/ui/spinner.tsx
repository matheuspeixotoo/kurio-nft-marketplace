import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className, label = 'Carregando' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-secondary', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function PageSpinner() {
  return (
    <div className="container-page flex min-h-[40vh] items-center justify-center">
      <Spinner className="text-primary-light" label="Carregando página" />
    </div>
  )
}
