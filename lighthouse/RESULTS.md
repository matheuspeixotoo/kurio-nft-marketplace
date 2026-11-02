# Lighthouse — resultados

Gerado em 2026-11-02T15:32:26.569Z contra `http://127.0.0.1:4173` (build otimizado, cenário padrão dos mocks). 3 medições por página/perfil; a tabela mostra a **mediana** de cada categoria.

| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | ⚠️ 71 | ✅ 100 | ✅ 100 | ✅ 100 | 4.67 s | 0.001 | 428 ms |
| Início | Desktop | ✅ 97 | ✅ 100 | ✅ 100 | ✅ 100 | 1.32 s | 0.002 | 18 ms |
| Detalhes do NFT | Mobile | ⚠️ 74 | ✅ 100 | ✅ 100 | ✅ 100 | 4.61 s | 0.000 | 408 ms |
| Detalhes do NFT | Desktop | ✅ 97 | ✅ 100 | ✅ 100 | ✅ 100 | 1.24 s | 0.000 | 3 ms |

Metas: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90.

Justificativa dos resultados abaixo da meta e causas identificadas: ver [`ANALYSIS.md`](./ANALYSIS.md).

## Medições individuais

### Início — Mobile

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 71 | 100 | 100 | 100 | 4.77 s | 0.001 | 466 ms | `lighthouse/reports/inicio-mobile-run1.html` |
| 2 | 67 | 100 | 100 | 100 | 4.65 s | 0.000 | 428 ms | `lighthouse/reports/inicio-mobile-run2.html` |
| 3 | 74 | 100 | 100 | 100 | 4.67 s | 0.002 | 397 ms | `lighthouse/reports/inicio-mobile-run3.html` |

### Início — Desktop

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 97 | 100 | 100 | 100 | 1.26 s | 0.002 | 12 ms | `lighthouse/reports/inicio-desktop-run1.html` |
| 2 | 97 | 100 | 100 | 100 | 1.32 s | 0.001 | 18 ms | `lighthouse/reports/inicio-desktop-run2.html` |
| 3 | 96 | 100 | 100 | 100 | 1.38 s | 0.002 | 38 ms | `lighthouse/reports/inicio-desktop-run3.html` |

### Detalhes do NFT — Mobile

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 74 | 100 | 100 | 100 | 4.62 s | 0.000 | 405 ms | `lighthouse/reports/detalhe-mobile-run1.html` |
| 2 | 70 | 100 | 100 | 100 | 4.58 s | 0.000 | 511 ms | `lighthouse/reports/detalhe-mobile-run2.html` |
| 3 | 74 | 100 | 100 | 100 | 4.61 s | 0.000 | 408 ms | `lighthouse/reports/detalhe-mobile-run3.html` |

### Detalhes do NFT — Desktop

| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 97 | 100 | 100 | 100 | 1.24 s | 0.000 | 55 ms | `lighthouse/reports/detalhe-desktop-run1.html` |
| 2 | 98 | 100 | 100 | 100 | 1.19 s | 0.000 | 3 ms | `lighthouse/reports/detalhe-desktop-run2.html` |
| 3 | 97 | 100 | 100 | 100 | 1.26 s | 0.000 | 0 ms | `lighthouse/reports/detalhe-desktop-run3.html` |

## Ambiente e condições

- **chrome**: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/156.0.0.0 Safari/537.36
- **benchmarkIndex**: 2048
- **os**: Windows_NT 10.0.26300 (x64)
- **cpu**: Intel(R) Core(TM) i5-10400F CPU @ 2.90GHz
- **cores**: 12
- **memoryGb**: 16
- **node**: v22.23.4
- **lighthouse**: 13.6.0
- **app**: 1.0.0
- **throttling**: Lighthouse defaults: mobile = simulated slow 4G + 4x CPU slowdown; desktop = simulated 10 Mbps, no CPU slowdown

Configuração versionada em `lighthouse/run.mjs` (perfis padrão do Lighthouse: `mobile` e `desktop-config`). Os relatórios HTML/JSON de cada medição estão versionados em `lighthouse/reports/` junto com o resumo `summary.json`.
