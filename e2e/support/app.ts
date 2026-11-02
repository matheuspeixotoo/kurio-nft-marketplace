import { expect, type Page, type Response } from '@playwright/test'

/** Visible element by test id (desktop and mobile variants share ids; only one is rendered visibly). */
export function vis(page: Page, testId: string) {
  return page.locator(`[data-testid="${testId}"]:visible`)
}

/** Whichever variant (desktop or mobile) is visible right now; waits like any locator. */
export function either(page: Page, desktopId: string, mobileId: string) {
  return page.locator(`[data-testid="${desktopId}"]:visible, [data-testid="${mobileId}"]:visible`).first()
}

export const USERS = {
  ana: { email: 'ana@kurio.app', password: 'Kurio@2026', displayName: 'Ana Ribeiro', username: 'ana.colecionadora' },
  bruno: { email: 'bruno@kurio.app', password: 'Kurio@2026', displayName: 'Bruno Carvalho', username: 'bruno.mints' },
} as const

export type ScenarioFlag =
  | 'slow'
  | 'variable-latency'
  | 'flaky'
  | 'offline'
  | 'timeout'
  | 'empty-catalog'
  | 'session-expired'
  | 'register-conflict'
  | 'coupon-expired'
  | 'price-change'
  | 'sold-out'
  | 'order-timeout'
  | 'payment-declined'
  | 'wallet-rejected'
  | 'favorites-fail'
  | 'profile-conflict'

/** Opens a page with a fresh mock state and the given scenario flags (all handled before the app renders). */
export async function open(page: Page, path = '/', flags: ScenarioFlag[] = []) {
  const url = new URL(path, 'http://x')
  url.searchParams.set('reset', '1')
  url.searchParams.set('scenario', flags.join(','))
  await page.goto(`${url.pathname}${url.search}${url.hash}`)
  await expect(page.locator('#root')).not.toBeEmpty()
}

/** Changes the active flags at runtime through the mock control plane (no reload). */
export async function setScenario(page: Page, flags: ScenarioFlag[]) {
  await page.evaluate(async (f) => {
    await fetch('/api/_mock/scenario', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ flags: f }) })
  }, flags)
}

export async function trigger(page: Page, body: Record<string, unknown>) {
  const res = await page.evaluate(async (b) => {
    const r = await fetch('/api/_mock/trigger', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
    return r.status
  }, body)
  expect(res, `trigger ${JSON.stringify(body)}`).toBe(200)
}

export async function login(page: Page, user: keyof typeof USERS = 'ana') {
  const u = USERS[user]
  await page.goto('/login')
  await page.getByTestId('login-form').getByLabel('E-mail').fill(u.email)
  await page.getByTestId('login-form').getByLabel('Senha', { exact: true }).fill(u.password)
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.getByTestId('account-menu-trigger')).toBeVisible()
}

export async function logout(page: Page) {
  await page.getByTestId('account-menu-trigger').click()
  await page.getByTestId('logout').click()
  await expect(page.getByTestId('header-login')).toBeVisible()
}

export async function addToCart(page: Page, nftId = 'emerald-ape-042', quantity = 1) {
  await page.goto(`/nft/${nftId}`)
  const buy = either(page, 'buy-button', 'buy-button-mobile')
  await expect(buy).toBeEnabled()
  const before = await cartCount(page)
  for (let i = 1; i < quantity; i++) await page.getByRole('button', { name: 'Aumentar quantidade' }).first().click()
  const added = page.waitForResponse((r) => r.url().includes('/api/cart/items') && r.request().method() === 'POST')
  await buy.click()
  await added
  await expect.poll(() => cartCount(page)).toBe(before + quantity)
}

export async function cartCount(page: Page) {
  const badge = page.getByTestId('cart-count').first()
  if (!(await badge.isVisible())) return 0
  return Number(await badge.textContent())
}

export async function waitForApi(page: Page, method: string, pathPart: string, status?: number): Promise<Response> {
  return page.waitForResponse((r) => r.request().method() === method && r.url().includes(pathPart) && (status === undefined || r.status() === status))
}

export async function connectWalletAndReview(page: Page) {
  await page.getByTestId('connect-wallet').click()
  await expect(page.getByTestId('wallet-connection')).toHaveAttribute('data-status', 'connected')
  await expect(page.getByTestId('review-order')).toBeEnabled()
  await page.getByTestId('review-order').click()
  await expect(page.getByRole('dialog', { name: 'Revisar pedido' })).toBeVisible()
}

/** Full happy path from an empty state to the review dialog. */
export async function goToReview(page: Page, nftId = 'emerald-ape-042') {
  await login(page)
  await addToCart(page, nftId)
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-form')).toBeVisible()
  await expect(page.getByTestId('quote-summary')).not.toHaveAttribute('aria-busy', 'true')
  await connectWalletAndReview(page)
}
