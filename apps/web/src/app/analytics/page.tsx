import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canPerform, type Role } from '@pil/domain'
import { getAnalytics, prisma } from '@pil/db'
import AnalyticsPanel from '@/components/AnalyticsPanel'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user || !canPerform(session.user.role as Role, 'finance.view')) {
    redirect('/login')
  }
  const analytics = await getAnalytics(prisma)

  return (
    <main>
      <h1>Analytics</h1>
      <AnalyticsPanel analytics={analytics} />
    </main>
  )
}
