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

async function signOut(page: import('@playwright/test').Page) {
  await resetAuth(page)
  await page.goto('/login')
  await page.locator('#email').waitFor({ state: 'visible' })
}

test('coach calculates and applies nutrition targets; client sees updated calorie goal', async ({
  page,
}) => {
  test.setTimeout(90_000)

  await signIn(page, 'coach@test.dev', 'password123')
  await page.waitForURL('/coach/clients')

  await page.getByRole('link', { name: 'Client Cara' }).click()
  await expect(page.getByTestId('client-nutrition-section')).toBeVisible()

  await page.getByTestId('nutrition-calc-btn').click()
  await expect(page.getByTestId('calc-preview')).toBeVisible()

  const appliedCalories = await page.getByTestId('calc-preview-calories').textContent()
  expect(appliedCalories).toMatch(/\d+/)
  const calorieValue = appliedCalories!.match(/(\d+)/)![1]

  await page.getByTestId('calc-apply-btn').click()
  await expect(page.getByTestId('nutrition-calc-btn')).toBeVisible({ timeout: 10_000 })

  await signOut(page)

  await signIn(page, 'client@test.dev', 'password123')
  await page.goto('/nutrition')

  await expect(page.getByTestId('prescribed-badge')).toBeVisible()
  await expect(page.getByTestId('calories-remaining-card')).toContainText(calorieValue)
})
