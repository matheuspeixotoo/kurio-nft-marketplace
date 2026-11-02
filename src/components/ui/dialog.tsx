import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export const DialogOverlay = forwardRef<ElementRef<typeof DialogPrimitive.Overlay>, ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-ink/80 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      )}
      {...props}
    />
  ),
)
DialogOverlay.displayName = 'DialogOverlay'

interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideClose?: boolean
  /** "modal" = centered card (Figma login modal); "sheet" = right drawer; "bottom" = mobile bottom sheet. */
  mode?: 'modal' | 'sheet' | 'bottom'
}

/** Focus is trapped and restored by Radix; Escape and overlay click close the dialog. */
export const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, hideClose, mode = 'modal', ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 bg-surface text-foreground shadow-2xl outline-none',
          mode === 'modal' &&
            'left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 border-b-[10px] border-primary p-6 sm:p-8 max-h-[calc(100dvh-2rem)] overflow-y-auto',
          mode === 'sheet' && 'inset-y-0 right-0 h-full w-full max-w-[420px] border-l border-border-soft p-6 overflow-y-auto',
          mode === 'bottom' && 'inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[16px] border-t border-border-soft p-5',
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm p-1 text-primary-light transition-colors hover:text-foreground focus-visible:outline-2">
            <X className="size-5" aria-hidden="true" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
)
DialogContent.displayName = 'DialogContent'

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2 text-center', className)} {...props} />
}
export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
}
