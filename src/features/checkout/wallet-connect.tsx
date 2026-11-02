import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Check, MoreVertical, Unplug } from 'lucide-react'
import type { Network, Wallet, WalletConnection, WalletProvider, Wallets } from '@/types/api'
import { api } from '@/lib/api/endpoints'
import { toApiError } from '@/lib/api/errors'
import { cn, truncateMiddle } from '@/lib/utils'
import { NETWORK_LABELS } from '@/lib/networks'
import { Button } from '@/components/ui/button'
import { WalletGlyph } from '@/components/icons'
import { useAnnounce } from '@/components/live-announcer'

export const PROVIDERS: { id: WalletProvider; label: string; letter: string }[] = [
  { id: 'walletconnect', label: 'WalletConnect', letter: 'W' },
  { id: 'metamask', label: 'MetaMask', letter: 'M' },
  { id: 'coinbase', label: 'Coinbase Wallet', letter: 'C' },
]

export type ConnectionState =
  { status: 'disconnected' } | { status: 'connecting' } | { status: 'connected'; connection: WalletConnection } | { status: 'rejected'; message: string }

interface WalletPickerProps {
  wallets: Wallets | undefined
  walletId: string
  onWalletChange: (w: Wallet) => void
  provider: WalletProvider
  onProviderChange: (p: WalletProvider) => void
  network: Network
  onNetworkChange: (n: Network) => void
  connection: ConnectionState
  onConnectionChange: (c: ConnectionState) => void
}

/**
 * "Carteira e rede" block: saved wallets (primary/secondary), provider choice and the simulated
 * extension handshake (connect → connected / rejected; disconnect). No real wallet is touched.
 */
export function WalletPicker({
  wallets,
  walletId,
  onWalletChange,
  provider,
  onProviderChange,
  network,
  onNetworkChange,
  connection,
  onConnectionChange,
}: WalletPickerProps) {
  const announce = useAnnounce()
  const [showSwitch, setShowSwitch] = useState(false)
  const saved = [wallets?.primary, wallets?.secondary].filter((w): w is Wallet => !!w)

  const connect = useMutation({
    mutationFn: () => api.wallets.connect({ provider, network }),
    onMutate: () => onConnectionChange({ status: 'connecting' }),
    onSuccess: (c) => {
      onConnectionChange({ status: 'connected', connection: c })
      announce(`Carteira ${PROVIDERS.find((p) => p.id === provider)?.label} conectada na rede ${NETWORK_LABELS[network]}.`)
    },
    onError: (err) => {
      const e = toApiError(err)
      onConnectionChange({ status: 'rejected', message: e.message })
      announce(`Conexão recusada: ${e.message}`, 'assertive')
    },
  })

  const disconnect = () => {
    onConnectionChange({ status: 'disconnected' })
    announce('Carteira desconectada.')
  }

  return (
    <div data-testid="wallet-picker">
      {saved.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold">Carteira conectada</h3>
            {saved.length > 1 && (
              <button
                type="button"
                className="text-[14px] font-bold text-primary-light hover:underline"
                onClick={() => setShowSwitch((v) => !v)}
                aria-expanded={showSwitch}
              >
                Trocar carteira
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-3" role="radiogroup" aria-label="Carteira cadastrada">
            {saved
              .filter((w) => showSwitch || saved.length === 1 || w.id === walletId || !saved.some((s) => s.id === walletId))
              .map((w) => {
                const selected = w.id === walletId
                return (
                  <label
                    key={w.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-[12px] border bg-surface px-4 py-4',
                      selected ? 'border-primary' : 'border-border',
                    )}
                  >
                    <input
                      type="radio"
                      name="saved-wallet"
                      className="mt-1 size-4 accent-primary"
                      checked={selected}
                      onChange={() => onWalletChange(w)}
                      data-testid={`saved-wallet-${w.slot}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold">{w.nickname}</span>
                      <span className="block truncate text-[14px] text-primary-light">{w.ensName ? `${w.ensName}.eth` : truncateMiddle(w.address, 6, 4)}</span>
                      <span className="block text-[14px] text-primary-light">
                        Rede {w.slot === 'primary' ? 'principal ' : ''}
                        {NETWORK_LABELS[w.network]}
                      </span>
                    </span>
                    <MoreVertical className="size-4 text-primary-light" aria-hidden="true" />
                  </label>
                )
              })}
          </div>
        </>
      )}

      <h3 className="mt-6 text-center text-[16px] font-bold lg:text-left">Carteira e rede</h3>
      <div className="mt-3 grid gap-3" role="radiogroup" aria-label="Provedor da carteira">
        {PROVIDERS.map((p) => {
          const selected = p.id === provider
          return (
            <label
              key={p.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border bg-surface px-4 py-3',
                selected ? 'border-primary-light' : 'border-primary/50 hover:border-primary',
              )}
            >
              <WalletGlyph letter={p.letter} className="lg:hidden" />
              <span className="flex-1 text-[15px]">{p.label}</span>
              <input
                type="radio"
                name="provider"
                className="size-4 accent-primary"
                checked={selected}
                onChange={() => {
                  onProviderChange(p.id)
                  if (connection.status !== 'disconnected') onConnectionChange({ status: 'disconnected' })
                }}
                data-testid={`provider-${p.id}`}
              />
            </label>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="checkout-network" className="text-[14px] text-secondary">
          Rede:
        </label>
        <select
          id="checkout-network"
          value={network}
          onChange={(e) => {
            onNetworkChange(e.target.value as Network)
            if (connection.status !== 'disconnected') onConnectionChange({ status: 'disconnected' })
          }}
          className="h-9 rounded-md border border-primary/70 bg-surface px-2 text-[14px]"
          data-testid="checkout-network"
        >
          {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
            <option key={n} value={n}>
              {NETWORK_LABELS[n]}
            </option>
          ))}
        </select>
      </div>

      <div
        className="mt-4 rounded-md border border-border bg-surface-raised/60 p-3 text-[14px]"
        aria-live="polite"
        data-testid="wallet-connection"
        data-status={connection.status}
      >
        {connection.status === 'connected' ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-success">
              <Check className="size-4" aria-hidden="true" />
              Conectada: <span className="font-mono text-foreground">{truncateMiddle(connection.connection.address, 6, 4)}</span>
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={disconnect}>
              <Unplug className="size-4" aria-hidden="true" /> Desconectar
            </Button>
          </div>
        ) : connection.status === 'rejected' ? (
          <div className="flex flex-col gap-2">
            <p role="alert" className="text-coral">
              {connection.message}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => connect.mutate()}>
              Tentar conectar novamente
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-secondary">Conecte a carteira para confirmar a compra.</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => connect.mutate()}
              loading={connection.status === 'connecting'}
              loadingText="Aguardando a carteira…"
              data-testid="connect-wallet"
            >
              Conectar carteira
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
