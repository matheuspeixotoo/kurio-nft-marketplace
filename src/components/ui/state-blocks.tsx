import type { ReactNode } from 'react'
import { AlertTriangle, PackageOpen, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'
import { toApiError } from '@/lib/api/errors'

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  retrying?: boolean
  title?: string
  className?: string
  compact?: boolean
}

export function ErrorState({ error, onRetry, retrying, title, className, compact }: ErrorStateProps) {
  const e = toApiError(error)
  const Icon = e.isNetwork ? WifiOff : AlertTriangle
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-coral/40 bg-surface p-6 text-center',
        compact ? 'py-6' : 'py-12',
        className,
      )}
      data-testid="error-state"
    >
      <Icon className="size-8 text-coral" aria-hidden="true" />
      <div>
        <p className="font-bold text-foreground">{title ?? (e.isNetwork ? 'Sem conexão com o servidor' : 'Não foi possível carregar')}</p>
        <p className="mt-1 text-[14px] text-secondary">{e.message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} loading={retrying} loadingText="Tentando novamente…">
          <RefreshCw className="size-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  icon?: ReactNode
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface px-6 py-12 text-center', className)}
      data-testid="empty-state"
    >
      <span className="text-primary-light">{icon ?? <PackageOpen className="size-9" aria-hidden="true" />}</span>
      <p className="text-[18px] font-bold text-foreground">{title}</p>
      {description && <p className="max-w-md text-[14px] text-secondary">{description}</p>}
      {action}
    </div>
  )
}

/** Small "refreshing in background" indicator for lists that already have data. */
export function BackgroundRefresh({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-accent" role="status" data-testid="background-refresh">
      <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
      Atualizando…
    </span>
  )
}
