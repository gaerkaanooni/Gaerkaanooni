import { NextResponse } from 'next/server'
import { listLawyerApplications, prisma } from '@pil/db'
import { requireRole } from '@/lib/requireRole'

/** Staff: list lawyer applications for the review queue (optionally by status). */
export async function GET(request: Request) {
  const guard = await requireRole('dashboard.view')
  if (guard.denied) return guard.response

  const status = new URL(request.url).searchParams.get('status')
  const valid = status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' ? status : undefined
  const applications = await listLawyerApplications(prisma, valid ? { status: valid } : {})
  return NextResponse.json({ applications })
}
