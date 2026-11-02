import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shimmer skeleton. Always give it explicit dimensions (or let it fill a sized parent)
 * so the loaded content lands in the same box — no layout shift.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('skeleton', className)} {...props} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}
