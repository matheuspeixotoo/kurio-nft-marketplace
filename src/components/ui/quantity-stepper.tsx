import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  min?: number
  max: number
  onChange: (next: number) => void
  disabled?: boolean
  label?: string
  size?: 'md' | 'lg'
  className?: string
}

/** Figma quantity control: round orange minus/plus with the number in between. */
export function QuantityStepper({ value, min = 1, max, onChange, disabled, label = 'Quantidade', size = 'md', className }: QuantityStepperProps) {
  const btn = cn(
    'flex shrink-0 items-center justify-center rounded-full bg-primary text-ink transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:bg-surface-raised disabled:text-secondary/60',
    size === 'lg' ? 'size-9' : 'size-7',
  )
  const canDec = !disabled && value > min
  const canInc = !disabled && value < max
  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => canDec && onChange(value - 1)} disabled={!canDec} aria-label={`Diminuir ${label.toLowerCase()}`}>
        <Minus className={size === 'lg' ? 'size-4' : 'size-3.5'} strokeWidth={3} aria-hidden="true" />
      </button>
      <output
        className={cn('min-w-[1.5ch] text-center tabular-nums text-foreground', size === 'lg' ? 'text-[20px]' : 'text-[17px]')}
        aria-live="polite"
        aria-label={label}
      >
        {value}
      </output>
      <button type="button" className={btn} onClick={() => canInc && onChange(value + 1)} disabled={!canInc} aria-label={`Aumentar ${label.toLowerCase()}`}>
        <Plus className={size === 'lg' ? 'size-4' : 'size-3.5'} strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  )
}
