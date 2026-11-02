import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'

export function NotFoundPage({
  title = 'Página não encontrada',
  description = 'O endereço que você acessou não existe ou foi movido.',
}: {
  title?: string
  description?: string
}) {
  return (
    <section className="container-page flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center" aria-labelledby="nf-title">
      <p className="text-[13px] uppercase tracking-widest text-primary-light">Erro 404</p>
      <h1 id="nf-title" className="text-[28px] font-bold">
        {title}
      </h1>
      <p className="max-w-md text-secondary">{description}</p>
      <Button asChild size="lg">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  )
}
