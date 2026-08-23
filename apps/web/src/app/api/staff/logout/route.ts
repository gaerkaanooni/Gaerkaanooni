import { NextResponse } from 'next/server'
import { signOutStaff } from '@/lib/auth-session'

export async function POST() {
  await signOutStaff()
  return NextResponse.json({ ok: true })
}
