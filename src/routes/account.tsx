import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Activity, Download, Heart, LifeBuoy, LogOut, Tag, User, Wallet } from 'lucide-react'
import { requireAuth } from '@/features/auth/guards'
import { useAuth } from '@/features/auth/auth-context'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'

export const Route = createFileRoute('/account')({
  beforeLoad: ({ context, location }) => requireAuth(context, location),
  component: AccountLayout,
})

const ITEMS = [
  { label: 'Dados do perfil', to: '/account/profile' as const, Icon: User },
  { label: 'Carteiras', to: '/account/wallets' as const, Icon: Wallet },
  { label: 'Atividade', Icon: Activity },
  { label: 'Lista de interesse', to: '/account/favorites' as const, Icon: Heart },
  { label: 'Ofertas', Icon: Tag },
  { label: 'Arquivos baixados', Icon: Download },
  { label: 'Suporte', Icon: LifeBuoy },
]

function AccountLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="container-page grid gap-6 pb-10 pt-5 lg:grid-cols-[310px_1fr] lg:gap-7 lg:pt-8">
      <nav aria-label="Minha conta" className="min-w-0 max-w-full rounded-[6px] bg-surface py-5 lg:self-start">
        <h2 className="px-3 text-[18px] font-bold">Meu perfil</h2>
        <ul className="mt-4 flex gap-1 overflow-x-auto px-2 pb-1 lg:block lg:space-y-1 lg:px-0">
          {ITEMS.map((item) => {
            const active = item.to ? pathname.startsWith(item.to) : false
            const cls = cn(
              'flex shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-3 py-2.5 text-[15px] text-primary-light transition-colors hover:bg-surface-raised lg:rounded-none lg:border-l-[3px] lg:border-transparent',
              active && 'bg-surface-raised font-medium lg:border-primary',
            )
            return (
              <li key={item.label}>
                {item.to ? (
                  <Link to={item.to} className={cls} aria-current={active ? 'page' : undefined}>
                    <item.Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={cls}
                    onClick={() => toast({ title: `${item.label} fora do escopo`, description: 'Esta seção não faz parte da entrega.', variant: 'default' })}
                  >
                    <item.Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </button>
                )}
              </li>
            )
          })}
          <li className="hidden border-t border-border pt-2 lg:block lg:mt-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2.5 text-[15px] font-bold text-primary-light hover:bg-surface-raised"
              onClick={async () => {
                await logout()
                void navigate({ to: '/' })
              }}
              data-testid="account-logout"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
