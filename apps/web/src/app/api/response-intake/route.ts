import { NextResponse } from 'next/server'
import { prisma, submitUrgent } from '@pil/db'
import { DomainError } from '@pil/domain'
import { parseJsonBody, str, nullableStr, bool } from '@/lib/http'
import { guardRateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
  const tooMany = guardRateLimit({ request, discriminator: 'urgent-intake', limit: 10, windowMs: 60_000 })
  if (tooMany) return tooMany

  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const b = parsed.body

  try {
    const c = await submitUrgent(prisma, {
      whatHappened: str(b.whatHappened),
      where: nullableStr(b.where),
      when: nullableStr(b.when),
      applicantName: nullableStr(b.applicantName),
      contact: nullableStr(b.contact),
      onBehalfOf: nullableStr(b.onBehalfOf),
      isAnonymous: bool(b.isAnonymous),
    })
    return NextResponse.json({ id: c.id, stage: c.stage }, { status: 201 })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
