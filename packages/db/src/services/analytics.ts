import type { PrismaClient } from '@prisma/client'
import { getFinancialSummary } from './dashboard'

export interface CategoryCount {
  category: string
  count: number
}

export interface WeeklyContribution {
  week: string
  contributions: number
  grossPaise: number
}

export interface Analytics {
  totals: {
    submissions: number
    live: number
    funded: number
    expired: number
    closed: number
    dispatched: number
    awaitingFunds: number
  }
  money: {
    totalRaisedPaise: number
    totalRefundedPaise: number
    avgBackPaise: number
    backerCount: number
  }
  conversion: {
    liveCampaigns: number
    fundedCampaigns: number
    ratePercent: number
  }
  topCategories: CategoryCount[]
  recentWeekly: WeeklyContribution[]
  responseFundBalancePaise: number
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function getAnalytics(db: PrismaClient): Promise<Analytics> {
  const [counts, capturedCount, backers, categories, contributions, finance] = await Promise.all([
    db.case.groupBy({ by: ['stage'], _count: { _all: true } }),
    db.contribution.count({ where: { status: 'CAPTURED' } }),
    db.backer.groupBy({ by: ['kind'], _count: { _all: true } }),
    db.case.groupBy({ by: ['category'], _count: { _all: true } }),
    db.contribution.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 4 * WEEK_MS) } },
      select: { createdAt: true, grossAmountPaise: true },
    }),
    getFinancialSummary(db),
  ])

  const byStage = (stage: string) => counts.find((c) => c.stage === stage)?._count._all ?? 0
  const totalRaisedPaise = finance.totalRaisedPaise
  const backerCount = backers.find((b) => b.kind === 'BACKER')?._count._all ?? 0

  const weeks = new Map<string, WeeklyContribution>()
  for (const c of contributions) {
    const weekStart = new Date(Math.floor(c.createdAt.getTime() / WEEK_MS) * WEEK_MS)
    const key = weekStart.toISOString().slice(0, 10)
    const bucket = weeks.get(key) ?? { week: key, contributions: 0, grossPaise: 0 }
    bucket.contributions += 1
    bucket.grossPaise += c.grossAmountPaise
    weeks.set(key, bucket)
  }

  const fundedCampaigns = byStage('FUNDED')
  const liveCampaigns = byStage('LIVE')
  const denominator = fundedCampaigns + liveCampaigns

  return {
    totals: {
      submissions: byStage('SUBMITTED') + byStage('SCREENING') + byStage('APPROVED') + liveCampaigns + fundedCampaigns + byStage('EXPIRED') + byStage('CLOSED') + byStage('AWAITING_FUNDS') + byStage('DISPATCHED') + byStage('REJECTED'),
      live: liveCampaigns,
      funded: fundedCampaigns,
      expired: byStage('EXPIRED'),
      closed: byStage('CLOSED'),
      dispatched: byStage('DISPATCHED'),
      awaitingFunds: byStage('AWAITING_FUNDS'),
    },
    money: {
      totalRaisedPaise,
      totalRefundedPaise: finance.totalRefundedPaise,
      avgBackPaise: capturedCount > 0 ? Math.round(totalRaisedPaise / capturedCount) : 0,
      backerCount,
    },
    conversion: {
      liveCampaigns,
      fundedCampaigns,
      ratePercent: denominator > 0 ? Math.round((fundedCampaigns / denominator) * 100) : 0,
    },
    topCategories: categories
      .map((c) => ({ category: c.category, count: c._count._all }))
      .sort((a, b) => b.count - a.count),
    recentWeekly: [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)),
    responseFundBalancePaise: finance.responseFundBalancePaise,
  }
}
