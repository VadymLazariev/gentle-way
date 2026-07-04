import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('measurement value input updates on edit', async ({ page }) => {
  await signIn(page, 'client@test.dev', 'password123')
  await page.waitForURL('/')

  await page.goto('/measurements')
  await page.getByTestId('measurement-log-btn').click()

  const display = page.getByTestId('measurement-value-display')
  const input = page.getByTestId('measurement-value-input')
  await expect(display).toBeVisible()

  await display.click()
  await input.fill('88.5')
  await input.press('Enter')
  await expect(display).toContainText('88.5')

  await page.getByTestId('measurement-next-btn').click()
  await expect(page.getByText('Neck', { exact: true })).toBeVisible()
})

test('client logs measurement and weekly report; coach sees on dashboard', async ({ page }) => {
  await signIn(page, 'client@test.dev', 'password123')
  await page.waitForURL('/')

  await page.goto('/measurements')
  await page.getByTestId('measurement-log-btn').click()

  await page.getByTestId('measurement-value-display').click()
  await page.getByTestId('measurement-value-input').fill('88')
  await page.getByTestId('measurement-value-input').press('Enter')
  await page.getByTestId('measurement-next-btn').click()
  for (let i = 0; i < 12; i += 1) {
    await page.getByTestId('measurement-skip-btn').click()
  }
  await page.getByTestId('measurement-confirm-btn').click()
  await expect(page.getByText('Measurements saved')).toBeVisible()

  await page.goto('/weekly-report')
  await expect(page.getByTestId('weekly-report-measurements')).toBeVisible()
  await page.getByTestId('weekly-report-submit-btn').click()
  await expect(page.getByText('Weekly report submitted')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL('/login')
  await signIn(page, 'coach@test.dev', 'password123')
  await page.waitForURL('/coach/clients')

  await page.getByRole('link', { name: 'Client Cara' }).click()
  await expect(page.getByTestId('client-weekly-reports')).toBeVisible()
  await expect(page.getByText('Submitted')).toBeVisible()
  await expect(page.getByText('Body measurements')).toBeVisible()
})
