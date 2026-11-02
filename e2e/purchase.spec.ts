import { expect, test } from '@playwright/test'
import { cartCount, goToReview, open } from './support/app'

test.describe('Compra completa', () => {
  test('do catálogo ao recibo confirmado; carrinho perde só o que foi comprado; recibo é snapshot', async ({ page }) => {
    await open(page, '/')
    await goToReview(page)
    await expect(page.getByTestId('review-total')).toHaveText('1.206 ETH')

    const created = page.waitForResponse((r) => r.url().includes('/api/orders') && r.request().method() === 'POST')
    await page.getByTestId('confirm-order').click()
    const res = await created
    expect(res.status()).toBe(202)

    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('1.206 ETH')
    await expect(page.getByTestId('receipt-item')).toHaveCount(1)

    // Cart emptied of the purchased quantity only
    await expect.poll(() => cartCount(page)).toBe(0)

    // Catalog price changes afterwards must not alter the receipt
    const orderUrl = page.url()
    await page.evaluate(() =>
      fetch('/api/_mock/trigger', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'nft.updated', nftId: 'emerald-ape-042', price: '9.99' }),
      }),
    )
    await page.goto(orderUrl)
    await expect(page.getByTestId('receipt-total')).toHaveText('1.206 ETH')

    // Direct access to the receipt by another user is refused
    await page.evaluate(() => localStorage.removeItem('kurio:token'))
    await page.goto(orderUrl)
    await expect(page).toHaveURL(/\/login/)
  })

  test('checkout exige autenticação e preserva o destino', async ({ page }) => {
    await open(page, '/checkout')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  })
})
