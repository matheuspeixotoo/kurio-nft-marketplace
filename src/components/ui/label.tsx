import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

export interface LabelProps extends ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  required?: boolean
}

export const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, LabelProps>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('block text-[15px] font-normal leading-none text-foreground peer-disabled:opacity-60', className)} {...props}>
    {children}
    {required && (
      <>
        <span aria-hidden="true" className="ml-0.5 text-coral">
          *
        </span>
        <span className="sr-only"> (obrigatório)</span>
      </>
    )}
  </LabelPrimitive.Root>
))
Label.displayName = 'Label'
