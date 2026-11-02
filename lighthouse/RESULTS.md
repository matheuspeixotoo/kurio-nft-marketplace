# Lighthouse — resultados

Gerado em 2026-11-02T10:10:33.998Z contra `http://127.0.0.1:4173` (build otimizado, cenário padrão dos mocks). 3 medições por página/perfil; a tabela mostra a **mediana** de cada categoria.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | ⚠️ 74 | ✅ 100 | ✅ 100 | ✅ 100 | 4.60 s | 0.001 | 389 ms |
| Início | Desktop | ✅ 97 | ✅ 100 | ✅ 100 | ✅ 100 | 1.20 s | 0.002 | 0 ms |
| Detalhes do NFT | Mobile | ⚠️ 77 | ✅ 100 | ✅ 100 | ✅ 100 | 4.50 s | 0.000 | 323 ms |
| Detalhes do NFT | Desktop | ✅ 98 | ✅ 100 | ✅ 100 | ✅ 100 | 1.10 s | 0.000 | 0 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

Justificativa dos resultados abaixo da meta e causas identificadas: ver [`ANALYSIS.md`](./ANALYSIS.md).

## Medições individuais

### Início — Mobile

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 74 | 100 | 100 | 100 | 4.60 s | 0.002 | 394 ms | `lighthouse\reports\inicio-mobile-run1.html` |
| 2 | 69 | 100 | 100 | 100 | 4.60 s | 0.000 | 382 ms | `lighthouse\reports\inicio-mobile-run2.html` |
| 3 | 74 | 100 | 100 | 100 | 4.61 s | 0.001 | 389 ms | `lighthouse\reports\inicio-mobile-run3.html` |

### Início — Desktop

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 97 | 100 | 100 | 100 | 1.20 s | 0.002 | 0 ms | `lighthouse\reports\inicio-desktop-run1.html` |
| 2 | 97 | 100 | 100 | 100 | 1.21 s | 0.002 | 0 ms | `lighthouse\reports\inicio-desktop-run2.html` |
| 3 | 97 | 100 | 100 | 100 | 1.20 s | 0.002 | 0 ms | `lighthouse\reports\inicio-desktop-run3.html` |

### Detalhes do NFT — Mobile

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 77 | 100 | 100 | 100 | 4.50 s | 0.000 | 323 ms | `lighthouse\reports\detalhe-mobile-run1.html` |
| 2 | 77 | 100 | 100 | 100 | 4.50 s | 0.000 | 321 ms | `lighthouse\reports\detalhe-mobile-run2.html` |
| 3 | 77 | 100 | 100 | 100 | 4.50 s | 0.000 | 324 ms | `lighthouse\reports\detalhe-mobile-run3.html` |

### Detalhes do NFT — Desktop

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 98 | 100 | 100 | 100 | 1.09 s | 0.000 | 0 ms | `lighthouse\reports\detalhe-desktop-run1.html` |
| 2 | 98 | 100 | 100 | 100 | 1.11 s | 0.000 | 0 ms | `lighthouse\reports\detalhe-desktop-run2.html` |
| 3 | 98 | 100 | 100 | 100 | 1.10 s | 0.000 | 0 ms | `lighthouse\reports\detalhe-desktop-run3.html` |

## Ambiente e condições

- **chrome**: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- **benchmarkIndex**: 2142
- **os**: Windows_NT 10.0.26300 (x64)
- **cpu**: Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz
- **cores**: 12
- **memoryGb**: 16
- **node**: v22.23.4
- **lighthouse**: 13.6.0
- **app**: 1.0.0
- **throttling**: Lighthouse defaults: mobile = simulated slow 4G + 4x CPU slowdown; desktop = simulated 10 Mbps, no CPU slowdown

Configuração versionada em `lighthouse/run.mjs` (perfis padrão do Lighthouse: `mobile` e `desktop-config`). Os relatórios HTML/JSON de cada medição ficam em `lighthouse/reports/` (gerados localmente; ignorados pelo git exceto `summary.json`).
