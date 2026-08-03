import type { VolunteerRow } from '@pil/db'

export default function VolunteerDirectory({ volunteers }: { volunteers: VolunteerRow[] }) {
  return (
    <ul>
      {volunteers.map((v) => (
        <li key={v.volunteerId}>
          <strong>{v.name}</strong> · {v.role} · {v.availability} · {v.region ?? 'Any region'}
          <span>{`${v.activeAssignments} / ${v.capacityLimit} active`}</span>
          <span>{`${v.hoursContributed} hrs`}</span>
        </li>
      ))}
    </ul>
  )
}
