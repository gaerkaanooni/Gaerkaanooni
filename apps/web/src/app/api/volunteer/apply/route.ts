import { NextResponse } from 'next/server'
import { prisma, submitLawyerApplication } from '@pil/db'
import { getPublicUser } from '@/lib/public-auth'
import { guardRateLimit } from '@/lib/rateLimit'
import { parseJsonBody, nullableStr } from '@/lib/http'

/**
 * Public lawyer signup (POST /api/volunteer/apply).
 *
 * Requires a signed-in public session (email OTP / Google) so every
 * application is tied to a verified email; the session email overrides
 * anything in the body. Applications land in the staff queue as PENDING —
 * approval provisions the Volunteer row (docs/spec/06-volunteers.md §5).
 */
export async function POST(request: Request) {
  const tooMany = guardRateLimit({ request, discriminator: 'volunteer-apply', limit: 5, windowMs: 60_000 })
  if (tooMany) return tooMany

  const user = await getPublicUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Sign in to apply' }, { status: 401 })
  }

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const b = parsed.body

  try {
    // yearsPractice / capacityLimit are validated inside the domain layer.
    const row = await submitLawyerApplication(prisma, {
      userId: user.id,
      email: user.email,
      fullName: String(b.fullName ?? ''),
      barCouncilId: String(b.barCouncilId ?? ''),
      yearsPractice: typeof b.yearsPractice === 'number' ? b.yearsPractice : Number.NaN,
      skills: Array.isArray(b.skills) ? b.skills.map(String) : [],
      region: nullableStr(b.region),
      capacityLimit: typeof b.capacityLimit === 'number' ? b.capacityLimit : undefined,
      motivation: nullableStr(b.motivation),
    })
    return NextResponse.json({ ok: true, status: row.status }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not submit the application'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
