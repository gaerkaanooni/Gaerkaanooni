/**
 * Promote a user to a staff role on whatever DATABASE_URL points at (local or hosted).
 *
 * Usage:
 *   DATABASE_URL="<hosted>" npx tsx scripts/promote-staff.ts <email> <role>
 *
 * Roles: ADMIN | LAWYER | INTERN | BACKER | PUBLIC
 *
 * On a hosted DB this lets you create your first staff account after deploying:
 *   1) register/seed the user, then
 *   2) promote them here (needs its own DB connection via DATABASE_URL + the
 *      local node modules; run it from your machine or a one-off job).
 */
import { prisma, setRole } from '@pil/db'

const [, , rawEmail, rawRole] = process.argv
const email = (rawEmail ?? '').trim().toLowerCase()
const role = (rawRole ?? '').trim().toUpperCase() as 'ADMIN' | 'LAWYER' | 'INTERN' | 'BACKER' | 'PUBLIC'

const VALID = ['ADMIN', 'LAWYER', 'INTERN', 'BACKER', 'PUBLIC']

async function main() {
  if (!email || !role || !VALID.includes(role)) {
    console.error('Usage: DATABASE_URL=... npx tsx scripts/promote-staff.ts <email> <role>')
    console.error('Valid roles: ' + VALID.join(', '))
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (!existing) {
    console.error(`No user with email "${email}". Register them first (or the deployed app registers on login).`)
    process.exit(1)
  }

  const updated = await setRole(prisma, { userId: existing.id, role, actorId: 'admin-script' })
  console.log(`Promoted ${updated.email} to ${updated.role}.`)
  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
