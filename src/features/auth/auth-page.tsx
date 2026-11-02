import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useAuth } from './auth-context'
import { AuthForm } from './auth-form'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'

/**
 * Login / Cadastro screens. Desktop: a centered modal card over the (dimmed) home, as in the
 * Figma frames; mobile: a full "KURIO" screen. Authenticated visitors are sent back.
 */
export function AuthPage({ mode, redirect }: { mode: 'login' | 'register'; redirect?: string }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  useDocumentTitle(mode === 'login' ? 'Entrar — Kurio' : 'Criar conta — Kurio')

  useEffect(() => {
    if (isAuthenticated) void navigate({ href: redirect && redirect.startsWith('/') ? redirect : '/', replace: true })
  }, [isAuthenticated, navigate, redirect])

  return (
    <div className="container-page flex min-h-[calc(100dvh-72px)] items-start justify-center pb-10 pt-6 lg:min-h-[calc(100dvh-82px)] lg:items-center lg:py-12">
      <section
        className="relative w-full max-w-[500px] bg-ink lg:border-b-[10px] lg:border-primary lg:bg-surface lg:px-10 lg:pb-10 lg:pt-8"
        aria-labelledby="auth-title"
        data-testid="auth-card"
      >
        <Link
          to="/"
          className="absolute right-0 top-0 hidden size-9 items-center justify-center text-primary-light hover:text-foreground lg:flex"
          aria-label="Fechar e voltar ao início"
        >
          <X className="size-5" aria-hidden="true" />
        </Link>
        <p className="mt-16 text-center text-[32px] font-bold tracking-[0.2em] lg:hidden">KURIO</p>
        <div className="mt-20 text-center lg:mt-0">
          <h1 id="auth-title" className="text-[20px] font-bold lg:hidden">
            {mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
          </h1>
          <nav aria-label="Alternar entre entrar e criar conta" className="hidden items-center justify-center gap-2 text-[20px] lg:flex">
            <Link
              to="/login"
              search={{ redirect }}
              className={cn('font-bold', mode === 'login' ? 'text-primary-light' : 'text-foreground hover:text-primary-light')}
              aria-current={mode === 'login' ? 'page' : undefined}
            >
              Entrar
            </Link>
            <span className="h-6 w-px bg-primary" aria-hidden="true" />
            <Link
              to="/register"
              search={{ redirect }}
              className={cn('font-bold', mode === 'register' ? 'text-primary-light' : 'text-foreground hover:text-primary-light')}
              aria-current={mode === 'register' ? 'page' : undefined}
            >
              Criar conta
            </Link>
          </nav>
          <p className="mt-4 hidden text-[13px] text-foreground lg:block">
            {mode === 'login'
              ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
              : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
          </p>
        </div>
        <div className="mt-8 lg:mt-6">
          <AuthForm mode={mode} redirect={redirect} />
        </div>
      </section>
    </div>
  )
}
