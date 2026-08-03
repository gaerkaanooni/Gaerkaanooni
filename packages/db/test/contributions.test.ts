import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { DomainError, defaultConfig } from '@pil/domain'
import { getTestDb, resetDb } from '@pil/testkit'
import { publishCampaign, screenCase, submitCampaign } from '../src/services/case-flows'
import {
  backCase,
  captureContribution,
  finalizeFundedCampaign,
  followCase,
  markExpired,
  refundContribution,
  refundExpiredCampaign,
} from '../src/services/contributions'

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

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000)

async function liveCampaign(goalPaise = 500_000, deadlineAt = FUTURE) {
  const c = await submitCampaign(db, {
    entryType: 'funded',
    title: 'Yamuna pollution',
    summary: 'Untreated discharge.',
    category: 'ENVIRONMENT',
    region: 'Delhi',
    goalAmountPaise: goalPaise,
    deadlineAt: FUTURE,
    track: 'CAMPAIGN',
    whatHappened: 'Ongoing discharge.',
    applicantName: 'Asha Rao',
    contact: 'asha@example.com',
  })
  await screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: true, reason: 'Eligible.' })
  await publishCampaign(db, { caseId: c.id, actorId: 'intern_1' })
  if (deadlineAt.getTime() !== FUTURE.getTime()) {
    await db.case.update({ where: { id: c.id }, data: { deadlineAt } })
  }
  return db.case.findUniqueOrThrow({ where: { id: c.id } })
}

async function fundRaisedSoFar(caseId: string): Promise<number> {
  const agg = await db.contribution.aggregate({
    where: { caseId, status: 'CAPTURED' },
    _sum: { netToCasePaise: true },
  })
  return agg._sum.netToCasePaise ?? 0
}

async function fundBalance(): Promise<number> {
  const agg = await db.ledgerEntry.aggregate({
    where: { type: { in: ['REPLENISHMENT', 'SURPLUS_SWEEP'] } },
    _sum: { amountPaise: true },
  })
  return agg._sum.amountPaise ?? 0
}

describe('followCase', () => {
  it('creates a follower backer with no contribution', async () => {
    const c = await liveCampaign()
    const backer = await followCase(db, { caseId: c.id, userId: 'user_9' })

    expect(backer.kind).toBe('FOLLOWER')
    expect(await db.contribution.count({ where: { caseId: c.id } })).toBe(0)
  })
})

describe('backCase', () => {
  it('creates a pending contribution with the correct fee split', async () => {
    const c = await liveCampaign()
    const contrib = await backCase(db, {
      caseId: c.id,
      backerId: 'user_1',
      grossAmountPaise: 20_000,
      gatewayFeePaise: 400,
    })

    expect(contrib.status).toBe('PENDING')
    expect(contrib.netToCasePaise).toBe(19_000)
    expect(contrib.platformFeePaise).toBe(600)
    const backer = await db.backer.findFirst({ where: { caseId: c.id } })
    expect(backer?.kind).toBe('BACKER')
  })

  it('rejects an invalid amount', async () => {
    const c = await liveCampaign()
    await expect(
      backCase(db, { caseId: c.id, backerId: 'user_1', grossAmountPaise: 0, gatewayFeePaise: 0 }),
    ).rejects.toThrow(DomainError)
  })

  it('rejects backing a case that is not live', async () => {
    const c = await submitCampaign(db, {
      entryType: 'funded',
      title: 't',
      summary: 's',
      category: 'OTHER',
      goalAmountPaise: 100_000,
      track: 'CAMPAIGN',
      whatHappened: 'x',
    })
    await expect(
      backCase(db, { caseId: c.id, backerId: 'user_1', grossAmountPaise: 100, gatewayFeePaise: 0 }),
    ).rejects.toThrow(DomainError)
  })
})

describe('captureContribution', () => {
  it('captures a contribution, writes the ledger, and stays LIVE below goal', async () => {
    const c = await liveCampaign()
    const contrib = await backCase(db, { caseId: c.id, backerId: 'u', grossAmountPaise: 10_000, gatewayFeePaise: 200 })

    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 200 })

    const captured = await db.contribution.findUniqueOrThrow({ where: { id: contrib.id } })
    expect(captured.status).toBe('CAPTURED')
    expect(await fundRaisedSoFar(c.id)).toBe(9_500)
    expect(await db.ledgerEntry.count({ where: { caseId: c.id, type: 'CONTRIBUTION' } })).toBe(1)
    expect(await db.auditLog.count({ where: { action: 'contribution.captured' } })).toBe(1)
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).stage).toBe('LIVE')
  })

  it('transitions to FUNDED at the exact goal boundary', async () => {
    const c = await liveCampaign(19_000)
    const contrib = await backCase(db, { caseId: c.id, backerId: 'u', grossAmountPaise: 20_000, gatewayFeePaise: 0 })

    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })

    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).stage).toBe('FUNDED')
    expect(await db.auditLog.count({ where: { action: 'case.funded' } })).toBe(1)
  })

  it('routes a dispatched-track back to the response fund, with no threshold gate', async () => {
    const c = await submitCampaign(db, {
      entryType: 'dispatched',
      title: 'Illegal detention',
      summary: 'Urgent habeas.',
      category: 'CIVIL_LIBERTIES',
      goalAmountPaise: 100_000,
      track: 'RESPONSE',
      whatHappened: 'Detained.',
    })
    await db.case.update({
      where: { id: c.id },
      data: { stage: 'DISPATCHED', activeSinceAt: new Date(), publishedAt: new Date() },
    })

    const contrib = await backCase(db, { caseId: c.id, backerId: 'u', grossAmountPaise: 10_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })

    expect(await fundBalance()).toBe(9_500)
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).stage).toBe('DISPATCHED')
  })
})

describe('markExpired', () => {
  it('expires a live campaign past deadline with the goal unmet', async () => {
    const c = await liveCampaign(500_000, PAST)
    const expired = await markExpired(db, { caseId: c.id, actorId: 'system' })
    expect(expired.stage).toBe('EXPIRED')
    expect(await db.auditLog.count({ where: { action: 'case.expired' } })).toBe(1)
  })

  it('refuses to expire a campaign that has already met its goal', async () => {
    const c = await liveCampaign(19_000, PAST)
    const contrib = await backCase(db, { caseId: c.id, backerId: 'u', grossAmountPaise: 20_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })

    await expect(markExpired(db, { caseId: c.id, actorId: 'system' })).rejects.toThrow(DomainError)
  })
})

describe('refundContribution', () => {
  it('refunds the full gross amount back to the backer with a durable audit trail', async () => {
    const c = await liveCampaign()
    const contrib = await backCase(db, { caseId: c.id, backerId: 'u', grossAmountPaise: 20_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })

    await refundContribution(db, { contributionId: contrib.id, actorId: 'intern_1', reason: 'Campaign failed' })

    const refunded = await db.contribution.findUniqueOrThrow({ where: { id: contrib.id } })
    expect(refunded.status).toBe('REFUNDED')
    const refundLedger = await db.ledgerEntry.findFirst({ where: { caseId: c.id, type: 'REFUND' } })
    expect(refundLedger?.amountPaise).toBe(20_000)
    expect(await db.auditLog.count({ where: { action: 'refund.issued' } })).toBe(1)
  })

  it('flags refunds at the sign-off limit as requiring sign-off', async () => {
    const c = await liveCampaign()
    const contrib = await backCase(db, { caseId: c.id, backerId: 'u', grossAmountPaise: defaultConfig.signoffLimitPaise, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })

    await refundContribution(db, { contributionId: contrib.id, actorId: 'intern_1', reason: 'Campaign failed' })

    const audit = await db.auditLog.findFirst({ where: { action: 'refund.issued' } })
    const meta = audit?.meta as { signoffRequired?: boolean }
    expect(meta.signoffRequired).toBe(true)
  })
})

describe('refundExpiredCampaign', () => {
  it('refunds every captured contribution and closes the campaign', async () => {
    const c = await liveCampaign(500_000, PAST)
    const a = await backCase(db, { caseId: c.id, backerId: 'u1', grossAmountPaise: 10_000, gatewayFeePaise: 0 })
    const b = await backCase(db, { caseId: c.id, backerId: 'u2', grossAmountPaise: 20_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: a.id, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: b.id, gatewayFeePaise: 0 })
    await markExpired(db, { caseId: c.id, actorId: 'system' })

    const closed = await refundExpiredCampaign(db, { caseId: c.id, actorId: 'intern_1' })

    expect(closed.stage).toBe('CLOSED')
    expect(await db.contribution.count({ where: { caseId: c.id, status: 'REFUNDED' } })).toBe(2)
    expect(await db.ledgerEntry.count({ where: { caseId: c.id, type: 'REFUND' } })).toBe(2)
  })
})

describe('finalizeFundedCampaign', () => {
  it('sweeps 25% of the surplus to the response fund at the deadline', async () => {
    const c = await liveCampaign(100_000, PAST)
    const contrib = await backCase(db, { caseId: c.id, backerId: 'u', grossAmountPaise: 200_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })

    await finalizeFundedCampaign(db, { caseId: c.id, actorId: 'intern_1' })

    // net 190,000 vs goal 100,000 => surplus 90,000; 25% = 22,500 swept
    const sweep = await db.ledgerEntry.findFirst({ where: { caseId: c.id, type: 'SURPLUS_SWEEP' } })
    expect(sweep?.amountPaise).toBe(22_500)
    expect(await fundBalance()).toBe(22_500)
    expect(await db.auditLog.count({ where: { action: 'surplus.swept' } })).toBe(1)
  })

  it('refuses to finalize before the deadline or before funding', async () => {
    const future = await liveCampaign(100_000, FUTURE)
    const pending = await submitCampaign(db, {
      entryType: 'funded',
      title: 't',
      summary: 's',
      category: 'OTHER',
      goalAmountPaise: 100_000,
      track: 'CAMPAIGN',
      whatHappened: 'x',
    })

    await expect(finalizeFundedCampaign(db, { caseId: future.id, actorId: 'i' })).rejects.toThrow(DomainError)
    await expect(finalizeFundedCampaign(db, { caseId: pending.id, actorId: 'i' })).rejects.toThrow(DomainError)
  })
})
