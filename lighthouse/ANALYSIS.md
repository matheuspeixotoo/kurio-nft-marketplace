# Lighthouse — análise dos resultados

Medianas de 3 medições (build otimizado, cenário padrão dos mocks, `lighthouse/run.mjs`). Os números exatos da última execução estão em [`RESULTS.md`](./RESULTS.md) e em `reports/summary.json`.

| Página | Perfil | Performance | A11y | Best Practices | SEO | Meta atingida? |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Início | Desktop | 97 | 100 | 100 | 100 | ✅ |
| Detalhes do NFT | Desktop | 98 | 100 | 100 | 100 | ✅ |
| Início | Mobile | 74 | 100 | 100 | 100 | ⚠️ Performance abaixo de 90 |
| Detalhes do NFT | Mobile | 77 | 100 | 100 | 100 | ⚠️ Performance abaixo de 90 |

## Core Web Vitals observados

| Página / perfil | LCP | CLS | TBT |
| --- | ---: | ---: | ---: |
| Início / Mobile | ~4,6 s | 0,001 | ~390 ms |
| Início / Desktop | ~1,2 s | 0,002 | 0 ms |
| Detalhe / Mobile | ~4,5 s | 0,000 | ~320 ms |
| Detalhe / Desktop | ~1,1 s | 0,000 | 0 ms |

CLS e TBT estão dentro dos limiares "bons" (< 0,1 e < 200–600 ms) em todos os casos. O único indicador fora da meta é o **LCP no perfil mobile**.

## Causa do LCP mobile

O perfil mobile do Lighthouse simula **slow 4G (1,6 Mbps, 150 ms de RTT) com CPU 4× mais lenta**. Nessas condições o LCP é determinado quase inteiramente pelo tempo de download + parse/execução do JavaScript necessário antes da primeira renderização:

| Chunk | Tamanho (gzip) | Por quê existe |
| --- | ---: | --- |
| `mocks` (MSW browser + interceptors + binding Socket.IO + fixtures) | ~166 kB | **Exigência do desafio**: a camada de mocks precisa estar no build de demonstração e inicia antes da primeira requisição (`worker.start()` precede o `render`). Num deploy com backend real este chunk não existiria. |
| `vendor` (React DOM, TanStack Router/Query, Axios, decimal.js, Zod) | ~168 kB | Stack obrigatória. |
| `ui` (Radix UI + ícones) | ~53 kB | Componentes shadcn/ui acessíveis. |
| `index` + rotas | ~31 kB | Código da aplicação. |

Em slow 4G, ~420 kB transferidos correspondem a ~2,1 s só de download, somados a ~1,7 s de *bootup* de JS com CPU 4× mais lenta (auditoria `bootup-time`). A imagem LCP (hero, WebP de 18 kB com `fetchpriority=high` e `preload`) chega bem antes, mas só é pintada quando o React monta.

## O que já foi feito

- Imagens dos NFTs em WebP, em 3 tamanhos (160/480/800 px), com `width`/`height`, `loading="lazy"` fora da dobra e `fetchpriority="high"` + `<link rel="preload">` para a imagem do hero.
- Fonte Roboto Mono self-hosted (3 pesos, subset latin, `font-display: swap`).
- Chunks estáticos pré-carregados em paralelo (`modulepreload`); apenas `socket.io-client` é carregado após o boot (precisa do `WebSocket` interceptado).
- Code-splitting por rota (TanStack Router `autoCodeSplitting`), devtools e painel de cenários carregados sob demanda.
- Skeletons com dimensões reservadas e `min-height` no `main` → CLS ≈ 0.
- Sem recursos bloqueantes de render além do CSS (11 kB gzip).

## O que traria o mobile para ≥ 90 (fora do escopo desta entrega)

1. **Remover a camada de mocks do bundle** apontando `VITE_ENABLE_MOCKS=false` para um backend real: corta ~40% do JavaScript inicial.
2. **Renderização no servidor ou shell estático** do hero/catalogo (SSR/SSG com TanStack Start), para que o LCP não dependa do boot do React.
3. Trocar `decimal.js` por uma aritmética decimal própria e `zod` por `zod/mini` (~15–20 kB gzip).

Nenhuma simplificação foi feita exclusivamente para pontuar: a auditoria carrega imagens, fontes, mocks e tempo real exatamente como a entrega publicada.
