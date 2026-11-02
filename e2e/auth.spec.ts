import { expect, test } from '@playwright/test'
import { USERS, either, login, logout, open } from './support/app'

test.describe('Conta e sessão', () => {
  test('cadastro com validação, conflito de e-mail e sucesso', async ({ page }) => {
    await open(page, '/register')
    await page.getByTestId('register-submit').click()
    await expect(page.getByRole('alert').first()).toBeVisible()

    const form = page.getByTestId('register-form')
    await form.getByLabel('Nome de usuário').fill('nova.colecionadora')
    await form.getByLabel('E-mail').fill(USERS.ana.email) // already taken
    await form.getByLabel('Senha', { exact: true }).fill('Kurio@2026')
    await form.getByLabel('Confirmar senha').fill('Kurio@2026')
    await page.getByTestId('register-submit').click()
    await expect(form.getByText(/já está cadastrado/)).toBeVisible()

    await form.getByLabel('E-mail').fill('nova@kurio.app')
    await page.getByTestId('register-submit').click()
    await expect(page.getByTestId('account-menu-trigger')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('account-menu-trigger')).toBeVisible() // session survives refresh
  })

  test('login inválido, login válido com retorno ao fluxo anterior e logout', async ({ page }) => {
    await open(page, '/nft/emerald-ape-042')
    await either(page, 'favorite-button', 'favorite-button-mobile').click()
    await expect(page).toHaveURL(/\/login\?redirect=/)

    const form = page.getByTestId('login-form')
    await form.getByLabel('E-mail').fill(USERS.ana.email)
    await form.getByLabel('Senha', { exact: true }).fill('errada123')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('form-error')).toContainText('E-mail ou senha incorretos')

    await form.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/\/nft\/emerald-ape-042/)
    await expect(page.getByTestId('account-menu-trigger')).toBeVisible()

    await logout(page)
    await page.goto('/account/profile')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('expiração de sessão durante a navegação preserva o contexto para retomada', async ({ page }) => {
    await open(page, '/', ['session-expired'])
    await login(page)
    await page.goto('/account/wallets')
    await expect(page.getByRole('heading', { name: 'Carteira principal' })).toBeVisible()
    // Sessions last 20 s under this flag: move the page clock 25 s ahead (timers keep running) and reload.
    await page.clock.setFixedTime(new Date(Date.now() + 25_000))
    await page.reload()
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Fwallets/)
    await page.getByTestId('login-form').getByLabel('E-mail').fill(USERS.ana.email)
    await page.getByTestId('login-form').getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL(/\/account\/wallets/)
  })

  test('troca de usuário limpa dados privados em cache', async ({ page }) => {
    await open(page, '/')
    await login(page, 'ana')
    await page.goto('/account/favorites')
    await expect(page.getByTestId('favorites-grid').getByTestId('nft-card')).toHaveCount(2)
    await logout(page)
    await login(page, 'bruno')
    await page.goto('/account/favorites')
    await expect(page.getByTestId('empty-state')).toBeVisible()
    await expect(page.getByTestId('favorites-grid')).toHaveCount(0)
  })
})
