import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { Highlights } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'

export function Promos({ promos }: { promos: Highlights['promos'] | undefined }) {
  return (
    <section className="container-page mt-16 lg:mt-24" aria-label="Promoções">
      <div className="grid gap-6 md:grid-cols-2">
        {(promos ?? [undefined, undefined]).map((p, i) =>
          p ? (
            <article key={p.id} className="flex overflow-hidden rounded-[6px] bg-surface">
              <img
                src={p.image}
                alt=""
                width={290}
                height={250}
                loading="lazy"
                decoding="async"
                className="aspect-[290/250] w-[40%] max-w-[290px] shrink-0 rounded-[6px] object-cover"
              />
              <div className="flex flex-1 flex-col items-end justify-center px-5 py-6 text-right lg:px-8">
                <h3 className="text-[17px] font-bold leading-6 text-foreground">{p.title}</h3>
                <p className="mt-3 text-[14px] leading-[22px] text-secondary">{p.description}</p>
                <Button asChild size="sm" className="mt-5 h-9 text-[15px]">
                  <Link to="/" search={p.href.includes('category=') ? { category: p.href.split('category=')[1] } : { tab: 'new' }} hash="catalogo">
                    Explorar <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </article>
          ) : (
            <Skeleton key={i} className="h-[250px] rounded-[6px]" />
          ),
        )}
      </div>
    </section>
  )
}

const POSTS = [
  {
    date: '12 de setembro',
    read: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/nfts/ivory-md.webp',
  },
  {
    date: '13 de setembro',
    read: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a nova cultura digital.',
    image: '/nfts/emerald-md.webp',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/nfts/sage-md.webp',
  },
  {
    date: '15 de setembro',
    read: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/nfts/golden-md.webp',
  },
]

/** "Diário da Cunhagem" — editorial pages are out of scope; "Ler mais" explains that instead of pretending to work. */
export function Blog() {
  return (
    <section id="diario" className="container-page mt-16 scroll-mt-24 lg:mt-24" aria-labelledby="diario-heading">
      <div className="text-center">
        <h2 id="diario-heading" className="text-[24px] font-bold">
          Diário da Cunhagem
        </h2>
        <p className="mt-2 text-[13px] text-secondary">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((p) => (
          <article key={p.title} className="overflow-hidden rounded-[6px] bg-surface">
            <img src={p.image} alt="" width={280} height={200} loading="lazy" decoding="async" className="aspect-[280/200] w-full object-cover" />
            <div className="p-4">
              <p className="text-[11px] text-secondary">
                {p.date} <span aria-hidden="true">|</span> {p.read}
              </p>
              <h3 className="mt-2 text-[15px] font-bold leading-5 text-foreground">{p.title}</h3>
              <p className="mt-2 text-[12px] leading-[18px] text-secondary">{p.text}</p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-primary-light hover:underline"
                onClick={() =>
                  toast({ title: 'Conteúdo editorial fora do escopo', description: `"${p.title}" não está disponível nesta entrega.`, variant: 'default' })
                }
              >
                Ler mais <ArrowRight className="size-3" aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
