import { Link } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'
import type { NftSummary } from '@/types/api'
import { cn } from '@/lib/utils'
import { formatEth } from '@/lib/eth'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/misc'

interface NftCardProps {
  nft: NftSummary
  favorite?: boolean
  onToggleFavorite?: (nft: NftSummary) => void
  onQuickAdd?: (nft: NftSummary) => void
  priority?: boolean
  className?: string
}

/** Catalog card (Figma "Products"): image inset on a dark card, name and amber price below. */
export function NftCard({ nft, favorite, onToggleFavorite, onQuickAdd, priority, className }: NftCardProps) {
  const soldOut = nft.available <= 0
  return (
    <article className={cn('group relative flex flex-col', className)} data-testid="nft-card" data-nft-id={nft.id}>
      <div className="relative rounded-[6px] bg-surface p-2.5 sm:p-4">
        <Link
          to="/nft/$id"
          params={{ id: nft.id }}
          className="block overflow-hidden rounded-[12px] sm:rounded-[16px]"
          aria-label={`${nft.name}, ${formatEth(nft.price)}`}
        >
          <img
            src={nft.image.replace('.webp', '-md.webp')}
            alt={nft.imageAlt}
            width={480}
            height={480}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : undefined}
            className={cn('aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]', soldOut && 'opacity-60 grayscale')}
          />
        </Link>
        {nft.badge === 'raro' && (
          <Badge variant="primary" className="absolute left-0 top-5 rounded-l-none px-3 py-1 text-[13px]">
            Raro
          </Badge>
        )}
        {soldOut && (
          <Badge variant="outline" className="absolute right-4 top-5 bg-ink/80">
            Esgotado
          </Badge>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          {onQuickAdd && (
            <button
              type="button"
              onClick={() => onQuickAdd(nft)}
              disabled={soldOut}
              className="pointer-events-auto flex size-9 items-center justify-center rounded-md bg-ink/90 text-foreground ring-1 ring-border-soft hover:text-primary-light disabled:opacity-50"
              aria-label={`Adicionar ${nft.name} ao carrinho`}
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
            </button>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(nft)}
              className="pointer-events-auto flex size-9 items-center justify-center rounded-md bg-ink/90 text-foreground ring-1 ring-border-soft hover:text-primary-light"
              aria-pressed={favorite}
              aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
              data-testid="favorite-toggle"
            >
              <Heart className={cn('size-4', favorite && 'fill-primary-light text-primary-light')} aria-hidden="true" />
            </button>
          )}
          <Link
            to="/nft/$id"
            params={{ id: nft.id }}
            className="pointer-events-auto flex size-9 items-center justify-center rounded-md bg-ink/90 text-foreground ring-1 ring-border-soft hover:text-primary-light"
            aria-label={`Ver detalhes de ${nft.name}`}
            tabIndex={-1}
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <h3 className="mt-3 truncate text-[15px] text-foreground">
        <Link to="/nft/$id" params={{ id: nft.id }} className="hover:text-primary-light">
          {nft.name}
        </Link>
      </h3>
      <p className="mt-1 flex items-baseline gap-2 text-[17px] font-bold text-primary-light">
        <span>{formatEth(nft.price)}</span>
        {nft.compareAtPrice && (
          <s className="text-[16px] font-normal text-accent">
            <span className="sr-only">de </span>
            {formatEth(nft.compareAtPrice)}
          </s>
        )}
      </p>
    </article>
  )
}

export function NftCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col', className)} aria-hidden="true" data-testid="nft-card-skeleton">
      <div className="rounded-[6px] bg-surface p-2.5 sm:p-4">
        <Skeleton className="aspect-square w-full rounded-[12px] sm:rounded-[16px]" />
      </div>
      <Skeleton className="mt-3 h-[22px] w-3/4" />
      <Skeleton className="mt-2 h-[25px] w-1/3" />
    </div>
  )
}
