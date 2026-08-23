import { NextResponse } from 'next/server'
import { decideLawyerApplication, prisma } from '@pil/db'
import { requireRole } from '@/lib/requireRole'
import { parseJsonBody, str } from '@/lib/http'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Admin decision on a lawyer application. Approval provisions the volunteer
 * (User role LAWYER + Volunteer panel row); rejection records a reason and
 * lets the applicant re-apply later.
 */
export async function POST(request: Request, { params }: RouteContext) {
  // Provisioning accounts is an admin action — mirrors setRole (spec 08 §1).
  const guard = await requireRole('volunteer.review')
  if (guard.denied) return guard.response
  const actorId = guard.session?.userId ?? 'staff'

  const { id } = await params
  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response

  const decision = str(parsed.body.decision)
  const reason = str(parsed.body.reason)
  if ((decision !== 'approved' && decision !== 'rejected') || !reason) {
    return NextResponse.json(
      { error: 'A decision (approved/rejected) and a reason are required' },
      { status: 400 },
    )
  }

  try {
    const result = await decideLawyerApplication(prisma, {
      applicationId: id,
      decision: decision as 'approved' | 'rejected',
      actorId,
      reason,
    })
    return NextResponse.json({ ok: true, status: result.application.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not record the decision'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
