import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canPerform, type Role } from '@pil/domain'
import { prisma } from '@pil/db'
import CaseDocuments from '@/components/CaseDocuments'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function CaseDocumentsPage({ params }: Props) {
  const session = await auth()
  if (!session?.user || !canPerform(session.user.role as Role, 'case.update')) {
    redirect('/dashboard')
  }

  const { id } = await params
  const caseRec = await prisma.case.findUnique({
    where: { id },
    select: { id: true, title: true, stage: true },
  })
  if (!caseRec) redirect('/dashboard')

  return (
    <main className="narrow">
      <p className="detail-category reveal">Staff · case documents</p>
      <h1>{caseRec.title}</h1>
      <p className="lede">
        Confidential filings for this matter (petitions, orders, vouchers). Files live in private
        storage; only signed-in staff can list or download them.
      </p>
      <CaseDocuments caseId={caseRec.id} />
      <p style={{ marginTop: 24 }}>
        <a href="/dashboard" className="link">
          ← Back to dashboard
        </a>
      </p>
    </main>
  )
}
