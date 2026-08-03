import type { PrismaClient } from '@prisma/client'
import {
  canDispatch,
  defaultConfig,
  DomainError,
  InsufficientFundsError,
  requiresSignOff,
  transition,
  type CaseStage,
} from '@pil/domain'
import { writeAudit } from './audit'
import { getResponseFundBalance } from './finance'

export interface SubmitUrgentInput {
  whatHappened: string
  where?: string | null
  when?: string | null
  applicantName?: string | null
  contact?: string | null
  onBehalfOf?: string | null
  isAnonymous?: boolean
}

export interface VerifyUrgentInput {
  caseId: string
  decidedBy: string
  verified: boolean
  reason: string
}

export async function submitUrgent(db: PrismaClient, input: SubmitUrgentInput) {
  if (typeof input.whatHappened !== 'string' || input.whatHappened.trim().length === 0) {
    throw new DomainError('whatHappened is required')
  }

  const caseRec = await db.case.create({
    data: {
      entryType: 'DISPATCHED',
      title: 'Urgent response matter',
      summary: input.whatHappened,
      category: 'OTHER',
      stage: 'SUBMITTED',
      goalAmountPaise: 0,
    },
  })
  await db.submission.create({
    data: {
      caseId: caseRec.id,
      track: 'RESPONSE',
      whatHappened: input.whatHappened,
      where: input.where,
      when: input.when,
      applicantName: input.applicantName,
      contact: input.contact,
      onBehalfOf: input.onBehalfOf,
      isAnonymous: input.isAnonymous ?? false,
    },
  })
  await writeAudit(db, {
    action: 'submission.created',
    actorId: null,
    caseId: caseRec.id,
    reason: 'Urgent response intake received',
  })
  return db.case.findUniqueOrThrow({ where: { id: caseRec.id } })
}

export async function verifyUrgentSubmission(db: PrismaClient, input: VerifyUrgentInput) {
  if (typeof input.decidedBy !== 'string' || input.decidedBy.trim().length === 0) {
    throw new DomainError('decidedBy is required')
  }
  if (typeof input.reason !== 'string' || input.reason.trim().length === 0) {
    throw new DomainError('reason is required')
  }
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.entryType !== 'DISPATCHED') {
    throw new DomainError('Only dispatched-track cases use the urgent verification flow')
  }
  if (caseRec.stage !== 'SUBMITTED') {
    throw new DomainError('Only submitted cases can be verified')
  }

  const inScreening = transition('dispatched', caseRec.stage as CaseStage, 'SCREENING')
  await db.case.update({ where: { id: input.caseId }, data: { stage: inScreening } })
  await db.screening.upsert({
    where: { caseId: input.caseId },
    create: {
      caseId: input.caseId,
      completenessPassed: true,
      isEligible: input.verified,
      reason: input.reason,
      decidedBy: input.decidedBy,
      decidedAt: new Date(),
    },
    update: {
      completenessPassed: true,
      isEligible: input.verified,
      reason: input.reason,
      decidedBy: input.decidedBy,
      decidedAt: new Date(),
    },
  })

  if (!input.verified) {
    const next = transition('dispatched', inScreening, 'REJECTED')
    await db.case.update({ where: { id: input.caseId }, data: { stage: next } })
    await writeAudit(db, {
      action: 'case.verified',
      actorId: input.decidedBy,
      caseId: input.caseId,
      reason: `Rejected: ${input.reason}`,
    })
    return db.case.findUniqueOrThrow({ where: { id: input.caseId } })
  }

  const budget = caseRec.goalAmountPaise > 0 ? caseRec.goalAmountPaise : defaultConfig.defaultDispatchBudgetPaise
  const balance = await getResponseFundBalance(db)
  if (canDispatch(balance, budget)) {
    return dispatchUrgentCase(db, {
      caseId: input.caseId,
      actorId: input.decidedBy,
      budgetPaise: budget,
      reason: input.reason,
    })
  }

  const next = transition('dispatched', inScreening, 'AWAITING_FUNDS')
  await db.case.update({ where: { id: input.caseId }, data: { stage: next } })
  await writeAudit(db, {
    action: 'case.awaiting-funds',
    actorId: input.decidedBy,
    caseId: input.caseId,
    reason: `Verified but the response fund has insufficient balance (${balance})`,
  })
  return db.case.findUniqueOrThrow({ where: { id: input.caseId } })
}

export async function dispatchUrgentCase(
  db: PrismaClient,
  input: { caseId: string; actorId: string; budgetPaise: number; reason: string },
) {
  if (!Number.isInteger(input.budgetPaise) || input.budgetPaise <= 0) {
    throw new DomainError('Dispatch budget must be a positive integer of paise')
  }
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.entryType !== 'DISPATCHED') {
    throw new DomainError('Only dispatched-track cases can be dispatched')
  }
  if (caseRec.stage !== 'SCREENING' && caseRec.stage !== 'AWAITING_FUNDS') {
    throw new DomainError(`Cannot dispatch a case in stage ${caseRec.stage}`)
  }

  const balance = await getResponseFundBalance(db)
  if (!canDispatch(balance, input.budgetPaise)) {
    throw new InsufficientFundsError(balance, input.budgetPaise)
  }
  const signoffRequired = requiresSignOff(input.budgetPaise, defaultConfig.signoffLimitPaise)
  const next = transition('dispatched', caseRec.stage as CaseStage, 'DISPATCHED')

  await db.$transaction(async (tx) => {
    await tx.ledgerEntry.create({
      data: {
        caseId: input.caseId,
        type: 'RESPONSE_DRAW',
        amountPaise: input.budgetPaise,
        note: 'Dispatch budget drawn from the response fund',
      },
    })
    await tx.case.update({
      where: { id: input.caseId },
      data: { stage: next, goalAmountPaise: input.budgetPaise },
    })
  })
  await writeAudit(db, {
    action: 'response.dispatched',
    actorId: input.actorId,
    caseId: input.caseId,
    amountPaise: input.budgetPaise,
    reason: input.reason,
    meta: { signoffRequired },
  })
  return db.case.findUniqueOrThrow({ where: { id: input.caseId } })
}

export async function publishResponsePage(db: PrismaClient, input: { caseId: string; actorId?: string | null }) {
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.entryType !== 'DISPATCHED' || caseRec.stage !== 'DISPATCHED') {
    throw new DomainError('Only dispatched urgent cases publish a response page')
  }

  const next = transition('dispatched', caseRec.stage as CaseStage, 'LIVE')
  const now = new Date()
  const updated = await db.case.update({
    where: { id: input.caseId },
    data: { stage: next, publishedAt: now, activeSinceAt: now },
  })
  await writeAudit(db, {
    action: 'case.launched',
    actorId: input.actorId,
    caseId: input.caseId,
    reason: 'Response-track campaign page published',
  })
  return updated
}
