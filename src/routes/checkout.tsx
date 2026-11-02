import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import type { Cart, CollectorInfo, CreateOrderInput, Network, Quote, Wallet, WalletProvider } from '@/types/api'
import { requireAuth } from '@/features/auth/guards'
import { useAuth } from '@/features/auth/auth-context'
import { useCart } from '@/features/cart/hooks'
import { clearPendingOrder, readPendingOrder, useCreateOrder, useOrder, useOrders, useQuote } from '@/features/checkout/hooks'
import { useProfile, useWallets } from '@/features/account/hooks'
import { WalletPicker, type ConnectionState } from '@/features/checkout/wallet-connect'
import { PROVIDER_LABELS } from './account.wallets'
import { NETWORK_LABELS } from '@/mocks/fixtures/catalog'
import { formatDiscount, formatEth } from '@/lib/eth'
import { toApiError } from '@/lib/api/errors'
import { STORAGE_KEYS, readJson, writeJson } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { Breadcrumb } from '@/components/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog'
import { EmptyState, ErrorState } from '@/components/ui/state-blocks'
import { useAnnounce } from '@/components/live-announcer'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ context, location }) => requireAuth(context, location),
  component: CheckoutPage,
})

type Draft = Omit<CollectorInfo, 'network' | 'walletProvider'> & { useOtherWallet: boolean }
const EMPTY_DRAFT: Draft = {
  displayName: '',
  username: '',
  profileName: '',
  email: '',
  walletAddress: '',
  secondaryAddress: '',
  referralCode: '',
  ensName: '',
  note: '',
  useOtherWallet: false,
}

function validate(d: Draft) {
  const e: Record<string, string> = {}
  if (d.displayName.trim().length < 2) e.displayName = 'Informe o nome de exibição.'
  if (!/^[a-z0-9][a-z0-9._]{2,23}$/i.test(d.username.trim())) e.username = 'Informe um nome de usuário válido.'
  if (d.profileName.trim().length < 2) e.profileName = 'Informe o nome do perfil.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'Informe um e-mail válido.'
  if (!/^0x[a-fA-F0-9]{40}$|^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(d.walletAddress.trim())) e.walletAddress = 'Informe um endereço de carteira válido.'
  if (!d.referralCode.trim()) e.referralCode = 'Informe o código de indicação.'
  if (!/^[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*$/i.test(d.ensName.trim().replace(/\.eth$/, ''))) e.ensName = 'Informe um nome ENS válido.'
  return e
}

function CheckoutPage() {
  const cart = useCart()
  useDocumentTitle('Pagamento — Kurio')
  if (cart.isError) {
    return (
      <div className="container-page py-10">
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
      </div>
    )
  }
  if (cart.isPending) return <CheckoutSkeleton />
  return <CheckoutContent cart={cart.data} />
}

/**
 * Surfaces an order that is still in progress: either the last pending order (stored after a
 * successful POST) or an order created by an attempt whose response never arrived (matched by the
 * persisted idempotency key), so a refresh after a timeout never loses the purchase.
 */
function PendingBanner() {
  const { userId } = useAuth()
  const pendingId = readPendingOrder(userId)
  const order = useOrder(pendingId ?? undefined, { poll: false })
  const orders = useOrders()
  const attempt = readJson<{ idempotencyKey: string; userId: string; orderId: string | null } | null>(STORAGE_KEYS.idempotency, null)
  const recovered = attempt && attempt.userId === userId ? orders.data?.find((o) => o.idempotencyKey === attempt.idempotencyKey) : undefined
  useEffect(() => {
    if (order.data && order.data.status !== 'pending') clearPendingOrder()
  }, [order.data])
  const target = order.data?.status === 'pending' ? order.data : recovered
  if (!target) return null
  const label = target.status === 'pending' ? 'pendente' : target.status === 'confirmed' ? 'confirmado' : 'recusado'
  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary bg-primary/10 px-4 py-3 text-[14px]"
      data-testid="pending-banner"
    >
      <span>
        {target.status === 'pending' ? 'Você tem um pedido' : 'Sua última tentativa gerou um pedido'} <strong>{label}</strong> ({target.id}). Acompanhe antes de
        criar outro.
      </span>
      <Button asChild size="sm" variant="outline">
        <Link to="/orders/$id" params={{ id: target.id }}>
          Ver pedido
        </Link>
      </Button>
    </div>
  )
}

function CheckoutContent({ cart }: { cart: Cart }) {
  const navigate = useNavigate()
  const announce = useAnnounce()
  const { user } = useAuth()
  const profile = useProfile()
  const wallets = useWallets()
  const createOrder = useCreateOrder()

  const stored = useRef(
    readJson<{ draft?: Draft; network?: Network; provider?: WalletProvider; walletId?: string; touched?: boolean } | null>(STORAGE_KEYS.checkoutDraft, null),
  )
  const [network, setNetwork] = useState<Network>(() => stored.current?.network ?? cart.items[0]?.network ?? 'ethereum')
  const [provider, setProvider] = useState<WalletProvider>(() => stored.current?.provider ?? 'metamask')
  const [walletId, setWalletId] = useState(() => stored.current?.walletId ?? '')
  const [touched, setTouched] = useState(() => stored.current?.touched ?? false)
  const [connection, setConnection] = useState<ConnectionState>({ status: 'disconnected' })
  const [draft, setDraft] = useState<Draft>(() => readJson<{ draft?: Draft } | null>(STORAGE_KEYS.checkoutDraft, null)?.draft ?? EMPTY_DRAFT)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [review, setReview] = useState<{ open: boolean; hash: string | null }>({ open: false, hash: null })
  // Exact payload of the last attempt: a resend after a timeout must reuse it (same idempotency key).
  const [lastAttempt, setLastAttempt] = useState<CreateOrderInput | null>(null)
  const prefilled = useRef(false)

  const quote = useQuote(cart, network)

  // Prefill from profile + primary wallet once (a draft restored from storage wins).
  useEffect(() => {
    if (prefilled.current || !profile.data) return
    const w = wallets.data?.primary ?? null
    if (!wallets.data) return
    prefilled.current = true
    setDraft((d) => ({
      ...d,
      displayName: d.displayName || profile.data.displayName,
      username: d.username || profile.data.username,
      profileName: d.profileName || w?.profileName || profile.data.username,
      email: d.email || profile.data.email,
      ensName: d.ensName || w?.ensName || profile.data.ensName,
      walletAddress: d.walletAddress || w?.address || '',
      secondaryAddress: d.secondaryAddress || w?.secondaryAddress || '',
      referralCode: d.referralCode || w?.referralCode || '',
    }))
    if (w && !touched) {
      setWalletId(w.id)
      setProvider(w.provider)
      setNetwork(w.network)
    }
  }, [profile.data, wallets.data, touched])

  // Persist the draft so a session expiry mid-checkout can be resumed after login.
  useEffect(() => {
    writeJson(STORAGE_KEYS.checkoutDraft, { draft, network, provider, walletId, touched })
  }, [draft, network, provider, walletId, touched])

  const chooseNetwork = (n: Network) => {
    setTouched(true)
    setNetwork(n)
    setConnection({ status: 'disconnected' })
  }
  const chooseProvider = (p: WalletProvider) => {
    setTouched(true)
    setProvider(p)
    setConnection({ status: 'disconnected' })
  }

  const set = (k: keyof Draft) => (value: string | boolean) => {
    setDraft((d) => ({ ...d, [k]: value }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  const onPickWallet = (w: Wallet) => {
    setTouched(true)
    setWalletId(w.id)
    setNetwork(w.network)
    setProvider(w.provider)
    setConnection({ status: 'disconnected' })
    setDraft((d) => ({ ...d, walletAddress: w.address, ensName: w.ensName || d.ensName, secondaryAddress: w.secondaryAddress }))
  }

  // Realtime/REST revalidation: a newer quote hash invalidates an open review.
  const quoteHash = quote.data?.quoteHash ?? null
  const reviewStale = review.open && review.hash !== null && quoteHash !== null && review.hash !== quoteHash
  useEffect(() => {
    if (reviewStale) announce('A cotação mudou. Revise os novos valores antes de confirmar.', 'assertive')
  }, [reviewStale, announce])

  const blockingIssues = useMemo(() => quote.data?.issues.filter((i) => i.type !== 'COUPON_EXPIRED' && i.type !== 'COUPON_INVALID') ?? [], [quote.data])
  const canReview = !!quote.data && quote.data.lines.length > 0 && blockingIssues.length === 0 && connection.status === 'connected' && !quote.isFetching

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(draft)
    if (Object.keys(errs).length) {
      setErrors(errs)
      announce(`Revise ${Object.keys(errs).length} campo(s) do formulário.`, 'assertive')
      document.getElementById(`co-${Object.keys(errs)[0]}`)?.focus()
      return
    }
    if (connection.status !== 'connected') {
      announce('Conecte a carteira antes de revisar o pedido.', 'assertive')
      toast({ title: 'Conecte a carteira', description: 'A compra precisa de uma carteira conectada.', variant: 'warning' })
      return
    }
    if (!quote.data) return
    setReview({ open: true, hash: quote.data.quoteHash })
  }

  const createError = createOrder.error ? toApiError(createOrder.error) : null
  const canResend = !!lastAttempt && !!createError && (createError.code === 'TIMEOUT' || createError.isNetwork)

  const confirm = () => {
    if (createOrder.isPending) return
    let input: CreateOrderInput
    if (canResend && lastAttempt) {
      input = lastAttempt
    } else {
      if (!quote.data || reviewStale) return
      const q = quote.data
      input = {
        quoteId: q.quoteId,
        quoteHash: q.quoteHash,
        items: q.lines.map((l) => ({ nftId: l.nftId, editionId: l.editionId, quantity: l.quantity })),
        couponCode: q.couponCode,
        network,
        walletId: walletId || 'manual',
        walletProvider: provider,
        collector: { ...draft, network, walletProvider: provider },
      }
      setLastAttempt(input)
    }
    createOrder.mutate(input, {
      onSuccess: (order) => {
        writeJson(STORAGE_KEYS.checkoutDraft, null)
        setReview({ open: false, hash: null })
        void navigate({ to: '/orders/$id', params: { id: order.id }, replace: true })
      },
      onError: (err) => {
        const api = toApiError(err)
        if (api.code === 'QUOTE_OUTDATED') {
          void quote.refetch()
          announce('A cotação foi atualizada pelo servidor. Confirme novamente com os novos valores.', 'assertive')
        } else if (api.code === 'TIMEOUT' || api.isNetwork) {
          announce('A confirmação demorou. Você pode reenviar com segurança: a mesma chave recupera o pedido.', 'assertive')
        } else {
          toast({ title: 'Não foi possível criar o pedido', description: api.message, variant: 'error' })
        }
      },
    })
  }

  const showEmpty = cart.items.length === 0 && !review.open && !createOrder.isPending

  if (showEmpty) {
    return (
      <div className="container-page py-10">
        <PendingBanner />
        <EmptyState
          title="Nada para pagar"
          description="Seu carrinho está vazio."
          action={
            <Button asChild>
              <Link to="/">Explorar NFTs</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="container-page pt-5 lg:pt-7">
      <div className="hidden lg:block">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Pagamento' }]} />
      </div>
      <div className="flex items-center gap-3 lg:hidden">
        <Link to="/cart" className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-primary-light" aria-label="Voltar ao carrinho">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="flex-1 text-center text-[20px] font-bold">Pagamento com carteira</h1>
        <span className="size-9" aria-hidden="true" />
      </div>
      <div className="mt-4 lg:mt-8">
        <PendingBanner />
      </div>

      <form onSubmit={onSubmit} noValidate className="grid gap-10 pb-10 lg:grid-cols-[1fr_405px] lg:gap-8" data-testid="checkout-form">
        <section aria-labelledby="collector-heading">
          <h1 id="collector-heading" className="hidden text-[18px] font-bold lg:block">
            Perfil do colecionador
          </h1>
          <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormField label="Nome de exibição" required error={errors.displayName} id="co-displayName">
              {(f) => (
                <Input
                  id={f.id}
                  value={draft.displayName}
                  onChange={(e) => set('displayName')(e.target.value)}
                  autoComplete="name"
                  aria-describedby={f.describedBy}
                  invalid={f.invalid}
                />
              )}
            </FormField>
            <FormField label="Nome de usuário" required error={errors.username} id="co-username">
              {(f) => (
                <Input
                  id={f.id}
                  value={draft.username}
                  onChange={(e) => set('username')(e.target.value)}
                  autoComplete="username"
                  aria-describedby={f.describedBy}
                  invalid={f.invalid}
                />
              )}
            </FormField>
            <FormField label="Rede" required id="co-network">
              {(f) => (
                <Select value={network} onValueChange={(v) => chooseNetwork(v as Network)}>
                  <SelectTrigger id={f.id} aria-describedby={f.describedBy} data-testid="co-network">
                    <SelectValue placeholder="Selecione uma rede" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
                      <SelectItem key={n} value={n}>
                        {NETWORK_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label="Nome do perfil" required error={errors.profileName} id="co-profileName">
              {(f) => (
                <Input
                  id={f.id}
                  value={draft.profileName}
                  onChange={(e) => set('profileName')(e.target.value)}
                  aria-describedby={f.describedBy}
                  invalid={f.invalid}
                />
              )}
            </FormField>
            <FormField label="Endereço da carteira" required error={errors.walletAddress} id="co-walletAddress">
              {(f) => (
                <Input
                  id={f.id}
                  value={draft.walletAddress}
                  onChange={(e) => set('walletAddress')(e.target.value)}
                  placeholder="Endereço 0x da carteira"
                  className="font-mono"
                  aria-describedby={f.describedBy}
                  invalid={f.invalid}
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
            </FormField>
            <FormField label={<span className="sr-only">ENS ou carteira secundária</span>} id="co-secondaryAddress" className="sm:pt-[26px]">
              {(f) => (
                <Input
                  id={f.id}
                  value={draft.secondaryAddress}
                  onChange={(e) => set('secondaryAddress')(e.target.value)}
                  placeholder="ENS ou carteira secundária (opcional)"
                  className="font-mono"
                  aria-describedby={f.describedBy}
                  autoComplete="off"
                />
              )}
            </FormField>
            <FormField label="Tipo de carteira" required id="co-provider">
              {(f) => (
                <Select value={provider} onValueChange={(v) => chooseProvider(v as WalletProvider)}>
                  <SelectTrigger id={f.id} aria-describedby={f.describedBy} data-testid="co-provider">
                    <SelectValue placeholder="Selecione uma carteira" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROVIDER_LABELS) as WalletProvider[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PROVIDER_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label="Código de indicação" required error={errors.referralCode} id="co-referralCode">
              {(f) => (
                <Input
                  id={f.id}
                  value={draft.referralCode}
                  onChange={(e) => set('referralCode')(e.target.value)}
                  aria-describedby={f.describedBy}
                  invalid={f.invalid}
                />
              )}
            </FormField>
            <FormField label="E-mail" required error={errors.email} id="co-email">
              {(f) => (
                <Input
                  id={f.id}
                  type="email"
                  value={draft.email}
                  onChange={(e) => set('email')(e.target.value)}
                  autoComplete="email"
                  aria-describedby={f.describedBy}
                  invalid={f.invalid}
                />
              )}
            </FormField>
            <FormField label="Nome ENS" required error={errors.ensName} id="co-ensName">
              {(f) => (
                <div className="flex gap-2">
                  <span className="flex h-10 items-center rounded-md border border-primary/70 bg-surface px-3 text-[15px]" aria-hidden="true">
                    .eth
                  </span>
                  <Input
                    id={f.id}
                    value={draft.ensName}
                    onChange={(e) => set('ensName')(e.target.value)}
                    aria-describedby={f.describedBy}
                    invalid={f.invalid}
                    className="max-w-[220px]"
                  />
                </div>
              )}
            </FormField>
          </div>
          <label className="mt-6 flex items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              className="size-4 rounded-full accent-primary"
              checked={draft.useOtherWallet}
              onChange={(e) => set('useOtherWallet')(e.target.checked)}
            />
            Usar outra carteira?
          </label>
          <FormField label="Observação do colecionador (opcional)" id="co-note" className="mt-5 max-w-[350px]">
            {(f) => <Textarea id={f.id} value={draft.note} onChange={(e) => set('note')(e.target.value)} aria-describedby={f.describedBy} maxLength={500} />}
          </FormField>
        </section>

        <aside aria-labelledby="summary-heading" className="lg:pt-0">
          <h2 id="summary-heading" className="text-[18px] font-bold">
            Seus NFTs
          </h2>
          <div className="mt-2 flex justify-between border-b border-primary/50 pb-2 text-[15px]">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          <ul className="mt-3 space-y-2" data-testid="checkout-items">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-[6px] bg-surface p-2 pr-3">
                <img src={item.image.replace('.webp', '-sm.webp')} alt="" width={60} height={60} className="size-[60px] rounded-[6px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold">{item.name}</p>
                  <p className="text-[13px] text-primary-light">ID do token: #{item.tokenId}</p>
                </div>
                <span className="text-[14px] text-secondary">(x {item.quantity})</span>
                <span className="text-[17px] font-bold text-primary-light">{formatEth(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center text-[14px]">
            Tem um código promocional?{' '}
            <Link to="/cart" className="text-primary-light hover:underline">
              Aplique aqui
            </Link>
          </p>
          <QuoteSummary
            quote={quote.data}
            loading={quote.isPending}
            refreshing={quote.isFetching}
            error={quote.error}
            onRetry={() => void quote.refetch()}
            issues={quote.data?.issues ?? []}
          />

          <div className="mt-6">
            <WalletPicker
              wallets={wallets.data}
              walletId={walletId}
              onWalletChange={onPickWallet}
              provider={provider}
              onProviderChange={chooseProvider}
              network={network}
              onNetworkChange={chooseNetwork}
              connection={connection}
              onConnectionChange={setConnection}
            />
          </div>

          <Button type="submit" size="lg" block className="mt-6 h-12 text-[16px]" disabled={!canReview} data-testid="review-order">
            Confirmar compra
          </Button>
          {!canReview && quote.data && (
            <p className="mt-2 text-center text-[12px] text-accent" aria-live="polite">
              {connection.status !== 'connected'
                ? 'Conecte a carteira para continuar.'
                : blockingIssues.length
                  ? 'Resolva os itens indisponíveis no carrinho.'
                  : quote.isFetching
                    ? 'Atualizando cotação…'
                    : ''}
            </p>
          )}
        </aside>
      </form>

      <Dialog open={review.open} onOpenChange={(open) => !createOrder.isPending && setReview((r) => ({ ...r, open }))}>
        <DialogContent className="max-w-[560px]" aria-describedby="review-desc">
          <DialogTitle className="text-[20px] font-bold">Revisar pedido</DialogTitle>
          <DialogDescription id="review-desc" className="mt-1 text-[13px] text-secondary">
            Confira os valores antes de confirmar. A cotação é revalidada no envio.
          </DialogDescription>
          {quote.data && (
            <div className="mt-4 space-y-3 text-[14px]">
              <ul className="divide-y divide-border rounded-md border border-border">
                {quote.data.lines.map((l) => (
                  <li key={`${l.nftId}-${l.editionId}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="truncate">
                      {l.name} <span className="text-secondary">× {l.quantity}</span>
                    </span>
                    <span className="font-bold text-primary-light">{formatEth(l.lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-1">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatEth(quote.data.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Desconto</dt>
                  <dd>{formatDiscount(quote.data.discount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Taxa de rede ({NETWORK_LABELS[network]})</dt>
                  <dd>{formatEth(quote.data.networkFee)}</dd>
                </div>
                <div className="flex justify-between border-t border-primary/50 pt-2 text-[16px] font-bold">
                  <dt>Total</dt>
                  <dd className="text-primary-light" data-testid="review-total">
                    {formatEth(quote.data.total)}
                  </dd>
                </div>
              </dl>
              <p className="text-secondary">
                Carteira: {PROVIDER_LABELS[provider]} · {connection.status === 'connected' ? connection.connection.address.slice(0, 8) + '…' : '—'} · Rede{' '}
                {NETWORK_LABELS[network]}
              </p>
            </div>
          )}
          {reviewStale && (
            <div role="alert" className="mt-4 rounded-md border border-primary bg-primary/10 px-3 py-2 text-[13px]" data-testid="quote-stale">
              <strong>A cotação mudou</strong> enquanto você revisava (preço ou disponibilidade). Os valores acima já estão atualizados — confirme novamente
              para prosseguir.
            </div>
          )}
          {createError && createError.code === 'QUOTE_OUTDATED' && !reviewStale && (
            <div role="alert" className="mt-4 rounded-md border border-primary bg-primary/10 px-3 py-2 text-[13px]" data-testid="quote-outdated">
              O servidor recusou a cotação anterior e enviou valores atualizados. Confirme novamente.
            </div>
          )}
          {createError && (createError.code === 'TIMEOUT' || createError.isNetwork) && (
            <div role="alert" className="mt-4 rounded-md border border-coral/60 bg-coral/10 px-3 py-2 text-[13px]" data-testid="order-timeout">
              A confirmação demorou mais que o esperado. Reenviar é seguro: a mesma chave de idempotência recupera o pedido já criado, sem duplicar a compra.
            </div>
          )}
          {createError && !['QUOTE_OUTDATED', 'TIMEOUT', 'NETWORK_ERROR'].includes(createError.code) && (
            <p role="alert" className="mt-4 text-[13px] text-coral">
              {createError.message}
            </p>
          )}
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setReview({ open: false, hash: null })} disabled={createOrder.isPending}>
              Voltar
            </Button>
            {reviewStale ? (
              <Button onClick={() => setReview({ open: true, hash: quoteHash })} data-testid="accept-new-quote">
                Aceitar novos valores
              </Button>
            ) : (
              <Button
                onClick={confirm}
                loading={createOrder.isPending}
                loadingText="Enviando pedido…"
                disabled={canResend ? false : !quote.data || quote.isFetching}
                data-testid="confirm-order"
                className={cn(createOrder.isPending && 'pointer-events-none')}
              >
                {canResend ? 'Reenviar pedido' : 'Confirmar pedido'}
              </Button>
            )}
          </DialogFooter>
          <p className="sr-only" aria-live="polite">
            {user ? `Pedido em nome de ${user.displayName}.` : ''}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function QuoteSummary({
  quote,
  loading,
  refreshing,
  error,
  onRetry,
  issues,
}: {
  quote: Quote | undefined
  loading: boolean
  refreshing: boolean
  error: unknown
  onRetry: () => void
  issues: Quote['issues']
}) {
  const row = (label: string, value: string | undefined, bold = false) => (
    <div className={cn('flex items-baseline justify-between text-[16px]', bold && 'text-[18px] font-bold')}>
      <dt>{label}</dt>
      <dd className={bold ? 'text-primary-light' : ''}>{loading ? <Skeleton className="inline-block h-5 w-24 align-middle" /> : (value ?? '—')}</dd>
    </div>
  )
  return (
    <div className="mt-4" data-testid="quote-summary" aria-busy={refreshing || undefined}>
      <dl className="space-y-2">
        {row('Subtotal', quote && formatEth(quote.subtotal))}
        {row('Desconto do lançamento', quote && formatDiscount(quote.discount))}
        {row('Taxa de rede', quote && formatEth(quote.networkFee))}
        <p className="text-right text-[12px] text-primary-light">Taxa estimada{refreshing && !loading ? ' · atualizando…' : ''}</p>
        <div className="border-t border-primary/50 pt-3">{row('Total', quote && formatEth(quote.total), true)}</div>
      </dl>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-coral">
          {toApiError(error).message}{' '}
          <button type="button" className="underline" onClick={onRetry}>
            Tentar novamente
          </button>
        </p>
      ) : null}
      {issues.map((i) => (
        <p key={i.type + (i.nftId ?? '')} role="status" className="mt-2 text-[13px] text-primary-light" data-testid="quote-issue">
          {i.message}
        </p>
      ))}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div
      className="container-page grid gap-10 pt-7 lg:grid-cols-[1fr_405px]"
      aria-busy="true"
      aria-label="Carregando pagamento"
      data-testid="checkout-skeleton"
    >
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-[6px]" />
        ))}
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
