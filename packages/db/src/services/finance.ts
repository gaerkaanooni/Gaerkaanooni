import type { PrismaClient } from '@prisma/client'
import { DomainError } from '@pil/domain'

export async function getResponseFundBalance(db: PrismaClient): Promise<number> {
  const [income, out] = await Promise.all([
    db.ledgerEntry.aggregate({
      where: { type: { in: ['REPLENISHMENT', 'SURPLUS_SWEEP'] } },
      _sum: { amountPaise: true },
    }),
    db.ledgerEntry.aggregate({
      where: { type: 'RESPONSE_DRAW' },
      _sum: { amountPaise: true },
    }),
  ])
  return (income._sum.amountPaise ?? 0) - (out._sum.amountPaise ?? 0)
}

export async function seedResponseFund(db: PrismaClient, amountPaise: number) {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw new DomainError('Seed amount must be a positive integer of paise')
  }
  return db.ledgerEntry.create({
    data: {
      type: 'REPLENISHMENT',
      amountPaise,
      category: 'directDonation',
      note: 'Direct donation to the response fund',
    },
  })
}
