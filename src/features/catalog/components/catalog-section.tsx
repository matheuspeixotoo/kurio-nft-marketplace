import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import type { NftSummary } from '@/types/api'
import { useCatalog } from '../hooks'
import { catalogSearchSchema, countActiveFilters, searchToQuery, SORT_IDS, SORT_LABELS, type CatalogSearch } from '../search-schema'
import { Filters } from './filters'
import { NftCard, NftCardSkeleton } from './nft-card'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackgroundRefresh, EmptyState, ErrorState } from '@/components/ui/state-blocks'
import { useFavorites, useToggleFavorite } from '@/features/favorites/hooks'
import { useAddToCart } from '@/features/cart/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { useHighlights } from '../hooks'
import { cn } from '@/lib/utils'

export function CatalogSection({ search }: { search: CatalogSearch }) {
  const navigate = useNavigate({ from: '/' })
  const query = searchToQuery(search)
  const catalog = useCatalog(query)
  const highlights = useHighlights()
  const { isAuthenticated } = useAuth()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [q, setQ] = useState(search.q ?? '')

  const update = (patch: Partial<CatalogSearch>, replace = false) =>
    navigate({ search: (prev) => catalogSearchSchema.parse({ ...prev, ...patch }), replace, resetScroll: false, hash: 'catalogo' })
  const clear = () => navigate({ search: (prev) => ({ q: prev.q, sort: prev.sort, tab: prev.tab }), resetScroll: false, hash: 'catalogo' })
  const clearAll = () => {
    setQ('')
    void navigate({ search: {}, resetScroll: false, hash: 'catalogo' })
  }

  const onToggleFavorite = (nft: NftSummary) => {
    if (!isAuthenticated) {
      void navigate({ to: '/login', search: { redirect: window.location.pathname + window.location.search } })
      return
    }
    const isFav = favorites.data?.ids.includes(nft.id) ?? false
    toggleFavorite.mutate({ nftId: nft.id, next: !isFav, name: nft.name })
  }
  const onQuickAdd = (nft: NftSummary) => addToCart.mutate({ nftId: nft.id, editionId: '1of50', quantity: 1, name: nft.name })

  const data = catalog.data
  const activeCount = countActiveFilters(search)
  const items = data?.items ?? []
  const showSkeleton = catalog.isPending || (catalog.isFetching && !data)

  return (
    <section id="catalogo" className="container-page mt-10 scroll-mt-24 lg:mt-20" aria-labelledby="catalogo-heading">
      <h2 id="catalogo-heading" className="sr-only">
        Catálogo de NFTs
      </h2>

      {/* Mobile search + filter trigger */}
      <form
        className="mb-5 flex gap-3 lg:hidden"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          void update({ q: q.trim() || undefined, page: undefined })
        }}
      >
        <label htmlFor="catalog-search" className="sr-only">
          Explorar coleções
        </label>
        <Input
          id="catalog-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Explorar coleções"
          className="h-12 rounded-[12px] border-border-soft bg-surface pl-4 text-[15px]"
          enterKeyHint="search"
        />
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="size-12 shrink-0 rounded-[12px]"
              aria-label={`Abrir filtros${activeCount ? `, ${activeCount} ativos` : ''}`}
              data-testid="open-filters"
            >
              <SlidersHorizontal className="size-5" aria-hidden="true" />
            </Button>
          </DialogTrigger>
          <DialogContent mode="bottom" className="p-0" aria-describedby={undefined}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
              <DialogTitle className="text-[18px] font-bold">Filtros</DialogTitle>
              <DialogDescription className="sr-only">Filtre por coleção, faixa de preço e rede.</DialogDescription>
              <Button size="sm" onClick={() => setFiltersOpen(false)}>
                Ver {data?.total ?? ''} resultados
              </Button>
            </div>
            <div className="p-3">
              <Filters
                search={search}
                facets={data?.facets}
                priceRange={data?.priceRange}
                onChange={(p) => void update(p)}
                onClear={() => void clear()}
                isLoading={catalog.isPending}
                idPrefix="drawer"
              />
            </div>
          </DialogContent>
        </Dialog>
      </form>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-10">
        <Filters
          search={search}
          facets={data?.facets}
          priceRange={data?.priceRange}
          onChange={(p) => void update(p)}
          onClear={() => void clear()}
          spotlight={highlights.data?.spotlight}
          idPrefix="sidebar"
          isLoading={catalog.isPending}
          className="hidden lg:flex"
        />

        <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-border pb-2 sm:flex-row sm:items-end sm:justify-between">
            <div role="group" aria-label="Seções do catálogo" className="flex flex-wrap items-end gap-x-5 gap-y-2">
              {(
                [
                  ['all', 'Todos os NFTs'],
                  ['new', 'Novos lançamentos'],
                  ['trending', 'Em alta'],
                ] as const
              ).map(([value, label]) => {
                const active = (search.tab ?? 'all') === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void update({ tab: value === 'all' ? undefined : value, page: undefined })}
                    className={cn(
                      'relative whitespace-nowrap pb-2 text-[15px] text-foreground transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-transparent hover:text-primary-light',
                      active && 'font-bold text-primary-light after:bg-primary',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-2 pb-2 text-[15px]">
              <label htmlFor="sort" className="whitespace-nowrap text-foreground">
                Ordenar por:
              </label>
              <Select
                value={search.sort ?? 'recent'}
                onValueChange={(v) => void update({ sort: v === 'recent' ? undefined : (v as CatalogSearch['sort']), page: undefined })}
              >
                <SelectTrigger
                  id="sort"
                  className="h-8 w-auto gap-1 border-0 bg-transparent px-1 text-[15px] focus-visible:outline-offset-2"
                  aria-label="Ordenar por"
                  data-testid="sort-select"
                >
                  <SelectValue />
                  <ChevronDown className="hidden" />
                </SelectTrigger>
                <SelectContent align="end" className="w-[220px]">
                  {SORT_IDS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SORT_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex min-h-6 flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-accent">
            {search.q && (
              <span>
                Busca por <strong className="text-foreground">“{search.q}”</strong>{' '}
                <button
                  type="button"
                  className="text-primary-light underline-offset-2 hover:underline"
                  onClick={() => {
                    setQ('')
                    void update({ q: undefined, page: undefined })
                  }}
                >
                  limpar
                </button>
              </span>
            )}
            {data && (
              <span data-testid="result-count">
                {data.total} {data.total === 1 ? 'resultado' : 'resultados'}
              </span>
            )}
            <BackgroundRefresh active={catalog.isFetching && !!data && !catalog.isPlaceholderData} />
            {catalog.isPlaceholderData && catalog.isFetching && (
              <span className="text-accent" role="status">
                Atualizando resultados…
              </span>
            )}
          </div>

          {catalog.isError && !data ? (
            <ErrorState error={catalog.error} onRetry={() => void catalog.refetch()} retrying={catalog.isFetching} className="mt-6" />
          ) : showSkeleton ? (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:gap-x-5 lg:gap-y-8" aria-busy="true" aria-label="Carregando catálogo">
              {Array.from({ length: 9 }).map((_, i) => (
                <NftCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="Nenhum NFT encontrado"
              description="Ajuste a busca ou remova filtros para ver mais resultados."
              action={
                activeCount || search.q || search.tab ? (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    Limpar busca e filtros
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div
              className={cn(
                'mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:gap-x-5 lg:gap-y-8',
                catalog.isPlaceholderData && 'opacity-70 transition-opacity',
              )}
              data-testid="catalog-grid"
            >
              {items.map((nft, i) => (
                <NftCard
                  key={nft.id}
                  nft={nft}
                  priority={i < 3}
                  favorite={favorites.data?.ids.includes(nft.id)}
                  onToggleFavorite={onToggleFavorite}
                  onQuickAdd={onQuickAdd}
                />
              ))}
            </div>
          )}

          {data && data.totalPages > 1 && (
            <Pagination
              className="mt-10"
              page={data.page}
              totalPages={data.totalPages}
              onChange={(page) => void update({ page: page === 1 ? undefined : page })}
            />
          )}
          {catalog.isError && data && (
            <p role="alert" className="mt-4 text-[13px] text-coral">
              Não foi possível atualizar os resultados. Exibindo a última versão carregada.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
