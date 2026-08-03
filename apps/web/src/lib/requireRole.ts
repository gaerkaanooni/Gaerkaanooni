import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/auth'
import { canPerform, type Action, type Role } from '@pil/domain'

type Guard = { denied: true; response: NextResponse } | { denied: false; session: Session | null; role: Role | null }

export async function requireRole(action: Action): Promise<Guard> {
  const session = await auth()
  const role = (session?.user?.role as Role | undefined) ?? null
  if (!canPerform(role, action)) {
    return { denied: true, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { denied: false, session, role }
}
