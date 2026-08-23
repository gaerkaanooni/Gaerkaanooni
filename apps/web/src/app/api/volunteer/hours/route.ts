import { NextResponse } from 'next/server'
import { prisma, logVolunteerHours } from '@pil/db'
import { getCurrentVolunteer } from '@/lib/volunteer-session'
import { parseJsonBody, str, nullableStr } from '@/lib/http'

/** Volunteer logs pro-bono hours (positive integers only — domain enforced). */
export async function POST(request: Request) {
  const volunteer = await getCurrentVolunteer()
  if (!volunteer) {
    return NextResponse.json({ error: 'Only approved volunteer lawyers can do this' }, { status: 403 })
  }

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response

  const rawHours = parsed.body.hours
  const hours = typeof rawHours === 'number' ? rawHours : Number(str(rawHours))
  if (!Number.isInteger(hours) || hours <= 0) {
    return NextResponse.json({ error: 'Hours must be a whole number, at least 1' }, { status: 400 })
  }

  try {
    const total = await logVolunteerHours(prisma, {
      volunteerId: volunteer.volunteerId,
      hours,
      note: nullableStr(parsed.body.note),
    })
    return NextResponse.json({ ok: true, total })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not log the hours'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
