import { NextResponse } from 'next/server'
import { updateReferralStatus, prisma } from '@pil/db'
import { requireRole } from '@/lib/requireRole'

const STATUSES = ['NEW', 'CONTACTED', 'ASSISTED', 'CLOSED'] as const
type Status = (typeof STATUSES)[number]

type RouteContext = { params: Promise<{ id: string }> }

/** Staff-only: advance a referral's triage status (NEW → CONTACTED → ASSISTED → CLOSED). */
export async function PATCH(request: Request, { params }: RouteContext) {
  const guard = await requireRole('case.screen')
  if (guard.denied) return guard.response

  const { id } = await params
  let body: { status?: string }
  try {
    body = (await request.json()) as { status?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!body.status || !STATUSES.includes(body.status as Status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const row = await updateReferralStatus(prisma, id, body.status as Status)
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, status: row.status })
}
