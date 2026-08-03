import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { DomainError, InvalidTransitionError } from '@pil/domain'
import { getTestDb, resetDb } from '@pil/testkit'
import { publishCampaign, screenCase, submitCampaign } from '../src/services/case-flows'

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

const validSubmission = {
  entryType: 'funded' as const,
  title: 'Yamuna pollution',
  summary: 'Untreated industrial discharge affecting downstream communities.',
  category: 'ENVIRONMENT',
  region: 'Delhi',
  goalAmountPaise: 500_000,
  deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  track: 'CAMPAIGN' as const,
  whatHappened: 'Continuous discharge for 18 months.',
  applicantName: 'Asha Rao',
  contact: 'asha@example.com',
}

async function createAndScreenApproved() {
  const c = await submitCampaign(db, validSubmission)
  await screenCase(db, {
    caseId: c.id,
    decidedBy: 'lawyer_1',
    isEligible: true,
    reason: 'Falls within public interest litigation scope.',
  })
  return c
}

describe('submitCampaign', () => {
  it('creates a case, its submission, and an audit trail', async () => {
    const c = await submitCampaign(db, validSubmission)

    expect(c.stage).toBe('SUBMITTED')
    const auditCount = await db.auditLog.count({ where: { action: 'submission.created' } })
    expect(auditCount).toBe(1)
  })

  it('rejects a missing required field', async () => {
    await expect(submitCampaign(db, { ...validSubmission, title: '  ' })).rejects.toThrow(DomainError)
    await expect(submitCampaign(db, { ...validSubmission, whatHappened: '' })).rejects.toThrow(DomainError)
  })

  it('rejects a non-positive goal', async () => {
    await expect(submitCampaign(db, { ...validSubmission, goalAmountPaise: 0 })).rejects.toThrow(DomainError)
    await expect(submitCampaign(db, { ...validSubmission, goalAmountPaise: -100 })).rejects.toThrow(DomainError)
  })
})

describe('screenCase', () => {
  it('approves an eligible submission and records the decision', async () => {
    const c = await submitCampaign(db, validSubmission)
    await screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: true, reason: 'Eligible.' })

    const fetched = await db.case.findUnique({ where: { id: c.id }, include: { screening: true } })
    expect(fetched?.stage).toBe('APPROVED')
    expect(fetched?.screening?.isEligible).toBe(true)
    expect(fetched?.screening?.decidedBy).toBe('lawyer_1')
    expect(await db.auditLog.count({ where: { action: 'case.screened' } })).toBe(1)
  })

  it('rejects an ineligible submission with a reason', async () => {
    const c = await submitCampaign(db, validSubmission)
    await screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: false, reason: 'Not a legal matter.' })

    const fetched = await db.case.findUnique({ where: { id: c.id } })
    expect(fetched?.stage).toBe('REJECTED')
  })

  it('requires a reason when rejecting', async () => {
    const c = await submitCampaign(db, validSubmission)
    await expect(screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: false, reason: '' })).rejects.toThrow(
      DomainError,
    )
  })

  it('refuses to screen a case that has already left submission', async () => {
    const c = await createAndScreenApproved()
    await expect(
      screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: true, reason: 'again' }),
    ).rejects.toThrow(InvalidTransitionError)
  })
})

describe('publishCampaign', () => {
  it('launches an approved campaign with a deadline', async () => {
    const c = await createAndScreenApproved()
    const published = await publishCampaign(db, { caseId: c.id, actorId: 'intern_1' })

    expect(published.stage).toBe('LIVE')
    expect(published.publishedAt).toBeTruthy()
    expect(published.activeSinceAt).toBeTruthy()
    expect(await db.auditLog.count({ where: { action: 'case.launched' } })).toBe(1)
  })

  it('requires a deadline at launch', async () => {
    const c = await submitCampaign(db, { ...validSubmission, deadlineAt: null })
    await screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: true, reason: 'ok' })

    await expect(publishCampaign(db, { caseId: c.id, actorId: 'intern_1' })).rejects.toThrow(DomainError)
  })

  it('rejects launching a case that has not been approved', async () => {
    const c = await submitCampaign(db, validSubmission)
    await expect(publishCampaign(db, { caseId: c.id, actorId: 'intern_1' })).rejects.toThrow(InvalidTransitionError)
  })
})
