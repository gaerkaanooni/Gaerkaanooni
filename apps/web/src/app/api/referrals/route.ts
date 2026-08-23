import { NextResponse } from 'next/server'
import { createReferral, listReferrals, prisma } from '@pil/db'
import { isCategory } from '@pil/domain'
import { requireRole } from '@/lib/requireRole'
import { guardRateLimit } from '@/lib/rateLimit'

/**
 * Public referral intake. Open to anyone (no account required) so a friend,
 * family member, neighbour or community group can bring forward a matter for
 * someone who needs a fair hearing.
 *
 * Privacy-first: the contact of the person being referred is only stored when
 * they have consented to be contacted (`contactConsented`).
 */
export async function POST(request: Request) {
  // Prevent referral spam: at most a handful per minute per IP.
  const tooMany = guardRateLimit({ request, discriminator: 'referral', limit: 10, windowMs: 60_000 })
  if (tooMany) return tooMany

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const referredFor = String(body.referredFor ?? '').trim()
  const matter = String(body.matter ?? '').trim()
  if (!referredFor || !matter) {
    return NextResponse.json(
      { error: 'Tell us who needs a hearing and what is going on' },
      { status: 400 },
    )
  }

  const category = body.category ? String(body.category) : null
  if (category && !isCategory(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  const contactConsented = Boolean(body.contactConsented)

  const row = await createReferral(prisma, {
    referredFor,
    category,
    matter,
    region: body.region ? String(body.region) : null,
    contact: body.contact ? String(body.contact) : null,
    referrer: body.referrer ? String(body.referrer) : null,
    referrerContact: body.referrerContact ? String(body.referrerContact) : null,
    contactConsented,
  })

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 })
}

/** Staff-only: list all referrals for triage in the dashboard. */
export async function GET() {
  const guard = await requireRole('case.screen')
  if (guard.denied) return guard.response
  const rows = await listReferrals(prisma)
  return NextResponse.json({ referrals: rows })
}
