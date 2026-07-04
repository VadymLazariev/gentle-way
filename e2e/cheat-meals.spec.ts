import { expect, test } from '@playwright/test'

async function resetAuth(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => {
    for (const key of [...Object.keys(localStorage)]) {
      if (key.startsWith('sb-')) localStorage.removeItem(key)
    }
    sessionStorage.clear()
  })
  await page.context().clearCookies()
}

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await resetAuth(page)
    await page.goto('/login')
    await page.locator('#email').waitFor({ state: 'visible' })
    await page.fill('#email', email)
    await page.fill('#password', password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    try {
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
      return
    } catch {
      if (attempt === 1) throw new Error(`Sign in failed for ${email}`)
    }
  }
}

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('client submits cheat meal without photo; coach sees pending and approves', async ({ page }) => {
  test.setTimeout(90_000)

  await signIn(page, 'client@test.dev', 'password123')
  await page.goto('/nutrition')
  await expect(page.getByTestId('cheat-meal-card')).toBeVisible({ timeout: 15_000 })

  await page.getByTestId('cheat-meal-open-btn').click()
  await page.getByTestId('cheat-meal-name').fill('Birthday cake')
  await page.getByTestId('cheat-meal-grams').fill('150')
  await expect(page.getByTestId('cheat-meal-preview')).toContainText('750')
  await page.getByTestId('cheat-meal-submit').click()
  await expect(page.getByText('Cheat meal reported to your coach')).toBeVisible()
  await expect(page.getByTestId('pending-cheat-meal')).toContainText('Birthday cake')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('/login')
  await signIn(page, 'coach@test.dev', 'password123')
  await page.waitForURL('/coach/clients')

  await page.goto('/coach/reports')
  await expect(page.getByTestId('coach-pending-cheat-meals')).toBeVisible()
  await expect(page.getByText('Birthday cake')).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).first().click()
  await expect(page.getByText('Cheat meal approved')).toBeVisible()
})

test('client submits cheat meal with photo mock', async ({ page }) => {
  test.setTimeout(90_000)

  await signIn(page, 'client@test.dev', 'password123')
  await page.goto('/nutrition')
  await expect(page.getByTestId('cheat-meal-card')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('cheat-meal-open-btn').click()
  await page.getByTestId('cheat-meal-name').fill('Burger meal')
  await page.getByTestId('cheat-meal-grams').fill('200')
  await page.getByTestId('cheat-meal-photo').setInputFiles({
    name: 'burger.png',
    mimeType: 'image/png',
    buffer: tinyPng,
  })
  await page.getByTestId('cheat-meal-submit').click()
  await expect(page.getByText('Cheat meal reported to your coach')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('cheat-meal-cancel-btn').click()
  await expect(page.getByText('Cheat meal report cancelled')).toBeVisible()
})

test('client can cancel pending cheat meal report', async ({ page }) => {
  test.setTimeout(90_000)

  await signIn(page, 'client@test.dev', 'password123')
  await page.goto('/nutrition')
  await page.getByTestId('cheat-meal-open-btn').click()
  await page.getByTestId('cheat-meal-name').fill('Ice cream')
  await page.getByTestId('cheat-meal-grams').fill('80')
  await page.getByTestId('cheat-meal-submit').click()
  await expect(page.getByTestId('pending-cheat-meal')).toBeVisible()

  await page.getByTestId('cheat-meal-cancel-btn').click()
  await expect(page.getByText('Cheat meal report cancelled')).toBeVisible()
  await expect(page.getByText('Ice cream')).not.toBeVisible()
})
