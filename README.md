# Kurio — Marketplace de NFTs

Implementação do [desafio frontend](https://github.com/junglegaming/frontend-challenge) a partir do [layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1): fluxos de descoberta, compra e conta do colecionador, com APIs, autenticação, carteiras, pagamentos e tempo real **100% simulados no navegador** (MSW + Socket.IO), inclusive no build publicado.

- **Demo:** _URL pública publicada na Vercel (ver seção Deploy)_
- **Documentação técnica:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) (contratos REST e eventos, sessão, carrinho, cache, reconciliação REST ⇄ Socket.IO, decisões de UX e desvios do Figma)
- **Auditoria Lighthouse:** [`lighthouse/RESULTS.md`](./lighthouse/RESULTS.md) (medianas) e [`lighthouse/ANALYSIS.md`](./lighthouse/ANALYSIS.md) (análise e causas)

## Stack

| Responsabilidade      | Tecnologia                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Interface / linguagem | React 19 + TypeScript 7 (strict)                                                         |
| Build                 | Vite 8                                                                                   |
| Roteamento            | TanStack Router (file-based, `validateSearch` com Zod, `beforeLoad` para rotas privadas) |
| Estado remoto         | TanStack Query 5 (queries, mutations, cache, atualização otimista)                       |
| HTTP                  | Axios (instância única com interceptors de sessão)                                       |
| Tempo real            | `socket.io-client` (transporte WebSocket)                                                |
| Estilo / componentes  | Tailwind CSS 4 + componentes shadcn/ui adaptados (Radix UI)                              |
| Mocking               | MSW 2 (REST + WebSocket) + `@mswjs/socket.io-binding`                                    |
| Testes                | Playwright (E2E + regressão visual, Chromium desktop e mobile)                           |
| Performance           | Lighthouse (script versionado em `lighthouse/run.mjs`)                                   |

## Setup

Requisitos: Node 20+ e npm.

```bash
npm ci                      # instala dependências (lockfile versionado)
npx playwright install chromium   # só para os testes E2E / Lighthouse
npm run dev                 # http://127.0.0.1:5173 com mocks ativos
```

Comandos:

| Comando                           | O que faz                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`                     | Servidor de desenvolvimento (mocks ativos, devtools do TanStack Query)                 |
| `npm run build`                   | Type-check (`tsc -b`) + build otimizado em `dist/`                                     |
| `npm run preview`                 | Serve o build em http://127.0.0.1:4173 (mesmo bundle do deploy)                        |
| `npm run typecheck`               | Verificação de tipos                                                                   |
| `npm run lint`                    | oxlint em `src`, `e2e` e `lighthouse`                                                  |
| `npm run format` / `format:check` | Prettier                                                                               |
| `npm run test:e2e`                | Playwright contra o build (`vite preview` é iniciado automaticamente)                  |
| `npm run test:e2e:update`         | Regera as baselines de regressão visual                                                |
| `npm run test:report`             | Abre o relatório HTML da última execução                                               |
| `npm run lighthouse`              | Audita Início e Detalhe (mobile + desktop, 3 medições) e grava `lighthouse/RESULTS.md` |

> Os testes e o Lighthouse auditam o **build de produção**. Rode `npm run build` antes (ou use `npm run lighthouse:ci`).

## Variáveis de ambiente

Nenhuma é obrigatória. Todas são opcionais e lidas em build (`import.meta.env`):

| Variável                    | Padrão                        | Uso                                                                                              |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `VITE_ENABLE_MOCKS`         | `true`                        | `false` desliga o MSW (a aplicação passa a chamar `VITE_API_URL` e `VITE_SOCKET_URL` reais)      |
| `VITE_API_URL`              | `/api`                        | Base das chamadas REST (Axios)                                                                   |
| `VITE_SOCKET_URL`           | `ws://realtime.kurio.mock`    | Origem do Socket.IO. O host `.mock` nunca é resolvido: o MSW intercepta o WebSocket antes do DNS |
| `VITE_HTTP_TIMEOUT_MS`      | `8000`                        | Timeout do Axios                                                                                 |
| `E2E_BASE_URL` / `E2E_PORT` | `http://127.0.0.1:4173`       | Alvo do Playwright                                                                               |
| `LH_BASE_URL` / `LH_RUNS`   | `http://127.0.0.1:4173` / `3` | Alvo e nº de medições do Lighthouse                                                              |

## Credenciais fictícias

| Conta          | E-mail            | Senha        | Observações                                                                                               |
| -------------- | ----------------- | ------------ | --------------------------------------------------------------------------------------------------------- |
| Ana Ribeiro    | `ana@kurio.app`   | `Kurio@2026` | Carteiras principal (MetaMask/Ethereum) e secundária (Coinbase/Polygon), 2 favoritos, 1 pedido confirmado |
| Bruno Carvalho | `bruno@kurio.app` | `Kurio@2026` | Conta nova, sem carteiras                                                                                 |

Cupons: `KURIO10` (10%), `GENESIS5` (5%), `LAUNCH20` (expirado). Senhas nunca ficam em claro: o mock guarda `sha256(salt:senha)`.

## Cenários de simulação

Os mocks rodam no navegador e persistem em `localStorage` (catálogo, usuários, sessões, carrinhos, favoritos, pedidos). Três formas de controlar:

1. **URL** — `?scenario=slow,flaky` ativa flags (salvas até serem trocadas); `?scenario=` limpa; `?reset=1` restaura integralmente o estado inicial. Os parâmetros são consumidos antes do app renderizar e removidos da URL.
2. **Painel “Cenários de simulação”** — botão com o ícone de frasco (canto inferior direito): liga/desliga flags, dispara eventos de tempo real, expira sessões e faz o reset total.
3. **API de controle** (também usada pelos testes): `GET /api/_mock/status`, `PUT /api/_mock/scenario {flags}`, `POST /api/_mock/reset`, `POST /api/_mock/trigger {type: 'nft.updated' | 'order.updated' | 'socket.disconnect' | 'socket.replay' | 'session.expire', ...}`.

| Flag                | Efeito                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `slow`              | Todas as respostas levam ~2,5 s (skeletons)                                                                          |
| `variable-latency`  | Latência pseudoaleatória determinística (150–2600 ms) → respostas fora de ordem                                      |
| `flaky`             | As 3 primeiras chamadas de cada endpoint respondem 503 (esgotam os retries automáticos); a tentativa manual funciona |
| `offline`           | Todas as chamadas REST falham com erro de rede                                                                       |
| `timeout`           | As chamadas REST nunca respondem (timeout do cliente em 8 s)                                                         |
| `empty-catalog`     | Catálogo vazio                                                                                                       |
| `session-expired`   | Sessões criadas duram 20 s                                                                                           |
| `register-conflict` | Qualquer cadastro responde 409                                                                                       |
| `coupon-expired`    | Todos os cupons respondem como expirados                                                                             |
| `price-change`      | 1,5 s após a 1ª cotação do checkout, o preço do 1º item sobe 10% e `nft.updated` é emitido                           |
| `sold-out`          | 1,5 s após a 1ª cotação do checkout, a edição do 1º item esgota                                                      |
| `order-timeout`     | A 1ª criação de pedido nunca responde; o reenvio com a mesma chave recupera o pedido                                 |
| `payment-declined`  | Pedidos são recusados pela rede após ~3 s                                                                            |
| `wallet-rejected`   | A carteira recusa a conexão                                                                                          |
| `favorites-fail`    | Mutations de favoritos respondem 500 (rollback otimista)                                                             |
| `profile-conflict`  | Salvar perfil/carteira responde 409                                                                                  |

### Reproduzindo os fluxos de falha

| Fluxo                            | Como reproduzir                                                                                                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resultado vazio                  | `/?q=zzz` ou `/?scenario=empty-catalog`                                                                                                                                                        |
| Latência e fora de ordem         | `/?scenario=variable-latency` e troque filtros rapidamente — a última consulta sempre vence (respostas obsoletas são canceladas/descartadas)                                                   |
| Falha HTTP + nova tentativa      | `/?scenario=flaky` → estado de erro → “Tentar novamente”                                                                                                                                       |
| Sem conexão                      | `/nft/emerald-ape-042?scenario=offline`                                                                                                                                                        |
| Sessão expirada                  | `/?scenario=session-expired`, entre, abra `/account/wallets`, aguarde 20 s e recarregue → volta ao login com `redirect` preservado. Ou use “Expirar todas as sessões” no painel                |
| Conflito de cadastro             | Cadastre-se com `ana@kurio.app` (ou `?scenario=register-conflict`)                                                                                                                             |
| Cupom inválido/expirado          | No carrinho aplique `NAOEXISTE` e `LAUNCH20` (ou `?scenario=coupon-expired`)                                                                                                                   |
| Preço muda durante o checkout    | Entre, adicione um NFT, abra `/checkout?scenario=price-change`: o resumo atualiza sozinho e a revisão exige nova confirmação. Ou abra a revisão e use “Subir 10% o preço do 1º item” no painel |
| Edição esgota durante o checkout | `?scenario=sold-out` ou “Esgotar o 1º item” no painel                                                                                                                                          |
| Timeout após criar o pedido      | Ative `order-timeout` no painel antes de confirmar: o cliente estoura em 8 s, o diálogo oferece “Reenviar pedido” com a mesma chave de idempotência e recupera o pedido já criado              |
| Pagamento recusado               | `?scenario=payment-declined` e conclua a compra                                                                                                                                                |
| Carteira recusa                  | `?scenario=wallet-rejected` no checkout                                                                                                                                                        |
| Desconexão com pedido pendente   | Confirme a compra e, na tela “Processando”, use “Derrubar a conexão Socket.IO” (ou recarregue): o pedido é reconciliado via REST sem nova compra                                               |
| Eventos duplicados/antigos       | “Reenviar o último evento” no painel — versões antigas são ignoradas                                                                                                                           |

## Testes (Playwright)

```bash
npm run build
npm run test:e2e              # chromium desktop (1440×900) + mobile (Pixel 7, 390×844)
npm run test:report           # relatório HTML; traces ficam em test-results/ nas falhas
```

Cobertura (`e2e/*.spec.ts`): catálogo (busca, filtros combinados, ordenação, paginação, histórico, vazio, falhas), detalhe (acesso direto, 404, edição indisponível, limite), conta (cadastro, login, expiração, logout, troca de usuário), favoritos (otimista + rollback), carrinho (quantidades, remoção, cupons, refresh, login), compra completa, falhas de pagamento (recusa, cliques repetidos, timeout idempotente, carteira recusada), perfil/avatar/senha/carteiras, tempo real (preço muda no checkout, eventos duplicados/antigos, desconexão com pedido pendente), acessibilidade (teclado, foco em diálogos/drawers, validação) e skeletons/recuperação. Regressão visual de início, detalhe, carrinho e pagamento com baselines em `e2e/__screenshots__/`.

Cada teste parte de um contexto novo e chama `?reset=1&scenario=…`; relógio, latência e eventos são controlados pela API de mock. Os testes de tempo real passam pelo `socket.io-client` real e os de REST pelos handlers MSW.

## Lighthouse

```bash
npm run lighthouse:ci   # build + auditoria; relatórios em lighthouse/reports/, resumo em lighthouse/RESULTS.md
```

Última execução (medianas de 3 medições): desktop 97–98 / 100 / 100 / 100; mobile 74–77 / 100 / 100 / 100 (Performance / Accessibility / Best Practices / SEO). O LCP mobile fica em ~4,5 s no slow 4G simulado por causa do JavaScript inicial — sobretudo a camada de mocks (MSW + Socket.IO), obrigatória no build de demonstração. Detalhes e causas em [`lighthouse/ANALYSIS.md`](./lighthouse/ANALYSIS.md).

## Deploy

Build estático (`dist/`) com rewrite de SPA e cabeçalhos para o service worker (`vercel.json`). Na Vercel: _Import Project_ → framework **Vite** → sem variáveis obrigatórias. Os mocks e o tempo real funcionam no build publicado; acesso direto e refresh de qualquer rota funcionam via rewrite.

## Estrutura

```
src/
  app/            router, QueryClient, composição de providers
  routes/         rotas (TanStack Router file-based): /, /nft/$id, /cart, /checkout, /orders/$id, /login, /register, /account/*
  features/       auth, catalog, cart, checkout, favorites, account, realtime (hooks + componentes de domínio)
  components/     ui (shadcn adaptado), layout, dev-panel, estados de carregamento/erro
  lib/            axios, contratos de erro, chaves de query, decimal (ETH), storage
  mocks/          MSW: fixtures, banco em memória persistido, handlers REST, servidor Socket.IO simulado, cenários
  types/api.ts    contratos REST + eventos
e2e/              Playwright (specs, suporte, baselines visuais)
lighthouse/       script de auditoria + resultados
public/nfts/      artes dos NFTs exportadas do Figma (WebP em 3 tamanhos)
```
