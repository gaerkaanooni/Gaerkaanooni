import { expect, test } from '@playwright/test'
import {
  backAndConfirm,
  createLiveCampaign,
  db,
  expireCase,
  finalizeCase,
  forceDeadlinePast,
  fundDb,
  loginAsStaff,
  refundCase,
  staffUserId,
  withFundLock,
} from './helpers'

test.describe.configure({ mode: 'serial' })

test.afterAll(async () => {
  await fundDb.$disconnect()
  await db.$disconnect()
})

test('a funded-track campaign reaches FUNDED end to end and is shown on the dashboard', async ({
  page,
  request,
}) => {
  const title = `Lifecycle funded ${Date.now()}`
  const id = await createLiveCampaign(page, title)

  await backAndConfirm(request, id, 1_000_000) // ₹10,000 gross on a ₹5,000 goal

  const rec = await db.case.findUnique({ where: { id } })
  expect(rec?.stage).toBe('FUNDED')

  await loginAsStaff(page)
  await page.goto('/dashboard')
  const row = page.locator('tr', { hasText: title })
  await expect(row.locator('.stage-funded')).toHaveText('FUNDED')
})

test('an expired campaign is bulk-refunded and closed', async ({ page, request }) => {
  const title = `Lifecycle expired ${Date.now()}`
  const id = await createLiveCampaign(page, title)
  const contributionId = await backAndConfirm(request, id, 100_000) // ₹1,000 — below the ₹5,000 goal
  const actorId = await staffUserId()

  await forceDeadlinePast(id)
  const expired = await expireCase(id, actorId)
  expect(expired.stage).toBe('EXPIRED')

  const closed = await refundCase(id, actorId)
  expect(closed.stage).toBe('CLOSED')

  const contribution = await db.contribution.findUnique({ where: { id: contributionId } })
  expect(contribution?.status).toBe('REFUNDED')

  const refundEntries = await db.ledgerEntry.findMany({
    where: { caseId: id, type: 'REFUND' },
  })
  expect(refundEntries.length).toBe(1)
  expect(refundEntries[0].amountPaise).toBe(100_000)

  await loginAsStaff(page)
  await page.goto('/dashboard')
  const row = page.locator('tr', { hasText: title })
  await expect(row.locator('.stage-closed')).toHaveText('CLOSED')
  await expect(row).toContainText('₹0 of ₹5,000')
})

test('a funded campaign is finalized and sweeps surplus to the response fund', async ({ page, request }) => {
  const title = `Lifecycle finalized ${Date.now()}`
  const id = await createLiveCampaign(page, title)
  await backAndConfirm(request, id, 1_000_000)
  const actorId = await staffUserId()

  await forceDeadlinePast(id)

  await withFundLock(async (locked) => {
    const finalized = await finalizeCase(locked, id, actorId)
    expect(finalized.stage).toBe('FUNDED')

    const sweeps = await locked.ledgerEntry.findMany({
      where: { caseId: id, type: 'SURPLUS_SWEEP' },
    })
    expect(sweeps.length).toBe(1)
    // ₹10,000 gross − 5% platform fee = ₹9,500 net; surplus over ₹5,000 goal = ₹4,500;
    // sweep = 25% of ₹4,500 = ₹1,125.
    expect(sweeps[0].amountPaise).toBe(112_500)

    const audits = await locked.auditLog.findMany({
      where: { caseId: id, action: 'surplus.swept' },
    })
    expect(audits.length).toBe(1)
  })
})