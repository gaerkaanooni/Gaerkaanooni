import { PrismaClient } from '@prisma/client'

export const TEST_DB_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://anmoldureha@localhost:5432/pil_promax_test'

export function getTestDb(): PrismaClient {
  process.env.DATABASE_URL = TEST_DB_URL
  return new PrismaClient()
}

export async function resetDb(db: PrismaClient): Promise<void> {
  const tables = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `
  for (const { tablename } of tables) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE`)
  }
}
