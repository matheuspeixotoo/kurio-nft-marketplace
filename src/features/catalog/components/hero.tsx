import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { NftSummary } from '@/types/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const SLIDES = [
  {
    kicker: 'Bem-vindo à Kurio',
    title: 'Seja dono do futuro da arte digital',
    text: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
  },
  {
    kicker: 'Lançamentos gênesis',
    title: 'Edições limitadas direto dos criadores',
    text: 'Colecione edições escassas antes da revelação pública e acompanhe cada cunhagem com procedência verificada na rede.',
  },
  {
    kicker: 'Coleções verificadas',
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras que definem a cultura digital — tudo em um só lugar.',
  },
]

export function Hero({ items, isLoading }: { items: NftSummary[] | undefined; isLoading: boolean }) {
  const [index, setIndex] = useState(0)
  const slides = SLIDES.map((s, i) => ({ ...s, nft: items?.[i] ?? items?.[0] }))
  const current = slides[index] ?? slides[0]!

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 9000)
    return () => window.clearInterval(t)
  }, [])

  return (
    <section className="container-page pt-6 lg:pt-7" aria-roledescription="carrossel" aria-label="Destaques">
      {/* Mobile: card with gradient (Figma "Mobile / Início") */}
      <div
        className="relative overflow-hidden rounded-[16px] bg-surface p-4 lg:hidden"
        style={{ background: 'linear-gradient(100deg, #3a2316 0%, #241612 55%, #2f1d15 100%)' }}
      >
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-foreground">{current.kicker}</p>
            <h1 className="mt-2 text-[19px] font-bold uppercase leading-[26px] text-foreground">{current.title}</h1>
            <p className="mt-3 line-clamp-3 text-[13px] leading-5 text-secondary">{current.text}</p>
            <Link to="/" hash="catalogo" className="mt-3 inline-flex items-center gap-2 text-[13px] font-bold uppercase text-primary-light">
              Explorar <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="relative w-[140px] shrink-0">
            {current.nft ? (
              <img
                src={current.nft.image.replace('.webp', '-md.webp')}
                alt={current.nft.imageAlt}
                width={140}
                height={140}
                className="aspect-square w-full rounded-[12px] object-cover"
                fetchPriority="high"
                decoding="async"
              />
            ) : (
              <Skeleton className="aspect-square w-full rounded-[12px]" />
            )}
          </div>
        </div>
        <Dots index={index} onChange={setIndex} className="mt-3 justify-end" />
      </div>

      {/* Desktop hero (Figma "Desktop / Início") */}
      <div className="hidden min-h-[450px] grid-cols-[600px_1fr] items-start gap-8 lg:grid">
        <div className="pt-12">
          <p className="text-[15px] text-foreground">{current.kicker}</p>
          <h1 className="mt-4 max-w-[600px] text-[43px] font-bold uppercase leading-[70px] text-foreground">{current.title}</h1>
          <p className="mt-2 max-w-[560px] text-[15px] leading-6 text-secondary">{current.text}</p>
          <Button asChild size="md" className="mt-9 h-10 w-[140px] text-[15px] uppercase">
            <Link to="/" hash="catalogo">
              Explorar
            </Link>
          </Button>
          <Dots index={index} onChange={setIndex} className="mt-14 justify-end pr-24" />
        </div>
        <div className="ml-auto aspect-square w-[450px]">
          {isLoading || !current.nft ? (
            <Skeleton className="size-full rounded-[16px]" />
          ) : (
            <Link to="/nft/$id" params={{ id: current.nft.id }} className="block overflow-hidden rounded-[16px]" aria-label={`Ver ${current.nft.name}`}>
              <img
                src={current.nft.image}
                alt={current.nft.imageAlt}
                width={800}
                height={800}
                className="aspect-square size-full object-cover"
                fetchPriority="high"
                decoding="async"
              />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

function Dots({ index, onChange, className }: { index: number; onChange: (i: number) => void; className?: string }) {
  return (
    <div className={cn('flex gap-0', className)} role="tablist" aria-label="Slides em destaque">
      {SLIDES.map((_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === index}
          aria-label={`Slide ${i + 1}`}
          onClick={() => onChange(i)}
          className="flex size-6 items-center justify-center rounded-full"
        >
          <span
            aria-hidden="true"
            className={cn('block size-2 rounded-full transition-colors', i === index ? 'bg-primary' : 'bg-primary/40 hover:bg-primary/70')}
          />
        </button>
      ))}
    </div>
  )
}
