import { expect, test } from '@playwright/test'
import { login, open, setScenario } from './support/app'

const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

test.describe('Perfil e carteiras', () => {
  test('edição do perfil com validação, conflito da API, avatar e senha', async ({ page }) => {
    await open(page, '/')
    await login(page, 'bruno')
    await page.goto('/account/profile')
    const form = page.getByTestId('profile-form')
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Bruno Carvalho')

    // Client validation
    await form.getByLabel('Nome de usuário').fill('x')
    await page.getByTestId('profile-save').click()
    await expect(form.getByText(/pelo menos 3/)).toBeVisible()

    // API conflict (username taken by ana)
    await form.getByLabel('Nome de usuário').fill('ana.colecionadora')
    await form.getByLabel('Apelido da carteira').fill('Cofre')
    await page.getByTestId('profile-save').click()
    await expect(form.getByText(/indisponível/)).toBeVisible()

    // Success + persistence
    await form.getByLabel('Nome de usuário').fill('bruno.carvalho')
    await form.getByLabel('Nome de exibição').fill('Bruno C.')
    await page.getByTestId('profile-save').click()
    await expect(page.getByTestId('toast-success')).toBeVisible()
    await page.reload()
    await expect(form.getByLabel('Nome de exibição')).toHaveValue('Bruno C.')

    // Avatar upload / remove
    await page.getByTestId('avatar-input').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1x1 })
    await expect(page.getByRole('img', { name: /Avatar de/ })).toBeVisible()
    await page.getByRole('button', { name: 'Remover' }).first().click()
    await expect(page.getByRole('img', { name: /Avatar de/ })).toHaveCount(0)

    // Password: wrong current, then success and login with the new one
    const pw = page.getByTestId('password-form')
    await pw.getByLabel('Senha atual').fill('errada123')
    await pw.getByLabel('Nova senha', { exact: true }).fill('NovaSenha2026')
    await pw.getByLabel('Confirmar nova senha').fill('NovaSenha2026')
    await page.getByTestId('password-save').click()
    await expect(pw.getByText('Senha atual incorreta')).toBeVisible()
    await pw.getByLabel('Senha atual').fill('Kurio@2026')
    await page.getByTestId('password-save').click()
    await expect(page.getByTestId('toast-success').last()).toContainText('Senha alterada')
  })

  test('cadastro e edição de carteiras principal e secundária com erros de validação', async ({ page }) => {
    await open(page, '/')
    await login(page, 'bruno')
    await page.goto('/account/wallets')
    const form = page.getByTestId('wallet-form-primary')
    await expect(form).toBeVisible()

    await page.getByTestId('wallet-save-primary').click()
    await expect(form.getByRole('alert').first()).toBeVisible()

    await form.getByLabel('Apelido da carteira').fill('Principal')
    await page.getByTestId('wallet-primary-network').click()
    await page.getByRole('option', { name: 'Ethereum' }).click()
    await form.getByLabel('Endereço da carteira').fill('0x123') // invalid
    await page.getByTestId('wallet-primary-provider').click()
    await page.getByRole('option', { name: 'MetaMask' }).click()
    await form.getByLabel('Código de indicação').fill('KURIO-BRUNO')
    await form.getByLabel('Nome ENS').fill('bruno')
    await page.getByTestId('wallet-save-primary').click()
    await expect(form.getByText(/40 caracteres hexadecimais/)).toBeVisible()

    await form.getByLabel('Endereço da carteira').fill('0x5bC1E7a84d6B9C0e2F5A713Fd1a8B6c47E9A0D2f')
    await page.getByTestId('wallet-save-primary').click()
    await expect(page.getByTestId('wallet-card-primary')).toContainText('MetaMask · Ethereum')

    // API conflict scenario on edit
    await setScenario(page, ['profile-conflict'])
    await page.getByTestId('edit-primary').click()
    await page.getByTestId('wallet-save-primary').click()
    await expect(page.getByTestId('wallet-form-primary').getByText(/indisponível|em uso/)).toBeVisible()
    await setScenario(page, [])
    await page.getByRole('button', { name: 'Cancelar' }).click()

    // Secondary = same as primary
    await page.getByTestId('secondary-same').check()
    await expect(page.getByTestId('wallet-card-secondary')).toContainText('igual à principal')
    await page.reload()
    await expect(page.getByTestId('wallet-card-secondary')).toBeVisible()
    await page.getByTestId('remove-secondary').click()
    await expect(page.getByTestId('wallet-card-secondary')).toHaveCount(0)
  })
})
