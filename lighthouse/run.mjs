/**
 * Lighthouse audit: Início and Detalhe do NFT, mobile + desktop, 3 runs each, median per category.
 *
 *   npm run build && npm run lighthouse            # audits http://127.0.0.1:4173 (starts `vite preview` if needed)
 *   LH_BASE_URL=https://kurio.vercel.app npm run lighthouse
 *
 * Output: lighthouse/reports/<page>-<profile>-run<N>.{html,json}, lighthouse/reports/summary.json
 * and lighthouse/RESULTS.md (medians, Core Web Vitals, tool versions, environment).
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import * as chromeLauncher from 'chrome-launcher'
import { chromium } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const REPORTS = path.join(__dirname, 'reports')
const BASE_URL = process.env.LH_BASE_URL ?? 'http://127.0.0.1:4173'
const RUNS = Number(process.env.LH_RUNS ?? 3)
const PAGES = [
  { id: 'inicio', label: 'Início', path: '/' },
  { id: 'detalhe', label: 'Detalhes do NFT', path: '/nft/emerald-ape-042' },
]
const PROFILES = [
  { id: 'mobile', label: 'Mobile', config: undefined }, // Lighthouse default: Moto G Power emulation, slow 4G
  { id: 'desktop', label: 'Desktop', config: desktopConfig },
]
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']
const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }

async function isUp(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return r.ok
  } catch {
    return false
  }
}

async function ensureServer() {
  if (await isUp(BASE_URL)) return null
  if (!BASE_URL.startsWith('http://127.0.0.1') && !BASE_URL.startsWith('http://localhost')) throw new Error(`${BASE_URL} is not reachable`)
  const port = new URL(BASE_URL).port || '4173'
  const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', port], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  for (let i = 0; i < 40; i++) {
    if (await isUp(BASE_URL)) return child
    await new Promise((r) => setTimeout(r, 500))
  }
  child.kill()
  throw new Error('vite preview did not start')
}

const median = (values) => {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

async function main() {
  await mkdir(REPORTS, { recursive: true })
  const server = await ensureServer()
  const chromePath = process.env.CHROME_PATH ?? chromium.executablePath()
  const chrome = await chromeLauncher.launch({ chromePath, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--window-size=1440,900'] })
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'))
  const lhPkg = JSON.parse(await readFile(path.join(ROOT, 'node_modules/lighthouse/package.json'), 'utf8'))
  const summary = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, runs: RUNS, targets: TARGETS, environment: {}, results: [] }

  try {
    for (const page of PAGES) {
      for (const profile of PROFILES) {
        const runs = []
        for (let i = 1; i <= RUNS; i++) {
          const url = `${BASE_URL}${page.path}`
          const result = await lighthouse(url, { port: chrome.port, output: ['html', 'json'], logLevel: 'error', onlyCategories: CATEGORIES }, profile.config)
          const lhr = result.lhr
          const scores = Object.fromEntries(CATEGORIES.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)]))
          const metrics = {
            lcp: lhr.audits['largest-contentful-paint']?.numericValue ?? null,
            cls: lhr.audits['cumulative-layout-shift']?.numericValue ?? null,
            tbt: lhr.audits['total-blocking-time']?.numericValue ?? null,
            fcp: lhr.audits['first-contentful-paint']?.numericValue ?? null,
            si: lhr.audits['speed-index']?.numericValue ?? null,
          }
          const base = path.join(REPORTS, `${page.id}-${profile.id}-run${i}`)
          await writeFile(`${base}.html`, result.report[0])
          await writeFile(`${base}.json`, result.report[1])
          runs.push({ run: i, scores, metrics, report: path.relative(ROOT, `${base}.html`) })
          summary.environment.chrome ??= lhr.environment.hostUserAgent
          summary.environment.benchmarkIndex ??= lhr.environment.benchmarkIndex
          console.log(
            `${page.label} / ${profile.label} #${i}:`,
            scores,
            `LCP ${Math.round(metrics.lcp)}ms CLS ${metrics.cls?.toFixed(3)} TBT ${Math.round(metrics.tbt)}ms`,
          )
        }
        const medians = {
          scores: Object.fromEntries(CATEGORIES.map((c) => [c, median(runs.map((r) => r.scores[c]))])),
          metrics: Object.fromEntries(['lcp', 'cls', 'tbt', 'fcp', 'si'].map((m) => [m, median(runs.map((r) => r.metrics[m] ?? 0))])),
        }
        summary.results.push({ page: page.label, path: page.path, profile: profile.label, runs, medians })
      }
    }
  } finally {
    await chrome.kill()
    server?.kill()
  }

  summary.environment = {
    ...summary.environment,
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: os.cpus()[0]?.model,
    cores: os.cpus().length,
    memoryGb: Math.round(os.totalmem() / 1024 ** 3),
    node: process.version,
    lighthouse: lhPkg.version,
    app: pkg.version,
    throttling: 'Lighthouse defaults: mobile = simulated slow 4G + 4x CPU slowdown; desktop = simulated 10 Mbps, no CPU slowdown',
  }
  await writeFile(path.join(REPORTS, 'summary.json'), JSON.stringify(summary, null, 2))
  await writeFile(path.join(__dirname, 'RESULTS.md'), renderMarkdown(summary))
  console.log('\nMedians written to lighthouse/RESULTS.md')
}

function renderMarkdown(s) {
  const fmtMs = (v) => `${(v / 1000).toFixed(2)} s`
  const pass = (c, v) => (v >= TARGETS[c] ? '✅' : '⚠️')
  const lines = []
  lines.push(
    '# Lighthouse — resultados',
    '',
    `Gerado em ${s.generatedAt} contra \`${s.baseUrl}\` (build otimizado, cenário padrão dos mocks). ${s.runs} medições por página/perfil; a tabela mostra a **mediana** de cada categoria.`,
    '',
  )
  lines.push(
    '| Página | Perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  )
  for (const r of s.results) {
    const m = r.medians
    lines.push(
      `| ${r.page} | ${r.profile} | ${pass('performance', m.scores.performance)} ${m.scores.performance} | ${pass('accessibility', m.scores.accessibility)} ${m.scores.accessibility} | ${pass('best-practices', m.scores['best-practices'])} ${m.scores['best-practices']} | ${pass('seo', m.scores.seo)} ${m.scores.seo} | ${fmtMs(m.metrics.lcp)} | ${m.metrics.cls.toFixed(3)} | ${Math.round(m.metrics.tbt)} ms |`,
    )
  }
  lines.push(
    '',
    `Metas: Performance ≥ ${TARGETS.performance}, Accessibility ≥ ${TARGETS.accessibility}, Best Practices ≥ ${TARGETS['best-practices']}, SEO ≥ ${TARGETS.seo}.`,
    '',
  )
  lines.push('Justificativa dos resultados abaixo da meta e causas identificadas: ver [`ANALYSIS.md`](./ANALYSIS.md).', '')
  lines.push('## Medições individuais', '')
  for (const r of s.results) {
    lines.push(
      `### ${r.page} — ${r.profile}`,
      '',
      '| Run | Perf | A11y | BP | SEO | LCP | CLS | TBT | Relatório |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    )
    for (const run of r.runs)
      lines.push(
        `| ${run.run} | ${run.scores.performance} | ${run.scores.accessibility} | ${run.scores['best-practices']} | ${run.scores.seo} | ${fmtMs(run.metrics.lcp)} | ${run.metrics.cls.toFixed(3)} | ${Math.round(run.metrics.tbt)} ms | \`${run.report}\` |`,
      )
    lines.push('')
  }
  lines.push('## Ambiente e condições', '')
  for (const [k, v] of Object.entries(s.environment)) lines.push(`- **${k}**: ${v}`)
  lines.push(
    '',
    'Configuração versionada em `lighthouse/run.mjs` (perfis padrão do Lighthouse: `mobile` e `desktop-config`). Os relatórios HTML/JSON de cada medição ficam em `lighthouse/reports/` (gerados localmente; ignorados pelo git exceto `summary.json`).',
    '',
  )
  return lines.join('\n')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
