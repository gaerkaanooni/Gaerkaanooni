import { NextResponse } from 'next/server'
import { prisma, publishCampaign } from '@pil/db'
import { DomainError } from '@pil/domain'
import { requireRole } from '@/lib/requireRole'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const guard = await requireRole('case.publish')
  if (guard.denied) return guard.response

  try {
    const { id } = await params
    const body = await request.json()
    const published = await publishCampaign(prisma, { ...body, caseId: id })
    return NextResponse.json({ ok: true, id: published.id, stage: published.stage })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
