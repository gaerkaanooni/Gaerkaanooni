import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canPerform, type Role } from '@pil/domain'
import { getCaseList, getFinancialSummary, getVolunteerDirectory, prisma } from '@pil/db'
import CaseTable from '@/components/CaseTable'
import VolunteerDirectory from '@/components/VolunteerDirectory'
import FinancialSummaryCard from '@/components/FinancialSummaryCard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user || !canPerform(session.user.role as Role, 'dashboard.view')) {
    redirect('/login')
  }

  const [cases, volunteers, finances] = await Promise.all([
    getCaseList(prisma),
    getVolunteerDirectory(prisma),
    getFinancialSummary(prisma),
  ])

  return (
    <main>
      <h1>Operations dashboard</h1>
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
    </main>
  )
}
