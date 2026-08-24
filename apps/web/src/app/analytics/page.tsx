import { redirect } from 'next/navigation'

/**
 * Analytics merged into the operations dashboard (admin section).
 * This path now hands off; the dashboard's own guard enforces roles.
 */
export default function AnalyticsPage() {
  redirect('/dashboard#analytics')
}
