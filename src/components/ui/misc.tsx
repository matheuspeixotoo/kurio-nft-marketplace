import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'

// Separator ------------------------------------------------------------------
export const Separator = forwardRef<ElementRef<typeof SeparatorPrimitive.Root>, ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn('shrink-0 bg-border-soft', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
      {...props}
    />
  ),
)
Separator.displayName = 'Separator'

// Badge ----------------------------------------------------------------------
export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'primary' | 'outline' | 'success' | 'danger' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide',
        variant === 'default' && 'bg-surface-raised text-secondary',
        variant === 'primary' && 'bg-primary text-ink',
        variant === 'outline' && 'border border-secondary/60 text-secondary',
        variant === 'success' && 'bg-success/20 text-success',
        variant === 'danger' && 'bg-coral/20 text-coral',
        className,
      )}
      {...props}
    />
  )
}

// Tabs (underline style used by the catalog and detail page) ----------------
export const Tabs = TabsPrimitive.Root
export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => <TabsPrimitive.List ref={ref} className={cn('flex flex-wrap items-end gap-x-5 gap-y-2', className)} {...props} />,
)
TabsList.displayName = 'TabsList'
export const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'relative whitespace-nowrap pb-2 text-[15px] text-foreground transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent hover:text-primary-light data-[state=active]:font-bold data-[state=active]:text-primary-light data-[state=active]:after:bg-primary',
        className,
      )}
      {...props}
    />
  ),
)
TabsTrigger.displayName = 'TabsTrigger'
export const TabsContent = TabsPrimitive.Content

// Avatar ---------------------------------------------------------------------
export const Avatar = forwardRef<ElementRef<typeof AvatarPrimitive.Root>, ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Root ref={ref} className={cn('relative flex size-12 shrink-0 overflow-hidden rounded-full bg-surface-raised', className)} {...props} />
  ),
)
Avatar.displayName = 'Avatar'
export const AvatarImage = forwardRef<ElementRef<typeof AvatarPrimitive.Image>, ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>>(
  ({ className, ...props }, ref) => <AvatarPrimitive.Image ref={ref} className={cn('aspect-square size-full object-cover', className)} {...props} />,
)
AvatarImage.displayName = 'AvatarImage'
export const AvatarFallback = forwardRef<ElementRef<typeof AvatarPrimitive.Fallback>, ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>>(
  ({ className, ...props }, ref) => (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn('flex size-full items-center justify-center rounded-full bg-surface-raised text-primary-light', className)}
      {...props}
    />
  ),
)
AvatarFallback.displayName = 'AvatarFallback'
