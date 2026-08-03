import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEST_DB_URL } from '@pil/testkit'

const here = path.dirname(fileURLToPath(import.meta.url))
const schema = path.resolve(here, '../prisma/schema.prisma')

export default function globalSetup(): void {
  execSync(`npx prisma migrate deploy --schema "${schema}"`, {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'pipe',
  })
}
