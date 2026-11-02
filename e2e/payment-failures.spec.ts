import { expect, test } from '@playwright/test'
import { cartCount, goToReview, open, setScenario } from './support/app'

test.describe('Falhas de pagamento, cliques repetidos e timeout', () => {
  test('pagamento recusado mantém os itens no carrinho', async ({ page }) => {
    await open(page, '/', ['payment-declined'])
    await goToReview(page)
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-declined')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('alert')).toContainText('recusou')
    await expect.poll(() => cartCount(page)).toBe(1)
  })

  test('cliques repetidos criam um único pedido', async ({ page }) => {
    await open(page, '/')
    await goToReview(page)
    const posts: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/orders') && r.method() === 'POST') posts.push(r.headers()['idempotency-key'] ?? '')
    })
    const button = page.getByTestId('confirm-order')
    await button.click({ clickCount: 3, delay: 20 })
    await expect(page).toHaveURL(/\/orders\/ord_/)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    expect(posts.length).toBeGreaterThanOrEqual(1)
    expect(new Set(posts).size).toBe(1)
    const orders = await page.evaluate(async () => {
      const r = await fetch('/api/orders', { headers: { authorization: `Bearer ${localStorage.getItem('kurio:token')}` } })
      return (await r.json()) as { id: string }[]
    })
    expect(orders.filter((o) => !o.id.startsWith('ord_seed')).length).toBe(1)
  })

  test('timeout após criação do pedido: reenviar com a mesma chave recupera o mesmo pedido', async ({ page }) => {
    await open(page, '/')
    await goToReview(page)
    await setScenario(page, ['order-timeout'])
    const keys: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/orders') && r.method() === 'POST') keys.push(r.headers()['idempotency-key'] ?? '')
    })
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-timeout')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByTestId('confirm-order')).toHaveText('Reenviar pedido')
    await page.getByTestId('confirm-order').click()
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 15_000 })
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    expect(keys.length).toBe(2)
    expect(keys[0]).toBe(keys[1])
    const orders = await page.evaluate(async () => {
      const r = await fetch('/api/orders', { headers: { authorization: `Bearer ${localStorage.getItem('kurio:token')}` } })
      return (await r.json()) as { id: string }[]
    })
    expect(orders.filter((o) => !o.id.startsWith('ord_seed')).length).toBe(1)
  })

  test('carteira recusa a conexão e o usuário pode tentar de novo', async ({ page }) => {
    await open(page, '/', ['wallet-rejected'])
    await goToReview(page).catch(() => undefined)
    await expect(page.getByTestId('wallet-connection')).toHaveAttribute('data-status', 'rejected')
    await expect(page.getByTestId('review-order')).toBeDisabled()
    await setScenario(page, [])
    await page.getByRole('button', { name: 'Tentar conectar novamente' }).click()
    await expect(page.getByTestId('wallet-connection')).toHaveAttribute('data-status', 'connected')
    await expect(page.getByTestId('review-order')).toBeEnabled()
  })
})
