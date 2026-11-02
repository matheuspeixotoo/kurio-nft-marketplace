import { expect, test } from '@playwright/test'
import { either, login, open, setScenario } from './support/app'

test.describe('Favoritos', () => {
  test('toggle otimista persiste; falha da mutation faz rollback', async ({ page }) => {
    await open(page, '/')
    await login(page)
    const favoritesLoaded = page.waitForResponse((r) => r.url().includes('/api/favorites') && r.request().method() === 'GET')
    await page.goto('/nft/golden-beat-207')
    await favoritesLoaded
    const button = either(page, 'favorite-button', 'favorite-button-mobile')

    const saved = page.waitForResponse((r) => r.url().includes('/api/favorites/golden-beat-207') && r.request().method() === 'PUT')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true') // optimistic
    expect((await saved).status()).toBe(200)
    await page.reload()
    await expect(button).toHaveAttribute('aria-pressed', 'true') // persisted for the user

    // Failure: optimistic flip then rollback to "favorited"
    await setScenario(page, ['favorites-fail'])
    const failing = page.waitForResponse((r) => r.url().includes('/api/favorites/') && r.status() === 500)
    await button.click()
    await failing
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('toast-error')).toBeVisible()

    // Recovery
    await setScenario(page, [])
    const removed = page.waitForResponse((r) => r.url().includes('/api/favorites/golden-beat-207') && r.request().method() === 'DELETE')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    expect((await removed).status()).toBe(200)
    await page.goto('/account/favorites')
    await expect(page.getByTestId('favorites-grid').getByTestId('nft-card')).toHaveCount(2)
  })
})
