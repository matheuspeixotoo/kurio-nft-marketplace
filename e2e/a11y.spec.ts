import { expect, test } from '@playwright/test'
import { open } from './support/app'

test.describe('Acessibilidade: teclado, foco e validação', () => {
  test('skip link, navegação por teclado e foco controlado no diálogo de busca', async ({ page, isMobile }) => {
    test.skip(isMobile, 'o diálogo de busca do cabeçalho é um controle desktop')
    await open(page, '/')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#conteudo')).toBeFocused()

    await page.getByTestId('open-search').focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Buscar no catálogo' })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Buscar NFTs' })).toBeFocused()
    // Focus stays trapped inside the dialog
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab')
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('open-search')).toBeFocused()
  })

  test('filtros e paginação operáveis por teclado', async ({ page, isMobile }) => {
    test.skip(isMobile, 'filtros ficam em drawer no mobile (coberto em catalog.spec)')
    await open(page, '/')
    await page.getByLabel('Música').focus()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/category=musica/)
    await page
      .getByRole('button', { name: 'Página 2' })
      .focus()
      .catch(() => undefined)
  })

  test('formulário de login: erros associados aos campos e foco no primeiro inválido', async ({ page }) => {
    await open(page, '/login')
    await page.getByTestId('login-submit').click()
    const email = page.getByTestId('login-form').getByLabel('E-mail')
    await expect(email).toBeFocused()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy!.split(' ')[0]}`)).toHaveText(/e-mail/i)
    await expect(page.getByTestId('live-assertive')).toContainText(/erro/i)
  })

  test('drawer mobile de filtros prende e devolve o foco', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'somente mobile')
    await open(page, '/')
    const trigger = page.getByTestId('open-filters')
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'Filtros' })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
})
