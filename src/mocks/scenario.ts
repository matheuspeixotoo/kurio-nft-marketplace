import type { ScenarioFlag } from '@/types/api'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'

export const ALL_FLAGS: { flag: ScenarioFlag; label: string; description: string }[] = [
  { flag: 'slow', label: 'Lento', description: 'Todas as respostas levam ~2,5 s (skeletons).' },
  {
    flag: 'variable-latency',
    label: 'Latência variável',
    description: 'Latência aleatória, porém determinística, de 150 a 2600 ms — produz respostas fora de ordem.',
  },
  {
    flag: 'flaky',
    label: 'Instável',
    description: 'As 3 primeiras chamadas de cada endpoint falham com 503 (esgotam os retries automáticos); a nova tentativa manual funciona.',
  },
  { flag: 'offline', label: 'Sem conexão', description: 'Todas as chamadas REST falham com erro de rede.' },
  { flag: 'timeout', label: 'Timeout', description: 'As chamadas REST nunca respondem (timeout do cliente em 8 s).' },
  { flag: 'empty-catalog', label: 'Catálogo vazio', description: 'A listagem retorna zero itens.' },
  { flag: 'session-expired', label: 'Sessão expira', description: 'Sessões criadas duram apenas 20 s.' },
  { flag: 'register-conflict', label: 'Conflito de cadastro', description: 'Qualquer cadastro responde 409 (e-mail já usado).' },
  { flag: 'coupon-expired', label: 'Cupom expirado', description: 'Todos os cupons respondem como expirados.' },
  {
    flag: 'price-change',
    label: 'Preço muda no checkout',
    description: 'Após a primeira cotação do checkout, o preço do 1º item sobe 10% e um nft.updated é emitido.',
  },
  { flag: 'sold-out', label: 'Edição esgota no checkout', description: 'Após a primeira cotação do checkout, a edição do 1º item esgota.' },
  { flag: 'order-timeout', label: 'Timeout do pedido', description: 'A 1ª criação de pedido nunca responde; a repetição com a mesma chave recupera o pedido.' },
  { flag: 'payment-declined', label: 'Pagamento recusado', description: 'Pedidos são recusados pela rede após alguns segundos.' },
  { flag: 'wallet-rejected', label: 'Carteira recusa', description: 'A conexão com a carteira é recusada pelo provedor.' },
  { flag: 'favorites-fail', label: 'Favorito falha', description: 'Mutations de favoritos respondem 500 (rollback otimista).' },
  { flag: 'profile-conflict', label: 'Conflito de perfil', description: 'Salvar perfil/carteira responde 409 (nome de usuário em uso).' },
]

const VALID = new Set<string>(ALL_FLAGS.map((f) => f.flag))

export function parseFlags(raw: string | null | undefined): ScenarioFlag[] {
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is ScenarioFlag => VALID.has(s)),
    ),
  )
}

export function getFlags(): ScenarioFlag[] {
  return parseFlags(readStorage(STORAGE_KEYS.scenario))
}

export function setFlags(flags: ScenarioFlag[]) {
  writeStorage(STORAGE_KEYS.scenario, flags.length ? flags.join(',') : null)
}

export function hasFlag(flag: ScenarioFlag) {
  return getFlags().includes(flag)
}

/** Deterministic PRNG so "variable latency" is reproducible for a given request order. */
let prngState = 0x9e3779b9
export function resetPrng(seed = 0x9e3779b9) {
  prngState = seed >>> 0
}
export function nextRandom() {
  // mulberry32
  prngState = (prngState + 0x6d2b79f5) >>> 0
  let t = prngState
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const BASE_LATENCY_MS = 350
export const SLOW_LATENCY_MS = 2500
