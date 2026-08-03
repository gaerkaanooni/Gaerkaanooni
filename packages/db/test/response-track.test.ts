import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { DomainError, InsufficientFundsError, defaultConfig } from '@pil/domain'
import { getTestDb, resetDb } from '@pil/testkit'
import { submitCampaign } from '../src/services/case-flows'
import {
  dispatchUrgentCase,
  publishResponsePage,
  submitUrgent,
  verifyUrgentSubmission,
} from '../src/services/response-track'
import { getResponseFundBalance, seedResponseFund } from '../src/services/finance'

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

async function urgentSubmission() {
  return submitUrgent(db, {
    whatHappened: 'Detained during protest; location unknown.',
    where: 'Mumbai',
    when: '2 hours ago',
    isAnonymous: true,
  })
}

describe('submitUrgent', () => {
  it('creates a dispatched-track case from a minimal form, anonymous allowed', async () => {
    const c = await urgentSubmission()

    expect(c.entryType).toBe('DISPATCHED')
    expect(c.stage).toBe('SUBMITTED')
    expect(c.goalAmountPaise).toBe(0)
    const sub = await db.submission.findUniqueOrThrow({ where: { caseId: c.id } })
    expect(sub.isAnonymous).toBe(true)
    expect(sub.track).toBe('RESPONSE')
    expect(sub.applicantName).toBeNull()
  })

  it('rejects an empty description of what happened', async () => {
    await expect(submitUrgent(db, { whatHappened: '  ' })).rejects.toThrow(DomainError)
  })
})

describe('verifyUrgentSubmission', () => {
  it('dispatches a verified submission when the fund has balance, drawing the budget', async () => {
    await seedResponseFund(db, defaultConfig.defaultDispatchBudgetPaise * 2)
    const c = await urgentSubmission()

    const dispatched = await verifyUrgentSubmission(db, {
      caseId: c.id,
      decidedBy: 'lawyer_1',
      verified: true,
      reason: 'Verified by volunteer counsel.',
    })

    expect(dispatched.stage).toBe('DISPATCHED')
    expect(dispatched.goalAmountPaise).toBe(defaultConfig.defaultDispatchBudgetPaise)
    expect(await getResponseFundBalance(db)).toBe(defaultConfig.defaultDispatchBudgetPaise)
    expect(await db.auditLog.count({ where: { action: 'response.dispatched' } })).toBe(1)
  })

  it('parks an approved urgent case in AWAITING_FUNDS when the fund is empty', async () => {
    const c = await urgentSubmission()

    const parked = await verifyUrgentSubmission(db, {
      caseId: c.id,
      decidedBy: 'lawyer_1',
      verified: true,
      reason: 'Verified, but no balance to draw.',
    })

    expect(parked.stage).toBe('AWAITING_FUNDS')
    expect(await getResponseFundBalance(db)).toBe(0)
    expect(await db.auditLog.count({ where: { action: 'case.awaiting-funds' } })).toBe(1)
  })

  it('rejects an unverifiable submission with a reason', async () => {
    const c = await urgentSubmission()

    const rejected = await verifyUrgentSubmission(db, {
      caseId: c.id,
      decidedBy: 'lawyer_1',
      verified: false,
      reason: 'No evidence of detention.',
    })

    expect(rejected.stage).toBe('REJECTED')
    const screening = await db.screening.findUniqueOrThrow({ where: { caseId: c.id } })
    expect(screening.isEligible).toBe(false)
  })

  it('refuses to verify a campaign-track case', async () => {
    const c = await submitCampaign(db, {
      entryType: 'funded',
      title: 'Yamuna',
      summary: 'Pollution.',
      category: 'ENVIRONMENT',
      goalAmountPaise: 100_000,
      track: 'CAMPAIGN',
      whatHappened: 'Discharge.',
    })
    await expect(
      verifyUrgentSubmission(db, { caseId: c.id, decidedBy: 'l', verified: true, reason: 'x' }),
    ).rejects.toThrow(DomainError)
  })
})

describe('dispatchUrgentCase', () => {
  it('dispatches a parked case once the fund is replenished', async () => {
    const c = await urgentSubmission()
    await verifyUrgentSubmission(db, { caseId: c.id, decidedBy: 'lawyer_1', verified: true, reason: 'v' })
    expect((await db.case.findUniqueOrThrow({ where: { id: c.id } })).stage).toBe('AWAITING_FUNDS')

    await seedResponseFund(db, defaultConfig.defaultDispatchBudgetPaise * 2)
    const dispatched = await dispatchUrgentCase(db, {
      caseId: c.id,
      actorId: 'intern_1',
      budgetPaise: defaultConfig.defaultDispatchBudgetPaise,
      reason: 'Funds replenished',
    })

    expect(dispatched.stage).toBe('DISPATCHED')
    expect(await getResponseFundBalance(db)).toBe(defaultConfig.defaultDispatchBudgetPaise)
  })

  it('refuses to dispatch when the balance is still insufficient', async () => {
    const c = await urgentSubmission()
    await verifyUrgentSubmission(db, { caseId: c.id, decidedBy: 'lawyer_1', verified: true, reason: 'v' })

    await expect(
      dispatchUrgentCase(db, {
        caseId: c.id,
        actorId: 'intern_1',
        budgetPaise: defaultConfig.defaultDispatchBudgetPaise,
        reason: 'no funds',
      }),
    ).rejects.toThrow(InsufficientFundsError)
  })
})

describe('publishResponsePage', () => {
  it('brings a dispatched case onto a public page', async () => {
    await seedResponseFund(db, defaultConfig.defaultDispatchBudgetPaise * 2)
    const c = await urgentSubmission()
    await verifyUrgentSubmission(db, { caseId: c.id, decidedBy: 'lawyer_1', verified: true, reason: 'v' })

    const live = await publishResponsePage(db, { caseId: c.id, actorId: 'intern_1' })

    expect(live.stage).toBe('LIVE')
    expect(live.publishedAt).toBeTruthy()
    expect(live.activeSinceAt).toBeTruthy()
  })
})
