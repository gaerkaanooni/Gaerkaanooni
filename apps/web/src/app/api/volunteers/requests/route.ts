import { NextResponse } from 'next/server'
import { listAssignmentRequests, prisma } from '@pil/db'
import { requireRole } from '@/lib/requireRole'

/** Staff: offers of help awaiting confirmation (optionally filtered by status). */
export async function GET(request: Request) {
  const guard = await requireRole('dashboard.view')
  if (guard.denied) return guard.response

  const status = new URL(request.url).searchParams.get('status')
  const valid = status === 'PENDING' || status === 'APPROVED' || status === 'DECLINED' ? status : undefined
  const requests = await listAssignmentRequests(prisma, valid ? { status: valid } : {})
  return NextResponse.json({ requests })
}
