import { NextResponse } from 'next/server'
import { requestPhoneOtp } from '@/lib/mock-supabase'

const PHONE_RE = /^\+?\d{7,15}$/

export async function POST(request: Request) {
  let phone = ''
  try {
    const body = (await request.json()) as { phone?: string }
    phone = String(body.phone ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Enter a valid phone number' }, { status: 400 })
  }
  const result = requestPhoneOtp(phone)
  return NextResponse.json(result)
}
