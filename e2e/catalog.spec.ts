import { expect, test } from '@playwright/test'
import { open } from './support/app'

test.describe('Catálogo: busca, filtros, ordenação, paginação e histórico', () => {
  test('busca + filtros combinados + ordenação compõem a URL, reiniciam a paginação e sobrevivem a refresh/histórico', async ({ page, isMobile }) => {
    await open(page, '/')
    await expect(page.getByTestId('catalog-grid')).toBeVisible()
    await expect(page.getByTestId('result-count')).toHaveText(/36 resultados/)

    // Pagination first, so we can prove filters reset it.
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    if (isMobile) await page.getByTestId('open-filters').click()
    const filters = isMobile ? page.getByRole('dialog', { name: 'Filtros' }) : page.locator('aside[aria-label="Filtros do catálogo"]:visible')
    await filters.getByLabel('Música').check()
    await expect(page).toHaveURL(/category=musica/)
    await expect(page).not.toHaveURL(/page=/)
    await filters.getByLabel('Solana').check()
    await expect(page).toHaveURL(/network=solana/)
    if (isMobile)
      await page
        .getByRole('dialog', { name: 'Filtros' })
        .getByRole('button', { name: /resultados/ })
        .click()

    const count = page.getByTestId('result-count')
    await expect(count).toHaveText(/^(3|4) resultados$/)
    const names = page.getByTestId('nft-card').locator('h3')
    await expect(names.first()).toContainText('Golden')

    // Sorting
    await page.getByTestId('sort-select').click()
    await page.getByRole('option', { name: 'Menor preço' }).click()
    await expect(page).toHaveURL(/sort=price_asc/)
    const readPrices = async () => (await page.getByTestId('nft-card').locator('p').allInnerTexts()).map((p) => Number(p.split(' ')[0]))
    await expect.poll(readPrices).toEqual([0.45, 0.59, 0.99])

    // Search composes with the filters
    if (isMobile) {
      await page.getByLabel('Explorar coleções').fill('Frequency')
      await page.getByLabel('Explorar coleções').press('Enter')
    } else {
      await page.getByTestId('open-search').click()
      await page.getByRole('textbox', { name: 'Buscar NFTs' }).fill('Frequency')
      await page.getByRole('button', { name: 'Buscar' }).click()
    }
    await expect(page).toHaveURL(/q=Frequency/)
    await expect(page.getByTestId('nft-card')).toHaveCount(1)
    await expect(names.first()).toHaveText('Golden Frequency #071')

    // Refresh keeps everything
    const url = page.url()
    await page.reload()
    await expect(page).toHaveURL(url)
    await expect(page.getByTestId('nft-card')).toHaveCount(1)
    if (!isMobile) await expect(page.locator('aside[aria-label="Filtros do catálogo"]:visible').getByLabel('Música')).toBeChecked()

    // History: back restores the previous state (search removed → the 3-4 music/solana results)
    await page.goBack()
    await expect(page).not.toHaveURL(/q=Frequency/)
    await expect(count).toHaveText(/^(3|4) resultados$/)
    await page.goForward()
    await expect(page).toHaveURL(/q=Frequency/)
    await expect(page.getByTestId('nft-card')).toHaveCount(1)
  })

  test('resultado vazio e limpeza de filtros', async ({ page, isMobile }) => {
    await open(page, '/?q=zzz-nao-existe')
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar busca e filtros' }).click()
    await expect(page.getByTestId('catalog-grid')).toBeVisible()
    if (!isMobile) await expect(page.getByTestId('result-count')).toHaveText(/36 resultados/)
  })

  test('catálogo vazio (cenário empty-catalog) e falha de API com nova tentativa', async ({ page }) => {
    await open(page, '/', ['empty-catalog'])
    await expect(page.getByTestId('empty-state')).toBeVisible()

    await open(page, '/', ['flaky'])
    const catalogError = page.locator('#catalogo').getByTestId('error-state')
    await expect(catalogError).toBeVisible({ timeout: 20_000 }) // 3 × 503 exhaust the automatic retries
    await catalogError.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('catalog-grid')).toBeVisible({ timeout: 15_000 })
  })

  test('respostas fora de ordem nunca mostram resultados de outra consulta', async ({ page, isMobile }) => {
    test.skip(isMobile, 'cobertura idêntica no desktop')
    await open(page, '/', ['variable-latency'])
    await expect(page.getByTestId('catalog-grid')).toBeVisible({ timeout: 20_000 })
    // Fire two filter changes quickly; the last one must win regardless of latency.
    await page.getByLabel('Fotografia').check()
    await page.getByLabel('Música').check()
    await expect(page).toHaveURL(/category=fotografia%2Cmusica|category=fotografia,musica/)
    await expect(page.getByTestId('result-count')).toHaveText(/^9 resultados$/, { timeout: 20_000 })
    const names = await page.getByTestId('nft-card').locator('h3').allInnerTexts()
    expect(names.length).toBe(9)
  })
})
