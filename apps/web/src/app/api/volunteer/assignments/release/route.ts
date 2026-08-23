import { NextResponse } from 'next/server'
import { prisma, releaseAssignment } from '@pil/db'
import { getCurrentVolunteer } from '@/lib/volunteer-session'
import { parseJsonBody, str } from '@/lib/http'

/** Volunteer releases one of their own active assignments. */
export async function POST(request: Request) {
  const volunteer = await getCurrentVolunteer()
  if (!volunteer) {
    return NextResponse.json({ error: 'Only approved volunteer lawyers can do this' }, { status: 403 })
  }

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const assignmentId = str(parsed.body.assignmentId)
  if (!assignmentId) return NextResponse.json({ error: 'Which assignment?' }, { status: 400 })

  try {
    await releaseAssignment(prisma, {
      volunteerId: volunteer.volunteerId,
      assignmentId,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not release the case'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
