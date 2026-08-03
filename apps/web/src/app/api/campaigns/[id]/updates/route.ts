import { NextResponse } from 'next/server'
import { postCaseUpdate, prisma } from '@pil/db'
import { DomainError } from '@pil/domain'
import { requireRole } from '@/lib/requireRole'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const guard = await requireRole('case.update')
  if (guard.denied) return guard.response

  try {
    const { id } = await params
    const body = await request.json()
    const update = await postCaseUpdate(prisma, { caseId: id, authorId: body.authorId, title: body.title, body: body.body })
    return NextResponse.json({ id: update.id, title: update.title }, { status: 201 })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
