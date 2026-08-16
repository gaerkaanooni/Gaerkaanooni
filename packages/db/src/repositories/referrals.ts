import type { PrismaClient } from '@prisma/client'

export interface ReferralRow {
  id: string
  referredFor: string
  category: string | null
  matter: string
  region: string | null
  contact: string | null
  referrer: string | null
  referrerContact: string | null
  contactConsented: boolean
  status: string
  createdAt: Date
}

export interface CreateReferralInput {
  referredFor: string
  category?: string | null
  matter: string
  region?: string | null
  contact?: string | null
  referrer?: string | null
  referrerContact?: string | null
  contactConsented?: boolean
}

/** Create a referral. `contact` is only stored when the person consented. */
export async function createReferral(db: PrismaClient, input: CreateReferralInput): Promise<ReferralRow> {
  const row = await db.referral.create({
    data: {
      referredFor: input.referredFor.trim(),
      category: (input.category as never) ?? null,
      matter: input.matter.trim(),
      region: input.region?.trim() || null,
      contact: input.contactConsented ? (input.contact?.trim() || null) : null,
      referrer: input.referrer?.trim() || null,
      referrerContact: input.referrerContact?.trim() || null,
      contactConsented: Boolean(input.contactConsented),
    },
  })
  return mapRow(row)
}

export async function listReferrals(db: PrismaClient): Promise<ReferralRow[]> {
  const rows = await db.referral.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(mapRow)
}

export async function updateReferralStatus(
  db: PrismaClient,
  id: string,
  status: 'NEW' | 'CONTACTED' | 'ASSISTED' | 'CLOSED',
): Promise<ReferralRow | null> {
  const row = await db.referral.update({ where: { id }, data: { status } }).catch(() => null)
  return row ? mapRow(row) : null
}

function mapRow(row: {
  id: string
  referredFor: string
  category: string | null
  matter: string
  region: string | null
  contact: string | null
  referrer: string | null
  referrerContact: string | null
  contactConsented: boolean
  status: string
  createdAt: Date
}): ReferralRow {
  return {
    id: row.id,
    referredFor: row.referredFor,
    category: row.category,
    matter: row.matter,
    region: row.region,
    contact: row.contact,
    referrer: row.referrer,
    referrerContact: row.referrerContact,
    contactConsented: row.contactConsented,
    status: row.status,
    createdAt: row.createdAt,
  }
}
