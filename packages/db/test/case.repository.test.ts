import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { getTestDb, resetDb } from '@pil/testkit'
import { CaseRepository } from '../src/repositories/case'

let db: PrismaClient
let repo: CaseRepository

beforeAll(() => {
  db = getTestDb()
  repo = new CaseRepository(db)
})

beforeEach(async () => {
  await resetDb(db)
})

afterAll(async () => {
  await db.$disconnect()
})

const campaignSubmission = {
  entryType: 'funded' as const,
  title: 'River pollution in the Yamuna',
  summary: 'Untreated industrial discharge affecting downstream communities.',
  category: 'ENVIRONMENT',
  region: 'Delhi',
  goalAmountPaise: 500_000,
  deadlineAt: new Date('2026-09-01T00:00:00Z'),
  track: 'CAMPAIGN' as const,
  whatHappened: 'Continuous discharge over the last 18 months.',
  where: 'Yamuna, Delhi',
  when: 'Ongoing',
  applicantName: 'Asha Rao',
  contact: 'asha@example.com',
}

describe('CaseRepository', () => {
  it('creates a funded-track case in SUBMITTED with its submission', async () => {
    const caseRec = await repo.createSubmission(campaignSubmission)

    expect(caseRec.id).toBeTruthy()
    expect(caseRec.stage).toBe('SUBMITTED')
    expect(caseRec.entryType).toBe('FUNDED')

    const fetched = await repo.getById(caseRec.id)
    expect(fetched?.submission?.whatHappened).toBe(campaignSubmission.whatHappened)
    expect(fetched?.submission?.applicantName).toBe('Asha Rao')
    expect(fetched?.submission?.track).toBe('CAMPAIGN')
  })

  it('creates a dispatched-track case with a minimal, anonymous-capable submission', async () => {
    const caseRec = await repo.createSubmission({
      entryType: 'dispatched',
      title: 'Illegal detention during protest',
      summary: 'Detainee location unknown; habeas petition needed within hours.',
      category: 'CIVIL_LIBERTIES',
      region: 'Mumbai',
      goalAmountPaise: 100_000,
      track: 'RESPONSE',
      whatHappened: 'Arrested during protest, location not disclosed.',
      isAnonymous: true,
    })

    const fetched = await repo.getById(caseRec.id)
    expect(fetched?.entryType).toBe('DISPATCHED')
    expect(fetched?.submission?.isAnonymous).toBe(true)
    expect(fetched?.submission?.applicantName).toBeNull()
  })

  it('persists a stage transition', async () => {
    const caseRec = await repo.createSubmission(campaignSubmission)

    const updated = await repo.updateStage(caseRec.id, 'SCREENING')
    expect(updated.stage).toBe('SCREENING')

    const fetched = await repo.getById(caseRec.id)
    expect(fetched?.stage).toBe('SCREENING')
  })

  it('lists cases by stage across both tracks', async () => {
    const a = await repo.createSubmission(campaignSubmission)
    await repo.createSubmission({ ...campaignSubmission, title: 'Second' })

    await repo.updateStage(a.id, 'SCREENING')

    const submitted = await repo.listByStage('SUBMITTED')
    const screening = await repo.listByStage('SCREENING')

    expect(submitted).toHaveLength(1)
    expect(screening.map((c) => c.id)).toContain(a.id)
  })
})
