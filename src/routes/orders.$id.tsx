import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Copy, ExternalLink, Loader2, XCircle } from 'lucide-react'
import type { Order } from '@/types/api'
import { requireAuth } from '@/features/auth/guards'
import { clearPendingOrder, useOrder } from '@/features/checkout/hooks'
import { useRealtime, useRealtimeSubscription } from '@/features/realtime/realtime-provider'
import { PROVIDER_LABELS } from './account.wallets'
import { NETWORK_LABELS } from '@/mocks/fixtures/catalog'
import { formatEth } from '@/lib/eth'
import { formatDate, truncateMiddle } from '@/lib/utils'
import { toApiError } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/state-blocks'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ThankYouIcon } from '@/components/icons'
import { NotFoundPage } from '@/components/not-found'
import { toast } from '@/components/ui/toast'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/orders/$id')({
  beforeLoad: ({ context, location }) => requireAuth(context, location),
  component: OrderPage,
})

function OrderPage() {
  const { id } = Route.useParams()
  const order = useOrder(id)
  useRealtimeSubscription('order', id)
  useDocumentTitle(
    order.data
      ? order.data.status === 'confirmed'
        ? 'Pedido confirmado — Kurio'
        : order.data.status === 'declined'
          ? 'Pedido recusado — Kurio'
          : 'Processando pedido — Kurio'
      : 'Pedido — Kurio',
  )

  useEffect(() => {
    if (order.data && order.data.status !== 'pending') clearPendingOrder()
  }, [order.data])

  if (order.isPending) return <OrderSkeleton />
  if (order.isError) {
    const e = toApiError(order.error)
    if (e.status === 404 || e.status === 403)
      return <NotFoundPage title="Pedido não encontrado" description="Este pedido não existe ou pertence a outro colecionador." />
    return (
      <div className="container-page py-10">
        <ErrorState error={order.error} onRetry={() => void order.refetch()} retrying={order.isFetching} />
      </div>
    )
  }
  const o = order.data
  if (o.status === 'pending') return <PendingView order={o} />
  if (o.status === 'declined') return <DeclinedView order={o} />
  return <Receipt order={o} />
}

function PendingView({ order }: { order: Order }) {
  const { status } = useRealtime()
  return (
    <section className="container-page flex min-h-[60vh] items-center justify-center py-10" aria-labelledby="pending-title" data-testid="order-pending">
      <div className="w-full max-w-[560px] rounded-[6px] border-b-[10px] border-primary bg-surface p-8 text-center">
        <Loader2 className="mx-auto size-12 animate-spin text-primary-light" aria-hidden="true" />
        <h1 id="pending-title" className="mt-5 text-[20px] font-bold">
          Processando o pagamento
        </h1>
        <p className="mt-2 text-[14px] text-secondary" role="status">
          Aguardando a confirmação da rede {NETWORK_LABELS[order.network]}. Você pode recarregar ou fechar esta página: o pedido{' '}
          <strong className="text-foreground">{order.id}</strong> continua em andamento e não será duplicado.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-left text-[14px]">
          <div>
            <dt className="text-secondary">Total</dt>
            <dd className="font-bold text-primary-light">{formatEth(order.total)}</dd>
          </div>
          <div>
            <dt className="text-secondary">Carteira</dt>
            <dd>{PROVIDER_LABELS[order.walletProvider]}</dd>
          </div>
        </dl>
        <p className="mt-6 text-[12px] text-accent" data-testid="pending-connection" data-status={status}>
          {status === 'connected'
            ? 'Conexão em tempo real ativa.'
            : status === 'connecting'
              ? 'Reconectando… o estado é reconciliado pela API a cada 4 s.'
              : 'Sem conexão em tempo real — verificando o pedido pela API a cada 4 s.'}
        </p>
      </div>
    </section>
  )
}

function DeclinedView({ order }: { order: Order }) {
  return (
    <section className="container-page flex min-h-[60vh] items-center justify-center py-10" aria-labelledby="declined-title" data-testid="order-declined">
      <div className="w-full max-w-[560px] rounded-[6px] border-b-[10px] border-coral bg-surface p-8 text-center">
        <XCircle className="mx-auto size-12 text-coral" aria-hidden="true" />
        <h1 id="declined-title" className="mt-5 text-[20px] font-bold">
          Pagamento recusado
        </h1>
        <p className="mt-2 text-[14px] text-secondary" role="alert">
          {order.failureReason ?? 'A transação não foi aprovada pela rede.'}
        </p>
        <p className="mt-3 text-[13px] text-secondary">Seus itens continuam no carrinho. Nenhum valor foi cobrado.</p>
        <dl className="mt-6 grid grid-cols-2 gap-3 text-left text-[14px]">
          <div>
            <dt className="text-secondary">Pedido</dt>
            <dd className="font-mono">{order.id}</dd>
          </div>
          <div>
            <dt className="text-secondary">Total</dt>
            <dd>{formatEth(order.total)}</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/checkout">Tentar novamente</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function Receipt({ order }: { order: Order }) {
  const [explorer, setExplorer] = useState(false)
  const tx = order.txHash ?? ''
  return (
    <section className="container-page flex justify-center py-6 lg:py-14" aria-labelledby="receipt-title" data-testid="order-confirmed">
      <div className="relative w-full max-w-[580px] border-b-[10px] border-primary bg-surface pb-10">
        <Link to="/" className="absolute right-4 top-4 text-primary-light hover:text-foreground" aria-label="Fechar e voltar ao início">
          ✕
        </Link>
        <div className="px-6 pt-6 text-center">
          <ThankYouIcon className="mx-auto" />
          <h1 id="receipt-title" className="mt-4 text-[16px] font-bold text-primary-light">
            Seus NFTs agora estão na sua carteira
          </h1>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-y-3 border-y border-primary px-6 py-4 text-[13px] sm:grid-cols-4 sm:divide-x sm:divide-primary">
          <div className="sm:pr-3">
            <dt className="font-bold text-primary-light">ID da transação</dt>
            <dd className="font-mono text-secondary" title={tx}>
              {truncateMiddle(tx, 6, 4)}
            </dd>
          </div>
          <div className="sm:px-3">
            <dt className="text-secondary">Data</dt>
            <dd className="text-secondary">{formatDate(order.settledAt ?? order.updatedAt)}</dd>
          </div>
          <div className="sm:px-3">
            <dt className="text-secondary">Total</dt>
            <dd className="text-secondary" data-testid="receipt-total">
              {formatEth(order.total)}
            </dd>
          </div>
          <div className="sm:pl-3">
            <dt className="font-bold text-primary-light">Carteira</dt>
            <dd className="text-secondary">{PROVIDER_LABELS[order.walletProvider]}</dd>
          </div>
        </dl>
        <div className="px-6 pt-6 sm:px-11">
          <h2 className="text-[15px] font-bold">Detalhes da transação</h2>
          <table className="mt-2 w-full text-[14px]">
            <thead>
              <tr className="border-b border-primary text-left text-[16px]">
                <th className="pb-2 font-normal">NFTs</th>
                <th className="pb-2 text-center font-normal">Edições</th>
                <th className="pb-2 text-right font-normal">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.nftId}-${item.editionId}`} data-testid="receipt-item">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <img src={item.image.replace('.webp', '-sm.webp')} alt="" width={70} height={70} className="size-[70px] rounded-[6px] object-cover" />
                      <div>
                        <p className="text-[16px] font-bold">{item.name}</p>
                        <p className="text-[13px] text-primary-light">ID do token: #{item.tokenId}</p>
                        <p className="text-[12px] text-secondary">Edição {item.editionLabel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-center text-secondary">(x {item.quantity})</td>
                  <td className="py-3 text-right text-[17px] font-bold text-primary-light">{formatEth(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-2 ml-auto w-full max-w-[320px] space-y-1 text-[16px]">
            {order.discount !== '0' && (
              <div className="flex justify-between">
                <dt>Desconto</dt>
                <dd>- {formatEth(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(order.networkFee)}</dd>
            </div>
            <div className="flex justify-between border-b border-primary pb-3 font-bold">
              <dt>Total</dt>
              <dd className="text-primary-light">{formatEth(order.total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-center text-[13px] leading-6 text-secondary">
            Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para sua carteira conectada e registrada na rede.
          </p>
          <div className="mt-6 text-center">
            <Button className="h-12 px-6 text-[16px]" onClick={() => setExplorer(true)} data-testid="open-explorer">
              Ver no {order.network === 'ethereum' ? 'Etherscan' : order.network === 'polygon' ? 'Polygonscan' : 'Solscan'}
            </Button>
          </div>
          <p className="mt-6 text-center text-[12px] text-accent">
            Este recibo é um snapshot do pedido {order.id}: alterações posteriores no catálogo não mudam estes valores.
          </p>
        </div>
      </div>

      <Dialog open={explorer} onOpenChange={setExplorer}>
        <DialogContent className="max-w-[520px]" aria-describedby="explorer-desc">
          <DialogTitle className="text-[18px] font-bold">Explorador de blocos (simulado)</DialogTitle>
          <DialogDescription id="explorer-desc" className="mt-1 text-[13px] text-secondary">
            Integrações reais com blockchain estão fora do escopo. A referência abaixo é fictícia e não existe na rede.
          </DialogDescription>
          <div className="mt-4 rounded-md border border-border bg-ink p-3 font-mono text-[12px] break-all">{tx}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(tx)
                  toast({ title: 'Hash copiado', variant: 'success' })
                } catch {
                  toast({ title: 'Não foi possível copiar', variant: 'error' })
                }
              }}
            >
              <Copy className="size-4" aria-hidden="true" /> Copiar hash
            </Button>
            <Button variant="ghost" size="sm" disabled title="Link externo desabilitado na simulação">
              <ExternalLink className="size-4" aria-hidden="true" /> {order.explorerUrl?.replace(/^https:\/\//, '').split('/')[0]}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function OrderSkeleton() {
  return (
    <div className="container-page flex justify-center py-14" aria-busy="true" aria-label="Carregando pedido">
      <div className="w-full max-w-[580px] space-y-4 bg-surface p-8">
        <Skeleton className="mx-auto size-20 rounded-full" />
        <Skeleton className="mx-auto h-5 w-72" />
        <Skeleton className="h-14 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[82px] w-full" />
        ))}
        <Skeleton className="mx-auto h-12 w-44" />
      </div>
    </div>
  )
}
