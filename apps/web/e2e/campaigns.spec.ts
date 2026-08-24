import { expect, test, type Page } from '@playwright/test'

const validSubmission = {
  entryType: 'funded',
  title: 'River pollution in the Yamuna',
  summary: 'Untreated industrial discharge affecting downstream communities.',
  category: 'ENVIRONMENT',
  region: 'Delhi',
  goalAmountPaise: 500_000,
  deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  track: 'CAMPAIGN',
  whatHappened: 'Continuous discharge for 18 months.',
  applicantName: 'Asha Rao',
  contact: 'asha@example.com',
}

async function loginAsStaff(page: Page) {
  await page.goto('/login/staff')
  await page.getByLabel(/email/i).fill('staff@example.com')
  await page.getByLabel(/password/i).fill('staff-pass-123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByText(/sign out/i)).toBeVisible()
}

async function loginAsPublic(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel(/email address/i).fill(email)
  await page.getByRole('button', { name: /send me a code/i }).click()
  const devCode = await page.getByText(/your code is/i).locator('strong').textContent()
  await page.getByLabel(/6-digit code/i).fill(devCode ?? '')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByText(/sign out/i)).toBeVisible()
}

async function createLiveCampaign(page: Page, title: string) {
  await loginAsStaff(page)
  const submit = await page.request.post('/api/campaigns', { data: { ...validSubmission, title } })
  expect(submit.status()).toBe(201)
  const { id } = await submit.json()
  await page.request.post(`/api/campaigns/${id}/screen`, {
    data: { decidedBy: 'lawyer_e2e', isEligible: true, reason: 'Eligible.' },
  })
  const publish = await page.request.post(`/api/campaigns/${id}/publish`, { data: { actorId: 'intern_e2e' } })
  expect(publish.ok()).toBe(true)
  return id
}

test('internal APIs reject unauthenticated callers', async ({ request }) => {
  const submit = await request.post('/api/campaigns', { data: validSubmission })
  expect(submit.status()).toBe(201)
  const { id } = await submit.json()

  const screen = await request.post(`/api/campaigns/${id}/screen`, {
    data: { decidedBy: 'lawyer_e2e', isEligible: true, reason: 'Eligible.' },
  })
  expect(screen.status()).toBe(403)
})

test('a submission can be screened, published, and listed end to end', async ({ page }) => {
  const id = await createLiveCampaign(page, 'End to end campaign')

  const list = await page.request.get('/api/campaigns')
  expect(list.ok()).toBe(true)
  const body = await list.json()
  expect(body.campaigns.some((c: { id: string }) => c.id === id)).toBe(true)
})

test('rejects a submission with missing required fields', async ({ request }) => {
  const res = await request.post('/api/campaigns', {
    data: { ...validSubmission, title: '   ' },
  })
  expect(res.status()).toBe(400)
  const body = await res.json()
  expect(body.error).toContain('title')
})

test('home page renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gaerkaanooni')
})

test('health endpoint reports platform config', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.ok()).toBe(true)
  const body = await res.json()
  expect(body.feePercent).toBe(5)
})

test('a live campaign renders its detail page with progress, countdown, and update feed', async ({ page }) => {
  const id = await createLiveCampaign(page, 'Detail page campaign')
  await page.request.post(`/api/campaigns/${id}/updates`, {
    data: { authorId: 'lawyer_e2e', title: 'Filed', body: 'The petition was filed this morning.' },
  })

  await page.goto(`/campaigns/${id}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Detail page campaign')
  await expect(page.getByText(/raised of/)).toBeVisible()
  await expect(page.getByText(/left/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Filed' })).toBeVisible()
})

test('a visitor can back and follow a live campaign from its page', async ({ page }) => {
  const id = await createLiveCampaign(page, 'Backable campaign')

  await page.goto(`/campaigns/${id}`)
  await page.getByLabel(/amount/i).fill('100')
  await page.getByRole('button', { name: /back this campaign/i }).click()
  await page.getByRole('button', { name: /pay ₹100 securely/i }).click()
  await expect(page.getByText(/thank you/i)).toBeVisible()

  await page.goto(`/campaigns/${id}`)
  await page.getByRole('button', { name: /follow/i }).click()
  await expect(page.getByText('Following')).toBeVisible()
})

test('a pledge is captured end to end and reflected in raised totals', async ({ page }) => {
  const id = await createLiveCampaign(page, 'Payments campaign')

  await page.goto(`/campaigns/${id}`)
  await page.getByLabel(/amount/i).fill('100')
  await page.getByRole('button', { name: /back this campaign/i }).click()
  await page.getByRole('button', { name: /pay ₹100 securely/i }).click()
  await expect(page.getByText(/thank you/i)).toBeVisible()

  await page.goto(`/campaigns/${id}`)
  await expect(page.getByText('₹95')).toBeVisible()
})

test('a visitor can submit a case through the UI', async ({ page }) => {
  await page.goto('/submit')
  await page.getByLabel(/title/i).fill('UI submitted campaign')
  await page.getByLabel(/summary/i).fill('Discriminatory housing rules.')
  await page.getByLabel(/what happened/i).fill('Housing discrimination in the colony.')
  await page.getByLabel(/goal/i).fill('25000')
  await page.getByRole('button', { name: /submit/i }).click()
  // Success panel copy: kicker "Submission received" + h2 "Your case has been submitted".
  await expect(page.getByText(/submission received|case has been submitted/i).first()).toBeVisible()
})

test('a visitor can file an urgent response intake through the UI', async ({ page }) => {
  await page.goto('/response')
  await page.getByLabel(/what happened/i).fill('Imminent demolition of 40 homes.')
  await page.getByRole('button', { name: /submit/i }).click()
  await expect(page.getByText(/urgent response request was received/i)).toBeVisible()
})

test('the operations dashboard is visible to staff', async ({ page }) => {
  const id = await createLiveCampaign(page, 'Dashboard campaign')
  await page.request.post(`/api/campaigns/${id}/back`, { data: { grossAmountPaise: 10_000, gatewayFeePaise: 0 } })

  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Operations dashboard')
  await expect(page.getByText('Dashboard campaign')).toBeVisible()
  await expect(page.getByText('Total raised')).toBeVisible()
})

test('a newly registered public user is kept out of the dashboard', async ({ page }) => {
  await loginAsPublic(page, `e2e-${Date.now()}@example.com`)

  await page.goto('/dashboard')
  // Staff guard routes to the staff sign-in (spec 08 §3).
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Staff sign in')
})

test('analytics live inside the admin dashboard', async ({ page }) => {
  await page.goto('/login/staff')
  await page.getByLabel(/email/i).fill('admin@example.com')
  await page.getByLabel(/password/i).fill('staff-pass-123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByText(/sign out/i)).toBeVisible()

  // Admins see the analytics readout as a section of the single ops console.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Operations dashboard')
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible()
  await expect(page.getByText(/total raised/i).or(page.getByText(/Totals/)).first()).toBeVisible()
})
