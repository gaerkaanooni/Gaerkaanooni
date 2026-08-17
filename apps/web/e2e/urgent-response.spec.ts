import { expect, test } from '@playwright/test'
import {
  db,
  dispatchUrgent,
  fundDb,
  getFundBalance,
  loginAsStaff,
  publishResponse,
  resetResponseFund,
  seedFund,
  staffUserId,
  submitUrgentViaApi,
  verifyUrgent,
  withFundLock,
} from './helpers'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await resetResponseFund()
})

test.afterAll(async () => {
  await fundDb.$disconnect()
  await db.$disconnect()
})

test('a verified urgent intake is dispatched and its response page goes live', async ({ page, request }) => {
  await withFundLock(async (locked) => {
    await resetResponseFund(locked)
    await seedFund(locked, 10_000_000) // ₹1,00,000 — comfortably above the ₹50,000 default budget

    const caseId = await submitUrgentViaApi(request, `Imminent eviction ${Date.now()} of 40 families.`)
    const actorId = await staffUserId()

    const verified = await verifyUrgent(locked, caseId, actorId)
    expect(verified.stage).toBe('DISPATCHED')

    const balanceAfterDraw = await getFundBalance(locked)
    expect(balanceAfterDraw).toBe(10_000_000 - 50_000 * 100)

    await loginAsStaff(page)
    await page.goto('/dashboard')
    await expect(page.getByText('Urgent response matter').first()).toBeVisible()

    const live = await publishResponse(caseId, actorId)
    expect(live.stage).toBe('LIVE')

    const list = await request.get('/api/campaigns')
    const body = await list.json()
    expect(body.campaigns.some((c: { id: string }) => c.id === caseId)).toBe(true)
  })
})

test('a verified intake parks as AWAITING_FUNDS when the fund is empty', async ({ page, request }) => {
  await withFundLock(async (locked) => {
    await resetResponseFund(locked)

    const caseId = await submitUrgentViaApi(request, `Demolition notice ${Date.now()} served overnight.`)
    const actorId = await staffUserId()

    const verified = await verifyUrgent(locked, caseId, actorId)
    expect(verified.stage).toBe('AWAITING_FUNDS')
    expect(await getFundBalance(locked)).toBe(0)

    await loginAsStaff(page)
    await page.goto('/dashboard')
    await expect(page.getByText(/awaiting/i).first()).toBeVisible()
  })
})

test('a parked urgent case is dispatched once the fund is replenished', async ({ request }) => {
  await withFundLock(async (locked) => {
    await resetResponseFund(locked)

    const caseId = await submitUrgentViaApi(request, `Unlawful detention ${Date.now()} needs urgent counsel.`)
    const actorId = await staffUserId()

    const parked = await verifyUrgent(locked, caseId, actorId)
    expect(parked.stage).toBe('AWAITING_FUNDS')

    await seedFund(locked, 5_000_000)
    const dispatched = await dispatchUrgent(locked, caseId, actorId, 50_000 * 100)
    expect(dispatched.stage).toBe('DISPATCHED')
    expect(await getFundBalance(locked)).toBe(5_000_000 - 50_000 * 100)
  })
})

test('a rejected urgent intake does not touch the fund', async ({ request }) => {
  await withFundLock(async (locked) => {
    await resetResponseFund(locked)
    await seedFund(locked, 5_000_000)

    const caseId = await submitUrgentViaApi(request, `A claim that does not check out ${Date.now()}.`)
    const actorId = await staffUserId()

    const rejected = await verifyUrgent(locked, caseId, actorId, false, 'Not an urgent legal matter')
    expect(rejected.stage).toBe('REJECTED')
    expect(await getFundBalance(locked)).toBe(5_000_000)
  })
})