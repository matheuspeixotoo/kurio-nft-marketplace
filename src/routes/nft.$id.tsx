import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Heart, Mail, ShoppingCart, Star, ZoomIn } from 'lucide-react'
import { LinkedinGlyph as Linkedin, TwitterGlyph as Twitter } from '@/components/icons'
import type { Edition, NftDetail } from '@/types/api'
import { cn } from '@/lib/utils'
import { formatEth } from '@/lib/eth'
import { toApiError } from '@/lib/api/errors'
import { useNft, useRelated } from '@/features/catalog/hooks'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { useAddToCart, useCart } from '@/features/cart/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { useRealtimeSubscription } from '@/features/realtime/realtime-provider'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { NETWORK_LABELS } from '@/lib/networks'
import { Breadcrumb } from '@/components/breadcrumb'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Skeleton, SkeletonText } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/misc'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/state-blocks'
import { NotFoundPage } from '@/components/not-found'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/nft/$id')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { id } = Route.useParams()
  const nft = useNft(id)
  useRealtimeSubscription('nft', id)
  useDocumentTitle(nft.data ? `${nft.data.name} — Kurio` : 'NFT — Kurio')

  if (nft.isPending) return <DetailSkeleton />
  if (nft.isError) {
    const e = toApiError(nft.error)
    if (e.status === 404) return <NotFoundPage title="NFT não encontrado" description="Este NFT não existe ou foi removido do catálogo." />
    return (
      <div className="container-page py-10">
        <ErrorState error={nft.error} onRetry={() => void nft.refetch()} retrying={nft.isFetching} />
      </div>
    )
  }
  return <DetailContent nft={nft.data} isRefreshing={nft.isFetching} />
}

function DetailContent({ nft, isRefreshing }: { nft: NftDetail; isRefreshing: boolean }) {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const cart = useCart()
  const related = useRelated(nft.id)

  const purchasable = nft.editions.filter((e) => e.status === 'available')
  const initialEdition = nft.editions.find((e) => e.id === nft.defaultEditionId && e.status === 'available') ?? purchasable[0] ?? nft.editions[0]!
  const [editionId, setEditionId] = useState(initialEdition.id)
  const edition = nft.editions.find((e) => e.id === editionId) ?? initialEdition
  const inCart = cart.data?.items.find((i) => i.nftId === nft.id && i.editionId === edition.id)?.quantity ?? 0
  const limit = Math.max(0, Math.min(edition.available, edition.maxPerOrder) - inCart)
  const [quantity, setQuantity] = useState(1)
  const [gallery, setGallery] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [priceFlash, setPriceFlash] = useState(false)

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, limit)))
  }, [limit])
  useEffect(() => {
    setPriceFlash(true)
    const t = setTimeout(() => setPriceFlash(false), 1500)
    return () => clearTimeout(t)
  }, [edition.price, edition.available])

  const isFav = favorites.data?.ids.includes(nft.id) ?? false
  const canBuy = edition.status === 'available' && limit > 0
  const statusText = useMemo(() => {
    if (edition.status === 'unavailable') return 'Edição indisponível para compra.'
    if (edition.status === 'sold_out') return 'Edição esgotada.'
    if (limit <= 0) return `Você já tem o máximo desta edição no carrinho (${edition.maxPerOrder}).`
    const parts = [`${edition.available} disponíveis`, `limite de ${edition.maxPerOrder} por pedido`]
    if (inCart) parts.push(`${inCart} no carrinho`)
    return parts.join(' · ')
  }, [edition, limit, inCart])

  const onFavorite = () => {
    if (authLoading) return
    if (!isAuthenticated) {
      void navigate({ to: '/login', search: { redirect: `/nft/${nft.id}` } })
      return
    }
    toggleFavorite.mutate({ nftId: nft.id, next: !isFav, name: nft.name })
  }
  const onBuy = () =>
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity, name: nft.name, silent: true },
      {
        onSuccess: () =>
          toast({
            title: 'Adicionado ao carrinho',
            description: `${nft.name} (${edition.label}) × ${quantity}`,
            variant: 'success',
            action: { label: 'Ver carrinho', onClick: () => void navigate({ to: '/cart' }) },
          }),
      },
    )

  return (
    <>
      {/* ---------- Mobile (Figma "Mobile / Detalhes do NFT") ---------- */}
      <div className="lg:hidden">
        <div className="relative">
          <img
            src={nft.gallery[gallery] ?? nft.image}
            alt={nft.imageAlt}
            width={800}
            height={800}
            fetchPriority="high"
            decoding="async"
            className="mx-auto aspect-square w-full max-w-[520px] rounded-b-[24px] object-cover"
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? window.history.back() : navigate({ to: '/' }))}
              className="flex size-9 items-center justify-center rounded-full bg-ink/80 text-primary-light ring-1 ring-primary/40"
              aria-label="Voltar"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onFavorite}
              className="flex size-9 items-center justify-center rounded-full bg-ink/80 text-primary-light ring-1 ring-primary/40"
              aria-pressed={isFav}
              aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar'}
              data-testid="favorite-button-mobile"
            >
              <Heart className={cn('size-5', isFav && 'fill-primary-light')} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="container-page pb-40 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[22px] font-bold leading-7">{nft.name}</h1>
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-primary px-2 py-1 text-[13px] text-foreground"
              aria-label={`Avaliação ${nft.rating} de 5, ${nft.reviewsCount} avaliações`}
            >
              <Star className="size-3.5 fill-primary-light text-primary-light" aria-hidden="true" />
              {nft.rating.toFixed(1)}({nft.reviewsCount})
            </span>
          </div>
          <p className="mt-3 text-[15px] leading-6 text-secondary">{nft.description}</p>
          <EditionPicker editions={nft.editions} value={edition.id} onChange={setEditionId} className="mt-4" />
          <p className="mt-2 text-[12px] text-accent" aria-live="polite">
            {statusText}
          </p>
          <Meta nft={nft} className="mt-4" />
        </div>
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 px-4 pb-3 pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-[640px] items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold">Qtd.</span>
              <QuantityStepper value={quantity} min={1} max={Math.max(1, limit)} onChange={setQuantity} disabled={!canBuy} />
            </div>
            <p className={cn('text-[20px] font-bold text-primary-light transition-colors', priceFlash && 'text-foreground')} data-testid="detail-price">
              {formatEth(edition.price)}
            </p>
          </div>
          <div className="mx-auto mt-3 flex max-w-[640px] gap-3">
            <Button
              size="xl"
              className="h-14 flex-1 rounded-full text-[16px]"
              onClick={onBuy}
              disabled={!canBuy}
              loading={addToCart.isPending}
              loadingText="Adicionando…"
              data-testid="buy-button-mobile"
            >
              {canBuy ? 'Comprar NFT' : edition.status === 'sold_out' ? 'Esgotado' : 'Indisponível'}
            </Button>
            <Button asChild variant="outline" className="size-14 rounded-full" aria-label="Ir para o carrinho">
              <Link to="/cart">
                <ShoppingCart className="size-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ---------- Desktop (Figma "Desktop / Detalhes do NFT") ---------- */}
      <div className="container-page hidden pt-7 lg:block">
        <Breadcrumb items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: nft.name }]} />
        <div className="mt-4 grid grid-cols-[100px_440px_1fr] gap-6">
          <ul className="flex flex-col gap-4" aria-label="Galeria">
            {nft.gallery.map((src, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setGallery(i)}
                  aria-pressed={gallery === i}
                  aria-label={`Imagem ${i + 1} de ${nft.gallery.length}`}
                  className={cn('block overflow-hidden rounded-[8px] ring-2 ring-transparent transition', gallery === i && 'ring-primary')}
                >
                  <img
                    src={src.replace('.webp', '-sm.webp')}
                    alt=""
                    width={100}
                    height={100}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-[100px] object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="relative rounded-[6px] bg-surface p-4">
            <img
              src={nft.gallery[gallery] ?? nft.image}
              alt={nft.imageAlt}
              width={800}
              height={800}
              fetchPriority="high"
              decoding="async"
              className="aspect-square w-full rounded-[16px] object-cover"
            />
            <button
              type="button"
              onClick={() => setZoom(true)}
              className="absolute right-7 top-7 flex size-8 items-center justify-center rounded-full border border-foreground/70 bg-ink/40 text-foreground hover:bg-ink"
              aria-label="Ampliar imagem"
            >
              <ZoomIn className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="min-w-0 pl-2">
            <h1 className="text-[28px] font-bold leading-9">{nft.name}</h1>
            <div className="mt-2 flex items-center justify-between gap-4 border-b border-primary/50 pb-2">
              <p
                className={cn('whitespace-nowrap text-[24px] font-bold text-primary-light transition-colors', priceFlash && 'text-foreground')}
                data-testid="detail-price"
              >
                {formatEth(edition.price)}
                {isRefreshing && <span className="sr-only"> (atualizando)</span>}
              </p>
              <p className="flex items-center gap-1 text-[15px] text-foreground" aria-label={`Avaliação ${nft.rating} de 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-primary-light text-primary-light" aria-hidden="true" />
                ))}
                <span className="ml-1">{nft.reviewsCount} avaliações de colecionadores</span>
              </p>
            </div>
            <p className="mt-3 text-[15px] font-bold">Sobre este NFT:</p>
            <p className="mt-2 text-[14px] leading-6 text-secondary">{nft.description}</p>
            <EditionPicker editions={nft.editions} value={edition.id} onChange={setEditionId} className="mt-4" />
            <div className="mt-5 flex items-center justify-between gap-4">
              <div>
                <QuantityStepper size="lg" value={quantity} min={1} max={Math.max(1, limit)} onChange={setQuantity} disabled={!canBuy} />
                <p className="mt-2 text-[12px] text-accent" aria-live="polite" data-testid="availability-text">
                  {statusText}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  className="h-10 w-[116px] text-[15px] uppercase"
                  onClick={onBuy}
                  disabled={!canBuy}
                  loading={addToCart.isPending}
                  loadingText="…"
                  data-testid="buy-button"
                >
                  {canBuy ? 'Comprar' : 'Esgotado'}
                </Button>
                <Button variant="outline" className="h-10 px-4 text-[15px]" onClick={onFavorite} aria-pressed={isFav} data-testid="favorite-button">
                  <Heart className={cn('size-4', isFav && 'fill-primary-light')} aria-hidden="true" />
                  {isFav ? 'Favoritado' : 'Favoritar'}
                </Button>
              </div>
            </div>
            <Meta nft={nft} className="mt-5" />
            <p className="mt-4 flex items-center gap-3 text-[15px] font-bold">
              Compartilhar este NFT:
              <ShareButton label="LinkedIn" Icon={Linkedin} />
              <ShareButton label="E-mail" Icon={Mail} />
              <ShareButton label="Twitter" Icon={Twitter} />
            </p>
          </div>
        </div>

        <Tabs defaultValue="details" className="mt-20">
          <TabsList className="border-b border-primary/50">
            <TabsTrigger value="details" className="text-[16px]">
              Detalhes do NFT
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-[16px]">
              Avaliações de colecionadores ({nft.reviewsCount})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-5 text-[14px] leading-6 text-secondary">
            {nft.about.split('\n\n').map((p, i) => (
              <p key={i} className="mb-5">
                {p}
              </p>
            ))}
            <dl className="space-y-3">
              <div>
                <dt className="font-bold text-foreground">Rede:</dt>
                <dd>Cunhado na {NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS.</dd>
              </div>
              <div>
                <dt className="font-bold text-foreground">Contrato:</dt>
                <dd>Direitos autorais do criador: {nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</dd>
              </div>
              <div>
                <dt className="font-bold text-foreground">Direitos autorais:</dt>
                <dd>
                  {nft.contract.slice(0, 6)}...{nft.contract.slice(-4)} • Contrato inteligente {nft.standard} verificado.
                </dd>
              </div>
            </dl>
          </TabsContent>
          <TabsContent value="reviews" className="mt-5 text-[14px] text-secondary">
            <p>As avaliações de colecionadores são um recurso editorial fora do escopo desta entrega.</p>
          </TabsContent>
        </Tabs>
      </div>

      <RelatedSection title="Mais desta coleção" related={related} />

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-[900px] border-b-0 bg-ink p-2" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{nft.name} ampliado</DialogTitle>
          <DialogDescription className="sr-only">Imagem em tamanho grande.</DialogDescription>
          <img
            src={nft.gallery[gallery] ?? nft.image}
            alt={nft.imageAlt}
            width={1254}
            height={1254}
            className="mx-auto aspect-square max-h-[80dvh] w-auto rounded-[12px] object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

function ShareButton({ label, Icon }: { label: string; Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }> }) {
  return (
    <button
      type="button"
      className="text-foreground hover:text-primary-light"
      aria-label={`Compartilhar por ${label} (simulado)`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href)
          toast({ title: 'Link copiado', description: `O compartilhamento por ${label} é simulado; o link do NFT foi copiado.`, variant: 'default' })
        } catch {
          toast({ title: 'Compartilhamento simulado', description: `Integração com ${label} fora do escopo.`, variant: 'default' })
        }
      }}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}

function EditionPicker({ editions, value, onChange, className }: { editions: Edition[]; value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="text-[15px] font-bold">Edição:</legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Edição">
        {editions.map((e) => {
          const selected = e.id === value
          const disabled = e.status !== 'available'
          return (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={disabled || undefined}
              onClick={() => onChange(e.id)}
              title={disabled ? (e.status === 'sold_out' ? 'Esgotada' : 'Indisponível') : `${e.available} disponíveis`}
              className={cn(
                'rounded-full border px-3 py-0.5 text-[13px] transition-colors',
                selected ? 'border-primary-light font-bold text-primary-light' : 'border-secondary/60 text-foreground hover:border-primary',
                disabled && 'border-dashed text-accent line-through decoration-accent/70 opacity-70',
              )}
              data-testid={`edition-${e.id}`}
            >
              {e.label}
              {disabled && <span className="sr-only"> ({e.status === 'sold_out' ? 'esgotada' : 'indisponível'})</span>}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function Meta({ nft, className }: { nft: NftDetail; className?: string }) {
  return (
    <dl className={cn('space-y-2 text-[15px] text-secondary', className)}>
      <div className="flex gap-1">
        <dt>ID do token:</dt>
        <dd className="text-primary-light">#{nft.tokenId}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Coleção:</dt>
        <dd className="text-primary-light">{nft.collection}</dd>
      </div>
      <div className="flex gap-1">
        <dt>Atributos:</dt>
        <dd className="text-primary-light">{nft.attributes.join(', ')}</dd>
      </div>
    </dl>
  )
}

export function RelatedSection({ title, related }: { title: string; related: ReturnType<typeof useRelated> }) {
  const [page, setPage] = useState(0)
  const perPage = 5
  const items = related.data ?? []
  const pages = Math.max(1, Math.ceil(items.length / perPage))
  const visible = items.slice(page * perPage, page * perPage + perPage)
  return (
    <section className="container-page mt-12 lg:mt-20" aria-labelledby="related-heading">
      <h2 id="related-heading" className="border-b border-primary/50 pb-3 text-[17px] font-bold text-primary-light">
        {title}
      </h2>
      {related.isError ? (
        <ErrorState compact className="mt-6" error={related.error} onRetry={() => void related.refetch()} />
      ) : (
        <>
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:gap-5 lg:overflow-visible" data-testid="related-grid">
            {related.isPending
              ? Array.from({ length: 5 }).map((_, i) => <NftCardSkeleton key={i} className="w-[180px] shrink-0 lg:w-auto" />)
              : visible.map((n) => <NftCard key={n.id} nft={n} className="w-[180px] shrink-0 lg:w-auto" />)}
          </div>
          {pages > 1 && (
            <div className="mt-6 hidden justify-center gap-3 lg:flex" role="tablist" aria-label="Páginas de itens relacionados">
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === page}
                  aria-label={`Página ${i + 1}`}
                  onClick={() => setPage(i)}
                  className={cn('size-3 rounded-full border border-primary', i === page ? 'bg-primary' : 'bg-transparent')}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="container-page pt-7" aria-busy="true" aria-label="Carregando NFT">
      <Skeleton className="h-5 w-40" />
      <div className="mt-4 grid gap-6 lg:grid-cols-[100px_440px_1fr]">
        <div className="hidden flex-col gap-4 lg:flex">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="size-[100px] rounded-[8px]" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full rounded-[6px]" />
        <div>
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="mt-3 h-8 w-32" />
          <SkeletonText lines={4} className="mt-6" />
          <div className="mt-6 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-14 rounded-full" />
            ))}
          </div>
          <Skeleton className="mt-6 h-10 w-full" />
        </div>
      </div>
    </div>
  )
}
