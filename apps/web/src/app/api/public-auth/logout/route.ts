import { NextResponse } from 'next/server'
import { signOutPublic } from '@/lib/public-auth'

export async function POST() {
  await signOutPublic()
  return NextResponse.json({ ok: true })
}
