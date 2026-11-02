import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

interface FormFieldProps {
  label: ReactNode
  required?: boolean
  error?: string | null
  hint?: string
  className?: string
  labelClassName?: string
  /** Render-prop receives ids/aria props to spread on the control. */
  children: (field: { id: string; describedBy?: string; invalid: boolean; errorId: string }) => ReactNode
  id?: string
}

/**
 * Associates label, hint and error message with a control (aria-describedby / aria-invalid)
 * so screen readers announce validation feedback next to the field.
 */
export function FormField({ label, required, error, hint, className, labelClassName, children, id: explicitId }: FormFieldProps) {
  const autoId = useId()
  const id = explicitId ?? autoId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} required={required} className={labelClassName}>
        {label}
      </Label>
      {children({ id, describedBy, invalid: !!error, errorId })}
      {hint && !error && (
        <p id={hintId} className="text-[13px] text-accent">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1 text-[13px] text-coral">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
