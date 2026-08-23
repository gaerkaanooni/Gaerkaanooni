import { getVolunteerForEmail, type VolunteerProfile } from '@pil/db'
import { prisma } from '@pil/db'
import { getPublicUser } from './public-auth'

/**
 * Server-side resolution of the signed-in volunteer lawyer.
 *
 * The volunteer-lawyer side runs on the PUBLIC auth track (email OTP / Google):
 * the public session email is matched against provisioned `Volunteer` rows.
 * Returns null when there is no public session or the email has not been
 * approved onto the volunteer panel yet.
 */
export async function getCurrentVolunteer(): Promise<VolunteerProfile | null> {
  const user = await getPublicUser()
  if (!user?.email) return null
  const resolved = await getVolunteerForEmail(prisma, user.email)
  return resolved?.profile ?? null
}
