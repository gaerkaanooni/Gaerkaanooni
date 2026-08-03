import type { PublicCaseUpdate } from '@pil/db'

export default function UpdateFeed({ updates }: { updates: PublicCaseUpdate[] }) {
  if (updates.length === 0) return <p className="muted">No updates yet.</p>
  return (
    <ul className="update-feed">
      {updates.map((u) => (
        <li key={u.id}>
          <h3>{u.title}</h3>
          <time dateTime={u.createdAt.toISOString()}>{u.createdAt.toLocaleDateString('en-IN')}</time>
          <p>{u.body}</p>
        </li>
      ))}
    </ul>
  )
}
