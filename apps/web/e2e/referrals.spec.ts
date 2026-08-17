import { expect, test } from '@playwright/test'
import { db, loginAsStaff } from './helpers'

test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await db.$disconnect()
})

test('a visitor refers someone through the UI and their contact is stored with consent', async ({ page }) => {
  const referredFor = `Anita ${Date.now()}`
  await page.goto('/refer')
  await page.getByLabel(/who needs a fair hearing/i).fill(referredFor)
  await page.getByLabel(/matter about/i).fill('Eviction without notice.')
  await page.getByLabel(/contact for them/i).fill('anita@example.com')
  await page.getByLabel(/happy for us to contact them/i).check()
  await page.getByRole('button', { name: /send this referral/i }).click()
  await expect(page.getByText(/received your referral/i)).toBeVisible()

  const row = await db.referral.findFirst({ where: { referredFor } })
  expect(row).not.toBeNull()
  expect(row?.contact).toBe('anita@example.com')
  expect(row?.contactConsented).toBe(true)
})

test('a referral submitted without consent never stores the contact', async ({ request }) => {
  const res = await request.post('/api/referrals', {
    data: {
      referredFor: 'A friend',
      matter: 'Wrongful termination.',
      region: 'Mumbai',
      contact: 'private@example.com',
      contactConsented: false,
    },
  })
  expect(res.status()).toBe(201)
  const { id } = await res.json()

  const row = await db.referral.findUnique({ where: { id } })
  expect(row?.contact).toBeNull()
  expect(row?.contactConsented).toBe(false)
})

test('the referrals API is staff-only', async ({ request }) => {
  const res = await request.get('/api/referrals')
  expect(res.status()).toBe(403)
})

test('staff can triage a referral through the statuses from the dashboard', async ({ page, request }) => {
  const referredFor = `Triage ${Date.now()}`
  const created = await request.post('/api/referrals', {
    data: { referredFor, matter: 'Denied a school seat.', contactConsented: true, contact: 'x@example.com' },
  })
  const { id } = await created.json()

  await loginAsStaff(page)
  await page.goto('/dashboard')
  const item = page.locator('.doc-item', { hasText: referredFor })
  await expect(item).toBeVisible()

  await item.getByRole('button', { name: /NEW → next/i }).click()
  await expect(item.getByRole('button', { name: /CONTACTED → next/i })).toBeVisible()
  await item.getByRole('button', { name: /CONTACTED → next/i }).click()
  await expect(item.getByRole('button', { name: /ASSISTED → next/i })).toBeVisible()
  await item.getByRole('button', { name: /ASSISTED → next/i }).click()
  await expect(item.getByRole('button', { name: /Closed/i })).toBeDisabled()

  const row = await db.referral.findUnique({ where: { id } })
  expect(row?.status).toBe('CLOSED')
})

test('referrals list shows anonymous referrals without a referrer', async ({ page, request }) => {
  const referredFor = `Anonymous ${Date.now()}`
  await request.post('/api/referrals', {
    data: { referredFor, matter: 'Land records dispute.' },
  })

  await loginAsStaff(page)
  await page.goto('/dashboard')
  const item = page.locator('.doc-item', { hasText: referredFor })
  await expect(item).toBeVisible()
  await expect(item.getByText(/anonymous referral/i)).toBeVisible()
})