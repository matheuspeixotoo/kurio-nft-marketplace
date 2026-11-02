import { expect, test } from '@playwright/test'
import { addToCart, open } from './support/app'

test.describe('Skeletons, falhas e recuperação', () => {
  test('catálogo lento mostra skeletons com shimmer e depois o conteúdo', async ({ page }) => {
    await open(page, '/', ['slow'])
    const skeletons = page.getByTestId('nft-card-skeleton')
    await expect(skeletons.first()).toBeVisible()
    expect(await skeletons.count()).toBe(9)
    await expect(page.getByTestId('catalog-grid')).toBeVisible({ timeout: 15_000 })
    await expect(skeletons).toHaveCount(0)
  })

  test('detalhe e resumo do carrinho usam skeletons', async ({ page }) => {
    await open(page, '/')
    await addToCart(page)
    await page.goto('/cart?scenario=slow')
    await expect(page.getByTestId('cart-skeleton')).toBeVisible()
    await expect(page.getByTestId('cart-item')).toHaveCount(1, { timeout: 15_000 })
  })

  test('sem conexão: feedback de erro e recuperação ao tentar novamente', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042', ['offline'])
    await expect(page.getByTestId('error-state').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('error-state').first()).toContainText(/conectar|conexão/i)
    await page.evaluate(() =>
      fetch('/api/_mock/scenario', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ flags: [] }) }),
    )
    await page.getByTestId('error-state').first().getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
  })
})
