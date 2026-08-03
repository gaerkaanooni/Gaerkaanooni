import type { PrismaClient } from '@prisma/client'
import {
  computeContributionSplit,
  defaultConfig,
  DomainError,
  isBackAmountValid,
  isThresholdMet,
  requiresSignOff,
  transition,
} from '@pil/domain'
import { writeAudit } from './audit'
async function capturedNetFor(db: PrismaClient, caseId: string): Promise<number> {
  const agg = await db.contribution.aggregate({
    where: { caseId, status: 'CAPTURED' },
    _sum: { netToCasePaise: true },
  })
  return agg._sum.netToCasePaise ?? 0
}

export interface BackCaseInput {
  caseId: string
  backerId: string
  grossAmountPaise: number
  gatewayFeePaise: number
  razorpayOrderId?: string | null
}

export async function followCase(db: PrismaClient, input: { caseId: string; userId: string }) {
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.stage !== 'LIVE' && caseRec.stage !== 'FUNDED' && caseRec.stage !== 'DISPATCHED') {
    throw new DomainError('Only published cases accept support signals')
  }
  return db.backer.create({ data: { caseId: input.caseId, kind: 'FOLLOWER', userId: input.userId } })
}

export async function backCase(db: PrismaClient, input: BackCaseInput) {
  if (!isBackAmountValid(input.grossAmountPaise)) {
    throw new DomainError('Back amount must be a positive integer of paise')
  }
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.stage !== 'LIVE' && caseRec.stage !== 'FUNDED' && caseRec.stage !== 'DISPATCHED') {
    throw new DomainError('Only live campaigns accept contributions')
  }

  const split = computeContributionSplit(input.grossAmountPaise, input.gatewayFeePaise, defaultConfig)
  return db.$transaction(async (tx) => {
    await tx.backer.create({ data: { caseId: input.caseId, kind: 'BACKER', userId: input.backerId } })
    return tx.contribution.create({
      data: {
        caseId: input.caseId,
        backerId: input.backerId,
        grossAmountPaise: split.grossAmountPaise,
        totalFeePaise: split.totalFeePaise,
        gatewayFeePaise: split.gatewayFeePaise,
        platformFeePaise: split.platformFeePaise,
        netToCasePaise: split.netToCasePaise,
        status: 'PENDING',
        razorpayOrderId: input.razorpayOrderId,
      },
    })
  })
}

export interface CaptureContributionInput {
  contributionId: string
  gatewayFeePaise: number
}

export async function captureContribution(db: PrismaClient, input: CaptureContributionInput) {
  const contrib = await db.contribution.findUnique({ where: { id: input.contributionId } })
  if (!contrib) throw new DomainError('Contribution not found')
  if (contrib.status !== 'PENDING') {
    throw new DomainError(`Cannot capture a contribution in status ${contrib.status}`)
  }

  const split = computeContributionSplit(contrib.grossAmountPaise, input.gatewayFeePaise, defaultConfig)
  const caseRec = await db.case.findUniqueOrThrow({ where: { id: contrib.caseId } })
  const dispatched = caseRec.entryType === 'DISPATCHED'

  await db.contribution.update({
    where: { id: input.contributionId },
    data: {
      status: 'CAPTURED',
      gatewayFeePaise: split.gatewayFeePaise,
      platformFeePaise: split.platformFeePaise,
      totalFeePaise: split.totalFeePaise,
      netToCasePaise: split.netToCasePaise,
    },
  })

  if (dispatched) {
    await db.ledgerEntry.create({
      data: {
        caseId: contrib.caseId,
        type: 'REPLENISHMENT',
        amountPaise: split.netToCasePaise,
        category: 'directDonation',
        note: 'Backer contribution routed to the response fund',
      },
    })
  } else {
    await db.ledgerEntry.create({
      data: {
        caseId: contrib.caseId,
        type: 'CONTRIBUTION',
        amountPaise: split.netToCasePaise,
        category: null,
        note: 'Captured contribution net of platform fee',
      },
    })
  }

  await writeAudit(db, {
    action: 'contribution.captured',
    actorId: contrib.backerId,
    caseId: contrib.caseId,
    amountPaise: contrib.grossAmountPaise,
    reason: 'Payment captured by the gateway',
  })

  if (!dispatched && caseRec.stage === 'LIVE') {
    const capturedNet = await capturedNetFor(db, contrib.caseId)
    if (isThresholdMet(capturedNet, caseRec.goalAmountPaise)) {
      const nextStage = transition('funded', 'LIVE', 'FUNDED')
      await db.case.update({ where: { id: contrib.caseId }, data: { stage: nextStage } })
      await writeAudit(db, {
        action: 'case.funded',
        actorId: null,
        caseId: contrib.caseId,
        amountPaise: capturedNet,
        reason: 'Captured net contributions reached the campaign goal',
      })
    }
  }
}

export async function markExpired(db: PrismaClient, input: { caseId: string; actorId: string }) {
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.stage !== 'LIVE') {
    throw new DomainError('Only live campaigns can expire')
  }
  if (caseRec.deadlineAt && caseRec.deadlineAt.getTime() > Date.now()) {
    throw new DomainError('Campaign deadline has not yet passed')
  }
  const capturedNet = await capturedNetFor(db, input.caseId)
  if (isThresholdMet(capturedNet, caseRec.goalAmountPaise)) {
    throw new DomainError('A campaign that met its goal cannot expire')
  }

  const nextStage = transition('funded', 'LIVE', 'EXPIRED')
  await db.case.update({ where: { id: input.caseId }, data: { stage: nextStage } })
  await writeAudit(db, {
    action: 'case.expired',
    actorId: input.actorId,
    caseId: input.caseId,
    reason: 'Deadline passed with the goal unmet',
  })
  return db.case.findUniqueOrThrow({ where: { id: input.caseId } })
}

export async function refundContribution(
  db: PrismaClient,
  input: { contributionId: string; actorId: string; reason: string },
) {
  const contrib = await db.contribution.findUnique({ where: { id: input.contributionId } })
  if (!contrib) throw new DomainError('Contribution not found')
  if (contrib.status !== 'CAPTURED') {
    throw new DomainError(`Cannot refund a contribution in status ${contrib.status}`)
  }

  const signoffRequired = requiresSignOff(contrib.grossAmountPaise, defaultConfig.signoffLimitPaise)

  await db.$transaction(async (tx) => {
    await tx.contribution.update({ where: { id: input.contributionId }, data: { status: 'REFUNDED' } })
    await tx.ledgerEntry.create({
      data: {
        caseId: contrib.caseId,
        type: 'REFUND',
        amountPaise: contrib.grossAmountPaise,
        note: 'Full gross refund to the backer',
      },
    })
  })
  await writeAudit(db, {
    action: 'refund.issued',
    actorId: input.actorId,
    caseId: contrib.caseId,
    amountPaise: contrib.grossAmountPaise,
    reason: input.reason,
    meta: { signoffRequired, gatewayFeeReversed: true },
  })
}

export async function refundExpiredCampaign(db: PrismaClient, input: { caseId: string; actorId: string }) {
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.stage !== 'EXPIRED') {
    throw new DomainError('Only expired campaigns are refunded in bulk')
  }

  const captured = await db.contribution.findMany({ where: { caseId: input.caseId, status: 'CAPTURED' } })
  for (const contrib of captured) {
    await refundContribution(db, { contributionId: contrib.id, actorId: input.actorId, reason: 'Campaign expired below threshold' })
  }

  const nextStage = transition('funded', 'EXPIRED', 'CLOSED')
  const updated = await db.case.update({ where: { id: input.caseId }, data: { stage: nextStage } })
  await writeAudit(db, {
    action: 'case.closed',
    actorId: input.actorId,
    caseId: input.caseId,
    reason: 'Expired campaign closed; all captured contributions refunded',
  })
  return updated
}

export async function finalizeFundedCampaign(db: PrismaClient, input: { caseId: string; actorId: string }) {
  const caseRec = await db.case.findUnique({ where: { id: input.caseId } })
  if (!caseRec) throw new DomainError('Case not found')
  if (caseRec.stage !== 'FUNDED') {
    throw new DomainError('Only funded campaigns can be finalized')
  }
  if (caseRec.deadlineAt && caseRec.deadlineAt.getTime() > Date.now()) {
    throw new DomainError('Campaign deadline has not yet passed')
  }

  const capturedNet = await capturedNetFor(db, input.caseId)
  if (capturedNet < caseRec.goalAmountPaise) {
    throw new DomainError('Campaign is not funded')
  }
  const surplus = capturedNet - caseRec.goalAmountPaise
  if (surplus > 0) {
    const sweepToFund = Math.floor((surplus * defaultConfig.surplusToFundPercent) / 100)
    if (sweepToFund > 0) {
      await db.ledgerEntry.create({
        data: {
          caseId: input.caseId,
          type: 'SURPLUS_SWEEP',
          amountPaise: sweepToFund,
          category: 'surplusSweep',
          note: `${defaultConfig.surplusToFundPercent}% of campaign surplus to the response fund`,
        },
      })
    }
    await writeAudit(db, {
      action: 'surplus.swept',
      actorId: input.actorId,
      caseId: input.caseId,
      amountPaise: sweepToFund,
      reason: `Surplus of ${surplus} split with ${defaultConfig.surplusToFundPercent}% to the response fund`,
    })
  }
  return db.case.findUniqueOrThrow({ where: { id: input.caseId } })
}
