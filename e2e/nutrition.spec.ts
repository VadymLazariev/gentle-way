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

const mockOffSearch = {
  products: [
    {
      code: '1234567890123',
      product_name: 'Test Oats',
      brands: 'E2E Brand',
      nutriments: {
        'energy-kcal_100g': 380,
        proteins_100g: 13,
        carbohydrates_100g: 67,
        fat_100g: 7,
      },
      serving_size: '40g',
      serving_quantity: 40,
    },
  ],
}

test('client logs food via OFF search; dashboard shows updated calories', async ({ page }) => {
  test.setTimeout(90_000)

  await page.route('**/world.openfoodfacts.org/cgi/search.pl**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOffSearch),
    })
  })

  await signIn(page, 'client@test.dev', 'password123')
  await page.waitForURL('/')

  await page.goto('/nutrition')
  await expect(page.getByTestId('calories-remaining-card')).toBeVisible()

  await page.getByTestId('nutrition-fab').click()
  await page.getByTestId('food-search-input').fill('oats')
  await expect(page.getByText('Test Oats')).toBeVisible({ timeout: 10_000 })
  await page.getByText('Test Oats').click()
  await page.getByTestId('food-add-btn').click()

  await expect(page.getByTestId('calories-remaining-card')).toContainText(/remaining|over/)
  const cardText = await page.getByTestId('calories-remaining-card').textContent()
  expect(cardText).not.toMatch(/^\s*2200\s*\/\s*2200/)
})

test('client adds custom food and sees it in diary', async ({ page }) => {
  test.setTimeout(60_000)

  await signIn(page, 'client@test.dev', 'password123')
  await page.goto('/nutrition/diary')

  await page.getByTestId('add-food-breakfast').click()
  await page.getByRole('button', { name: 'Custom' }).click()
  await page.getByTestId('custom-food-name').fill('Protein Shake')
  await page.getByTestId('custom-food-calories').fill('120')
  await page.getByRole('button', { name: 'Save & use' }).click()
  await page.getByTestId('food-add-btn').click()

  await expect(page.getByTestId('diary-daily-totals')).toContainText('120')
  await expect(page.getByText('Protein Shake')).toBeVisible()
})
