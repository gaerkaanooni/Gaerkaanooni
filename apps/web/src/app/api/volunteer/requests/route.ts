import { NextResponse } from 'next/server'
import { prisma, requestCaseForVolunteer } from '@pil/db'
import { getCurrentVolunteer } from '@/lib/volunteer-session'
import { guardRateLimit } from '@/lib/rateLimit'
import { parseJsonBody, str, nullableStr } from '@/lib/http'

/**
 * Volunteer offers to help on a case (POST /api/volunteer/requests).
 * Files an AssignmentRequest for coordinator confirmation — no assignment is
 * created until staff approve it.
 */
export async function POST(request: Request) {
  const tooMany = guardRateLimit({ request, discriminator: 'volunteer-request', limit: 20, windowMs: 60_000 })
  if (tooMany) return tooMany

  const volunteer = await getCurrentVolunteer()
  if (!volunteer) {
    return NextResponse.json({ error: 'Only approved volunteer lawyers can do this' }, { status: 403 })
  }

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const caseId = str(parsed.body.caseId)
  if (!caseId) return NextResponse.json({ error: 'Which case?' }, { status: 400 })

  try {
    await requestCaseForVolunteer(prisma, {
      volunteerId: volunteer.volunteerId,
      caseId,
      note: nullableStr(parsed.body.note),
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not file the request'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
