import { NextResponse } from 'next/server'
import { prisma, submitCampaign, type SubmitCampaignInput } from '@pil/db'
import { DomainError } from '@pil/domain'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitCampaignInput
    const c = await submitCampaign(prisma, body)
    return NextResponse.json({ id: c.id, stage: c.stage }, { status: 201 })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}

export async function GET() {
  const cases = await prisma.case.findMany({
    where: { stage: 'LIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { backers: true, contributions: true } },
    },
  })
  return NextResponse.json({
    campaigns: cases.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      description: c.description,
      goalAmountPaise: c.goalAmountPaise,
      deadlineAt: c.deadlineAt,
      supporterCount: c._count.backers,
      contributionCount: c._count.contributions,
    })),
  })
}
