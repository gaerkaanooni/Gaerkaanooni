import { expect, test } from '@playwright/test'
import { loginAsPublic } from './helpers'

test.describe('public email-OTP auth', () => {
  test('a citizen signs in with the email OTP code', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email address/i).fill('citizen@example.com')
    await page.getByRole('button', { name: /send me a code/i }).click()

    await expect(page.getByText(/your code is/i)).toBeVisible()
    const devCode = await page.getByText(/your code is/i).locator('strong').textContent()
    expect(devCode).toMatch(/^\d{6}$/)

    await page.getByLabel(/6-digit code/i).fill(devCode ?? '')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByText(/sign out/i)).toBeVisible()
  })

  test('rejects a wrong code', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email address/i).fill('citizen@example.com')
    await page.getByRole('button', { name: /send me a code/i }).click()
    await expect(page.getByText(/your code is/i)).toBeVisible()

    await page.getByLabel(/6-digit code/i).fill('000000')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByText(/invalid or expired code/i)).toBeVisible()
  })

  test('rejects an invalid email', async ({ request }) => {
    const res = await request.post('/api/public-auth/otp', { data: { email: 'not-an-email' } })
    expect(res.status()).toBe(400)
    expect((await res.json()).error).toMatch(/valid email/i)
  })

  test('a citizen signs out after signing in', async ({ page }) => {
    await loginAsPublic(page, `signout-${Date.now()}@example.com`)

    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page.getByText(/sign in/i).first()).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('a citizen signs in with Google via the mock provider', async ({ page }) => {
    await page.goto('/login')
    // Wait for hydration: clicking before React attaches handlers loses the
    // post-login navigation on a cold dev server.
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /continue with google/i }).click()
    await expect(page.getByText(/sign out/i)).toBeVisible()
    await page.goto('/')
    await expect(
      page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: /submit a case/i }),
    ).toBeVisible()
  })

  test('a newly registered public user becomes a PUBLIC role and is barred from staff pages', async ({
  page,
  request,
}) => {
  const email = `register-${Date.now()}@example.com`
  const res = await request.post('/api/register', {
    data: { name: 'Test Citizen', email, password: 'longpassword1' },
  })
  expect(res.status()).toBe(201)

  await loginAsPublic(page, email)
  // Staff-guarded surfaces all route to the staff sign-in (spec 08 §3).
  await page.goto('/login/staff')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Staff sign in')
  await page.goto('/analytics')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Staff sign in')
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Staff sign in')
})
})

test.describe('staff auth', () => {
  test('a staff member signs in with their credentials and can reach the dashboard', async ({ page }) => {
    await page.goto('/login/staff')
    await page.getByLabel(/email/i).fill('staff@example.com')
    await page.getByLabel(/password/i).fill('staff-pass-123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/sign out/i)).toBeVisible()
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Operations dashboard')
  })

  test('rejects a wrong password', async ({ page }) => {
    await page.goto('/login/staff')
    await page.getByLabel(/email/i).fill('staff@example.com')
    await page.getByLabel(/password/i).fill('wrong-pass')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
  })

  test('a staff member signs out', async ({ page, request }) => {
    await page.goto('/login/staff')
    await page.getByLabel(/email/i).fill('staff@example.com')
    await page.getByLabel(/password/i).fill('staff-pass-123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/sign out/i)).toBeVisible()

    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/$/)

    const res = await request.get('/dashboard', { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers().location).toMatch(/\/login/)
  })
})