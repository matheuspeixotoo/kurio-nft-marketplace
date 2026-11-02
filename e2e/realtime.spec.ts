import { expect, test } from '@playwright/test'
import { addToCart, goToReview, login, open, trigger, vis } from './support/app'

test.describe('Tempo real (Socket.IO via MSW)', () => {
  test('preço muda durante o checkout: a interface avisa, o resumo atualiza e a cotação antiga é bloqueada', async ({ page }) => {
    await open(page, '/')
    await goToReview(page)
    await expect(page.getByTestId('review-total')).toHaveText('1.206 ETH')

    // Server-side price bump arrives through socket.io-client (nft.updated) while the review is open.
    await trigger(page, { type: 'nft.updated', nftId: 'emerald-ape-042', price: '1.50' })
    await expect(page.getByTestId('quote-stale')).toBeVisible()
    await expect(page.getByTestId('review-total')).toHaveText('1.516 ETH')
    await expect(page.getByTestId('confirm-order')).toHaveCount(0) // confirmation blocked until re-accepted

    await page.getByTestId('accept-new-quote').click()
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('1.516 ETH')
  })

  test('cenário price-change: NFT no carrinho muda de preço, carrinho informa e checkout revalida', async ({ page }) => {
    await open(page, '/', ['price-change'])
    await login(page)
    await addToCart(page, 'golden-beat-207')
    await page.goto('/checkout')
    await expect(page.getByTestId('quote-summary')).toContainText('1.006 ETH')
    // 1.5 s after the first checkout quote the mock raises the price 10% and emits nft.updated.
    await expect(page.getByTestId('quote-summary')).toContainText('1.106 ETH', { timeout: 10_000 })
    await page.goto('/cart')
    await expect(page.getByTestId('cart-change-notice')).toBeVisible()
    await expect(page.getByTestId('price-changed')).toContainText('de 0.99 ETH para 1.09 ETH')
  })

  test('eventos duplicados ou antigos não regridem o estado; nft.updated atualiza catálogo e detalhe', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await expect(vis(page, 'detail-price')).toHaveText('1.19 ETH')
    await trigger(page, { type: 'nft.updated', nftId: 'emerald-ape-042', price: '2.00' })
    await expect(vis(page, 'detail-price')).toHaveText('2.00 ETH')
    await trigger(page, { type: 'nft.updated', nftId: 'emerald-ape-042', price: '2.50' })
    await expect(vis(page, 'detail-price')).toHaveText('2.50 ETH')
    // Replay the first (older) event verbatim: same eventId + lower version → ignored.
    await trigger(page, { type: 'socket.replay', eventId: 'evt_00001' })
    await page.waitForTimeout(600)
    await expect(vis(page, 'detail-price')).toHaveText('2.50 ETH')
    await page.goto('/')
    await expect(page.locator('[data-nft-id="emerald-ape-042"]').first()).toContainText('2.50 ETH')
  })

  test('desconexão com pedido pendente: reconexão/refresh recupera o mesmo pedido sem nova compra', async ({ page }) => {
    await open(page, '/')
    await goToReview(page)
    await page.getByTestId('confirm-order').click()
    await expect(page.getByTestId('order-pending')).toBeVisible()
    await trigger(page, { type: 'socket.disconnect' })
    await expect(page.getByTestId('pending-connection')).toBeVisible()
    const orderUrl = page.url()
    await page.reload()
    await expect(page).toHaveURL(orderUrl)
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 15_000 })
    const orders = await page.evaluate(async () => {
      const r = await fetch('/api/orders', { headers: { authorization: `Bearer ${localStorage.getItem('kurio:token')}` } })
      return (await r.json()) as { id: string; status: string }[]
    })
    expect(orders.filter((o) => !o.id.startsWith('ord_seed')).length).toBe(1)
  })
})
