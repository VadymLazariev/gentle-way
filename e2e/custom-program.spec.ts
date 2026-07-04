import { execSync } from 'node:child_process'
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

function todayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function latestTemplateSetLink(): { template_session_id: string | null; prescription_id: number | null } {
  const raw = execSync(
    `npx supabase db query --local --output json "SELECT template_session_id, prescription_id FROM session_sets WHERE template_session_id IS NOT NULL ORDER BY created_at DESC LIMIT 1"`,
    { cwd: process.cwd(), encoding: 'utf8' },
  )
  const jsonStart = raw.indexOf('{')
  const parsed = JSON.parse(raw.slice(jsonStart)) as {
    rows: Array<{
      template_session_id: string | null
      prescription_id: number | null
    }>
  }
  const row = parsed.rows[0]
  if (!row) throw new Error('No template-linked session_sets row found')
  return row
}

test('coach custom program: assign, client tracks workout linked to template', async ({ page }) => {
  test.setTimeout(180_000)

  const programName = 'E2E Custom Trackable'
  const allWeeksExercise = 'E2E All Weeks Squat'
  const weekOneExercise = 'E2E Week 1 Bench'

  await signIn(page, 'coach@test.dev', 'password123')
  await page.goto('/coach/programs')

  await page.getByTestId('new-program-btn').click()
  await page.locator('#template-name').fill(programName)
  await page.getByTestId('create-program-save').click()
  await expect(page.getByText('Program created')).toBeVisible({ timeout: 10_000 })

  const templateCard = page.locator('[data-testid^="program-template-"]').filter({ hasText: programName })
  await expect(templateCard).toBeVisible()
  await templateCard.getByRole('link', { name: programName }).click()

  await page.getByTestId('add-meso-btn').click()
  await page.getByTestId('meso-name').fill('Accumulation')
  await page.locator('#meso-weeks').fill('2')
  await page.getByTestId('meso-save').click()
  await expect(page.getByText('Phase added')).toBeVisible()

  await page.getByRole('button', { name: 'Add phase' }).click()
  await page.getByTestId('meso-name').fill('Intensification')
  await page.locator('#meso-weeks').fill('2')
  await page.getByTestId('meso-save').click()
  await expect(page.getByText('Phase added')).toBeVisible()

  const firstMeso = page.locator('[data-testid^="mesocycle-"]').first()
  await expect(firstMeso).toBeVisible()
  const mesoId = (await firstMeso.getAttribute('data-testid'))!.replace('mesocycle-', '')

  await page.getByTestId(`add-exercise-${mesoId}`).click()
  await page.getByTestId('session-row-exercise').fill(allWeeksExercise)
  await page.getByTestId('session-row-prescription').fill('3×5')
  await page.getByTestId('session-row-save').click()

  await page.getByTestId(`meso-week-select-${mesoId}`).selectOption('1')
  await page.getByTestId(`add-exercise-${mesoId}-A`).click()
  await page.getByTestId('session-row-exercise').fill(weekOneExercise)
  await page.getByTestId('session-row-prescription').fill('3×8')
  await page.getByTestId('session-row-save').click()

  await page.getByTestId('assign-program-btn').click()
  await page.getByTestId('assign-program-client').selectOption({ label: 'Client Cara' })
  await page.locator('#assign-start').fill(todayIsoDate())

  const saturday = new Date().getDay()
  await page.getByLabel('Saturday session').selectOption('Day A')
  if (saturday !== 6) {
    await page.getByLabel('Saturday session').selectOption('Rest')
    const weekdayLabels = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ] as const
    await page.getByLabel(`${weekdayLabels[saturday]} session`).selectOption('Day A')
  }

  await page.getByTestId('assign-program-submit').click()
  await expect(page.getByText('Program assigned')).toBeVisible()

  await signOut(page)

  await signIn(page, 'client@test.dev', 'password123')
  await page.waitForLoadState('networkidle')
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(programName)).toBeVisible({ timeout: 15_000 })
  const launcher = page.getByTestId('session-launcher')
  await expect(launcher).toBeVisible()
  await expect(launcher.getByText(allWeeksExercise)).toBeVisible()
  await expect(launcher.getByText(weekOneExercise)).toBeVisible()

  await page.getByTestId('session-launcher-btn').click()
  await page.getByRole('button', { name: 'Start Workout' }).click()
  await page.getByRole('button', { name: 'Feeling good, skip' }).click()
  await expect(page).toHaveURL(/\/session\//, { timeout: 15_000 })
  await expect(page.getByRole('button', { name: 'Finish' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: allWeeksExercise })).toBeVisible({ timeout: 15_000 })

  const weightInput = page.locator('input[inputmode="decimal"]').first()
  await weightInput.fill('60')
  await weightInput.blur()

  await page.getByRole('button', { name: 'Mark set done' }).first().click()
  await page.getByRole('button', { name: 'Finish' }).click()
  await page.getByRole('button', { name: 'Complete Unfinished Sets' }).click()

  await expect(page).toHaveURL(/\/summary\//, { timeout: 15_000 })

  const link = latestTemplateSetLink()
  expect(link.template_session_id).not.toBeNull()
  expect(link.prescription_id).toBeNull()
})
