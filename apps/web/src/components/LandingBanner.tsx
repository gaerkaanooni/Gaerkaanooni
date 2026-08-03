const ITEMS = [
  'We the people',
  'जनहित',
  'Public interest litigation, funded by citizens',
  '95% of every contribution reaches the case',
  '100% refunded if a goal is unmet',
  'Article 32 · Article 226',
  'Every hearing, published',
]

export default function LandingBanner() {
  const strip = [...ITEMS, ...ITEMS]
  return (
    <div className="banner" aria-label="How PIL Promax works at a glance">
      <div className="banner-track">
        {strip.map((t, i) => (
          <span className="banner-item" key={i}>
            {t}
            <span aria-hidden="true" className="banner-sep">
              ✳
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
