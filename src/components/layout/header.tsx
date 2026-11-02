import { useEffect, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Heart, Home, LogIn, LogOut, Search, ShoppingCart, User, Wallet, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/features/auth/auth-context'
import { useCart } from '@/features/cart/hooks'
import { useRealtime } from '@/features/realtime/realtime-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/misc'
import { ScanGlyph } from '@/components/icons'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'

const NAV = [
  { label: 'Início', to: '/', search: {} },
  { label: 'Mercado', to: '/', search: { tab: 'all' as const } },
  { label: 'Criadores', to: '/', search: { sort: 'trending' as const } },
  { label: 'Aprenda', to: '/', hash: 'diario', search: {} },
]

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('text-[14px] font-bold tracking-[0.18em] text-foreground', className)} aria-label="Kurio — página inicial">
      KURIO
    </Link>
  )
}

function CartButton({ className }: { className?: string }) {
  const { data } = useCart()
  const count = data?.totalQuantity ?? 0
  return (
    <Link
      to="/cart"
      className={cn('relative inline-flex size-10 items-center justify-center rounded-md text-foreground hover:text-primary-light', className)}
      aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
      data-testid="cart-link"
    >
      <ShoppingCart className="size-[22px]" aria-hidden="true" />
      {count > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-[18px] text-ink"
          data-testid="cart-count"
        >
          {count}
        </span>
      )}
    </Link>
  )
}

function AccountMenu() {
  const { user, logout, isLoading } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  if (isLoading) return <span className="skeleton h-[34px] w-[100px] rounded-md" aria-hidden="true" />
  if (!user) {
    return (
      <Button asChild size="sm" className="h-[34px] px-3 text-[15px]" data-testid="header-login">
        <Link to="/login" search={{ redirect: undefined }}>
          <LogIn className="size-4" aria-hidden="true" />
          Entrar
        </Link>
      </Button>
    )
  }
  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase()
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Conta de ${user.displayName}`}
        className="flex items-center gap-2 rounded-md p-1 hover:bg-surface-raised"
        data-testid="account-menu-trigger"
      >
        <Avatar className="size-8">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback className="text-[12px] font-bold">{initials}</AvatarFallback>
        </Avatar>
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-30 cursor-default" aria-hidden="true" tabIndex={-1} onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-60 rounded-md border border-border-soft bg-surface-raised p-1 shadow-xl"
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          >
            <p className="truncate px-3 py-2 text-[13px] text-secondary">{user.email}</p>
            <MenuLink to="/account/profile" icon={User} onSelect={() => setOpen(false)}>
              Dados do perfil
            </MenuLink>
            <MenuLink to="/account/wallets" icon={Wallet} onSelect={() => setOpen(false)}>
              Carteiras
            </MenuLink>
            <MenuLink to="/account/favorites" icon={Heart} onSelect={() => setOpen(false)}>
              Lista de interesse
            </MenuLink>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-[14px] text-primary-light hover:bg-primary/10"
              onClick={async () => {
                setOpen(false)
                await logout()
                toast({ title: 'Você saiu da sua conta', variant: 'default' })
                void navigate({ to: '/' })
              }}
              data-testid="logout"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MenuLink({
  to,
  icon: Icon,
  children,
  onSelect,
}: {
  to: '/account/profile' | '/account/wallets' | '/account/favorites'
  icon: typeof User
  children: string
  onSelect: () => void
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      className="flex items-center gap-2 rounded-sm px-3 py-2 text-[14px] text-foreground hover:bg-primary/10 hover:text-primary-light"
      onClick={onSelect}
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  )
}

function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-foreground hover:text-primary-light"
          aria-label="Buscar NFTs"
          data-testid="open-search"
        >
          <Search className="size-[22px]" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[560px] border-b-0 p-6" aria-describedby={undefined}>
        <DialogTitle className="text-[18px] font-bold">Buscar no catálogo</DialogTitle>
        <DialogDescription className="sr-only">Digite o nome do NFT, coleção ou criador.</DialogDescription>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setOpen(false)
            void navigate({ to: '/', search: (prev) => ({ ...prev, q: value.trim() || undefined, page: undefined }), hash: 'catalogo' })
          }}
        >
          <label htmlFor="global-search" className="sr-only">
            Buscar NFTs
          </label>
          <Input id="global-search" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="Nome, coleção ou criador…" />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RealtimeDot() {
  const { status } = useRealtime()
  const label = status === 'connected' ? 'Tempo real conectado' : status === 'connecting' ? 'Reconectando ao tempo real' : 'Tempo real desconectado'
  return (
    <span className="hidden items-center gap-1.5 text-[11px] text-accent lg:inline-flex" title={label} data-testid="realtime-status" data-status={status}>
      <span
        className={cn('size-2 rounded-full', status === 'connected' ? 'bg-success' : status === 'connecting' ? 'bg-primary-light animate-pulse' : 'bg-coral')}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <header className="sticky top-0 z-30 bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="container-page flex h-[72px] items-center justify-between gap-4 border-b border-border lg:h-[82px]">
        <Logo />
        <nav aria-label="Principal" className="hidden h-full items-stretch gap-10 lg:flex">
          {NAV.map((item) => {
            const active = item.label === 'Início' ? pathname === '/' : false
            return (
              <Link
                key={item.label}
                to={item.to}
                search={item.search}
                hash={item.hash}
                className={cn(
                  'relative flex items-center text-[17px] text-foreground transition-colors hover:text-primary-light',
                  active && 'font-bold text-primary-light after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="flex items-center gap-1 sm:gap-3">
          <RealtimeDot />
          <SearchDialog />
          <CartButton />
          <AccountMenu />
        </div>
      </div>
    </header>
  )
}

/** Mobile bottom navigation (Figma "Mobile / Início"). */
export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { isAuthenticated } = useAuth()
  const { data } = useCart()
  const count = data?.totalQuantity ?? 0
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    setVisible(!pathname.startsWith('/checkout') && !pathname.startsWith('/login') && !pathname.startsWith('/register'))
  }, [pathname])
  if (!visible) return null
  const item = 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-secondary hover:text-primary-light aria-[current=page]:text-primary-light'
  return (
    <nav
      aria-label="Navegação móvel"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      data-testid="mobile-nav"
    >
      <div className="relative mx-auto flex h-16 max-w-[640px] items-stretch">
        <Link to="/" className={item} aria-current={pathname === '/' ? 'page' : undefined} aria-label="Início">
          <Home className="size-6" aria-hidden="true" />
        </Link>
        <Link
          to="/account/favorites"
          className={item}
          aria-current={pathname.startsWith('/account/favorites') ? 'page' : undefined}
          aria-label="Lista de interesse"
        >
          <Heart className="size-6" aria-hidden="true" />
        </Link>
        <div className="flex flex-1 items-end justify-center">
          <Link
            to="/"
            hash="catalogo"
            className="-mt-7 flex size-14 items-center justify-center rounded-full bg-primary text-ink shadow-lg ring-4 ring-ink"
            aria-label="Explorar catálogo"
          >
            <ScanGlyph />
          </Link>
        </div>
        <Link
          to="/cart"
          className={cn(item, 'relative')}
          aria-current={pathname.startsWith('/cart') ? 'page' : undefined}
          aria-label={`Carrinho, ${count} itens`}
        >
          <ShoppingCart className="size-6" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute right-[calc(50%-18px)] top-1 min-w-[16px] rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-4 text-ink">
              {count}
            </span>
          )}
        </Link>
        <Link
          to={isAuthenticated ? '/account/profile' : '/login'}
          search={isAuthenticated ? undefined : { redirect: undefined }}
          className={item}
          aria-current={pathname.startsWith('/account') ? 'page' : undefined}
          aria-label={isAuthenticated ? 'Meu perfil' : 'Entrar'}
        >
          <User className="size-6" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  )
}

export function CloseLink({ to = '/' as const, label = 'Fechar' }: { to?: '/'; label?: string }) {
  return (
    <Link to={to} className="inline-flex size-10 items-center justify-center rounded-full text-primary-light hover:bg-surface-raised" aria-label={label}>
      <X className="size-5" aria-hidden="true" />
    </Link>
  )
}
