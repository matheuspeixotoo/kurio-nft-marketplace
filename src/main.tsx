import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { enableMocking } from '@/mocks/browser'
import { App } from '@/app/app'

/**
 * Boot order matters: the mock layer (MSW + Socket.IO binding) starts before the first request
 * leaves the app, and `socket.io-client` is imported lazily by the RealtimeProvider so that its
 * module is evaluated only after MSW patched `globalThis.WebSocket`. Everything else is imported
 * statically so Vite can modulepreload the chunks in parallel.
 */
async function bootstrap() {
  await enableMocking()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
