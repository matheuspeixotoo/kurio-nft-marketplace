import { expect, test, type Page } from '@playwright/test'
import { addToCart, login, open } from './support/app'

/**
 * Visual regression baselines (desktop 1440 / mobile 390). Data is the fixed seed; animations are
 * disabled by the config and the realtime indicator/toasts are masked because they are time-dependent.
 */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForLoadState('networkidle')
}

const mask = (page: Page) => [page.getByTestId('realtime-status'), page.locator('[data-testid^="toast-"]'), page.getByTestId('dev-panel-trigger')]

test.describe('Regressão visual', () => {
  test('início', async ({ page }) => {
    await open(page, '/')
    await expect(page.getByTestId('catalog-grid')).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('home.png', { fullPage: true, mask: mask(page) })
  })

  test('detalhe', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByTestId('related-grid').getByTestId('nft-card').first()).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detail.png', { fullPage: true, mask: mask(page) })
  })

  test('carrinho', async ({ page }) => {
    await open(page, '/')
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'violet-nomad-314', 1)
    await page.goto('/cart')
    await expect(page.getByTestId('cart-total')).not.toHaveText('—')
    await settle(page)
    await expect(page).toHaveScreenshot('cart.png', { fullPage: true, mask: mask(page) })
  })

  test('pagamento', async ({ page }) => {
    await open(page, '/')
    await login(page)
    await addToCart(page, 'emerald-ape-042', 2)
    await page.goto('/checkout')
    await expect(page.getByTestId('quote-summary')).toContainText('ETH')
    await expect(page.getByTestId('quote-summary')).not.toHaveAttribute('aria-busy', 'true')
    await settle(page)
    await expect(page).toHaveScreenshot('checkout.png', { fullPage: true, mask: mask(page) })
  })
})
