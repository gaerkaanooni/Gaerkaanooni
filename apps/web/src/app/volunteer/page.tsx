import Link from 'next/link'
import { getEngagementBoard, getLawyerApplicationByEmail, getVolunteerForEmail, prisma } from '@pil/db'
import { getPublicUser } from '@/lib/public-auth'
import LawyerApplicationForm from '@/components/LawyerApplicationForm'
import VolunteerWorkspace from '@/components/VolunteerWorkspace'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Volunteer as a lawyer — Gaerkaanooni',
}

/**
 * The volunteer-lawyer side. One URL, four states:
 *   signed out        → what joining means + sign-in CTA
 *   no application    → the application form
 *   application under review / previously rejected → status panel (+ re-apply)
 *   approved          → the engagement workspace
 */
export default async function VolunteerPage() {
  const user = await getPublicUser()

  if (!user) {
    return (
      <main className="narrow">
        <p className="detail-category reveal">Pro bono · volunteer panel</p>
        <h1>Lend your licence to someone&apos;s fair hearing</h1>
        <p className="lede">
          Most people who reach us have a lawful claim and no lawyer. Volunteer lawyers screen urgent
          matters, offer counsel on funded campaigns, and log every hour toward pro-bono certificates
          and CSR reports. You set your own capacity — we never assign beyond it.
        </p>
        <ul className="principles">
          <li className="principle">
            <strong>You choose the matters.</strong> See each case before you commit; nothing is
            assigned to you without your offer being confirmed.
          </li>
          <li className="principle">
            <strong>Capacity is a promise we keep.</strong> Set a concurrent-case limit; the platform
            blocks work beyond it.
          </li>
          <li className="principle">
            <strong>Every hour counts.</strong> Logged hours are audited and reported back to you for
            bar pro-bono recognition.
          </li>
        </ul>
        <div className="cta-row">
          <Link className="button" href="/login?intent=volunteer">
            Sign in to apply
          </Link>
          <Link className="ghost" href="/about">
            How the platform works
          </Link>
        </div>
      </main>
    )
  }

  // Signed in — resolve their application by the verified session email.
  let application = null
  try {
    application = await getLawyerApplicationByEmail(prisma, user.email)
  } catch {
    application = null
  }

  if (!application || application.status === 'REJECTED') {
    return (
      <main className="narrow">
        <p className="detail-category reveal">Pro bono · volunteer panel</p>
        <h1>Apply to join the volunteer panel</h1>
        <p className="lede">
          Tell us where you practise and how many matters you can carry at once. The coordinators
          review every application — usually within a few days.
        </p>
        {application?.status === 'REJECTED' && (
          <p role="status" className="gate-note">
            Your previous application was not approved
            {application.decisionReason ? ` — ${application.decisionReason}` : ''}. You are welcome to
            apply again.
          </p>
        )}
        <LawyerApplicationForm defaultName={user.name ?? ''} />
      </main>
    )
  }

  if (application.status === 'PENDING') {
    return (
      <main className="narrow">
        <p className="detail-category reveal">Pro bono · volunteer panel</p>
        <h1>Application received</h1>
        <p className="lede">
          Thank you{application.fullName ? `, ${application.fullName.split(' ')[0]}` : ''}. Your
          application is with the coordinators now. You will see your engagement board here the
          moment it is approved.
        </p>
        <p className="gate-muted">
          Applied on {application.createdAt.toLocaleDateString('en-IN', { dateStyle: 'long' })} ·
          areas: {application.skills.join(', ')}
        </p>
      </main>
    )
  }

  // APPROVED → the engagement workspace.
  const resolved = await getVolunteerForEmail(prisma, user.email)
  if (!resolved) {
    // Approval provisions both rows in one transaction; this is a safety net.
    return (
      <main className="narrow">
        <h1>Your volunteer record is being provisioned</h1>
        <p className="lede">Please refresh in a moment.</p>
      </main>
    )
  }

  const board = await getEngagementBoard(prisma, resolved.profile.volunteerId)
  return (
    <main>
      <VolunteerWorkspace profile={resolved.profile} board={board} />
    </main>
  )
}
