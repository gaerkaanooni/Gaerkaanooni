import type { PrismaClient } from '@prisma/client'
import { DomainError, isCategory, transition, type EntryType } from '@pil/domain'
import { CaseRepository } from '../repositories/case'
import { writeAudit } from './audit'

export interface SubmitCampaignInput {
  entryType: EntryType
  title: string
  summary: string
  description?: string | null
  category: string
  region?: string | null
  goalAmountPaise: number
  deadlineAt?: Date | null
  track: 'CAMPAIGN' | 'RESPONSE'
  whatHappened: string
  where?: string | null
  when?: string | null
  applicantName?: string | null
  contact?: string | null
  onBehalfOf?: string | null
  isAnonymous?: boolean
}

export interface ScreenCaseInput {
  caseId: string
  decidedBy: string
  isEligible: boolean
  reason: string
  completenessPassed?: boolean
  duplicateOfCaseId?: string | null
}

export interface PublishCampaignInput {
  caseId: string
  actorId?: string | null
  deadlineAt?: Date | null
}

function assertRequired(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new DomainError(`${field} is required`)
  }
}

function toDomainEntryType(dbEntryType: string): EntryType {
  return dbEntryType === 'FUNDED' ? 'funded' : 'dispatched'
}

export async function submitCampaign(db: PrismaClient, input: SubmitCampaignInput) {
  assertRequired(input.title, 'title')
  assertRequired(input.summary, 'summary')
  assertRequired(input.whatHappened, 'whatHappened')
  if (!isCategory(input.category)) {
    throw new DomainError(`Invalid category: ${input.category}`)
  }
  if (!Number.isInteger(input.goalAmountPaise) || input.goalAmountPaise <= 0) {
    throw new DomainError('goalAmountPaise must be a positive integer')
  }

  const repo = new CaseRepository(db)
  const caseRec = await repo.createSubmission({ ...input, category: input.category })
  await writeAudit(db, {
    action: 'submission.created',
    actorId: null,
    caseId: caseRec.id,
    reason: 'Public submission received',
  })
  return caseRec
}

export async function screenCase(db: PrismaClient, input: ScreenCaseInput) {
  assertRequired(input.decidedBy, 'decidedBy')
  assertRequired(input.reason, 'reason')

  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.entryType !== 'FUNDED') {
    throw new DomainError('Dispatched-track cases use the verification flow instead of screening')
  }

  const entryType = toDomainEntryType(caseRec.entryType)
  const outcome = input.isEligible ? 'APPROVED' : 'REJECTED'
  const inScreening = transition(entryType, caseRec.stage as never, 'SCREENING')
  const nextStage = transition(entryType, inScreening, outcome)

  await db.case.update({
    where: { id: input.caseId },
    data: { stage: nextStage },
  })
  await db.screening.upsert({
    where: { caseId: input.caseId },
    create: {
      caseId: input.caseId,
      completenessPassed: input.completenessPassed ?? true,
      duplicateOfCaseId: input.duplicateOfCaseId,
      isEligible: input.isEligible,
      reason: input.reason,
      decidedBy: input.decidedBy,
      decidedAt: new Date(),
    },
    update: {
      completenessPassed: input.completenessPassed ?? true,
      duplicateOfCaseId: input.duplicateOfCaseId,
      isEligible: input.isEligible,
      reason: input.reason,
      decidedBy: input.decidedBy,
      decidedAt: new Date(),
    },
  })
  await writeAudit(db, {
    action: 'case.screened',
    actorId: input.decidedBy,
    caseId: input.caseId,
    reason: `${input.isEligible ? 'Approved' : 'Rejected'} for public interest litigation: ${input.reason}`,
  })
}

export async function publishCampaign(db: PrismaClient, input: PublishCampaignInput) {
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')

  const nextStage = transition(toDomainEntryType(caseRec.entryType), caseRec.stage as never, 'LIVE')
  const deadlineAt = input.deadlineAt ?? caseRec.deadlineAt
  if (!deadlineAt) {
    throw new DomainError('A campaign launch requires a deadline')
  }
  if (deadlineAt.getTime() <= Date.now()) {
    throw new DomainError('A campaign deadline must be in the future')
  }

  const now = new Date()
  const updated = await db.case.update({
    where: { id: input.caseId },
    data: { stage: nextStage, deadlineAt, publishedAt: now, activeSinceAt: now },
  })
  await writeAudit(db, {
    action: 'case.launched',
    actorId: input.actorId,
    caseId: input.caseId,
    reason: 'Campaign went live with a public funding goal',
  })
  return updated
}
