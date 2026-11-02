import { createFileRoute } from '@tanstack/react-router'
import { catalogSearchSchema } from '@/features/catalog/search-schema'
import { useHighlights } from '@/features/catalog/hooks'
import { Hero } from '@/features/catalog/components/hero'
import { CatalogSection } from '@/features/catalog/components/catalog-section'
import { Blog, Promos } from '@/features/catalog/components/editorial'
import { ErrorState } from '@/components/ui/state-blocks'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const highlights = useHighlights()
  useDocumentTitle('Kurio — Marketplace de NFTs')
  return (
    <>
      {highlights.isError ? (
        <div className="container-page pt-6">
          <ErrorState
            compact
            error={highlights.error}
            onRetry={() => void highlights.refetch()}
            retrying={highlights.isFetching}
            title="Não foi possível carregar os destaques"
          />
        </div>
      ) : (
        <Hero items={highlights.data?.hero} isLoading={highlights.isPending} />
      )}
      <CatalogSection search={search} />
      <Promos promos={highlights.data?.promos} />
      <Blog />
    </>
  )
}
