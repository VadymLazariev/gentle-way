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

test('coach sets goal and supplement; client adds scheduled supplement; logs; analytics visible', async ({
  page,
}) => {
  test.setTimeout(90_000)

  await signIn(page, 'coach@test.dev', 'password123')
  await page.waitForURL('/coach/clients')

  await page.getByRole('link', { name: 'Client Cara' }).click()
  const clientId = page.url().split('/').pop()
  await expect(page.getByTestId('goals-section')).toBeVisible()

  await page.getByRole('button', { name: 'Add goal' }).click()
  await page.getByTestId('goal-title-input').fill('Reach 80 kg')
  await page.getByTestId('goal-target-weight-input').fill('80')
  await page.getByTestId('goal-save-btn').click()
  await expect(page.getByText('Reach 80 kg')).toBeVisible()

  await page.getByTestId('supplements-coach-section').getByRole('button', { name: 'Add' }).click()
  await page.getByTestId('supplement-name-input').fill('Creatine')
  await page.getByTestId('supplement-dosage-amount').fill('5')
  await page.getByTestId('supplement-dosage-unit').selectOption('g')
  await page.getByTestId('supplement-save-btn').click()
  await expect(page.getByText('Creatine')).toBeVisible()

  await signOut(page)

  await signIn(page, 'client@test.dev', 'password123')
  await page.waitForURL('/')

  await page.goto('/supplements')
  await page.getByTestId('add-supplement-btn').click()
  await page.getByTestId('supplement-name-input').fill('Vitamin D')
  await page.getByTestId('supplement-dosage-amount').fill('2000')
  await page.getByTestId('supplement-dosage-unit').selectOption('IU')
  for (const day of [0, 2, 4, 6]) {
    await page.getByTestId(`schedule-day-${day}`).click()
  }
  await page.getByTestId('schedule-time-0').fill('08:00')
  await page.getByTestId('supplement-save-btn').click()
  await expect(page.getByText('Vitamin D')).toBeVisible()
  await expect(page.getByText('Mon, Wed, Fri')).toBeVisible()

  await page.getByRole('button', { name: 'Mark taken' }).first().click()
  await expect(page.getByRole('button', { name: 'Taken' }).first()).toBeVisible()

  await page.goto('/goals')
  await expect(page.getByText('Reach 80 kg')).toBeVisible()

  await page.goto('/attendance')
  await expect(page.getByTestId('attendance-calendar')).toBeVisible()

  await signOut(page)
  await signIn(page, 'coach@test.dev', 'password123')
  await page.waitForURL(/\/coach/, { timeout: 30_000 })
  await page.goto(`/coach/analytics/${clientId}`)
  await expect(page.getByTestId('adherence-recovery-chart')).toBeVisible()
  await expect(page.getByTestId('attendance-calendar')).toBeVisible()
})
