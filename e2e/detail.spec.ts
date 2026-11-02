import { expect, test } from '@playwright/test'
import { open, vis } from './support/app'

test.describe('Detalhe do NFT', () => {
  test('acesso direto, edição indisponível e limite de quantidade', async ({ page, isMobile }) => {
    await open(page, '/nft/sage-nomad-009')
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
    await expect(vis(page, 'detail-price')).toHaveText('1.69 ETH')

    // 1/1 is unavailable for this NFT → chip disabled, cannot be chosen as purchasable
    const oneOfOne = vis(page, 'edition-1of1')
    await expect(oneOfOne).toHaveAttribute('aria-disabled', 'true')

    // 1/10 has 3 units → max 3 even though maxPerOrder would allow 5
    await vis(page, 'edition-1of10').click()
    const plus = page.getByRole('button', { name: 'Aumentar quantidade' }).first()
    await plus.click()
    await plus.click()
    await expect(plus).toBeDisabled()
    if (!isMobile) await expect(page.getByTestId('availability-text')).toContainText('3 disponíveis')
  })

  test('NFT inexistente mostra 404 e permite voltar ao início', async ({ page }) => {
    await open(page, '/nft/nao-existe-123')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('rota inexistente mostra 404 genérico', async ({ page }) => {
    await open(page, '/isto/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })
})
