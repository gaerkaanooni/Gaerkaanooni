import { NextResponse } from 'next/server'
import { prisma, registerUser } from '@pil/db'
import { DomainError } from '@pil/domain'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const user = await registerUser(prisma, body)
    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
