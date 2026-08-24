import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/auth-session'
import { canPerform, type Role } from '@pil/domain'
import { getAnalytics, getCaseList, getFinancialSummary, getVolunteerDirectory, prisma } from '@pil/db'
import CaseTable from '@/components/CaseTable'
import VolunteerDirectory from '@/components/VolunteerDirectory'
import FinancialSummaryCard from '@/components/FinancialSummaryCard'
import DashboardKpis, { type StageCounts } from '@/components/DashboardKpis'
import ReferralsList from '@/components/ReferralsList'
import LawyerApplicationsQueue from '@/components/LawyerApplicationsQueue'
import VolunteerRequestsQueue from '@/components/VolunteerRequestsQueue'
import AnalyticsPanel from '@/components/AnalyticsPanel'

export const dynamic = 'force-dynamic'

/**
 * The single ops console: KPIs, finances, cases, volunteers, intake queues —
 * and, for admins, the analytics readout (previously a separate /analytics
 * page). One page, one scroll, everything staff need day to day.
 */
export default async function DashboardPage() {
  const session = await getStaffSession()
  if (!session || !canPerform(session.role as Role, 'dashboard.view')) {
    redirect('/login/staff')
  }
  const isAdmin = canPerform(session.role as Role, 'finance.view')

  const [cases, volunteers, finances, stageGroups, analytics] = await Promise.all([
    getCaseList(prisma),
    getVolunteerDirectory(prisma),
    getFinancialSummary(prisma),
    prisma.case.groupBy({ by: ['stage'], _count: { _all: true } }),
    isAdmin ? getAnalytics(prisma) : Promise.resolve(null),
  ])

  const countFor = (stage: string) =>
    stageGroups.find((g) => g.stage === stage)?._count._all ?? 0
  const stages: StageCounts = {
    submitted: countFor('SUBMITTED'),
    live: countFor('LIVE'),
    funded: countFor('FUNDED'),
    resolved: countFor('RESOLVED'),
  }

  return (
    <main>
      <h1>Operations dashboard</h1>
      <DashboardKpis finance={finances} stages={stages} />
      <section aria-label="Finances">
        <h2>Finances</h2>
        <FinancialSummaryCard summary={finances} />
      </section>
      {analytics && (
        <section aria-label="Analytics" id="analytics">
          <h2>Analytics</h2>
          <p className="section-lede">
            Platform-wide readout for admins: pipeline totals, money, conversion and weekly activity.
          </p>
          <AnalyticsPanel analytics={analytics} />
        </section>
      )}
      <section aria-label="Cases">
        <h2>Cases</h2>
        <CaseTable rows={cases} />
      </section>
      <section aria-label="Volunteers">
        <h2>Volunteers</h2>
        <VolunteerDirectory volunteers={volunteers} />
      </section>
      <section aria-label="Lawyer applications">
        <h2>Lawyer applications</h2>
        <p className="section-lede">
          Practising lawyers asking to join the volunteer panel. Approval provisions their account
          and panel profile.
        </p>
        <LawyerApplicationsQueue />
      </section>
      <section aria-label="Offers of help">
        <h2>Offers of help</h2>
        <p className="section-lede">
          Volunteers offering to take on a matter. Confirming checks their capacity first — a stale
          offer can never over-commit anyone.
        </p>
        <VolunteerRequestsQueue />
      </section>
      <section aria-label="Referrals">
        <h2>Referrals</h2>
        <p className="section-lede">
          Matters brought forward on someone's behalf. Contact is only shown when the person consented.
        </p>
        <ReferralsList />
      </section>
    </main>
  )
}
