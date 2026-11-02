import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import {
  FacebookGlyph as Facebook,
  InstagramGlyph as Instagram,
  LinkedinGlyph as Linkedin,
  TwitterGlyph as Twitter,
  YoutubeGlyph as Youtube,
} from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { Logo } from './header'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

type Col = {
  title: string
  links: { label: string; to?: '/account/profile' | '/account/wallets' | '/account/favorites' | '/'; search?: Record<string, string>; external?: boolean }[]
}
const COLUMNS: Col[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/account/profile' },
      { label: 'Minha coleção', to: '/account/favorites' },
      { label: 'Atividade' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse', to: '/account/favorites' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda' },
      { label: 'Como comprar NFTs' },
      { label: 'Carteira e segurança', to: '/account/wallets' },
      { label: 'Política do mercado' },
      { label: 'Denunciar item' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', to: '/', search: { category: 'arte-digital' } },
      { label: 'Fotografia', to: '/', search: { category: 'fotografia' } },
      { label: 'Música', to: '/', search: { category: 'musica' } },
      { label: 'Arte 3D', to: '/', search: { category: 'arte-3d' } },
      { label: 'Utilidade', to: '/', search: { category: 'utilidade' } },
    ],
  },
]

const SOCIAL = [
  { label: 'Facebook', Icon: Facebook },
  { label: 'Instagram', Icon: Instagram },
  { label: 'Twitter', Icon: Twitter },
  { label: 'LinkedIn', Icon: Linkedin },
  { label: 'YouTube', Icon: Youtube },
]

function outOfScope(label: string) {
  toast({ title: `${label} não faz parte desta entrega`, description: 'Esta seção editorial/de suporte está fora do escopo do desafio.', variant: 'default' })
}

export function Footer() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'done'>('idle')
  const onSubscribe = (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      toast({ title: 'Informe um e-mail válido', variant: 'warning' })
      return
    }
    setStatus('done')
    toast({ title: 'Inscrição simulada', description: 'A newsletter não envia e-mails nesta demonstração.', variant: 'default' })
  }

  return (
    <footer className="container-page mt-16 pb-24 lg:mt-24 lg:pb-10" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Rodapé
      </h2>
      <div className="overflow-hidden rounded-t-[16px] bg-surface">
        <div className="grid gap-8 px-6 pb-8 pt-10 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr] lg:px-12 lg:pt-12">
          {FEATURES.map((f, i) => (
            <div key={f.letter} className={i > 0 ? 'lg:border-l lg:border-primary/60 lg:pl-8' : ''}>
              <span className="flex size-[72px] items-center justify-center rounded-full bg-primary text-[22px] font-bold text-ink" aria-hidden="true">
                {f.letter}
              </span>
              <h3 className="mt-5 text-[18px] font-bold">{f.title}</h3>
              <p className="mt-3 max-w-[220px] text-[14px] leading-[22px] text-secondary">{f.text}</p>
            </div>
          ))}
          <div className="lg:border-l lg:border-primary/60 lg:pl-8">
            <h3 className="text-[17px] font-bold leading-tight">Antecipe-se ao próximo lançamento</h3>
            <form className="mt-4 flex" onSubmit={onSubscribe} aria-label="Assinar newsletter">
              <label htmlFor="newsletter-email" className="sr-only">
                Seu e-mail
              </label>
              <Input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="digite seu e-mail..."
                className="h-11 rounded-r-none border-r-0 bg-ink text-[13px]"
                autoComplete="email"
              />
              <Button type="submit" className="h-11 rounded-l-none px-4 text-[17px]" disabled={status === 'done'}>
                {status === 'done' ? 'Enviado' : 'Enviar'}
              </Button>
            </form>
            <p className="mt-3 text-[13px] leading-5 text-secondary">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
          </div>
        </div>
        <div className="grid gap-3 bg-surface-dark px-6 py-5 text-[14px] md:grid-cols-4 md:items-center lg:px-12">
          <Logo />
          <p className="text-foreground">Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com" className="text-foreground hover:text-primary-light">
            contato@email.com
          </a>
          <a href="tel:+551140028922" className="text-foreground hover:text-primary-light">
            +55 11 4002 8922
          </a>
        </div>
        <div className="grid gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-12">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-[18px] font-bold">{col.title}</h3>
              <ul className="mt-4 space-y-3 text-[14px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link to={l.to} search={l.search as never} className="text-foreground hover:text-primary-light">
                        {l.label}
                      </Link>
                    ) : (
                      <button type="button" className="text-left text-foreground hover:text-primary-light" onClick={() => outOfScope(l.label)}>
                        {l.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <h3 className="text-[18px] font-bold">Redes sociais</h3>
            <ul className="mt-4 flex gap-2">
              {SOCIAL.map(({ label, Icon }) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => outOfScope(label)}
                    className="flex size-9 items-center justify-center rounded-md border border-primary text-primary-light hover:bg-primary/10"
                    aria-label={`${label} (link externo simulado)`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-[18px] font-bold">Carteiras compatíveis</h3>
            <p className="mt-3 inline-block rounded-sm bg-surface-raised px-3 py-1.5 text-[11px] font-bold tracking-wide text-primary-light">
              METAMASK • WALLETCONNECT • COINBASE
            </p>
          </div>
        </div>
      </div>
      <p className="py-6 text-center text-[13px] text-foreground">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
