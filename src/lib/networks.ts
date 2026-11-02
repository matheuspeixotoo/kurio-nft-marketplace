import type { Network } from '@/types/api'

/** Human-readable network names (shared by the UI and the mock fixtures). */
export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}
