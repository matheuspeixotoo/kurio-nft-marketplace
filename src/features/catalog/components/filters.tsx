import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { CatalogPage, NftSummary } from '@/types/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { type CatalogSearch, toggleCsv } from '../search-schema'

interface FiltersProps {
  search: CatalogSearch
  facets: CatalogPage['facets'] | undefined
  priceRange: CatalogPage['priceRange'] | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
  onClear: () => void
  spotlight?: NftSummary
  isLoading?: boolean
  className?: string
  /** Keeps ids unique when the sidebar and the mobile drawer are both mounted. */
  idPrefix?: string
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Sidebar "Coleções / Faixa de preço / Rede" (desktop) — also rendered inside the mobile filter drawer. */
export function Filters({ search, facets, priceRange, onChange, onClear, spotlight, isLoading, className, idPrefix = 'f' }: FiltersProps) {
  const min = Number(priceRange?.min ?? 0)
  const max = Number(priceRange?.max ?? 20)
  const [range, setRange] = useState<[number, number]>([Number(search.min ?? min), Number(search.max ?? max)])
  useEffect(() => {
    setRange([Number(search.min ?? min), Number(search.max ?? max)])
  }, [search.min, search.max, min, max])

  const selectedCats = new Set(search.category?.split(',') ?? [])
  const selectedNets = new Set(search.network?.split(',') ?? [])
  const hasAny = selectedCats.size + selectedNets.size > 0 || !!search.min || !!search.max

  return (
    <aside className={cn('flex flex-col gap-5', className)} aria-label="Filtros do catálogo">
      <div className="rounded-[6px] bg-surface px-6 py-6">
        <fieldset>
          <legend className="text-[18px] font-bold">Coleções</legend>
          <ul className="mt-4 space-y-3">
            {isLoading && !facets
              ? Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
              : facets?.categories.map((c) => {
                  const id = `${idPrefix}-cat-${c.id}`
                  const checked = selectedCats.has(c.id)
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 pl-3">
                      <label
                        htmlFor={id}
                        className={cn(
                          'flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-[15px]',
                          checked ? 'font-bold text-primary-light' : 'text-primary-light/90 hover:text-foreground',
                        )}
                      >
                        <Checkbox id={id} checked={checked} onCheckedChange={() => onChange({ category: toggleCsv(search.category, c.id), page: undefined })} />
                        <span className="truncate">{c.label}</span>
                      </label>
                      <span className="text-[15px] text-primary-light/90" aria-label={`${c.count} itens`}>
                        ({c.count})
                      </span>
                    </li>
                  )
                })}
          </ul>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-[18px] font-bold">Faixa de preço</legend>
          <div className="mt-3 px-1">
            <Slider
              min={min}
              max={max}
              step={0.01}
              value={range}
              onValueChange={(v) => setRange([v[0] ?? min, v[1] ?? max])}
              thumbLabels={['Preço mínimo', 'Preço máximo']}
              aria-label="Faixa de preço em ETH"
            />
            <p className="mt-1 text-[15px] text-foreground" aria-live="polite">
              Preço: {fmt(range[0])} - {fmt(range[1])} ETH
            </p>
            <Button
              size="sm"
              className="mt-3 h-9 px-4 text-[15px]"
              onClick={() =>
                onChange({ min: range[0] > min ? range[0].toFixed(2) : undefined, max: range[1] < max ? range[1].toFixed(2) : undefined, page: undefined })
              }
            >
              Aplicar
            </Button>
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-[18px] font-bold">Rede</legend>
          <ul className="mt-4 space-y-3">
            {isLoading && !facets
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)
              : facets?.networks.map((n) => {
                  const id = `${idPrefix}-net-${n.id}`
                  const checked = selectedNets.has(n.id)
                  return (
                    <li key={n.id} className="flex items-center justify-between gap-3 pl-3">
                      <label
                        htmlFor={id}
                        className={cn(
                          'flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-[15px]',
                          checked ? 'font-bold text-primary-light' : 'text-primary-light/90 hover:text-foreground',
                        )}
                      >
                        <Checkbox id={id} checked={checked} onCheckedChange={() => onChange({ network: toggleCsv(search.network, n.id), page: undefined })} />
                        <span>{n.label}</span>
                      </label>
                      <span className="text-[15px] text-primary-light/90" aria-label={`${n.count} itens`}>
                        ({n.count})
                      </span>
                    </li>
                  )
                })}
          </ul>
        </fieldset>

        {hasAny && (
          <Button variant="link" className="mt-6 text-[14px]" onClick={onClear} data-testid="clear-filters">
            Limpar filtros
          </Button>
        )}
      </div>

      {spotlight && (
        <div className="hidden overflow-hidden rounded-[6px] bg-surface pb-0 lg:block">
          <div className="px-4 pt-5">
            <p className="text-[22px] font-bold uppercase leading-7 text-primary-light">NFT em destaque</p>
            <p className="mt-1 text-center text-[17px] font-bold uppercase text-foreground">Oferta limitada</p>
          </div>
          <Link to="/nft/$id" params={{ id: spotlight.id }} className="mt-3 block" aria-label={`Ver ${spotlight.name}`}>
            <img
              src={spotlight.image.replace('.webp', '-md.webp')}
              alt={spotlight.imageAlt}
              width={480}
              height={480}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full rounded-[12px] object-cover"
            />
          </Link>
        </div>
      )}
    </aside>
  )
}
