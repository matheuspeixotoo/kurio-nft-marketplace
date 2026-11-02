import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const inputClassName =
  'flex h-10 w-full rounded-md border border-primary/70 bg-surface px-3 text-[15px] text-foreground placeholder:text-secondary/70 focus-visible:border-primary-light focus-visible:outline-2 focus-visible:outline-primary-light/70 focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-coral aria-[invalid=true]:focus-visible:outline-coral/60 transition-colors'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, invalid, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(inputClassName, className)} aria-invalid={invalid || props['aria-invalid'] || undefined} {...props} />
))
Input.displayName = 'Input'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(inputClassName, 'h-auto min-h-[140px] resize-y py-2', className)}
    aria-invalid={invalid || props['aria-invalid'] || undefined}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
