import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { cn } from '@/lib/utils'

export const RadioGroup = forwardRef<ElementRef<typeof RadioGroupPrimitive.Root>, ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>>(
  ({ className, ...props }, ref) => <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-3', className)} {...props} />,
)
RadioGroup.displayName = 'RadioGroup'

export const RadioGroupItem = forwardRef<ElementRef<typeof RadioGroupPrimitive.Item>, ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>>(
  ({ className, ...props }, ref) => (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'aspect-square size-[18px] shrink-0 rounded-full border border-primary bg-transparent transition-colors focus-visible:outline-2 focus-visible:outline-primary-light disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary-light',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="block size-2.5 rounded-full bg-primary-light" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  ),
)
RadioGroupItem.displayName = 'RadioGroupItem'
