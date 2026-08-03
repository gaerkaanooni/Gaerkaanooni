import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { getTestDb, resetDb } from '@pil/testkit'
import { publishCampaign, screenCase, submitCampaign } from '../src/services/case-flows'
import { backCase, captureContribution } from '../src/services/contributions'
import { submitUrgent, verifyUrgentSubmission } from '../src/services/response-track'
import { seedResponseFund } from '../src/services/finance'
import { getAnalytics } from '../src/services/analytics'

let db: PrismaClient

beforeAll(() => {
  db = getTestDb()
})

beforeEach(async () => {
  await resetDb(db)
})

afterAll(async () => {
  await db.$disconnect()
})

async function liveCampaign(title: string) {
  const c = await submitCampaign(db, {
    entryType: 'funded',
    title,
    summary: 's',
    category: 'ENVIRONMENT',
    goalAmountPaise: 500_000,
    deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    track: 'CAMPAIGN',
    whatHappened: 'x',
  })
  await screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: true, reason: 'ok' })
  await publishCampaign(db, { caseId: c.id, actorId: 'intern_1' })
  return c
}

describe('getAnalytics', () => {
  it('rolls up stage totals, money, conversion, and categories', async () => {
    const c1 = await liveCampaign('Env one')
    const back1 = await backCase(db, { caseId: c1.id, backerId: 'u1', grossAmountPaise: 100_000, gatewayFeePaise: 0 })
    const back2 = await backCase(db, { caseId: c1.id, backerId: 'u2', grossAmountPaise: 200_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: back1.id, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: back2.id, gatewayFeePaise: 0 })
    await seedResponseFund(db, 50_000)

    await submitCampaign(db, {
      entryType: 'funded',
      title: 'Unpublished',
      summary: 's',
      category: 'LABOR',
      goalAmountPaise: 100_000,
      track: 'CAMPAIGN',
      whatHappened: 'x',
    })

    const urgent = await submitUrgent(db, { whatHappened: 'Imminent harm' })
    await verifyUrgentSubmission(db, {
      caseId: urgent.id,
      decidedBy: 'lawyer_1',
      verified: true,
      reason: 'Verified',
    })

    const a = await getAnalytics(db)
    expect(a.totals.submissions).toBe(3)
    expect(a.totals.live).toBe(1)
    expect(a.totals.awaitingFunds).toBe(1)
    expect(a.totals.funded).toBe(0)
    expect(a.money.totalRaisedPaise).toBe(285_000)
    expect(a.money.avgBackPaise).toBe(142_500)
    expect(a.money.backerCount).toBe(2)
    expect(a.conversion.liveCampaigns).toBe(1)
    expect(a.conversion.ratePercent).toBe(0)
    expect(a.topCategories).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'ENVIRONMENT', count: 1 })]),
    )
    expect(a.topCategories).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: 'LABOR', count: 1 })]),
    )
    expect(a.responseFundBalancePaise).toBe(50_000)
  })

  it('reports the funded conversion rate', async () => {
    const c = await liveCampaign('Funds it')
    const goalNet = Math.floor((500_000 * 95) / 100)
    const back = await backCase(db, { caseId: c.id, backerId: 'u1', grossAmountPaise: 600_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: back.id, gatewayFeePaise: 0 })
    expect((await db.case.findUnique({ where: { id: c.id } }))?.stage).toBe('FUNDED')

    const a = await getAnalytics(db)
    expect(a.totals.funded).toBe(1)
    expect(a.money.totalRaisedPaise).toBeGreaterThan(goalNet)
    expect(a.conversion.ratePercent).toBe(100)
  })
})
