import { NextResponse } from 'next/server'
import { requestOtp } from '@/lib/public-auth'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let email = ''
  try {
    const body = (await request.json()) as { email?: string }
    email = String(body.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  const result = await requestOtp(email)
  return NextResponse.json(result)
}
