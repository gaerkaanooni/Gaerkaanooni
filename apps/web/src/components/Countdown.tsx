const DAY_MS = 24 * 60 * 60 * 1000

export default function Countdown({ deadlineAt, now = new Date() }: { deadlineAt: Date; now?: Date }) {
  const diff = deadlineAt.getTime() - now.getTime()
  let label: string
  if (diff <= 0) label = 'Ended'
  else if (diff < DAY_MS) label = 'Ends today'
  else {
    const daysLeft = Math.ceil(diff / DAY_MS)
    if (daysLeft === 1) label = '1 day left'
    else if (daysLeft < 30) label = `${daysLeft} days left`
    else label = `${Math.ceil(daysLeft / 7)} weeks left`
  }
  return <span aria-live="polite">{label}</span>
}
