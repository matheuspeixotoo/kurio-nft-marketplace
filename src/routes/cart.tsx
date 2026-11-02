import { useState, type FormEvent } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Trash2 } from 'lucide-react'
import type { Cart, CartItem } from '@/types/api'
import { cn } from '@/lib/utils'
import { formatDiscount, formatEth } from '@/lib/eth'
import { toApiError } from '@/lib/api/errors'
import { useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from '@/features/cart/hooks'
import { useQuote } from '@/features/checkout/hooks'
import { useRelated } from '@/features/catalog/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { RelatedSection } from './nft.$id'
import { Breadcrumb } from '@/components/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState, ErrorState } from '@/components/ui/state-blocks'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  const cart = useCart()
  useDocumentTitle('Carrinho de NFTs — Kurio')
  const related = useRelated(cart.data?.items[0]?.nftId ?? 'emerald-ape-042')

  return (
    <>
      <div className="container-page pt-5 lg:pt-7">
        <div className="hidden lg:block">
          <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]} />
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <Link to="/" className="flex size-9 items-center justify-center rounded-full bg-surface-raised text-primary-light" aria-label="Voltar">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="flex-1 text-center text-[20px] font-bold">Carrinho de NFTs</h1>
          <span className="size-9" aria-hidden="true" />
        </div>
        <h1 className="sr-only lg:not-sr-only lg:mt-3 lg:text-[15px] lg:font-bold">NFTs</h1>

        {cart.isError && !cart.data ? (
          <ErrorState className="mt-6" error={cart.error} onRetry={() => void cart.refetch()} retrying={cart.isFetching} />
        ) : cart.isPending ? (
          <CartSkeleton />
        ) : cart.data.items.length === 0 ? (
          <EmptyState
            className="mt-6"
            title="Seu carrinho está vazio"
            description="Explore o catálogo e adicione NFTs para continuar."
            action={
              <Button asChild>
                <Link to="/">Explorar NFTs</Link>
              </Button>
            }
          />
        ) : (
          <CartContent cart={cart.data} />
        )}
      </div>
      <RelatedSection title="Colecionadores também viram" related={related} />
    </>
  )
}

function CartContent({ cart }: { cart: Cart }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const quote = useQuote(cart, cart.items[0]?.network ?? 'ethereum')
  const changed = cart.items.filter((i) => i.priceChangedFrom || i.status !== 'available' || i.quantity > i.available)

  const goCheckout = () => {
    if (!isAuthenticated) {
      void navigate({ to: '/login', search: { redirect: '/checkout' } })
      return
    }
    void navigate({ to: '/checkout' })
  }

  return (
    <div className="mt-4 grid gap-8 min-w-0 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-12">
      <section aria-label="Itens do carrinho" className="min-w-0">
        {changed.length > 0 && (
          <div
            role="status"
            className="mb-4 rounded-md border border-primary/60 bg-primary/10 px-4 py-3 text-[13px] text-foreground"
            data-testid="cart-change-notice"
          >
            <strong>Atualização em tempo real:</strong> {changed.map((i) => i.name).join(', ')} {changed.length === 1 ? 'teve' : 'tiveram'} preço ou
            disponibilidade alterados. O resumo já reflete os novos valores.
          </div>
        )}
        <div className="hidden grid-cols-[1fr_120px_140px_120px_48px] gap-4 border-b border-primary/50 pb-3 text-[15px] lg:grid">
          <span className="sr-only">Item</span>
          <span>Preço</span>
          <span className="text-center">Edições</span>
          <span>Total</span>
          <span className="sr-only">Ações</span>
        </div>
        <ul className="mt-3 space-y-3">
          {cart.items.map((item) => (
            <CartRow
              key={item.id}
              item={item}
              onQuantity={(q) => updateItem.mutate({ itemId: item.id, quantity: q })}
              onRemove={() => removeItem.mutate({ itemId: item.id, name: item.name })}
              busy={updateItem.isPending && updateItem.variables?.itemId === item.id}
              removing={removeItem.isPending && removeItem.variables?.itemId === item.id}
            />
          ))}
        </ul>
      </section>

      <aside aria-labelledby="summary-heading" className="rounded-[16px] bg-surface p-5 lg:rounded-none lg:bg-transparent lg:p-0" data-testid="cart-summary">
        <h2 id="summary-heading" className="hidden border-b border-primary/50 pb-3 text-[17px] font-bold lg:block">
          Resumo da carteira
        </h2>
        <CouponForm cart={cart} />
        <dl className="mt-5 space-y-3 text-[16px]">
          <SummaryRow label="Subtotal" value={quote.data ? formatEth(quote.data.subtotal) : undefined} loading={quote.isPending} />
          <SummaryRow label="Desconto do lançamento" value={quote.data ? formatDiscount(quote.data.discount) : undefined} loading={quote.isPending} />
          <SummaryRow label="Taxa de rede" value={quote.data ? formatEth(quote.data.networkFee) : undefined} loading={quote.isPending} hint="Taxa estimada" />
          <div className="flex items-baseline justify-between border-t border-primary/50 pt-4 text-[18px] font-bold">
            <dt>Total</dt>
            <dd className="text-primary-light" data-testid="cart-total">
              {quote.isPending ? <Skeleton className="inline-block h-6 w-28 align-middle" /> : quote.data ? formatEth(quote.data.total) : '—'}
            </dd>
          </div>
        </dl>
        {quote.isError && (
          <p role="alert" className="mt-3 text-[13px] text-coral">
            {toApiError(quote.error).message}{' '}
            <button type="button" className="underline" onClick={() => void quote.refetch()}>
              Tentar novamente
            </button>
          </p>
        )}
        {quote.data?.issues.map((issue) => (
          <p key={issue.type + (issue.nftId ?? '')} role="status" className="mt-3 text-[13px] text-primary-light">
            {issue.message}
          </p>
        ))}
        <Button
          size="lg"
          block
          className="mt-5 h-12 text-[16px] lg:rounded-md"
          onClick={goCheckout}
          disabled={!quote.data || quote.data.lines.length === 0}
          data-testid="checkout-button"
        >
          Conectar e finalizar
        </Button>
        <Link to="/" className="mt-4 block text-center text-[15px] text-primary-light hover:underline">
          Continuar explorando
        </Link>
      </aside>
    </div>
  )
}

function SummaryRow({ label, value, loading, hint }: { label: string; value?: string; loading?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-foreground">{label}</dt>
        <dd className="text-foreground">{loading ? <Skeleton className="inline-block h-5 w-24 align-middle" /> : (value ?? '—')}</dd>
      </div>
      {hint && <span className="self-end text-[12px] text-primary-light">{hint}</span>}
    </div>
  )
}

function CouponForm({ cart }: { cart: Cart }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const error = apply.isError ? toApiError(apply.error) : null
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    apply.mutate(code.trim(), { onSuccess: () => setCode('') })
  }
  return (
    <form onSubmit={onSubmit} className="mt-4" aria-label="Código promocional">
      <label htmlFor="coupon" className="hidden text-[15px] font-bold lg:block">
        Código promocional
      </label>
      <div className="mt-2 flex">
        <Input
          id="coupon"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código promocional..."
          className="h-10 rounded-r-none border-r-0 text-[13px] lg:rounded-r-none"
          invalid={!!error}
          aria-describedby={error ? 'coupon-error' : cart.couponCode ? 'coupon-applied' : undefined}
          autoComplete="off"
          data-testid="coupon-input"
        />
        <Button type="submit" className="h-10 rounded-l-none px-4 text-[15px]" loading={apply.isPending} loadingText="…" data-testid="coupon-apply">
          Aplicar
        </Button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="mt-2 text-[13px] text-coral" data-testid="coupon-error">
          {error.fieldErrors.code ?? error.message}
        </p>
      )}
      {cart.couponCode && (
        <p id="coupon-applied" className="mt-2 flex items-center justify-between text-[13px] text-success" data-testid="coupon-applied">
          Cupom <strong className="mx-1">{cart.couponCode}</strong> aplicado.
          <button type="button" className="text-secondary underline-offset-2 hover:underline" onClick={() => remove.mutate()} disabled={remove.isPending}>
            Remover
          </button>
        </p>
      )}
    </form>
  )
}

function CartRow({
  item,
  onQuantity,
  onRemove,
  busy,
  removing,
}: {
  item: CartItem
  onQuantity: (q: number) => void
  onRemove: () => void
  busy: boolean
  removing: boolean
}) {
  const max = Math.min(item.available, item.maxPerOrder)
  const unavailable = item.status !== 'available' || item.available <= 0
  return (
    <li
      className={cn(
        'rounded-[12px] bg-surface p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_110px_120px_110px_40px] lg:items-center lg:gap-4 lg:rounded-[6px] lg:px-0 lg:py-3',
        removing && 'opacity-50',
      )}
      data-testid="cart-item"
      data-nft-id={item.nftId}
    >
      <div className="flex gap-3 lg:pl-0">
        <Link to="/nft/$id" params={{ id: item.nftId }} className="shrink-0">
          <img
            src={item.image.replace('.webp', '-sm.webp')}
            alt=""
            width={100}
            height={100}
            loading="lazy"
            className="size-[100px] rounded-[8px] object-cover lg:size-[70px]"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-bold">
            <Link to="/nft/$id" params={{ id: item.nftId }} className="hover:text-primary-light">
              {item.name}
            </Link>
          </h3>
          <p className="text-[14px] text-primary-light">Edição: {item.editionLabel}</p>
          <p className="hidden text-[14px] text-primary-light lg:block">ID do token: #{item.tokenId}</p>
          {item.priceChangedFrom && (
            <p className="text-[12px] text-primary-light" data-testid="price-changed">
              Preço atualizado: de {formatEth(item.priceChangedFrom)} para {formatEth(item.unitPrice)}
            </p>
          )}
          {unavailable && <p className="text-[12px] text-coral">Edição esgotada — remova o item para continuar.</p>}
          {!unavailable && item.quantity > max && <p className="text-[12px] text-coral">Só restam {max} unidades.</p>}
          <div className="mt-2 flex items-center justify-between lg:hidden">
            <p className="text-[18px] font-bold text-primary-light">{formatEth(item.lineTotal)}</p>
            <div className="flex items-center gap-2">
              <QuantityStepper
                value={item.quantity}
                min={0}
                max={Math.max(max, item.quantity)}
                onChange={onQuantity}
                disabled={busy || unavailable}
                label={`Quantidade de ${item.name}`}
              />
              <button
                type="button"
                onClick={onRemove}
                className="flex size-8 items-center justify-center rounded-full text-primary-light hover:bg-surface-raised"
                aria-label={`Remover ${item.name}`}
                data-testid="remove-item"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="hidden text-[17px] font-bold text-primary-light lg:block">{formatEth(item.unitPrice)}</p>
      <div className="hidden justify-center lg:flex">
        <QuantityStepper
          value={item.quantity}
          min={0}
          max={Math.max(max, item.quantity)}
          onChange={onQuantity}
          disabled={busy || unavailable}
          label={`Quantidade de ${item.name}`}
        />
      </div>
      <p className="hidden text-[17px] font-bold text-primary-light lg:block" data-testid="line-total">
        {formatEth(item.lineTotal)}
      </p>
      <button
        type="button"
        onClick={onRemove}
        className="hidden size-10 items-center justify-center rounded-md text-primary-light hover:bg-surface-raised lg:flex"
        aria-label={`Remover ${item.name}`}
        data-testid="remove-item"
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </button>
    </li>
  )
}

function CartSkeleton() {
  return (
    <div
      className="mt-4 grid gap-8 min-w-0 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-12"
      aria-busy="true"
      aria-label="Carregando carrinho"
      data-testid="cart-skeleton"
    >
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[124px] rounded-[12px] lg:h-[94px]" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
