import { NextResponse } from 'next/server'
import { prisma, submitUrgent } from '@pil/db'
import { DomainError } from '@pil/domain'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const c = await submitUrgent(prisma, body)
    return NextResponse.json({ id: c.id, stage: c.stage }, { status: 201 })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
