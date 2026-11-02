import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { Network, Wallet, WalletProvider, WalletSlot, Wallets } from '@/types/api'
import { toApiError } from '@/lib/api/errors'
import { truncateMiddle } from '@/lib/utils'
import { useProfile, useRemoveWallet, useSaveWallet, useWallets } from '@/features/account/hooks'
import { NETWORK_LABELS } from '@/lib/networks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/state-blocks'
import { Badge } from '@/components/ui/misc'
import { useAnnounce } from '@/components/live-announcer'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/account/wallets')({
  component: WalletsPage,
})

export const PROVIDER_LABELS: Record<WalletProvider, string> = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' }

type FormValues = {
  nickname: string
  displayName: string
  profileName: string
  email: string
  network: Network | ''
  address: string
  secondaryAddress: string
  provider: WalletProvider | ''
  referralCode: string
  ensName: string
}

const EMPTY: FormValues = {
  nickname: '',
  displayName: '',
  profileName: '',
  email: '',
  network: '',
  address: '',
  secondaryAddress: '',
  provider: '',
  referralCode: '',
  ensName: '',
}

function validate(v: FormValues) {
  const e: Record<string, string> = {}
  if (v.nickname.trim().length < 2) e.nickname = 'Informe um apelido para a carteira.'
  if (v.displayName.trim().length < 2) e.displayName = 'Informe o nome de exibição.'
  if (v.profileName.trim().length < 2) e.profileName = 'Informe o nome do perfil.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = 'Informe um e-mail válido.'
  if (!v.network) e.network = 'Selecione uma rede.'
  if (!v.provider) e.provider = 'Selecione o tipo de carteira.'
  const addr = v.address.trim()
  if (v.network === 'solana' ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr) : !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    e.address = v.network === 'solana' ? 'Endereço Solana inválido (base58, 32–44 caracteres).' : 'Use 0x seguido de 40 caracteres hexadecimais.'
  }
  if (!v.referralCode.trim()) e.referralCode = 'Informe o código de indicação.'
  if (!/^[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*$/i.test(v.ensName.trim().replace(/\.eth$/, ''))) e.ensName = 'Informe um nome ENS válido.'
  return e
}

function WalletsPage() {
  const wallets = useWallets()
  useDocumentTitle('Carteiras — Kurio')
  if (wallets.isError) return <ErrorState error={wallets.error} onRetry={() => void wallets.refetch()} retrying={wallets.isFetching} />
  if (wallets.isPending) return <WalletsSkeleton />
  return <WalletsContent wallets={wallets.data} />
}

function WalletsContent({ wallets }: { wallets: Wallets }) {
  const [editing, setEditing] = useState<WalletSlot | null>(wallets.primary ? null : 'primary')
  const save = useSaveWallet()
  const remove = useRemoveWallet()
  const announce = useAnnounce()
  const [sameAsPrimary, setSameAsPrimary] = useState(false)

  return (
    <div className="lg:pl-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-bold">Carteira principal</h1>
          <p className="mt-1 text-[13px] text-secondary">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        </div>
        {wallets.primary && editing !== 'primary' && (
          <Button variant="link" className="text-[15px]" onClick={() => setEditing('primary')} data-testid="edit-primary">
            Editar
          </Button>
        )}
      </div>

      {editing === 'primary' || !wallets.primary ? (
        <WalletForm
          slot="primary"
          initial={wallets.primary}
          onCancel={wallets.primary ? () => setEditing(null) : undefined}
          onSaved={() => {
            setEditing(null)
            announce('Carteira principal salva.')
          }}
        />
      ) : (
        <WalletCard wallet={wallets.primary} />
      )}

      <div className="mt-10 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[17px] font-bold">Carteira secundária</h2>
          <p className="mt-1 text-[13px] text-secondary">
            {wallets.secondary ? 'Usada como reserva no pagamento.' : 'Você ainda não adicionou uma carteira secundária.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {wallets.primary && !wallets.secondary && editing !== 'secondary' && (
            <label className="flex items-center gap-2 text-[14px]">
              <input
                type="radio"
                className="size-4 accent-primary"
                checked={sameAsPrimary}
                onChange={() => {
                  setSameAsPrimary(true)
                  save.mutate({ slot: 'secondary', input: { sameAsPrimary: true, nickname: 'Reserva' } }, { onSettled: () => setSameAsPrimary(false) })
                }}
                data-testid="secondary-same"
              />
              Igual à carteira principal
            </label>
          )}
          {wallets.primary && editing !== 'secondary' && (
            <Button variant="link" className="text-[15px]" onClick={() => setEditing('secondary')} data-testid="edit-secondary">
              {wallets.secondary ? 'Editar' : 'Adicionar'}
            </Button>
          )}
        </div>
      </div>

      {editing === 'secondary' ? (
        <WalletForm slot="secondary" initial={wallets.secondary} onCancel={() => setEditing(null)} onSaved={() => setEditing(null)} />
      ) : wallets.secondary ? (
        <>
          <WalletCard wallet={wallets.secondary} />
          <Button
            variant="danger"
            size="sm"
            className="mt-3"
            onClick={() => remove.mutate('secondary')}
            loading={remove.isPending}
            data-testid="remove-secondary"
          >
            Remover carteira secundária
          </Button>
        </>
      ) : null}
    </div>
  )
}

function WalletCard({ wallet }: { wallet: Wallet }) {
  return (
    <dl
      className="mt-5 grid gap-x-7 gap-y-4 rounded-md border border-border bg-surface p-5 text-[14px] sm:grid-cols-2"
      data-testid={`wallet-card-${wallet.slot}`}
    >
      <div>
        <dt className="text-secondary">Apelido</dt>
        <dd className="font-bold">
          {wallet.nickname} {wallet.sameAsPrimary && <Badge className="ml-2">igual à principal</Badge>}
        </dd>
      </div>
      <div>
        <dt className="text-secondary">Tipo / Rede</dt>
        <dd>
          {PROVIDER_LABELS[wallet.provider]} · {NETWORK_LABELS[wallet.network]}
        </dd>
      </div>
      <div>
        <dt className="text-secondary">Endereço</dt>
        <dd className="font-mono" title={wallet.address}>
          {truncateMiddle(wallet.address, 8, 6)}
        </dd>
      </div>
      <div>
        <dt className="text-secondary">ENS</dt>
        <dd>{wallet.ensName ? `${wallet.ensName}.eth` : '—'}</dd>
      </div>
      <div>
        <dt className="text-secondary">Nome de exibição / perfil</dt>
        <dd>
          {wallet.displayName} · {wallet.profileName}
        </dd>
      </div>
      <div>
        <dt className="text-secondary">E-mail</dt>
        <dd>{wallet.email}</dd>
      </div>
    </dl>
  )
}

export function WalletForm({ slot, initial, onSaved, onCancel }: { slot: WalletSlot; initial: Wallet | null; onSaved: () => void; onCancel?: () => void }) {
  const profile = useProfile()
  const save = useSaveWallet()
  const announce = useAnnounce()
  const [values, setValues] = useState<FormValues>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initial) {
      setValues({
        nickname: initial.nickname,
        displayName: initial.displayName,
        profileName: initial.profileName,
        email: initial.email,
        network: initial.network,
        address: initial.address,
        secondaryAddress: initial.secondaryAddress,
        provider: initial.provider,
        referralCode: initial.referralCode,
        ensName: initial.ensName,
      })
    } else if (profile.data) {
      setValues((v) => ({
        ...v,
        displayName: v.displayName || profile.data.displayName,
        profileName: v.profileName || profile.data.username,
        email: v.email || profile.data.email,
        ensName: v.ensName || profile.data.ensName,
        nickname: v.nickname || profile.data.walletNickname,
      }))
    }
  }, [initial, profile.data])

  const set = (k: keyof FormValues) => (value: string) => {
    setValues((v) => ({ ...v, [k]: value }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }
  const id = (k: string) => `wallet-${slot}-${k}`

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate(values)
    if (Object.keys(errs).length) {
      setErrors(errs)
      announce(`Revise ${Object.keys(errs).length} campo(s).`, 'assertive')
      document.getElementById(id(Object.keys(errs)[0]!))?.focus()
      return
    }
    save.mutate(
      {
        slot,
        input: { ...values, network: values.network as Network, provider: values.provider as WalletProvider, ensName: values.ensName.replace(/\.eth$/, '') },
      },
      {
        onSuccess: onSaved,
        onError: (err) => {
          const api = toApiError(err)
          setErrors(Object.keys(api.fieldErrors).length ? api.fieldErrors : { form: api.message })
          announce(api.message, 'assertive')
          const first = Object.keys(api.fieldErrors)[0]
          if (first) document.getElementById(id(first))?.focus()
        },
      },
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-x-7 gap-y-5 lg:grid-cols-2" data-testid={`wallet-form-${slot}`}>
      {errors.form && (
        <p role="alert" className="lg:col-span-2 rounded-md border border-coral/60 bg-coral/10 px-3 py-2 text-[13px] text-coral">
          {errors.form}
        </p>
      )}
      <FormField label="Nome de exibição" required error={errors.displayName} id={id('displayName')}>
        {(f) => (
          <Input
            id={f.id}
            value={values.displayName}
            onChange={(e) => set('displayName')(e.target.value)}
            aria-describedby={f.describedBy}
            invalid={f.invalid}
          />
        )}
      </FormField>
      <FormField label="Apelido da carteira" required error={errors.nickname} id={id('nickname')}>
        {(f) => (
          <Input id={f.id} value={values.nickname} onChange={(e) => set('nickname')(e.target.value)} aria-describedby={f.describedBy} invalid={f.invalid} />
        )}
      </FormField>
      <FormField label="Rede" required error={errors.network} id={id('network')}>
        {(f) => (
          <Select value={values.network} onValueChange={(v) => set('network')(v)}>
            <SelectTrigger id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} data-testid={id('network')}>
              <SelectValue placeholder="Selecione uma rede" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
                <SelectItem key={n} value={n}>
                  {NETWORK_LABELS[n]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <FormField label="Nome do perfil" required error={errors.profileName} id={id('profileName')}>
        {(f) => (
          <Input
            id={f.id}
            value={values.profileName}
            onChange={(e) => set('profileName')(e.target.value)}
            aria-describedby={f.describedBy}
            invalid={f.invalid}
          />
        )}
      </FormField>
      <FormField label="Endereço da carteira" required error={errors.address} id={id('address')}>
        {(f) => (
          <Input
            id={f.id}
            value={values.address}
            onChange={(e) => set('address')(e.target.value)}
            placeholder="Endereço 0x da carteira"
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            className="font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </FormField>
      <FormField
        label={<span className="sr-only">ENS ou carteira secundária</span>}
        error={errors.secondaryAddress}
        id={id('secondaryAddress')}
        className="lg:pt-[26px]"
      >
        {(f) => (
          <Input
            id={f.id}
            value={values.secondaryAddress}
            onChange={(e) => set('secondaryAddress')(e.target.value)}
            placeholder="ENS ou carteira secundária (opcional)"
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            className="font-mono"
            autoComplete="off"
          />
        )}
      </FormField>
      <FormField label="Tipo de carteira" required error={errors.provider} id={id('provider')}>
        {(f) => (
          <Select value={values.provider} onValueChange={(v) => set('provider')(v)}>
            <SelectTrigger id={f.id} aria-describedby={f.describedBy} invalid={f.invalid} data-testid={id('provider')}>
              <SelectValue placeholder="Selecione uma carteira" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROVIDER_LABELS) as WalletProvider[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
      <FormField label="Código de indicação" required error={errors.referralCode} id={id('referralCode')}>
        {(f) => (
          <Input
            id={f.id}
            value={values.referralCode}
            onChange={(e) => set('referralCode')(e.target.value)}
            aria-describedby={f.describedBy}
            invalid={f.invalid}
          />
        )}
      </FormField>
      <FormField label="E-mail" required error={errors.email} id={id('email')}>
        {(f) => (
          <Input
            id={f.id}
            type="email"
            value={values.email}
            onChange={(e) => set('email')(e.target.value)}
            aria-describedby={f.describedBy}
            invalid={f.invalid}
            autoComplete="email"
          />
        )}
      </FormField>
      <FormField label="Nome ENS" required error={errors.ensName} id={id('ensName')}>
        {(f) => (
          <div className="flex gap-2">
            <span className="flex h-10 items-center rounded-md border border-primary/70 bg-surface px-3 text-[15px]" aria-hidden="true">
              .eth
            </span>
            <Input id={f.id} value={values.ensName} onChange={(e) => set('ensName')(e.target.value)} aria-describedby={f.describedBy} invalid={f.invalid} />
          </div>
        )}
      </FormField>
      <div className="flex gap-3 lg:col-span-2">
        <Button type="submit" className="h-10 px-4" loading={save.isPending} loadingText="Salvando…" data-testid={`wallet-save-${slot}`}>
          Salvar carteira
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}

/** Network/provider pickers reused by checkout. */
export function NetworkRadio({ value, onChange }: { value: Network; onChange: (n: Network) => void }) {
  return (
    <RadioGroup value={value} onValueChange={(v) => onChange(v as Network)} aria-label="Rede">
      {(Object.keys(NETWORK_LABELS) as Network[]).map((n) => (
        <label key={n} className="flex items-center gap-3 text-[15px]">
          <RadioGroupItem value={n} id={`net-${n}`} />
          {NETWORK_LABELS[n]}
        </label>
      ))}
    </RadioGroup>
  )
}

function WalletsSkeleton() {
  return (
    <div className="lg:pl-7" aria-busy="true" aria-label="Carregando carteiras">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="mt-2 h-4 w-80" />
      <div className="mt-6 grid gap-x-7 gap-y-5 lg:grid-cols-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
