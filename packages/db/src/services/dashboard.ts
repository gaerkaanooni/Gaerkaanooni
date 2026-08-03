import type { PrismaClient } from '@prisma/client'
import {
  DEFAULT_STAGE_AGE_THRESHOLD_DAYS,
  defaultConfig,
  isStageStale,
  isUpdateOverdue,
} from '@pil/domain'
import { getResponseFundBalance } from './finance'

export interface CaseListRow {
  id: string
  entryType: 'FUNDED' | 'DISPATCHED'
  title: string
  category: string
  region: string | null
  stage: string
  goalAmountPaise: number
  raisedPaise: number
  submittedAt: Date
  publishedAt: Date | null
  deadlineAt: Date | null
  lastUpdateAt: Date | null
  overdueUpdate: boolean
  staleStage: boolean
  needsSignoff: boolean
}

export interface VolunteerRow {
  volunteerId: string
  name: string
  role: string
  availability: string
  region: string | null
  capacityLimit: number
  activeAssignments: number
  hoursContributed: number
}

export interface FinancialSummary {
  totalRaisedPaise: number
  totalRefundedPaise: number
  totalDisbursedPaise: number
  totalFeesPaise: number
  responseFundBalancePaise: number
}

export async function getCaseList(db: PrismaClient): Promise<CaseListRow[]> {
  const cases = await db.case.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      updates: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
    },
  })
  const raisedByCase = await db.contribution.groupBy({
    by: ['caseId'],
    where: { status: 'CAPTURED' },
    _sum: { netToCasePaise: true },
  })
  const raised = new Map(raisedByCase.map((r) => [r.caseId, r._sum.netToCasePaise ?? 0]))
  const signoffLogs = await db.auditLog.findMany({
    where: { meta: { path: ['signoffRequired'], equals: true } },
    select: { caseId: true },
  })
  const signoffCaseIds = new Set(signoffLogs.map((l) => l.caseId).filter((id): id is string => Boolean(id)))

  const now = new Date()
  return cases.map((c) => {
    const lastUpdateAt = c.updates[0]?.createdAt ?? null
    return {
      id: c.id,
      entryType: c.entryType,
      title: c.title,
      category: c.category,
      region: c.region,
      stage: c.stage,
      goalAmountPaise: c.goalAmountPaise,
      raisedPaise: raised.get(c.id) ?? 0,
      submittedAt: c.createdAt,
      publishedAt: c.publishedAt,
      deadlineAt: c.deadlineAt,
      lastUpdateAt,
      overdueUpdate: c.publishedAt
        ? isUpdateOverdue(lastUpdateAt, now, defaultConfig.cadenceDays, c.activeSinceAt ?? undefined)
        : false,
      staleStage: c.publishedAt
        ? false
        : isStageStale(c.stage as never, c.createdAt, now, DEFAULT_STAGE_AGE_THRESHOLD_DAYS),
      needsSignoff: signoffCaseIds.has(c.id),
    }
  })
}

export async function getVolunteerDirectory(db: PrismaClient): Promise<VolunteerRow[]> {
  const volunteers = await db.volunteer.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignments: { where: { status: 'ACTIVE' }, select: { id: true } },
    },
  })
  return volunteers.map((v) => ({
    volunteerId: v.id,
    name: v.user.name ?? v.user.email,
    role: v.role,
    availability: v.availability,
    region: v.region,
    capacityLimit: v.capacityLimit,
    activeAssignments: v.assignments.length,
    hoursContributed: v.hoursContributed,
  }))
}

export async function getFinancialSummary(db: PrismaClient): Promise<FinancialSummary> {
  const [raised, refunded, disbursed, fees] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { type: 'CONTRIBUTION' }, _sum: { amountPaise: true } }),
    db.ledgerEntry.aggregate({ where: { type: 'REFUND' }, _sum: { amountPaise: true } }),
    db.ledgerEntry.aggregate({ where: { type: 'DISBURSEMENT' }, _sum: { amountPaise: true } }),
    db.ledgerEntry.aggregate({ where: { type: 'FEE' }, _sum: { amountPaise: true } }),
  ])
  return {
    totalRaisedPaise: raised._sum.amountPaise ?? 0,
    totalRefundedPaise: refunded._sum.amountPaise ?? 0,
    totalDisbursedPaise: disbursed._sum.amountPaise ?? 0,
    totalFeesPaise: fees._sum.amountPaise ?? 0,
    responseFundBalancePaise: await getResponseFundBalance(db),
  }
}
