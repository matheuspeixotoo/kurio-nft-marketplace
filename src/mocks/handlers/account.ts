import { http } from 'msw'
import type { PasswordChangeInput, ProfileUpdateInput, WalletInput, WalletSlot, Wallets } from '@/types/api'
import { db } from '../db'
import { hasFlag } from '../scenario'
import { HttpError, handler, json, noContent, nowIso, readJson, requireUser, sha256Hex } from '../utils'
import { validatePassword } from './auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const USERNAME_RE = /^[a-z0-9][a-z0-9._]{2,23}$/
const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const ENS_RE = /^[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})*$/
const MAX_AVATAR_BYTES = 1_500_000

export const accountHandlers = [
  http.get(
    '/api/profile',
    handler(({ request }) => {
      const user = requireUser(request)
      return json(db.state.profiles[user.id])
    }),
  ),

  http.patch(
    '/api/profile',
    handler(async ({ request }) => {
      const user = requireUser(request)
      const body = await readJson<Partial<ProfileUpdateInput>>(request)
      const fieldErrors: Record<string, string> = {}
      const displayName = (body.displayName ?? '').trim()
      const username = (body.username ?? '').trim().toLowerCase()
      const email = (body.email ?? '').trim().toLowerCase()
      const ensName = (body.ensName ?? '')
        .trim()
        .toLowerCase()
        .replace(/\.eth$/, '')
      const walletNickname = (body.walletNickname ?? '').trim()
      if (displayName.length < 2) fieldErrors.displayName = 'Informe um nome de exibição com ao menos 2 caracteres.'
      if (!USERNAME_RE.test(username)) fieldErrors.username = 'Use de 3 a 24 caracteres: letras minúsculas, números, ponto ou sublinhado.'
      if (!EMAIL_RE.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
      if (ensName && !ENS_RE.test(ensName)) fieldErrors.ensName = 'Nome ENS inválido (ex.: nova.kurio).'
      if (walletNickname.length < 2) fieldErrors.walletNickname = 'Informe um apelido para a carteira.'
      if (Object.keys(fieldErrors).length) throw new HttpError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)

      const others = Object.values(db.state.users).filter((u) => u.id !== user.id)
      if (hasFlag('profile-conflict') || others.some((u) => u.username.toLowerCase() === username)) {
        throw new HttpError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso.', { username: 'Nome de usuário indisponível.' })
      }
      if (others.some((u) => u.email.toLowerCase() === email)) {
        throw new HttpError(409, 'EMAIL_TAKEN', 'Já existe uma conta com este e-mail.', { email: 'E-mail já cadastrado em outra conta.' })
      }
      const profile = db.state.profiles[user.id]!
      Object.assign(profile, { displayName, username, email, ensName, walletNickname, updatedAt: nowIso() })
      Object.assign(db.state.users[user.id]!, { displayName, username, email })
      db.persist()
      return json(profile)
    }),
  ),

  http.put(
    '/api/profile/avatar',
    handler(async ({ request }) => {
      const user = requireUser(request)
      const body = await readJson<{ dataUrl: string }>(request)
      if (!body.dataUrl?.startsWith('data:image/'))
        throw new HttpError(422, 'VALIDATION_ERROR', 'Envie uma imagem PNG, JPG ou WEBP.', { avatar: 'Envie uma imagem PNG, JPG ou WEBP.' })
      if (body.dataUrl.length > MAX_AVATAR_BYTES)
        throw new HttpError(422, 'VALIDATION_ERROR', 'A imagem precisa ter menos de 1 MB.', { avatar: 'A imagem precisa ter menos de 1 MB.' })
      const profile = db.state.profiles[user.id]!
      profile.avatarUrl = body.dataUrl
      profile.updatedAt = nowIso()
      db.state.users[user.id]!.avatarUrl = body.dataUrl
      db.persist()
      return json(profile)
    }),
  ),

  http.delete(
    '/api/profile/avatar',
    handler(({ request }) => {
      const user = requireUser(request)
      const profile = db.state.profiles[user.id]!
      profile.avatarUrl = null
      profile.updatedAt = nowIso()
      db.state.users[user.id]!.avatarUrl = null
      db.persist()
      return json(profile)
    }),
  ),

  http.post(
    '/api/profile/password',
    handler(async ({ request }) => {
      const user = requireUser(request)
      const body = await readJson<PasswordChangeInput>(request)
      const record = db.state.users[user.id]!
      const fieldErrors: Record<string, string> = {}
      const currentHash = await sha256Hex(`${record.salt}:${body.currentPassword ?? ''}`)
      if (currentHash !== record.passwordHash) fieldErrors.currentPassword = 'Senha atual incorreta.'
      const pw = validatePassword(body.newPassword)
      if (pw) fieldErrors.newPassword = pw
      else if (body.newPassword === body.currentPassword) fieldErrors.newPassword = 'A nova senha precisa ser diferente da atual.'
      if (Object.keys(fieldErrors).length)
        throw new HttpError(422, fieldErrors.currentPassword ? 'WRONG_PASSWORD' : 'VALIDATION_ERROR', 'Não foi possível alterar a senha.', fieldErrors)
      record.salt = `salt_${Math.random().toString(36).slice(2, 10)}`
      record.passwordHash = await sha256Hex(`${record.salt}:${body.newPassword}`)
      db.persist()
      return noContent()
    }),
  ),

  http.get(
    '/api/wallets',
    handler(({ request }) => {
      const user = requireUser(request)
      return json(db.state.wallets[user.id] ?? { primary: null, secondary: null })
    }),
  ),

  http.put(
    '/api/wallets/:slot',
    handler(async ({ request, params }) => {
      const user = requireUser(request)
      const slot = params.slot as WalletSlot
      if (slot !== 'primary' && slot !== 'secondary') throw new HttpError(404, 'NOT_FOUND', 'Carteira não encontrada.')
      const body = await readJson<Partial<WalletInput>>(request)
      const wallets: Wallets = db.state.wallets[user.id] ?? { primary: null, secondary: null }

      if (slot === 'secondary' && body.sameAsPrimary) {
        if (!wallets.primary)
          throw new HttpError(422, 'VALIDATION_ERROR', 'Cadastre a carteira principal primeiro.', { sameAsPrimary: 'Cadastre a carteira principal primeiro.' })
        wallets.secondary = {
          ...wallets.primary,
          id: `wal_${user.id}_secondary`,
          slot: 'secondary',
          nickname: body.nickname?.trim() || 'Reserva',
          sameAsPrimary: true,
          updatedAt: nowIso(),
        }
        db.state.wallets[user.id] = wallets
        db.persist()
        return json(wallets)
      }

      const fieldErrors: Record<string, string> = {}
      const nickname = (body.nickname ?? '').trim()
      const displayName = (body.displayName ?? '').trim()
      const profileName = (body.profileName ?? '').trim()
      const email = (body.email ?? '').trim().toLowerCase()
      const address = (body.address ?? '').trim()
      const secondaryAddress = (body.secondaryAddress ?? '').trim()
      const referralCode = (body.referralCode ?? '').trim()
      const ensName = (body.ensName ?? '')
        .trim()
        .toLowerCase()
        .replace(/\.eth$/, '')
      const network = body.network
      const provider = body.provider
      if (nickname.length < 2) fieldErrors.nickname = 'Informe um apelido para a carteira.'
      if (displayName.length < 2) fieldErrors.displayName = 'Informe o nome de exibição.'
      if (profileName.length < 2) fieldErrors.profileName = 'Informe o nome do perfil.'
      if (!EMAIL_RE.test(email)) fieldErrors.email = 'Informe um e-mail válido.'
      if (!network || !['ethereum', 'polygon', 'solana'].includes(network)) fieldErrors.network = 'Selecione uma rede.'
      if (!provider || !['metamask', 'walletconnect', 'coinbase'].includes(provider)) fieldErrors.provider = 'Selecione o tipo de carteira.'
      if (network === 'solana' ? !SOLANA_ADDRESS_RE.test(address) : !EVM_ADDRESS_RE.test(address)) {
        fieldErrors.address =
          network === 'solana' ? 'Endereço Solana inválido (base58, 32–44 caracteres).' : 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.'
      }
      if (
        secondaryAddress &&
        !(EVM_ADDRESS_RE.test(secondaryAddress) || SOLANA_ADDRESS_RE.test(secondaryAddress) || ENS_RE.test(secondaryAddress.replace(/\.eth$/, '')))
      ) {
        fieldErrors.secondaryAddress = 'Informe um ENS ou endereço de carteira válido.'
      }
      if (!referralCode) fieldErrors.referralCode = 'Informe o código de indicação.'
      if (!ensName || !ENS_RE.test(ensName)) fieldErrors.ensName = 'Informe um nome ENS válido.'
      if (Object.keys(fieldErrors).length) throw new HttpError(422, 'VALIDATION_ERROR', 'Revise os campos destacados.', fieldErrors)
      if (hasFlag('profile-conflict'))
        throw new HttpError(409, 'USERNAME_TAKEN', 'Este nome de perfil já está em uso por outro colecionador.', {
          profileName: 'Nome de perfil indisponível.',
        })

      wallets[slot] = {
        id: `wal_${user.id}_${slot}`,
        slot,
        nickname,
        displayName,
        profileName,
        email,
        network: network!,
        address,
        secondaryAddress,
        provider: provider!,
        referralCode,
        ensName,
        sameAsPrimary: false,
        updatedAt: nowIso(),
      }
      db.state.wallets[user.id] = wallets
      db.persist()
      return json(wallets)
    }),
  ),

  http.delete(
    '/api/wallets/:slot',
    handler(({ request, params }) => {
      const user = requireUser(request)
      const slot = params.slot as WalletSlot
      const wallets: Wallets = db.state.wallets[user.id] ?? { primary: null, secondary: null }
      if (slot === 'primary' && wallets.secondary && !wallets.secondary.sameAsPrimary) {
        wallets.primary = { ...wallets.secondary, id: `wal_${user.id}_primary`, slot: 'primary' }
        wallets.secondary = null
      } else if (slot === 'primary') {
        wallets.primary = null
        wallets.secondary = null
      } else {
        wallets.secondary = null
      }
      db.state.wallets[user.id] = wallets
      db.persist()
      return json(wallets)
    }),
  ),
]
