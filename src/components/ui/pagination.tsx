import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  className?: string
}

function range(page: number, total: number) {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total))
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('gap')
    out.push(p)
  })
  return out
}

/** Square page buttons as in the layout; active page is filled orange. */
export function Pagination({ page, totalPages, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null
  const btn = 'flex size-9 items-center justify-center rounded-[4px] border text-[14px] transition-colors disabled:opacity-40 disabled:pointer-events-none'
  return (
    <nav aria-label="Paginação" className={cn('flex items-center justify-end gap-2', className)}>
      <button
        type="button"
        className={cn(btn, 'border-border-soft bg-surface-raised text-foreground hover:border-primary')}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      {range(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-secondary" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Página ${p}`}
            className={cn(
              btn,
              p === page ? 'border-primary bg-primary font-bold text-ink' : 'border-border-soft bg-surface-raised text-foreground hover:border-primary',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        className={cn(btn, 'border-border-soft bg-surface-raised text-foreground hover:border-primary')}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
