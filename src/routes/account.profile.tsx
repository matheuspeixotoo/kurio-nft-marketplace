import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ImageIcon } from 'lucide-react'
import { z } from 'zod'
import type { Profile } from '@/types/api'
import { toApiError } from '@/lib/api/errors'
import { useAvatar, useChangePassword, useProfile, useUpdateProfile } from '@/features/account/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { FormField } from '@/components/ui/form-field'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/ui/state-blocks'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/misc'
import { useAnnounce } from '@/components/live-announcer'
import { useDocumentTitle } from '@/lib/use-document-title'

export const Route = createFileRoute('/account/profile')({
  component: ProfilePage,
})

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe um nome de exibição com ao menos 2 caracteres.'),
  username: z
    .string()
    .trim()
    .min(3, 'Use pelo menos 3 caracteres.')
    .max(24, 'Use no máximo 24 caracteres.')
    .regex(/^[a-z0-9][a-z0-9._]*$/, 'Use letras minúsculas, números, ponto ou sublinhado.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  ensName: z
    .string()
    .trim()
    .regex(/^$|^[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*$/i, 'Nome ENS inválido.'),
  walletNickname: z.string().trim().min(2, 'Informe um apelido para a carteira.'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(8, 'A nova senha precisa ter pelo menos 8 caracteres.')
      .regex(/[a-zA-Z]/, 'Use letras e números.')
      .regex(/\d/, 'Use letras e números.'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'As senhas não coincidem.', path: ['confirmPassword'] })

function zodErrors(err: z.ZodError) {
  const out: Record<string, string> = {}
  for (const i of err.issues) {
    const k = String(i.path[0] ?? 'form')
    if (!out[k]) out[k] = i.message
  }
  return out
}

function ProfilePage() {
  const profile = useProfile()
  useDocumentTitle('Perfil do colecionador — Kurio')
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} retrying={profile.isFetching} />
  if (profile.isPending) return <ProfileSkeleton />
  return <ProfileForms profile={profile.data} />
}

function ProfileForms({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const avatar = useAvatar()
  const changePassword = useChangePassword()
  const announce = useAnnounce()
  const fileRef = useRef<HTMLInputElement>(null)

  const [values, setValues] = useState({
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName,
    walletNickname: profile.walletNickname,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [avatarError, setAvatarError] = useState<string | null>(null)

  useEffect(() => {
    setValues({
      displayName: profile.displayName,
      username: profile.username,
      email: profile.email,
      ensName: profile.ensName,
      walletNickname: profile.walletNickname,
    })
  }, [profile])

  const set = (k: keyof typeof values) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: '' }))
  }

  const onSubmitProfile = (e: FormEvent) => {
    e.preventDefault()
    const parsed = profileSchema.safeParse(values)
    if (!parsed.success) {
      const errs = zodErrors(parsed.error)
      setErrors(errs)
      announce(`Revise ${Object.keys(errs).length} campo(s).`, 'assertive')
      document.getElementById(`profile-${Object.keys(errs)[0]}`)?.focus()
      return
    }
    update.mutate(parsed.data, {
      onError: (err) => {
        const api = toApiError(err)
        setErrors(api.fieldErrors)
        announce(api.message, 'assertive')
        const first = Object.keys(api.fieldErrors)[0]
        if (first) document.getElementById(`profile-${first}`)?.focus()
      },
    })
  }

  const onSubmitPassword = (e: FormEvent) => {
    e.preventDefault()
    const parsed = passwordSchema.safeParse(pw)
    if (!parsed.success) {
      const errs = zodErrors(parsed.error)
      setPwErrors(errs)
      announce(`Revise ${Object.keys(errs).length} campo(s) da senha.`, 'assertive')
      document.getElementById(`pw-${Object.keys(errs)[0]}`)?.focus()
      return
    }
    changePassword.mutate(
      { currentPassword: pw.currentPassword, newPassword: pw.newPassword },
      {
        onSuccess: () => {
          setPw({ currentPassword: '', newPassword: '', confirmPassword: '' })
          setPwErrors({})
        },
        onError: (err) => {
          const api = toApiError(err)
          setPwErrors(Object.keys(api.fieldErrors).length ? api.fieldErrors : { currentPassword: api.message })
          announce(api.message, 'assertive')
        },
      },
    )
  }

  const onPickAvatar = (file: File | undefined) => {
    setAvatarError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarError('Envie uma imagem PNG, JPG ou WEBP.')
      return
    }
    if (file.size > 1_000_000) {
      setAvatarError('A imagem precisa ter menos de 1 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () =>
      avatar.set.mutate(String(reader.result), { onError: (err) => setAvatarError(toApiError(err).fieldErrors.avatar ?? toApiError(err).message) })
    reader.readAsDataURL(file)
  }

  const formError = update.isError && !Object.keys(toApiError(update.error).fieldErrors).length ? toApiError(update.error).message : null
  const initials = (profile.displayName || profile.username).slice(0, 2).toUpperCase()

  return (
    <div className="lg:pl-7">
      <h1 className="text-[17px] font-bold">Perfil do colecionador</h1>
      <form onSubmit={onSubmitProfile} noValidate className="mt-8 grid gap-x-7 gap-y-6 lg:grid-cols-2" data-testid="profile-form">
        {formError && (
          <p role="alert" className="lg:col-span-2 rounded-md border border-coral/60 bg-coral/10 px-3 py-2 text-[13px] text-coral">
            {formError}
          </p>
        )}
        <FormField label="Nome de exibição" required error={errors.displayName} id="profile-displayName">
          {(f) => (
            <Input
              id={f.id}
              value={values.displayName}
              onChange={set('displayName')}
              autoComplete="name"
              aria-describedby={f.describedBy}
              invalid={f.invalid}
            />
          )}
        </FormField>
        <FormField label="Nome de usuário" required error={errors.username} id="profile-username">
          {(f) => (
            <Input id={f.id} value={values.username} onChange={set('username')} autoComplete="username" aria-describedby={f.describedBy} invalid={f.invalid} />
          )}
        </FormField>
        <FormField label="E-mail" required error={errors.email} id="profile-email">
          {(f) => (
            <Input
              id={f.id}
              type="email"
              value={values.email}
              onChange={set('email')}
              autoComplete="email"
              aria-describedby={f.describedBy}
              invalid={f.invalid}
            />
          )}
        </FormField>
        <FormField label="Nome ENS" required error={errors.ensName} id="profile-ensName" hint="Sufixo .eth adicionado automaticamente.">
          {(f) => (
            <div className="flex gap-2">
              <span className="flex h-10 items-center rounded-md border border-primary/70 bg-surface px-3 text-[15px]" aria-hidden="true">
                .eth
              </span>
              <Input id={f.id} value={values.ensName} onChange={set('ensName')} aria-describedby={f.describedBy} invalid={f.invalid} placeholder="nova.kurio" />
            </div>
          )}
        </FormField>
        <FormField label="Apelido da carteira" required error={errors.walletNickname} id="profile-walletNickname">
          {(f) => <Input id={f.id} value={values.walletNickname} onChange={set('walletNickname')} aria-describedby={f.describedBy} invalid={f.invalid} />}
        </FormField>
        <div>
          <p className="text-[15px]">Avatar</p>
          <div className="mt-2 flex items-center gap-4">
            <Avatar className="size-12">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={`Avatar de ${profile.displayName}`} />}
              <AvatarFallback>{profile.avatarUrl ? initials : <ImageIcon className="size-5" aria-hidden="true" />}</AvatarFallback>
            </Avatar>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              id="avatar-file"
              onChange={(e) => onPickAvatar(e.target.files?.[0])}
              aria-describedby={avatarError ? 'avatar-error' : undefined}
              data-testid="avatar-input"
            />
            <Button type="button" className="h-10 px-6" onClick={() => fileRef.current?.click()} loading={avatar.set.isPending} loadingText="Enviando…">
              Alterar
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-foreground"
              onClick={() => avatar.remove.mutate()}
              disabled={!profile.avatarUrl}
              loading={avatar.remove.isPending}
            >
              Remover
            </Button>
          </div>
          {avatarError && (
            <p id="avatar-error" role="alert" className="mt-2 text-[13px] text-coral">
              {avatarError}
            </p>
          )}
        </div>
        <div className="lg:col-span-2">
          <Button type="submit" className="h-10 w-[130px]" loading={update.isPending} loadingText="Salvando…" data-testid="profile-save">
            Salvar
          </Button>
        </div>
      </form>

      <form onSubmit={onSubmitPassword} noValidate className="mt-10 max-w-[416px]" data-testid="password-form">
        <h2 className="text-[17px] font-bold">Alterar senha</h2>
        <div className="mt-5 grid gap-6">
          <FormField label="Senha atual" error={pwErrors.currentPassword} id="pw-currentPassword">
            {(f) => (
              <PasswordInput
                id={f.id}
                value={pw.currentPassword}
                onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
                autoComplete="current-password"
                aria-describedby={f.describedBy}
                invalid={f.invalid}
              />
            )}
          </FormField>
          <FormField label="Nova senha" error={pwErrors.newPassword} id="pw-newPassword" hint="Mínimo de 8 caracteres com letras e números.">
            {(f) => (
              <PasswordInput
                id={f.id}
                value={pw.newPassword}
                onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
                autoComplete="new-password"
                aria-describedby={f.describedBy}
                invalid={f.invalid}
              />
            )}
          </FormField>
          <FormField label="Confirmar nova senha" error={pwErrors.confirmPassword} id="pw-confirmPassword">
            {(f) => (
              <PasswordInput
                id={f.id}
                value={pw.confirmPassword}
                onChange={(e) => setPw((p) => ({ ...p, confirmPassword: e.target.value }))}
                autoComplete="new-password"
                aria-describedby={f.describedBy}
                invalid={f.invalid}
              />
            )}
          </FormField>
          <div>
            <Button type="submit" className="h-10 w-[130px]" loading={changePassword.isPending} loadingText="Salvando…" data-testid="password-save">
              Salvar
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="lg:pl-7" aria-busy="true" aria-label="Carregando perfil">
      <Skeleton className="h-6 w-56" />
      <div className="mt-8 grid gap-x-7 gap-y-6 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
