import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { DomainError } from '@pil/domain'
import { getTestDb, resetDb } from '@pil/testkit'
import { publishCampaign, screenCase, submitCampaign } from '../src/services/case-flows'
import { backCase, captureContribution } from '../src/services/contributions'
import { postCaseUpdate } from '../src/services/updates'
import { getPublicCampaign, listPublicCampaigns } from '../src/services/queries'

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

async function liveCampaign(title = 'Yamuna pollution') {
  const c = await submitCampaign(db, {
    entryType: 'funded',
    title,
    summary: 'Untreated discharge.',
    category: 'ENVIRONMENT',
    region: 'Delhi',
    goalAmountPaise: 500_000,
    deadlineAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    track: 'CAMPAIGN',
    whatHappened: 'Ongoing discharge.',
    applicantName: 'Asha Rao',
    contact: 'asha@example.com',
  })
  await screenCase(db, { caseId: c.id, decidedBy: 'lawyer_1', isEligible: true, reason: 'Eligible.' })
  await publishCampaign(db, { caseId: c.id, actorId: 'intern_1' })
  return c
}

describe('postCaseUpdate', () => {
  it('posts a public update with an audit trail', async () => {
    const c = await liveCampaign()
    await postCaseUpdate(db, {
      caseId: c.id,
      authorId: 'lawyer_1',
      title: 'Documents filed',
      body: 'The petition was filed this morning.',
    })

    expect(await db.caseUpdate.count({ where: { caseId: c.id } })).toBe(1)
    expect(await db.auditLog.count({ where: { action: 'case.update.posted' } })).toBe(1)
  })

  it('rejects an empty title or body', async () => {
    const c = await liveCampaign()
    await expect(postCaseUpdate(db, { caseId: c.id, authorId: 'l', title: '', body: 'x' })).rejects.toThrow(DomainError)
    await expect(postCaseUpdate(db, { caseId: c.id, authorId: 'l', title: 't', body: ' ' })).rejects.toThrow(DomainError)
  })

  it('rejects updates for a case that has never gone live', async () => {
    const c = await submitCampaign(db, {
      entryType: 'funded',
      title: 't',
      summary: 's',
      category: 'OTHER',
      goalAmountPaise: 100_000,
      track: 'CAMPAIGN',
      whatHappened: 'x',
    })
    await expect(postCaseUpdate(db, { caseId: c.id, authorId: 'l', title: 't', body: 'b' })).rejects.toThrow(DomainError)
  })
})

describe('getPublicCampaign', () => {
  it('returns a public-safe view with raised amount, counts, and updates — never submission PII', async () => {
    const c = await liveCampaign()
    const contrib = await backCase(db, { caseId: c.id, backerId: 'u1', grossAmountPaise: 20_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })
    await postCaseUpdate(db, { caseId: c.id, authorId: 'lawyer_1', title: 'Filed', body: 'Filed in court.' })

    const view = await getPublicCampaign(db, c.id)

    expect(view).not.toBeNull()
    expect(view?.title).toBe('Yamuna pollution')
    expect(view?.raisedPaise).toBe(19_000)
    expect(view?.goalAmountPaise).toBe(500_000)
    expect(view?.backerCount).toBe(1)
    expect(view?.supporterCount).toBe(1)
    expect(view?.updates).toHaveLength(1)
    expect(view?.updates[0]?.title).toBe('Filed')
    expect(JSON.stringify(view)).not.toContain('asha@example.com')
    expect(JSON.stringify(view)).not.toContain('applicantName')
  })

  it('returns null for an unknown id', async () => {
    expect(await getPublicCampaign(db, 'nope')).toBeNull()
  })
})

describe('listPublicCampaigns', () => {
  it('lists only live campaigns with their raised totals', async () => {
    const live = await liveCampaign('Live one')
    const other = await submitCampaign(db, {
      entryType: 'funded',
      title: 'Not live',
      summary: 's',
      category: 'OTHER',
      goalAmountPaise: 100_000,
      track: 'CAMPAIGN',
      whatHappened: 'x',
    })
    const contrib = await backCase(db, { caseId: live.id, backerId: 'u1', grossAmountPaise: 10_000, gatewayFeePaise: 0 })
    await captureContribution(db, { contributionId: contrib.id, gatewayFeePaise: 0 })

    const list = await listPublicCampaigns(db)

    expect(list.map((c) => c.id)).toContain(live.id)
    expect(list.map((c) => c.id)).not.toContain(other.id)
    const found = list.find((c) => c.id === live.id)
    expect(found?.raisedPaise).toBe(9_500)
  })
})
