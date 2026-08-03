import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const schema = path.resolve(here, '../../../packages/db/prisma/schema.prisma')
const dbUrl = process.env.DATABASE_URL_TEST ?? 'postgresql://anmoldureha@localhost:5432/pil_promax_test'

export default async function globalSetup(): Promise<void> {
  execSync(`npx prisma migrate deploy --schema "${schema}"`, {
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'pipe',
  })

  const db = new PrismaClient({ datasourceUrl: dbUrl })
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `
  for (const { tablename } of tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`)
  }

  const hash = await bcrypt.hash('staff-pass-123', 10)
  await db.user.upsert({
    where: { email: 'staff@example.com' },
    update: {},
    create: { email: 'staff@example.com', name: 'E2E Staff', passwordHash: hash, role: 'LAWYER' },
  })
  await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', name: 'E2E Admin', passwordHash: hash, role: 'ADMIN' },
  })
  await db.$disconnect()
}
