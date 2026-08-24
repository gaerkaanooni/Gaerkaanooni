import { NextResponse } from 'next/server'
import { prisma } from '@pil/db'

/**
 * TEMPORARY one-shot ops endpoint: applies the volunteer-side migration SQL
 * (LawyerApplication + AssignmentRequest) for environments where the CLI
 * cannot reach the database directly. Guarded by a shared token in
 * MIGRATION_TOKEN; returns 404 when the token is not configured. This file is
 * removed immediately after the one-time use.
 */

const SQL = [
  // 20260823222817_add_lawyer_applications
  `DO $$ BEGIN
     CREATE TYPE "LawyerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "LawyerApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "barCouncilId" TEXT NOT NULL,
    "yearsPractice" INTEGER NOT NULL,
    "skills" TEXT[],
    "region" TEXT,
    "capacityLimit" INTEGER NOT NULL DEFAULT 2,
    "motivation" TEXT,
    "status" "LawyerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "decisionReason" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LawyerApplication_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LawyerApplication_email_key" ON "LawyerApplication"("email");`,
  `CREATE INDEX IF NOT EXISTS "LawyerApplication_status_createdAt_idx" ON "LawyerApplication"("status", "createdAt");`,
  // 20260823223546_add_assignment_requests
  `DO $$ BEGIN
     CREATE TYPE "AssignmentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');
   EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `CREATE TABLE IF NOT EXISTS "AssignmentRequest" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "status" "AssignmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "decisionReason" TEXT,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssignmentRequest_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "AssignmentRequest_status_createdAt_idx" ON "AssignmentRequest"("status", "createdAt");`,
  `CREATE INDEX IF NOT EXISTS "AssignmentRequest_volunteerId_idx" ON "AssignmentRequest"("volunteerId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentRequest_caseId_volunteerId_key" ON "AssignmentRequest"("caseId", "volunteerId");`,
  `DO $$ BEGIN
     ALTER TABLE "AssignmentRequest" ADD CONSTRAINT "AssignmentRequest_caseId_fkey"
       FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;`,
  `DO $$ BEGIN
     ALTER TABLE "AssignmentRequest" ADD CONSTRAINT "AssignmentRequest_volunteerId_fkey"
       FOREIGN KEY ("volunteerId") REFERENCES "Volunteer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
   EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;`,
]

export async function POST(request: Request) {
  const expected = process.env.MIGRATION_TOKEN
  if (!expected) return new NextResponse('Not found', { status: 404 })
  const provided = request.headers.get('x-ops-token') ?? ''
  if (provided !== expected) return new NextResponse('Not found', { status: 404 })

  try {
    for (const statement of SQL) {
      await prisma.$executeRawUnsafe(statement)
    }
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('LawyerApplication', 'AssignmentRequest')
      ORDER BY table_name`

    // Mark the two migrations as applied so `prisma migrate deploy` skips them.
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "logs", "started_at", "finished_at", "applied_steps_count")
      SELECT gen_random_uuid()::text, 'n/a', m.name, 'applied via ops endpoint', now(), now(), 1
      FROM (VALUES ('20260823222817_add_lawyer_applications'), ('20260823223546_add_assignment_requests')) AS m(name)
      WHERE NOT EXISTS (
        SELECT 1 FROM "_prisma_migrations" p
        WHERE p.migration_name = m.name AND p.finished_at IS NOT NULL AND p.rolled_back_at IS NULL
      )`)
    const marked = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE migration_name IN ('20260823222817_add_lawyer_applications', '20260823223546_add_assignment_requests')`

    return NextResponse.json({ ok: true, applied: SQL.length, tables, marked })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'migration failed' },
      { status: 500 },
    )
  }
}
