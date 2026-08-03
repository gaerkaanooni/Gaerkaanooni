import type { PrismaClient } from '@prisma/client'

export interface PublicCaseUpdate {
  id: string
  title: string
  body: string
  createdAt: Date
}

export interface PublicCampaign {
  id: string
  title: string
  summary: string
  description: string | null
  category: string
  region: string | null
  entryType: 'FUNDED' | 'DISPATCHED'
  stage: string
  goalAmountPaise: number
  raisedPaise: number
  deadlineAt: Date | null
  publishedAt: Date | null
  backerCount: number
  supporterCount: number
  contributionCount: number
  updates: PublicCaseUpdate[]
}

export async function getPublicCampaign(db: PrismaClient, id: string): Promise<PublicCampaign | null> {
  const caseRec = await db.case.findUnique({
    where: { id },
    include: {
      updates: { where: { published: true }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!caseRec) return null

  const agg = await db.contribution.aggregate({
    where: { caseId: id, status: 'CAPTURED' },
    _sum: { netToCasePaise: true },
  })
  const [backers, supporters, contributions] = await Promise.all([
    db.backer.count({ where: { caseId: id, kind: 'BACKER' } }),
    db.backer.count({ where: { caseId: id } }),
    db.contribution.count({ where: { caseId: id } }),
  ])

  return {
    id: caseRec.id,
    title: caseRec.title,
    summary: caseRec.summary,
    description: caseRec.description,
    category: caseRec.category,
    region: caseRec.region,
    entryType: caseRec.entryType,
    stage: caseRec.stage,
    goalAmountPaise: caseRec.goalAmountPaise,
    raisedPaise: agg._sum.netToCasePaise ?? 0,
    deadlineAt: caseRec.deadlineAt,
    publishedAt: caseRec.publishedAt,
    backerCount: backers,
    supporterCount: supporters,
    contributionCount: contributions,
    updates: caseRec.updates.map((u) => ({ id: u.id, title: u.title, body: u.body, createdAt: u.createdAt })),
  }
}

export async function listPublicCampaigns(db: PrismaClient): Promise<PublicCampaign[]> {
  const cases = await db.case.findMany({ where: { stage: 'LIVE' }, orderBy: { publishedAt: 'desc' } })
  const views = await Promise.all(cases.map((c) => getPublicCampaign(db, c.id)))
  return views.filter((v): v is PublicCampaign => v !== null)
}
