import type { CaseListRow } from '@pil/db'
import { formatRupees } from '@/lib/money'

export default function CaseTable({ rows }: { rows: CaseListRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Stage</th>
            <th>Raised</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.title}</td>
              <td>
                <span className={`stage stage-${row.stage.toLowerCase()}`}>{row.stage}</span>
              </td>
              <td>
                {formatRupees(row.raisedPaise)} of {formatRupees(row.goalAmountPaise)}
              </td>
              <td className="flags">
                <a href={`/dashboard/cases/${row.id}`} className="flag">
                  Documents
                </a>
                {row.overdueUpdate && <span className="flag">Update overdue</span>}
                {row.staleStage && <span className="flag">Stale stage</span>}
                {row.needsSignoff && <span className="flag flag-signoff">Needs sign-off</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
