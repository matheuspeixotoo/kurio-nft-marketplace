import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

interface SliderProps extends ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  thumbLabels?: string[]
}

/** Range slider styled after the "Faixa de preço" control; fully keyboard-operable (arrows / Home / End). */
export const Slider = forwardRef<ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, thumbLabels = [], value, defaultValue, ...props }, ref) => {
    const count = (value ?? defaultValue ?? [0]).length
    return (
      <SliderPrimitive.Root
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        className={cn('relative flex w-full touch-none select-none items-center py-2', className)}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-[3px] w-full grow rounded-full bg-primary/40">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
        </SliderPrimitive.Track>
        {Array.from({ length: count }).map((_, i) => (
          <SliderPrimitive.Thumb
            key={i}
            aria-label={thumbLabels[i] ?? `Valor ${i + 1}`}
            className="block size-4 rounded-full border-2 border-ink bg-primary-light shadow transition-colors focus-visible:outline-2 focus-visible:outline-primary-light focus-visible:outline-offset-2 hover:bg-primary"
          />
        ))}
      </SliderPrimitive.Root>
    )
  },
)
Slider.displayName = 'Slider'
