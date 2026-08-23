import { NextResponse } from 'next/server'
import { prisma, updateVolunteerPreferences } from '@pil/db'
import { getCurrentVolunteer } from '@/lib/volunteer-session'
import { parseJsonBody, nullableStr } from '@/lib/http'

/**
 * Volunteer updates their own engagement preferences: availability,
 * concurrent-case limit, region, areas of practice.
 */
export async function POST(request: Request) {
  const volunteer = await getCurrentVolunteer()
  if (!volunteer) {
    return NextResponse.json({ error: 'Only approved volunteer lawyers can do this' }, { status: 403 })
  }

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const b = parsed.body

  try {
    await updateVolunteerPreferences(prisma, {
      volunteerId: volunteer.volunteerId,
      ...(b.availability !== undefined ? { availability: b.availability } : {}),
      ...(b.capacityLimit !== undefined
        ? {
            capacityLimit:
              typeof b.capacityLimit === 'number' ? b.capacityLimit : Number(b.capacityLimit),
          }
        : {}),
      ...(b.region !== undefined ? { region: nullableStr(b.region) } : {}),
      ...(b.skills !== undefined && Array.isArray(b.skills) ? { skills: b.skills.map(String) } : {}),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update preferences'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
