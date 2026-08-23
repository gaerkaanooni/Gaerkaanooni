import { NextResponse } from 'next/server'
import { prisma, withdrawAssignmentRequest } from '@pil/db'
import { getCurrentVolunteer } from '@/lib/volunteer-session'
import { parseJsonBody, str } from '@/lib/http'

type RouteContext = { params: Promise<{ id: string }> }

/** A lawyer withdraws their own pending offer of help. */
export async function POST(request: Request, { params }: RouteContext) {
  const volunteer = await getCurrentVolunteer()
  if (!volunteer) {
    return NextResponse.json({ error: 'Only approved volunteer lawyers can do this' }, { status: 403 })
  }

  const { id } = await params
  // The body is optional; the route id wins when both are present.
  let requestId = id
  const parsed = await parseJsonBody(request)
  if (parsed.ok) {
    const fromBody = str(parsed.body.requestId)
    if (fromBody) requestId = fromBody
  }

  try {
    await withdrawAssignmentRequest(prisma, {
      volunteerId: volunteer.volunteerId,
      requestId,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not withdraw the request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
