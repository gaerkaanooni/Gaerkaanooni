import { NextResponse } from 'next/server'
import { getStaffSession, type StaffSession } from '@/lib/auth-session'
import { canPerform, type Action, type Role } from '@pil/domain'

type Guard =
  | { denied: true; response: NextResponse }
  | { denied: false; session: StaffSession | null; role: Role | null }

/**
 * Guard a route (or run it) by staff permission. Resolves the staff identity via
 * the unified Supabase/mock session, then enforces `canPerform(role, action)`.
 * Returns a 403 guard when the caller lacks the required ability.
 */
export async function requireRole(action: Action): Promise<Guard> {
  const session = await getStaffSession()
  const role = (session?.role as Role | undefined | null) ?? null
  if (!canPerform(role, action)) {
    return { denied: true, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { denied: false, session, role }
}
