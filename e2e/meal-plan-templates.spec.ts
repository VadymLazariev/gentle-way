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

const mockOffSearch = {
  products: [
    {
      code: '1234567890123',
      product_name: 'Plan Oats',
      brands: 'E2E Brand',
      nutriments: {
        'energy-kcal_100g': 380,
        proteins_100g: 13,
        carbohydrates_100g: 67,
        fat_100g: 7,
      },
      serving_size: '100g',
      serving_quantity: 100,
    },
  ],
}

test('coach builds meal plan, assigns to client; client confirms planned food', async ({ page }) => {
  test.setTimeout(120_000)

  await page.route('**/world.openfoodfacts.org/cgi/search.pl**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockOffSearch),
    })
  })

  await signIn(page, 'coach@test.dev', 'password123')
  await page.goto('/coach/nutrition')

  await page.getByTestId('new-diet-template-btn').click()
  await page.getByTestId('diet-template-name').fill('E2E Meal Plan')
  await page.getByTestId('diet-template-calories').fill('2000')
  await page.getByTestId('diet-template-save').click()
  await expect(page.getByText('Template created')).toBeVisible({ timeout: 10_000 })

  const templateCard = page.locator('[data-testid^="diet-template-"]').filter({ hasText: 'E2E Meal Plan' })
  await expect(templateCard).toBeVisible()
  const templateId = await templateCard.getAttribute('data-testid')
  const id = templateId!.replace('diet-template-', '')

  await page.getByTestId(`edit-plan-${id}`).click()
  await expect(page.getByTestId('template-macro-preview')).toBeVisible()

  await page.getByTestId('add-template-meal-btn').click()
  await page.getByTestId('template-meal-name').fill('Morning oats')
  await page.getByTestId('template-meal-save').click()
  await expect(page.getByText('Meal added')).toBeVisible()

  const mealSection = page.locator('[data-testid^="template-meal-"]').first()
  await expect(mealSection).toBeVisible()
  const mealId = (await mealSection.getAttribute('data-testid'))!.replace('template-meal-', '')

  await page.getByTestId(`add-food-meal-${mealId}`).click()
  await page.getByTestId('food-search-input').fill('oats')
  await expect(page.getByText('Plan Oats')).toBeVisible({ timeout: 10_000 })
  await page.getByText('Plan Oats').click()
  await page.getByTestId('food-add-btn').click()
  await expect(page.getByText('Food logged')).toBeVisible()

  await expect(page.getByTestId('template-macro-preview')).toContainText('380')

  await page.getByRole('link', { name: 'Back' }).click()
  await page.goto('/coach/clients')
  await page.getByRole('link', { name: 'Client Cara' }).click()
  await page.getByTestId('assign-diet-btn').click()
  await page.getByTestId('diet-template-select').selectOption(id)
  await page.getByRole('button', { name: 'Assign to client' }).click()
  await expect(page.getByText('Diet template assigned')).toBeVisible()
  await expect(page.getByTestId('client-plan-meals')).toBeVisible()

  await signOut(page)

  await signIn(page, 'client@test.dev', 'password123')
  await page.waitForLoadState('networkidle')
  await page.goto('/nutrition/diary')
  await expect(page.getByTestId('diary-daily-totals')).toBeVisible({ timeout: 15_000 })

  await expect(page.locator('[data-testid^="prescribed-meal-"]')).toBeVisible({ timeout: 15_000 })
  const plannedItem = page.locator('[data-testid^="planned-item-"]').first()
  await expect(plannedItem).toBeVisible()
  const plannedItemId = (await plannedItem.getAttribute('data-testid'))!.replace('planned-item-', '')

  await page.getByTestId(`planned-check-${plannedItemId}`).click()
  await expect(page.getByText('Planned item confirmed')).toBeVisible({ timeout: 10_000 })

  await page.goto('/nutrition')
  await expect(page.getByTestId('plan-adherence-summary')).toBeVisible()
  await expect(page.getByTestId('plan-adherence-summary')).toContainText('1 / 1')
})
