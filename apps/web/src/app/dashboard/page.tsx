import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canPerform, type Role } from '@pil/domain'
import { getCaseList, getFinancialSummary, getVolunteerDirectory, prisma } from '@pil/db'
import CaseTable from '@/components/CaseTable'
import VolunteerDirectory from '@/components/VolunteerDirectory'
import FinancialSummaryCard from '@/components/FinancialSummaryCard'
import DashboardKpis, { type StageCounts } from '@/components/DashboardKpis'
import ReferralsList from '@/components/ReferralsList'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user || !canPerform(session.user.role as Role, 'dashboard.view')) {
    redirect('/login')
  }

  const [cases, volunteers, finances, stageGroups] = await Promise.all([
    getCaseList(prisma),
    getVolunteerDirectory(prisma),
    getFinancialSummary(prisma),
    prisma.case.groupBy({ by: ['stage'], _count: { _all: true } }),
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
      <section aria-label="Cases">
        <h2>Cases</h2>
        <CaseTable rows={cases} />
      </section>
      <section aria-label="Volunteers">
        <h2>Volunteers</h2>
        <VolunteerDirectory volunteers={volunteers} />
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
