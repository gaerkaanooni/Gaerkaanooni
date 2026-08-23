/**
 * A compact trust strip shown beside/above the contribution decision. Reduces
 * donor hesitation at the point of action by restating the platform's core
 * guarantees — no hidden fees, refund if the goal is missed, and a public ledger.
 */
export default function TrustStrip() {
  const items = [
    { icon: '₹', label: '5% flat, never on top' },
    { icon: '↺', label: 'Refunded if the goal is missed' },
    { icon: '▤', label: 'Public ledger for every rupee' },
  ]
  return (
    <ul className="trust-strip" aria-label="How your pledge is protected">
      {items.map((it) => (
        <li key={it.label} className="trust-item">
          <span className="trust-icon" aria-hidden="true">
            {it.icon}
          </span>
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  )
}
