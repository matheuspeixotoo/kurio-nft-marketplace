import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useAuth } from './auth-context'
import { toApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { FormField } from '@/components/ui/form-field'
import { GoogleIcon, FacebookIcon } from '@/components/icons'
import { toast } from '@/components/ui/toast'
import { useAnnounce } from '@/components/live-announcer'
import { cn } from '@/lib/utils'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})

const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Use pelo menos 3 caracteres.')
      .max(24, 'Use no máximo 24 caracteres.')
      .regex(/^[a-z0-9][a-z0-9._]*$/i, 'Use letras, números, ponto ou sublinhado.'),
    email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
    password: z
      .string()
      .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
      .regex(/[a-zA-Z]/, 'Use letras e números na senha.')
      .regex(/\d/, 'Use letras e números na senha.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: 'As senhas não coincidem.', path: ['confirmPassword'] })

type Mode = 'login' | 'register'

function zodErrors(err: z.ZodError) {
  const out: Record<string, string> = {}
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}

/** Login / Cadastro form shared by the dedicated routes (Figma "Login" and "Cadastro"). */
export function AuthForm({ mode, redirect, compact }: { mode: Mode; redirect?: string; compact?: boolean }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [values, setValues] = useState({ username: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: '' }))
  }

  const finish = () => {
    const target = redirect || auth.consumeReturnTo() || '/'
    const safe = target.startsWith('/') && !target.startsWith('//') ? target : '/'
    void navigate({ href: safe, replace: true })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const schema = mode === 'login' ? loginSchema : registerSchema
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      const errs = zodErrors(parsed.error)
      setErrors(errs)
      announce(`Formulário com ${Object.keys(errs).length} erro(s). ${Object.values(errs)[0]}`, 'assertive')
      const first = Object.keys(errs)[0]
      document.getElementById(`${mode}-${first}`)?.focus()
      return
    }
    setSubmitting(true)
    try {
      const user =
        mode === 'login'
          ? await auth.login({ email: values.email, password: values.password })
          : await auth.register({ username: values.username, email: values.email, password: values.password })
      toast({ title: mode === 'login' ? `Bem-vindo de volta, ${user.displayName}` : 'Conta criada com sucesso', variant: 'success' })
      finish()
    } catch (err) {
      const apiErr = toApiError(err)
      if (Object.keys(apiErr.fieldErrors).length) {
        setErrors(apiErr.fieldErrors)
        const first = Object.keys(apiErr.fieldErrors)[0]
        document.getElementById(`${mode}-${first}`)?.focus()
      } else {
        setFormError(apiErr.message)
      }
      announce(apiErr.message, 'assertive')
    } finally {
      setSubmitting(false)
    }
  }

  const social = (label: string) =>
    toast({ title: `${label} fora do escopo`, description: 'Login social não faz parte desta simulação. Use e-mail e senha.', variant: 'default' })

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn('flex flex-col gap-3', compact && 'gap-3')}
      aria-describedby={formError ? `${mode}-form-error` : undefined}
      data-testid={`${mode}-form`}
    >
      {formError && (
        <p
          id={`${mode}-form-error`}
          role="alert"
          className="rounded-md border border-coral/60 bg-coral/10 px-3 py-2 text-[13px] text-coral"
          data-testid="form-error"
        >
          {formError}
        </p>
      )}
      {mode === 'register' && (
        <FormField label={<span className="sr-only">Nome de usuário</span>} error={errors.username} id={`${mode}-username`}>
          {(f) => (
            <Input
              id={f.id}
              value={values.username}
              onChange={set('username')}
              placeholder="Nome de usuário"
              autoComplete="username"
              aria-describedby={f.describedBy}
              invalid={f.invalid}
              className="h-11 text-center lg:text-left"
            />
          )}
        </FormField>
      )}
      <FormField label={<span className="sr-only">E-mail</span>} error={errors.email} id={`${mode}-email`}>
        {(f) => (
          <Input
            id={f.id}
            type="email"
            value={values.email}
            onChange={set('email')}
            placeholder={mode === 'login' ? 'contato@email.com' : 'Digite seu e-mail'}
            autoComplete="email"
            inputMode="email"
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            className="h-11"
          />
        )}
      </FormField>
      <FormField label={<span className="sr-only">Senha</span>} error={errors.password} id={`${mode}-password`}>
        {(f) => (
          <PasswordInput
            id={f.id}
            value={values.password}
            onChange={set('password')}
            placeholder={mode === 'login' ? '***********' : 'Senha'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            className="h-11"
          />
        )}
      </FormField>
      {mode === 'register' && (
        <FormField label={<span className="sr-only">Confirmar senha</span>} error={errors.confirmPassword} id={`${mode}-confirmPassword`}>
          {(f) => (
            <PasswordInput
              id={f.id}
              value={values.confirmPassword}
              onChange={set('confirmPassword')}
              placeholder="Confirmar senha"
              autoComplete="new-password"
              aria-describedby={f.describedBy}
              invalid={f.invalid}
              className="h-11"
            />
          )}
        </FormField>
      )}
      {mode === 'login' && (
        <button
          type="button"
          className="-mt-1 self-end text-[13px] text-primary-light hover:underline"
          onClick={() => toast({ title: 'Recuperação de senha simulada', description: 'Use Kurio@2026 para as contas de demonstração.', variant: 'default' })}
        >
          Esqueceu a senha?
        </button>
      )}
      <Button
        type="submit"
        size="lg"
        block
        className="mt-2 h-12 text-[16px]"
        loading={submitting}
        loadingText={mode === 'login' ? 'Entrando…' : 'Criando conta…'}
        data-testid={`${mode}-submit`}
      >
        {mode === 'login' ? 'Entrar' : 'Criar conta'}
      </Button>
      <div className="my-2 flex items-center gap-3 text-[12px] text-secondary" aria-hidden="true">
        <span className="h-px flex-1 bg-border-soft" />
        Ou continue com
        <span className="h-px flex-1 bg-border-soft" />
      </div>
      <Button type="button" variant="secondary" block className="h-11 border-primary/60 bg-surface text-[13px] font-medium" onClick={() => social('Google')}>
        <GoogleIcon /> Continuar com Google
      </Button>
      <Button type="button" variant="secondary" block className="h-11 border-primary/60 bg-surface text-[13px] font-medium" onClick={() => social('Facebook')}>
        <FacebookIcon /> Continuar com Facebook
      </Button>
      <p className="mt-3 text-center text-[15px] text-primary-light">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <Link to="/register" search={{ redirect }} className="underline-offset-2 hover:underline">
              Crie uma conta
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <Link to="/login" search={{ redirect }} className="underline-offset-2 hover:underline">
              Entre
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
