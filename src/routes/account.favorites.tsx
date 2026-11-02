import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueries } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { nftDetailOptions } from '@/features/catalog/hooks'
import { NftCard, NftCardSkeleton } from '@/features/catalog/components/nft-card'
import { useAddToCart } from '@/features/cart/hooks'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState } from '@/components/ui/state-blocks'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/account/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const addToCart = useAddToCart()
  useDocumentTitle('Lista de interesse — Kurio')
  const ids = favorites.data?.ids ?? []
  const details = useQueries({ queries: ids.map((id) => nftDetailOptions(id)) })

  if (favorites.isError) return <ErrorState error={favorites.error} onRetry={() => void favorites.refetch()} retrying={favorites.isFetching} />
  return (
    <div className="lg:pl-7">
      <h1 className="text-[17px] font-bold">Lista de interesse</h1>
      <p className="mt-1 text-[13px] text-secondary">Seus NFTs favoritos ficam salvos na sua conta.</p>
      {favorites.isPending ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <NftCardSkeleton key={i} />
          ))}
        </div>
      ) : ids.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Heart className="size-9" aria-hidden="true" />}
          title="Nenhum favorito ainda"
          description="Toque no coração de um NFT para salvá-lo aqui."
          action={
            <Button asChild>
              <Link to="/">Explorar catálogo</Link>
            </Button>
          }
        />
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3" data-testid="favorites-grid">
          {ids.map((id, i) => {
            const q = details[i]
            return (
              <li key={id}>
                {q?.data ? (
                  <NftCard
                    nft={q.data}
                    favorite
                    onToggleFavorite={(nft) => toggle.mutate({ nftId: nft.id, next: false, name: nft.name })}
                    onQuickAdd={(nft) => addToCart.mutate({ nftId: nft.id, editionId: '1of50', quantity: 1, name: nft.name })}
                  />
                ) : q?.isError ? (
                  <ErrorState compact error={q.error} onRetry={() => void q.refetch()} />
                ) : (
                  <NftCardSkeleton />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
