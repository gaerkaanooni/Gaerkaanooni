import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { getTestDb, resetDb } from '@pil/testkit'
import { publishCampaign, screenCase, submitCampaign } from '../src/services/case-flows'
import { backCase, captureContribution, refundContribution } from '../src/services/contributions'
import { seedResponseFund } from '../src/services/finance'
import { postCaseUpdate } from '../src/services/updates'
import { getCaseList, getFinancialSummary, getVolunteerDirectory } from '../src/services/dashboard'

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

async function liveCampaign(title = 'C') {
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

describe('getCaseList', () => {
  it('flags stale submissions and returns raised totals', async () => {
    const stale = await submitCampaign(db, {
      entryType: 'funded',
      title: 'Stale',
      summary: 's',
      category: 'OTHER',
      goalAmountPaise: 100_000,
      track: 'CAMPAIGN',
      whatHappened: 'x',
    })
    await db.case.update({ where: { id: stale.id }, data: { createdAt: new Date(Date.now() - 3 * 24 * 3600_000) } })

    const live = await liveCampaign('Live')
    const contrib = await backCase(db, { caseId: live.id, backerId: 'u1', grossAmountPaise: 20_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })

    const rows = await getCaseList(db)
    const staleRow = rows.find((r) => r.id === stale.id)
    expect(staleRow?.staleStage).toBe(true)
    expect(staleRow?.overdueUpdate).toBe(false)

    const liveRow = rows.find((r) => r.id === live.id)
    expect(liveRow?.raisedPaise).toBe(19_000)
    expect(liveRow?.staleStage).toBe(false)
  })

  it('flags cases whose update cadence has lapsed and cases needing sign-off', async () => {
    const overdue = await liveCampaign('Overdue')
    await db.case.update({ where: { id: overdue.id }, data: { activeSinceAt: new Date(Date.now() - 8 * 24 * 3600_000) } })

    const current = await liveCampaign('Current')
    await postCaseUpdate(db, { caseId: current.id, authorId: 'l', title: 't', body: 'b' })

    const big = await liveCampaign('Big')
    const contrib = await backCase(db, { caseId: big.id, backerId: 'u1', grossAmountPaise: 2_500_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })
    await refundContribution(db, { contributionId: contrib.id, actorId: 'ops', reason: 'Duplicate pledge' })

    const rows = await getCaseList(db)
    expect(rows.find((r) => r.id === overdue.id)?.overdueUpdate).toBe(true)
    expect(rows.find((r) => r.id === current.id)?.overdueUpdate).toBe(false)
    expect(rows.find((r) => r.id === big.id)?.needsSignoff).toBe(true)
  })
})

describe('getVolunteerDirectory', () => {
  it('reports capacity and active workload per volunteer', async () => {
    const u1 = await db.user.create({ data: { email: 'lawyer@example.com', name: 'Lawyer One', role: 'LAWYER' } })
    const v1 = await db.volunteer.create({
      data: {
        userId: u1.id,
        role: 'LAWYER',
        capacityLimit: 5,
        hoursContributed: 12,
        availability: 'AVAILABLE',
        region: 'Delhi',
        skills: ['criminal'],
      },
    })
    const u2 = await db.user.create({ data: { email: 'vm@example.com', name: 'Case Mgr', role: 'INTERN' } })
    const v2 = await db.volunteer.create({
      data: { userId: u2.id, role: 'CASE_MANAGER', capacityLimit: 2, availability: 'BUSY' },
    })

    const c = await liveCampaign('Assign')
    const c2 = await liveCampaign('Assign 2')
    await db.assignment.create({ data: { caseId: c.id, volunteerId: v1.id, kind: 'PRIMARY', status: 'ACTIVE' } })
    await db.assignment.create({ data: { caseId: c2.id, volunteerId: v1.id, kind: 'SUPPORT', status: 'ACTIVE' } })
    await db.assignment.create({ data: { caseId: c2.id, volunteerId: v2.id, kind: 'PRIMARY', status: 'RELEASED' } })

    const dir = await getVolunteerDirectory(db)
    const row1 = dir.find((v) => v.volunteerId === v1.id)
    expect(row1?.activeAssignments).toBe(2)
    expect(row1?.hoursContributed).toBe(12)
    expect(row1?.name).toBe('Lawyer One')
    const row2 = dir.find((v) => v.volunteerId === v2.id)
    expect(row2?.activeAssignments).toBe(0)
    expect(row2?.availability).toBe('BUSY')
  })
})

describe('getFinancialSummary', () => {
  it('totals raised, refunds, disbursements, and the response fund', async () => {
    const live = await liveCampaign('Money')
    const c1 = await backCase(db, { caseId: live.id, backerId: 'u1', grossAmountPaise: 10_000, gatewayFeePaise: 0 })
    const c2 = await backCase(db, { caseId: live.id, backerId: 'u2', grossAmountPaise: 20_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: c1.id, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: c2.id, gatewayFeePaise: 0 })
    await refundContribution(db, { contributionId: c1.id, actorId: 'ops', reason: 'Test refund' })
    await seedResponseFund(db, 50_000)

    const summary = await getFinancialSummary(db)
    expect(summary.totalRaisedPaise).toBe(28_500)
    expect(summary.totalRefundedPaise).toBe(10_000)
    expect(summary.responseFundBalancePaise).toBe(50_000)
    expect(summary.totalDisbursedPaise).toBe(0)
  })
})
