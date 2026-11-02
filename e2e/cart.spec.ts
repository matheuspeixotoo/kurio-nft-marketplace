import { expect, test } from '@playwright/test'
import { addToCart, cartCount, either, login, open } from './support/app'

test.describe('Carrinho', () => {
  test('quantidades, remoção, cupom válido/inválido/expirado e persistência após refresh e login', async ({ page }) => {
    await open(page, '/')
    await addToCart(page, 'emerald-ape-042', 2)
    await addToCart(page, 'ivory-baron-088', 1)
    await expect.poll(() => cartCount(page)).toBe(3)

    await page.goto('/cart')
    const items = page.getByTestId('cart-item')
    await expect(items).toHaveCount(2)
    await expect(page.getByTestId('cart-total')).toHaveText('4.186 ETH') // 2×1.19 + 1.79 + 0.016

    // Quantity +1 on the first item (optimistic) → 3×1.19
    await items
      .first()
      .getByRole('button', { name: /Aumentar quantidade/ })
      .first()
      .click()
    await expect(page.getByTestId('cart-total')).toHaveText('5.376 ETH')

    // Coupons
    await page.getByTestId('coupon-input').fill('NAOEXISTE')
    await page.getByTestId('coupon-apply').click()
    await expect(page.getByTestId('coupon-error')).toContainText('inválido')
    await page.getByTestId('coupon-input').fill('LAUNCH20')
    await page.getByTestId('coupon-apply').click()
    await expect(page.getByTestId('coupon-error')).toContainText('expirou')
    await page.getByTestId('coupon-input').fill('kurio10')
    await page.getByTestId('coupon-apply').click()
    await expect(page.getByTestId('coupon-applied')).toContainText('KURIO10')
    await expect(page.getByTestId('cart-total')).toHaveText('4.84 ETH') // 5.36 − 0.536 + 0.016

    // Remove second item
    await items
      .nth(1)
      .getByRole('button', { name: /Remover Ivory Baron/ })
      .first()
      .click()
    await expect(items).toHaveCount(1)

    // Refresh keeps the guest cart (coupon included)
    await page.reload()
    await expect(items).toHaveCount(1)
    await expect(page.getByTestId('coupon-applied')).toContainText('KURIO10')
    await expect.poll(() => cartCount(page)).toBe(3)

    // Login merges the guest cart into the account cart
    await login(page)
    await page.goto('/cart')
    await expect(items).toHaveCount(1)
    await expect(items.first()).toContainText('Emerald Ape #042')
    await expect.poll(() => cartCount(page)).toBe(3)
    await page.reload()
    await expect.poll(() => cartCount(page)).toBe(3)
  })

  test('disponibilidade por edição é respeitada ao adicionar', async ({ page }) => {
    await open(page, '/nft/golden-signal-160')
    const buy = either(page, 'buy-button', 'buy-button-mobile')
    await expect(buy).toBeEnabled()
    // 1/50 of this NFT has only 2 units
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' }).first()
    await plus.click()
    await expect(plus).toBeDisabled()
    await buy.click()
    await expect(page.getByTestId('cart-count').first()).toHaveText('2')
    // Trying to add more of the same edition is blocked client-side (limit reached)
    await expect(buy).toBeDisabled()
  })

  test('carrinho vazio e esqueleto durante carregamento lento', async ({ page }) => {
    await open(page, '/cart', ['slow'])
    await expect(page.getByTestId('cart-skeleton')).toBeVisible()
    await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 15_000 })
  })
})
