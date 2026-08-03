import { NextResponse } from 'next/server'
import { followCase, prisma } from '@pil/db'
import { DomainError } from '@pil/domain'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    await followCase(prisma, { caseId: id, userId: 'anonymous' })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
