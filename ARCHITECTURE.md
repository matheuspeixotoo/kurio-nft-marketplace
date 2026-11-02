# Arquitetura

## Visão geral

```
┌──────────────────────────── navegador ────────────────────────────┐
│  React (TanStack Router) ── hooks (TanStack Query) ── Axios ──┐    │
│         │                         │                           ▼    │
│         │                 socket.io-client            Service Worker (MSW)
│         │                         │                           │    │
│         ▼                         ▼                           ▼    │
│   componentes UI        WebSocket interceptado      handlers REST (msw)
│                                   │                           │    │
│                                   └──── servidor Socket.IO ───┘    │
│                                        simulado (binding)          │
│                                             │                      │
│                                   banco em memória persistido      │
│                                        (localStorage)              │
└────────────────────────────────────────────────────────────────────┘
```

Camadas e responsabilidades:

| Camada              | Pasta                                                       | Regras                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contratos           | `src/types/api.ts`                                          | Fonte única de tipos para transporte, mocks e UI. ETH como `string` decimal, quantidades inteiras.                                                                               |
| Transporte          | `src/lib/api/*`                                             | `http.ts` (instância Axios + interceptors), `endpoints.ts` (funções tipadas por recurso), `errors.ts` (`ApiError` normalizado). Nenhuma lógica de negócio nem resposta fictícia. |
| Estado remoto       | `src/features/*/hooks.ts`                                   | Queries/mutations com chaves em `src/lib/query-keys.ts`; isolamento por usuário e por parâmetros.                                                                                |
| Sessão / tempo real | `src/features/auth`, `src/features/realtime`                | Providers acima do router; o router recebe `auth` no contexto para guardas.                                                                                                      |
| UI                  | `src/routes`, `src/features/*/components`, `src/components` | Rotas finas; componentes shadcn adaptados à identidade (Roboto Mono, paleta do Figma).                                                                                           |
| Mocks               | `src/mocks`                                                 | Camada de rede: fixtures, banco, handlers, cenários e Socket.IO simulado.                                                                                                        |

Boot (`src/main.tsx`): o worker MSW é iniciado **antes** de importar o grafo da aplicação, porque `engine.io-client` captura `globalThis.WebSocket` no momento da avaliação do módulo e o interceptor precisa estar instalado antes disso (o chunking do Vite isola `socket.io-client` em um chunk próprio pelo mesmo motivo).

## Contratos REST

Base `/api`. Autenticação por `Authorization: Bearer <token>`; visitantes enviam `X-Guest-Id` para o carrinho anônimo. Corpo de erro padronizado:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "fieldErrors": { "email": "…" }, "details": {} } }
```

Códigos: `VALIDATION_ERROR` (422), `UNAUTHENTICATED` / `SESSION_EXPIRED` / `INVALID_CREDENTIALS` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `EMAIL_TAKEN` / `USERNAME_TAKEN` / `AVAILABILITY_CONFLICT` / `EDITION_UNAVAILABLE` / `QUANTITY_LIMIT` / `QUOTE_OUTDATED` / `IDEMPOTENCY_CONFLICT` (409), `COUPON_INVALID` / `COUPON_EXPIRED` / `WRONG_PASSWORD` (422), `WALLET_REJECTED` (403), `TRANSIENT_FAILURE` (503/500).

| Recurso          | Método e caminho                                                                                                                                                                                                                        | Observações                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessão e conta   | `POST /auth/register`, `POST /auth/login` → `{user, token, expiresAt}`; `GET /auth/session`; `POST /auth/logout`                                                                                                                        | Sessão de 8 h (20 s com `session-expired`).                                                                                                                                                                    |
| NFTs             | `GET /nfts?q&category[]&network[]&minPrice&maxPrice&sort&tab&page&pageSize` → `CatalogPage` (itens, paginação, facetas, faixa de preço, `appliedQuery`); `GET /nfts/highlights`; `GET /nfts/:id` → `NftDetail`; `GET /nfts/:id/related` | Categorias/redes repetíveis; página inválida é normalizada.                                                                                                                                                    |
| Favoritos        | `GET /favorites` → `{ids}`; `PUT /favorites/:nftId`; `DELETE /favorites/:nftId`                                                                                                                                                         | Requer sessão.                                                                                                                                                                                                 |
| Carrinho         | `GET /cart`; `POST /cart/items {nftId, editionId, quantity}`; `PATCH /cart/items/:id {quantity}`; `DELETE /cart/items/:id`; `PUT /cart/coupon {code}`; `DELETE /cart/coupon`; `POST /cart/merge {guestId}`                              | Itens validados contra disponibilidade/limite por edição; `priceChangedFrom` sinaliza mudança de preço desde a inclusão.                                                                                       |
| Cotação          | `POST /quote {items, couponCode?, network?}` → `Quote` (`lines`, `subtotal`, `discount`, `networkFee`, `total`, `couponStatus`, `issues[]`, `quoteHash`)                                                                                | `X-Checkout: 1` identifica a revalidação do checkout.                                                                                                                                                          |
| Pedidos          | `POST /orders` (header `Idempotency-Key`) → 202 `Order{status:'pending'}`; `GET /orders/:id`; `GET /orders`                                                                                                                             | Mesma chave + mesmo conteúdo → 200 com o mesmo pedido; mesma chave + conteúdo diferente → 409 `IDEMPOTENCY_CONFLICT`; hash de cotação divergente → 409 `QUOTE_OUTDATED` com a cotação nova em `details.quote`. |
| Perfil           | `GET /profile`; `PATCH /profile`; `PUT /profile/avatar {dataUrl}`; `DELETE /profile/avatar`; `POST /profile/password`                                                                                                                   | Conflitos de nome/e-mail → 409 com `fieldErrors`.                                                                                                                                                              |
| Carteiras        | `GET /wallets` → `{primary, secondary}`; `PUT /wallets/:slot`; `DELETE /wallets/:slot`; `POST /wallets/connect {provider, network}`                                                                                                     | `connect` simula a extensão (aceita/recusa). `secondary` aceita `{sameAsPrimary: true}`.                                                                                                                       |
| Controle de mock | `GET /_mock/status`, `PUT /_mock/scenario`, `POST /_mock/reset`, `POST /_mock/trigger`                                                                                                                                                  | Nunca afetado por latência/falhas.                                                                                                                                                                             |

## Eventos Socket.IO

Transporte: `socket.io-client` conectando a `VITE_SOCKET_URL` (padrão `ws://realtime.kurio.mock`) com `transports: ['websocket']`. O MSW intercepta o WebSocket e o `@mswjs/socket.io-binding` codifica/decodifica os pacotes Engine.IO/Socket.IO, então o cliente conversa com um servidor Socket.IO genuíno do ponto de vista do protocolo (handshake, `connect`, eventos, reconexão automática).

Envelope comum (`RealtimeEnvelope`): `eventId` (identidade estável), `resource`, `id`, `version` (monotônica por recurso), `emittedAt`, `payload`.

| Evento                                  | Payload                                                          | Efeito no cliente                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `nft.updated`                           | `price`, `available`, `editions[{id, price, available, status}]` | Atualiza caches da listagem, relacionados e detalhe (só se `version` for maior); invalida carrinho e cotação; anuncia em `aria-live`. |
| `order.updated`                         | `status`, `txHash`, `explorerUrl`, `failureReason`, `settledAt`  | Atualiza o pedido e, se terminal, invalida carrinho/catálogo. Entregue apenas aos sockets autenticados como o dono.                   |
| `auth` (cliente → servidor) / `auth.ok` | `{token}` / `{userId}`                                           | Enviado no `connect` e sempre que a sessão muda (login, logout, expiração).                                                           |
| `subscribe` / `unsubscribe`             | `{resource, id}`                                                 | Ciclo de vida atrelado ao componente (hook `useRealtimeSubscription`).                                                                |

Tolerância a duplicatas e eventos antigos: `RealtimeProvider` mantém um conjunto de `eventId` vistos (LRU de 500) e a última `version` por `resource:id`; eventos repetidos ou com versão ≤ conhecida são descartados sem reaplicar efeitos. No logout/troca de usuário o bookkeeping de pedidos é zerado e o socket se reautentica com `token: null`, então eventos de uma sessão anterior nunca tocam dados de outro usuário.

Reconciliação após reconexão: no segundo `connect` em diante, todas as queries ativas são invalidadas (`refetchType: 'active'`), e a tela de pedido pendente faz polling REST a cada 4 s independentemente do socket. Pedidos confirmados/recusados são terminais no servidor (o mock ignora novas liquidações).

**Limitações do transporte simulado** (binding): sem namespaces, rooms ou acks; apenas payloads de texto; o ping do servidor é emitido manualmente a cada 20 s para o cliente não encerrar por `ping timeout`; o fallback por long-polling do Socket.IO não é interceptável, por isso o cliente usa só WebSocket.

## Política de sessão

- Token opaco em `localStorage` (`kurio:token`); nunca a senha. O mock armazena `sha256(salt:senha)`.
- Boot: se há token, `GET /auth/session` valida; 401 limpa o token.
- Qualquer 401 (exceto em login/cadastro) dispara `kurio:session-expired`: o token e os caches privados são limpos, a rota privada atual é guardada (`redirect`) e o router leva ao `/login`; o rascunho do checkout fica em `localStorage` para retomada. Após autenticar, o usuário volta ao destino.
- Rotas privadas (`/checkout`, `/orders/$id`, `/account/*`) usam `beforeLoad` com o token do contexto do router (síncrono) → redirect com `?redirect=`.
- Logout/troca de usuário: `POST /auth/logout`, remoção de todas as queries não públicas (`removeQueries` por predicado), novo `guestId`, limpeza de rascunhos e reautenticação do socket.

## Estado do carrinho

- Servidor é a fonte da verdade; chave de cache `['cart', 'user:<id>' | 'guest:<guestId>']`.
- Visitante: carrinho por `X-Guest-Id` (gerado e persistido localmente). Ao autenticar, `POST /cart/merge {guestId}` soma quantidades respeitando disponibilidade/limite e descarta o carrinho anônimo; o `guestId` é rotacionado.
- Mutations: adicionar (toast + anúncio), alterar quantidade (**otimista com rollback**), remover, cupom (erros de código inválido/expirado associados ao campo).
- Hidratação: cada `GET /cart` reescreve preço/disponibilidade a partir do catálogo e marca `priceChangedFrom`; a UI exibe o aviso e o resumo é sempre a resposta de `POST /quote`.
- Após `nft.updated`, carrinho e cotação são invalidados; o checkout bloqueia a confirmação com uma cotação cujo `quoteHash` mudou desde a abertura da revisão.
- Os itens permanecem no carrinho enquanto o pedido está pendente; só na confirmação as quantidades compradas são removidas. Pedido recusado devolve o estoque e mantém o carrinho.

## Checkout, idempotência e pedidos

1. Formulário validado (campos do layout) → conexão simulada da carteira (`POST /wallets/connect`, com recusa e desconexão) → diálogo de revisão com a cotação atual.
2. Chave de idempotência gerada por `quoteHash` e persistida (`kurio:idempotency`); cliques repetidos, reenvios após timeout e refresh reutilizam a mesma chave, logo o servidor devolve o mesmo pedido.
3. `POST /orders` revalida preço, disponibilidade, cupom e taxas; divergência → 409 `QUOTE_OUTDATED` e a UI pede nova confirmação com os valores atualizados.
4. Resposta 202 `pending` → `/orders/$id`. A liquidação chega por `order.updated` (ou pelo polling REST). O recibo é o snapshot do pedido (`items`, valores e `txHash`), imune a mudanças posteriores do catálogo.
5. Timeout do cliente (8 s): o diálogo permanece com “Reenviar pedido”; se o carrinho esvaziar porque o pedido já foi liquidado, a página mostra o pedido recuperado pela chave (`GET /orders` × `idempotencyKey`).

## Estratégia de cache (TanStack Query)

| Aspecto      | Política                                                                                                                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `staleTime`  | Catálogo 30 s; destaques/relacionados 5 min; carrinho 15 s; cotação 10 s; sessão 60 s; favoritos 60 s.                                                                                                                                                                |
| `gcTime`     | 5 min.                                                                                                                                                                                                                                                                |
| Refetch      | `refetchOnWindowFocus` e `refetchOnReconnect` sempre; pedido pendente com `refetchInterval` de 4 s.                                                                                                                                                                   |
| Retries      | Apenas erros transitórios (rede, 5xx, 429), no máximo 2 com backoff exponencial (1 s, 2 s, cap 4 s); nunca 4xx; mutations não repetem automaticamente.                                                                                                                |
| Cancelamento | Toda query recebe o `AbortSignal` (Axios cancela a requisição anterior); chaves incluem todos os parâmetros, então respostas fora de ordem nunca são aplicadas a outra consulta; `placeholderData: keepPreviousData` evita “piscar” a lista durante trocas de filtro. |
| Isolamento   | Chaves privadas carregam o `userId`; logout remove tudo que não é catálogo.                                                                                                                                                                                           |
| Invalidação  | `nft.updated` → carrinho + cotação (+ patch direto dos caches de catálogo); `order.updated` terminal → carrinho + catálogo + pedidos; mutations de carrinho/favoritos/perfil/carteiras → `setQueryData` com a resposta + `invalidateQueries` em `onSettled`.          |
| Otimismo     | Favoritos (toggle) e quantidade do carrinho, ambos com rollback em `onError` e anúncio acessível.                                                                                                                                                                     |

## Precisão numérica

Valores em ETH trafegam como strings decimais; o cliente usa `decimal.js` (`src/lib/eth.ts`) para somas/descontos e formata com no mínimo 2 casas (`1.19 ETH`, `0.016 ETH`, `26.846 ETH`), sem passar por `number`. Quantidades são inteiras e validadas no cliente e no mock.

## Camada de mocks (MSW)

- `src/mocks/db.ts`: banco em memória (catálogo de 36 NFTs com 4 edições cada, 2 usuários, perfis, carteiras, favoritos, carrinhos, pedidos, idempotência, log de eventos) persistido em `localStorage` a cada mutação; versão/seed garantem reset automático quando as fixtures mudam; `?reset=1` ou `POST /_mock/reset` restauram integralmente.
- `src/mocks/handlers/*`: um arquivo por recurso; todo handler passa por `applyScenario` (latência fixa/variável, offline, timeout, 503 determinístico) e por tradução `HttpError → JSON`.
- `src/mocks/socket.ts`: servidor Socket.IO simulado; `emitNftUpdated`/`emitOrderUpdated` são chamados pelos mesmos serviços que alteram o banco, então REST e eventos nunca divergem.
- `src/mocks/scenario.ts`: flags combináveis (`?scenario=a,b`), PRNG determinístico (`mulberry32`) para latência variável, reset de contadores a cada troca de cenário.
- Componentes, hooks e o cliente Axios não contêm caminhos alternativos: desligar o MSW (`VITE_ENABLE_MOCKS=false`) troca apenas a origem das respostas.

## Acessibilidade

- Skip link, landmarks (`header`, `main`, `nav` rotulados, `footer`), títulos por página (`document.title`).
- Foco visível (outline âmbar), diálogos/drawers Radix com foco preso e devolvido ao gatilho, `Escape` fecha.
- Campos com `label`, `aria-describedby` para dica/erro, `aria-invalid`, mensagens `role="alert"`; o primeiro campo inválido recebe foco; obrigatórios têm texto oculto “(obrigatório)” além do asterisco.
- Regiões `aria-live` globais (polite/assertive) para mutations e eventos em tempo real; status de conexão com texto oculto.
- Estados não dependentes só de cor: chips de edição indisponível riscados/tracejados, badge “Esgotado”, ícones nas mensagens.
- Imagens de NFT com alternativas textuais descritivas; imagens decorativas com `alt=""`.
- `prefers-reduced-motion`: shimmer e carrossel desligam; transições reduzidas.
- Sem overflow horizontal (`overflow-x: clip`, grids `minmax(0,1fr)`), zoom até 200% sem perda de conteúdo.

## Decisões de UX e desvios do Figma

- **Fonte**: o Figma usa Roboto Mono (variável `font/family`); self-hosted via `@fontsource/roboto-mono` (400/500/700, subset latin).
- **Assets**: as 4 artes dos NFTs foram extraídas do próprio arquivo Figma (export SVG → PNG 1254 px) e convertidas para WebP em 3 tamanhos; o catálogo reutiliza as 4 artes entre 36 itens, como o layout. Ícones de interface vêm do `lucide-react`; ícones de marca (Google, Facebook, redes sociais) foram redesenhados inline. O selo “THANK YOU” do recibo foi redesenhado como SVG inline. Carteiras usam glifos com inicial (W/M/C) no lugar dos logotipos.
- **Login/Cadastro**: no desktop o cartão central do Figma é renderizado como página (`/login`, `/register`) para suportar acesso direto, refresh e `redirect`; no mobile é a tela cheia “KURIO”.
- **Confirmação do pedido**: o recibo (frame “Confirmação de Pedido”) tem estados adicionais não desenhados: “Processando” (pendente) e “Pagamento recusado”, seguindo o mesmo cartão com borda inferior âmbar/coral. “Ver no Etherscan” abre um diálogo explicando que o explorador é simulado (o hash é fictício) em vez de fingir um link externo.
- **Carteiras (desktop)**: o frame não pôde ser exportado como SVG (limitação do Figma em modo visualização); o layout foi reconstruído a partir da tela de Perfil e da inspeção visual: carteira principal (formulário em 2 colunas, “Salvar carteira”) e secundária (“Igual à carteira principal” / “Adicionar”). Perfil, carteiras e confirmação ganharam versões mobile (navegação da conta em abas roláveis).
- **Ações fora do escopo** (Atividade, Ofertas, Downloads, Suporte, blog, redes sociais, login social, newsletter): mostram um aviso explícito de que não fazem parte da entrega, sem aparentar sucesso.
- **Conexão da carteira**: além dos cartões de provedor, há um bloco explícito “Conectar carteira / Desconectar” com estados conectada/recusada, necessário para simular conexão, recusa e desconexão.
- **Catálogo**: o layout usa uma lista com contadores; implementado como checkboxes combináveis (acessíveis), contadores reais das fixtures. A busca global fica num diálogo (ícone de lupa) no desktop e numa barra fixa no mobile.
- **Painel de cenários**: botão flutuante adicionado para demonstração/avaliação; está presente no build publicado por exigência do enunciado.

## Limitações conhecidas

- Blockchain, extensões de carteira e gateways reais estão fora do escopo (tudo simulado).
- O servidor Socket.IO simulado vive na própria aba: múltiplas abas não compartilham eventos em tempo real (cada aba tem seu “servidor”), embora compartilhem o estado persistido ao recarregar.
- O banco simulado é por navegador/origem; não há sincronização entre dispositivos.
- Lighthouse: o bundle inclui o MSW e o binding (~165 kB gzip) por exigência de os mocks estarem no build de demonstração; ver a análise em `lighthouse/RESULTS.md`.
