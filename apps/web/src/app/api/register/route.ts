import { NextResponse } from 'next/server'
import { prisma, registerUser } from '@pil/db'
import { DomainError } from '@pil/domain'
import { parseJsonBody, str, nullableStr } from '@/lib/http'

/**
 * Public self-registration. NOTE: the caller cannot choose their role — the
 * server always provisions a PUBLIC (or BACKER) account, never STAFF/ADMIN.
 * Staff are promoted by an existing admin via `setRole`, never via self-service.
 */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request)
  if (!parsed.ok) return parsed.response
  const b = parsed.body

  try {
    const user = await registerUser(prisma, {
      email: str(b.email),
      password: str(b.password),
      name: nullableStr(b.name),
      // role is intentionally NOT read from the request body.
    })
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
