import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          // socket.io-client must live in a chunk that is evaluated only after MSW patched
          // globalThis.WebSocket (engine.io-client captures it at module-evaluation time).
          // The parsers are shared with the mock binding, so they go to the mocks chunk.
          if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'realtime'
          if (id.includes('/msw/') || id.includes('@mswjs') || id.includes('socket.io-parser') || id.includes('engine.io-parser')) return 'mocks'
          if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'ui'
          return 'vendor'
        },
      },
    },
  },
})
