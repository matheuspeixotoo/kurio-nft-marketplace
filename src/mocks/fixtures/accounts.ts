import type { Profile, User, Wallets } from '@/types/api'

/**
 * Two fixture collectors. Passwords are NOT stored in clear text: the mock keeps a
 * salted SHA-256 digest (sha256(`${salt}:${password}`)) and compares digests on login.
 *
 *   ana@kurio.app   / Kurio@2026   (has wallets + a confirmed order)
 *   bruno@kurio.app / Kurio@2026   (fresh account, no wallets)
 */
export interface UserRecord extends User {
  salt: string
  passwordHash: string
}

export const FIXTURE_PASSWORD = 'Kurio@2026'

export const users: UserRecord[] = [
  {
    id: 'usr_ana',
    username: 'ana.colecionadora',
    displayName: 'Ana Ribeiro',
    email: 'ana@kurio.app',
    avatarUrl: null,
    createdAt: '2026-05-12T14:20:00.000Z',
    salt: 'salt_ana_7f3a',
    passwordHash: '68d1763d0ac7151d74c9462ef7f718a56e6ac9ae2f233ae9d101ae806da26d6c',
  },
  {
    id: 'usr_bruno',
    username: 'bruno.mints',
    displayName: 'Bruno Carvalho',
    email: 'bruno@kurio.app',
    avatarUrl: null,
    createdAt: '2026-08-02T09:05:00.000Z',
    salt: 'salt_bruno_c21e',
    passwordHash: '668dbe17f1681298da777502a63fd57e22722dccd2bd63499479bd045bdcc886',
  },
]

export const profiles: Record<string, Profile> = {
  usr_ana: {
    id: 'usr_ana',
    displayName: 'Ana Ribeiro',
    username: 'ana.colecionadora',
    email: 'ana@kurio.app',
    ensName: 'ana',
    walletNickname: 'Reserva',
    avatarUrl: null,
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
  usr_bruno: {
    id: 'usr_bruno',
    displayName: 'Bruno Carvalho',
    username: 'bruno.mints',
    email: 'bruno@kurio.app',
    ensName: '',
    walletNickname: '',
    avatarUrl: null,
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
}

export const wallets: Record<string, Wallets> = {
  usr_ana: {
    primary: {
      id: 'wal_ana_primary',
      slot: 'primary',
      nickname: 'Principal',
      displayName: 'Ana Ribeiro',
      profileName: 'ana.colecionadora',
      email: 'ana@kurio.app',
      network: 'ethereum',
      address: '0xA91F3c8D2e7B4a0f9C6d5E1b8A7f2C3d4E5b6E82',
      secondaryAddress: '',
      provider: 'metamask',
      referralCode: 'KURIO-ANA',
      ensName: 'ana',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
    secondary: {
      id: 'wal_ana_secondary',
      slot: 'secondary',
      nickname: 'Reserva',
      displayName: 'Ana Ribeiro',
      profileName: 'ana.colecionadora',
      email: 'ana@kurio.app',
      network: 'polygon',
      address: '0x5bC1E7a84d6B9C0e2F5A713Fd1a8B6c47E9A0D2f',
      secondaryAddress: '',
      provider: 'coinbase',
      referralCode: 'KURIO-ANA',
      ensName: 'nova.kurio',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
  },
  usr_bruno: { primary: null, secondary: null },
}

export interface Coupon {
  code: string
  percent: number
  expiresAt: string | null
  label: string
}

export const coupons: Coupon[] = [
  { code: 'KURIO10', percent: 10, expiresAt: null, label: 'Desconto do lançamento (10%)' },
  { code: 'GENESIS5', percent: 5, expiresAt: null, label: 'Lançamentos gênesis (5%)' },
  { code: 'LAUNCH20', percent: 20, expiresAt: '2026-01-31T23:59:59.000Z', label: 'Pré-venda (expirado)' },
]

export const NETWORK_FEES: Record<'ethereum' | 'polygon' | 'solana', string> = {
  ethereum: '0.016',
  polygon: '0.004',
  solana: '0.002',
}
