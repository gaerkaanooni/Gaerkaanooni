import { PrismaClient } from '@prisma/client'
import {
  dispatchUrgentCase,
  finalizeFundedCampaign,
  markExpired,
  publishResponsePage,
  refundExpiredCampaign,
  seedResponseFund,
  verifyUrgentSubmission,
} from '@pil/db'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * The e2e specs run in their own Node process (not the Next dev server), so they
 * connect to the test database directly for service-level setup that has no HTTP
 * route (verify/dispatch/expire/refund/finalize), mirroring the test-database
 * resolution used by `playwright.config.ts` and `global-setup.ts`.
 */
export const dbUrl =
  process.env.DATABASE_URL_TEST ?? 'postgresql://anmoldureha@localhost:5432/pil_promax_test'

export const db = new PrismaClient({ datasourceUrl: dbUrl })

/**
 * Single-connection client for response-fund ledger work. Postgres advisory
 * locks are session-scoped; Prisma's default pool would scatter the lock across
 * connections and never release it. This client keeps lock and mutations on one
 * connection so `withFundLock` serializes correctly across worker processes.
 */
export const fundDb = new PrismaClient({ datasourceUrl: `${dbUrl}${dbUrl.includes('?') ? '&' : '?'}connection_limit=1` })

export const validSubmission = {
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

export async function staffUserId(): Promise<string> {
  const user = await db.user.findUnique({ where: { email: 'staff@example.com' } })
  if (!user) throw new Error('staff@example.com was not seeded by global-setup')
  return user.id
}

export async function adminUserId(): Promise<string> {
  const user = await db.user.findUnique({ where: { email: 'admin@example.com' } })
  if (!user) throw new Error('admin@example.com was not seeded by global-setup')
  return user.id
}

/** Wipe the response-fund ledger so balance assertions start from a known state. */
export async function resetResponseFund(client: PrismaClient = db): Promise<void> {
  await client.ledgerEntry.deleteMany({
    where: { type: { in: ['REPLENISHMENT', 'SURPLUS_SWEEP', 'RESPONSE_DRAW'] } },
  })
}

export async function getFundBalance(client: PrismaClient = db): Promise<number> {
  const [income, out] = await Promise.all([
    client.ledgerEntry.aggregate({
      where: { type: { in: ['REPLENISHMENT', 'SURPLUS_SWEEP'] } },
      _sum: { amountPaise: true },
    }),
    client.ledgerEntry.aggregate({
      where: { type: 'RESPONSE_DRAW' },
      _sum: { amountPaise: true },
    }),
  ])
  return (income._sum.amountPaise ?? 0) - (out._sum.amountPaise ?? 0)
}

export async function loginAsStaff(page: Page): Promise<void> {
  await page.goto('/login/staff')
  await page.getByLabel(/email/i).fill('staff@example.com')
  await page.getByLabel(/password/i).fill('staff-pass-123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByText(/sign out/i)).toBeVisible()
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login/staff')
  await page.getByLabel(/email/i).fill('admin@example.com')
  await page.getByLabel(/password/i).fill('staff-pass-123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByText(/sign out/i)).toBeVisible()
}

export async function loginAsPublic(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email address/i).fill(email)
  await page.getByRole('button', { name: /send me a code/i }).click()
  const devCode = await page.getByText(/your code is/i).locator('strong').textContent()
  await page.getByLabel(/6-digit code/i).fill(devCode ?? '')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page.getByText(/sign out/i)).toBeVisible()
}

/** Screen + publish a funded-track submission through the public API. */
export async function createLiveCampaign(page: Page, title: string): Promise<string> {
  await loginAsStaff(page)
  const submit = await page.request.post('/api/campaigns', { data: { ...validSubmission, title } })
  expect(submit.status()).toBe(201)
  const { id } = await submit.json()
  const screen = await page.request.post(`/api/campaigns/${id}/screen`, {
    data: { decidedBy: 'lawyer_e2e', isEligible: true, reason: 'Eligible.' },
  })
  expect(screen.ok()).toBe(true)
  const publish = await page.request.post(`/api/campaigns/${id}/publish`, { data: { actorId: 'intern_e2e' } })
  expect(publish.ok()).toBe(true)
  return id
}

/** Back a live campaign via the API and capture (confirm) the contribution. */
export async function backAndConfirm(
  request: APIRequestContext,
  caseId: string,
  grossAmountPaise: number,
): Promise<string> {
  const back = await request.post(`/api/campaigns/${caseId}/back`, {
    data: { grossAmountPaise, gatewayFeePaise: 0 },
  })
  expect(back.status()).toBe(201)
  const { id } = await back.json()
  const confirm = await request.post(`/api/campaigns/${caseId}/back/confirm`, {
    data: { contributionId: id },
  })
  expect(confirm.ok()).toBe(true)
  return id
}

/** Submit an urgent intake through the public API. */
export async function submitUrgentViaApi(request: APIRequestContext, whatHappened: string): Promise<string> {
  const res = await request.post('/api/response-intake', { data: { whatHappened } })
  expect(res.status()).toBe(201)
  const { id } = await res.json()
  return id
}

/** Move a campaign's deadline into the past so expire/finalize services accept it. */
export async function forceDeadlinePast(caseId: string): Promise<void> {
  await db.case.update({
    where: { id: caseId },
    data: { deadlineAt: new Date(Date.now() - 60_000) },
  })
}

export const verifyUrgent = (client: PrismaClient, caseId: string, decidedBy: string, verified = true, reason = 'Verified.') =>
  verifyUrgentSubmission(client, { caseId, decidedBy, verified, reason })

export const dispatchUrgent = (client: PrismaClient, caseId: string, actorId: string, budgetPaise: number) =>
  dispatchUrgentCase(client, { caseId, actorId, budgetPaise, reason: 'Dispatched.' })

export const publishResponse = (caseId: string, actorId?: string) =>
  publishResponsePage(db, { caseId, actorId })

export const expireCase = (caseId: string, actorId: string) => markExpired(db, { caseId, actorId })
export const refundCase = (caseId: string, actorId: string) =>
  refundExpiredCampaign(db, { caseId, actorId })
export const finalizeCase = (client: PrismaClient, caseId: string, actorId: string) =>
  finalizeFundedCampaign(client, { caseId, actorId })

export const seedFund = (client: PrismaClient, amountPaise: number) => seedResponseFund(client, amountPaise)

const FUND_LOCK_KEY = 0x47554e44 // arbitrary shared key for the response-fund ledger

/**
 * Serializes response-fund mutations across Playwright worker processes. Every
 * fund-affecting test (urgent dispatch draws, lifecycle surplus sweeps) runs its
 * body inside `withFundLock`, so concurrent specs cannot interleave writes into
 * the shared ledger. The lock is acquired and the mutations are executed on the
 * same single-connection client (`fundDb`), so advisory locks are held on the
 * exact connection doing the writes and always released.
 */
export async function withFundLock<T>(fn: (locked: PrismaClient) => Promise<T>): Promise<T> {
  await fundDb.$executeRaw`SELECT pg_advisory_lock(${FUND_LOCK_KEY})`
  try {
    return await fn(fundDb)
  } finally {
    await fundDb.$executeRaw`SELECT pg_advisory_unlock(${FUND_LOCK_KEY})`.catch(() => {})
  }
}