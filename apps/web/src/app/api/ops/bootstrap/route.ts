import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@pil/db'

/**
 * TEMPORARY one-shot admin bootstrap (removed immediately after use).
 * Token-guarded via MIGRATION_TOKEN; 404 when unset.
 */

function randomPassword(): string {
  const bytes =
    'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*'
  let out = ''
  const buf = globalThis.crypto.getRandomValues(new Uint8Array(20))
  for (const b of buf) out += bytes[b % bytes.length]
  return out
}

export async function POST(request: Request) {
  const expected = process.env.MIGRATION_TOKEN
  if (!expected) return new NextResponse('Not found', { status: 404 })
  if ((request.headers.get('x-ops-token') ?? '') !== expected) {
    return new NextResponse('Not found', { status: 404 })
  }

  let body: { email?: string; fullName?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 })
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  const fullName = String(body.fullName ?? '').trim() || null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'valid email required' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ ok: false, error: 'supabase not configured' }, { status: 500 })
  }

  const password = randomPassword()
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  // 1. Create (or reset) the Supabase Auth user with a known password.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName ?? undefined },
  })

  let authUserId = created?.user?.id ?? null
  if (createErr || !authUserId) {
    // User may already exist — reset their password instead.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email)
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: createErr?.message ?? 'could not create auth user' },
        { status: 500 },
      )
    }
    authUserId = existing.id
    const { error: updErr } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? undefined },
    })
    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })
    }
  }

  // 2. Provision the Prisma User row as ADMIN (first-account bootstrap).
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', name: fullName },
    create: { email, name: fullName, role: 'ADMIN' },
  })

  return NextResponse.json({
    ok: true,
    email,
    role: user.role,
    prismaUserId: user.id,
    authUserId,
    temporaryPassword: password,
  })
}
