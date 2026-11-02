import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-ink hover:bg-primary-light active:bg-primary-dark',
        secondary: 'bg-surface-raised text-foreground border border-border-soft hover:border-primary hover:text-primary-light',
        outline: 'border border-primary text-primary-light bg-transparent hover:bg-primary/10',
        ghost: 'bg-transparent text-secondary hover:bg-surface-raised hover:text-foreground',
        link: 'bg-transparent text-primary-light underline-offset-4 hover:underline h-auto p-0 font-medium',
        danger: 'bg-transparent border border-coral/60 text-coral hover:bg-coral/10',
      },
      size: {
        sm: 'h-9 px-3 text-[13px]',
        md: 'h-10 px-4 text-[15px]',
        lg: 'h-12 px-6 text-base',
        xl: 'h-[52px] px-8 text-[17px]',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, loading = false, loadingText, children, disabled, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, block }), className)}
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'
