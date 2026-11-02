import { http, HttpResponse } from 'msw'
import type { MockStatus, MockTrigger, ScenarioFlag } from '@/types/api'
import { db, DB_SEED } from '../db'
import { getFlags, parseFlags, resetPrng, setFlags } from '../scenario'
import { errorResponse, json, readJson, resetFlaky } from '../utils'
import { applyNftChange } from '../services'
import { connectedSocketsCount, disconnectAllSockets, replayEvent } from '../socket'
import { resetScenarioMemory, settleNow } from './commerce'

function status(): MockStatus {
  return { scenario: getFlags(), seed: DB_SEED, connectedSockets: connectedSocketsCount(), persisted: db.persisted }
}

/** Control plane for demos and tests. Never affected by latency/failure flags. */
export const controlHandlers = [
  http.get('/api/_mock/status', () => json(status())),

  http.put('/api/_mock/scenario', async ({ request }) => {
    const body = await readJson<{ flags: ScenarioFlag[] | string }>(request)
    const flags = Array.isArray(body.flags) ? parseFlags(body.flags.join(',')) : parseFlags(body.flags)
    setFlags(flags)
    resetFlaky()
    resetPrng()
    resetScenarioMemory()
    return json(status())
  }),

  http.post('/api/_mock/reset', () => {
    db.reset()
    resetFlaky()
    resetPrng()
    resetScenarioMemory()
    return json(status())
  }),

  http.post('/api/_mock/trigger', async ({ request }) => {
    const trigger = await readJson<MockTrigger>(request)
    switch (trigger.type) {
      case 'nft.updated': {
        if (!db.state.nfts[trigger.nftId]) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
        applyNftChange(trigger.nftId, { price: trigger.price, available: trigger.available })
        return json({ ok: true })
      }
      case 'order.updated': {
        const order = settleNow(trigger.orderId, trigger.status)
        if (!order) return errorResponse(404, 'NOT_FOUND', 'Pedido não encontrado.')
        return json({ ok: true })
      }
      case 'socket.disconnect':
        disconnectAllSockets()
        return json({ ok: true })
      case 'socket.replay':
        replayEvent(trigger.eventId)
        return json({ ok: true })
      case 'session.expire':
        for (const token of Object.keys(db.state.sessions)) delete db.state.sessions[token]
        db.persist()
        return json({ ok: true })
      default:
        return HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Gatilho desconhecido.' } }, { status: 400 })
    }
  }),
]
