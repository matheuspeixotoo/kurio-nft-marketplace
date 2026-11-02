import { useEffect, useState } from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'default' | 'success' | 'warning' | 'error'
export interface ToastOptions {
  id?: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
  action?: { label: string; onClick: () => void }
}
interface ToastRecord extends Required<Pick<ToastOptions, 'id' | 'title' | 'variant' | 'duration'>> {
  description?: string
  action?: ToastOptions['action']
}

type Listener = (toasts: ToastRecord[]) => void
let toasts: ToastRecord[] = []
const listeners = new Set<Listener>()
let counter = 0

function emit() {
  for (const l of listeners) l(toasts)
}

/** Imperative API usable from hooks, providers and mutation callbacks. */
export function toast(opts: ToastOptions) {
  const id = opts.id ?? `toast_${++counter}`
  const record: ToastRecord = {
    id,
    title: opts.title,
    description: opts.description,
    variant: opts.variant ?? 'default',
    duration: opts.duration ?? (opts.variant === 'error' ? 8000 : 5000),
    action: opts.action,
  }
  toasts = [...toasts.filter((t) => t.id !== id), record].slice(-4)
  emit()
  return id
}
export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

const ICONS: Record<ToastVariant, typeof Info> = { default: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle }
const COLORS: Record<ToastVariant, string> = {
  default: 'border-border-soft text-foreground',
  success: 'border-success/60 text-foreground',
  warning: 'border-primary text-foreground',
  error: 'border-coral text-foreground',
}
const ICON_COLORS: Record<ToastVariant, string> = { default: 'text-secondary', success: 'text-success', warning: 'text-primary-light', error: 'text-coral' }

export function Toaster() {
  const [items, setItems] = useState<ToastRecord[]>(toasts)
  useEffect(() => {
    listeners.add(setItems)
    return () => {
      listeners.delete(setItems)
    }
  }, [])
  return (
    <ToastPrimitive.Provider swipeDirection="right" label="Notificações">
      {items.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration}
            onOpenChange={(open) => {
              if (!open) dismissToast(t.id)
            }}
            className={cn(
              'group pointer-events-auto relative flex w-full items-start gap-3 rounded-md border bg-surface-raised p-4 pr-10 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[swipe=end]:translate-x-full',
              COLORS[t.variant],
            )}
            data-testid={`toast-${t.variant}`}
          >
            <Icon className={cn('mt-0.5 size-5 shrink-0', ICON_COLORS[t.variant])} aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <ToastPrimitive.Title className="text-[14px] font-bold leading-tight">{t.title}</ToastPrimitive.Title>
              {t.description && <ToastPrimitive.Description className="text-[13px] text-secondary">{t.description}</ToastPrimitive.Description>}
              {t.action && (
                <ToastPrimitive.Action altText={t.action.label} asChild>
                  <button
                    type="button"
                    onClick={t.action.onClick}
                    className="mt-1 self-start text-[13px] font-bold text-primary-light underline-offset-2 hover:underline"
                  >
                    {t.action.label}
                  </button>
                </ToastPrimitive.Action>
              )}
            </div>
            <ToastPrimitive.Close className="absolute right-2 top-2 rounded-sm p-1 text-secondary hover:text-foreground">
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Fechar notificação</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )
      })}
      <ToastPrimitive.Viewport className="pointer-events-none fixed right-0 top-[76px] z-[100] flex w-full max-w-[400px] flex-col gap-2 p-4 outline-none lg:top-auto lg:bottom-4 lg:right-4" />
    </ToastPrimitive.Provider>
  )
}
