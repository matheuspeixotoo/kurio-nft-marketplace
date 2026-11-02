import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, RotateCcw } from 'lucide-react'
import type { ScenarioFlag } from '@/types/api'
import { api } from '@/lib/api/endpoints'
import { queryKeys } from '@/lib/query-keys'
import { ALL_FLAGS } from '@/mocks/scenario'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { useCart } from '@/features/cart/hooks'
import { readPendingOrder } from '@/features/checkout/hooks'
import { useAuth } from '@/features/auth/auth-context'
import { eth } from '@/lib/eth'

/**
 * Scenario switcher (mock control plane). Also reachable via URL: `?scenario=slow,flaky` and `?reset=1`.
 * Hidden from the tab order of the main flows; opens a dialog with focus trapping.
 */
export function DevPanel() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const status = useQuery({ queryKey: queryKeys.mockStatus, queryFn: api.mock.status, enabled: open, staleTime: 0 })
  const { data: cart } = useCart()

  const setScenario = useMutation({
    mutationFn: (flags: ScenarioFlag[]) => api.mock.setScenario(flags),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.mockStatus, data)
      toast({ title: 'Cenário atualizado', description: data.scenario.length ? data.scenario.join(', ') : 'padrão', variant: 'default' })
    },
  })
  const reset = useMutation({
    mutationFn: () => api.mock.reset(),
    onSuccess: async () => {
      toast({ title: 'Dados simulados restaurados', description: 'A página será recarregada.', variant: 'success' })
      window.setTimeout(() => window.location.assign('/?reset=1'), 400)
    },
  })
  const trigger = useMutation({
    mutationFn: api.mock.trigger,
    onSuccess: () => toast({ title: 'Evento disparado', variant: 'default' }),
    onError: () => toast({ title: 'Não foi possível disparar o evento', variant: 'error' }),
  })

  const flags = status.data?.scenario ?? []
  const toggle = (flag: ScenarioFlag) => {
    const next = flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag]
    setScenario.mutate(next)
  }
  const firstItem = cart?.items[0]
  const pendingOrder = readPendingOrder(userId)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-1/2 top-3 z-30 flex size-10 -translate-x-1/2 lg:left-auto lg:right-4 lg:top-auto lg:bottom-16 lg:translate-x-0 items-center justify-center rounded-full border border-border-soft bg-surface-raised/90 text-primary-light shadow-lg hover:bg-surface lg:bottom-16"
        aria-label="Cenários de simulação"
        data-testid="dev-panel-trigger"
      >
        <FlaskConical className="size-5" aria-hidden="true" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent mode="sheet" className="max-w-[460px]">
          <DialogTitle className="text-[20px] font-bold">Cenários de simulação</DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-secondary">
            Os mocks (MSW) rodam no navegador. Flags ficam salvas em <code>localStorage</code> e também podem ser passadas na URL:{' '}
            <code>?scenario=slow,flaky</code>. <code>?reset=1</code> restaura o estado inicial.
          </DialogDescription>

          <div className="mt-5 flex items-center justify-between text-[12px] text-accent">
            <span>Sockets conectados: {status.data?.connectedSockets ?? '—'}</span>
            <span>Persistência: {status.data?.persisted ? 'localStorage' : 'memória'}</span>
          </div>

          <ul className="mt-4 space-y-3" aria-label="Flags de cenário">
            {ALL_FLAGS.map((f) => {
              const id = `flag-${f.flag}`
              return (
                <li key={f.flag} className="flex items-start gap-3">
                  <Checkbox
                    id={id}
                    checked={flags.includes(f.flag)}
                    onCheckedChange={() => toggle(f.flag)}
                    disabled={setScenario.isPending}
                    className="mt-0.5"
                  />
                  <label htmlFor={id} className="cursor-pointer">
                    <span className="block text-[14px] font-bold">
                      {f.label} <code className="ml-1 text-[11px] font-normal text-accent">{f.flag}</code>
                    </span>
                    <span className="block text-[12px] text-secondary">{f.description}</span>
                  </label>
                </li>
              )
            })}
          </ul>

          <h3 className="mt-6 text-[15px] font-bold">Gatilhos de tempo real</h3>
          <div className="mt-3 grid gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!firstItem || trigger.isPending}
              onClick={() =>
                firstItem &&
                trigger.mutate({ type: 'nft.updated', nftId: firstItem.nftId, price: eth.of(firstItem.unitPrice).times(1.1).toDecimalPlaces(2).toString() })
              }
            >
              Subir 10% o preço do 1º item do carrinho
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!firstItem || trigger.isPending}
              onClick={() => firstItem && trigger.mutate({ type: 'nft.updated', nftId: firstItem.nftId, available: 0 })}
            >
              Esgotar o 1º item do carrinho
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pendingOrder || trigger.isPending}
              onClick={() => pendingOrder && trigger.mutate({ type: 'order.updated', orderId: pendingOrder, status: 'confirmed' })}
            >
              Confirmar pedido pendente agora
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!pendingOrder || trigger.isPending}
              onClick={() => pendingOrder && trigger.mutate({ type: 'order.updated', orderId: pendingOrder, status: 'declined' })}
            >
              Recusar pedido pendente agora
            </Button>
            <Button variant="secondary" size="sm" disabled={trigger.isPending} onClick={() => trigger.mutate({ type: 'socket.disconnect' })}>
              Derrubar a conexão Socket.IO
            </Button>
            <Button variant="secondary" size="sm" disabled={trigger.isPending} onClick={() => trigger.mutate({ type: 'socket.replay', eventId: '' })}>
              Reenviar o último evento (duplicado)
            </Button>
            <Button variant="secondary" size="sm" disabled={trigger.isPending} onClick={() => trigger.mutate({ type: 'session.expire' })}>
              Expirar todas as sessões
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setScenario.mutate([])} disabled={setScenario.isPending}>
              Limpar flags
            </Button>
            <Button variant="danger" size="sm" onClick={() => reset.mutate()} loading={reset.isPending}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset total dos dados
            </Button>
          </div>
          <p className="mt-4 text-[12px] text-accent">
            Credenciais: <code>ana@kurio.app</code> / <code>bruno@kurio.app</code> · senha <code>Kurio@2026</code> · cupons <code>KURIO10</code>,{' '}
            <code>GENESIS5</code>, <code>LAUNCH20</code> (expirado).
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
