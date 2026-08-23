import { NextResponse } from 'next/server'
import { decideAssignmentRequest, prisma } from '@pil/db'
import { requireRole } from '@/lib/requireRole'
import { parseJsonBody, str } from '@/lib/http'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Staff decision on an offer of help. Approval is the hard gate — capacity
 * and availability are re-checked before the assignment becomes active.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const guard = await requireRole('volunteer.review')
  if (guard.denied) return guard.response
  const actorId = guard.session?.userId ?? 'staff'

  const { id } = await params
  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response

  const decision = str(parsed.body.decision)
  const reason = str(parsed.body.reason)
  if ((decision !== 'approved' && decision !== 'declined') || !reason) {
    return NextResponse.json(
      { error: 'A decision (approved/declined) and a reason are required' },
      { status: 400 },
    )
  }

  try {
    const result = await decideAssignmentRequest(prisma, {
      requestId: id,
      decision: decision as 'approved' | 'declined',
      actorId,
      reason,
    })
    return NextResponse.json({ ok: true, status: result.request.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not record the decision'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
