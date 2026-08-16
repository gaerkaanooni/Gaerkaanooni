const ITEMS = [
  "A fair hearing shouldn't depend on what you can afford",
  'जनहित',
  'Legal matters, funded by the public',
  '95% of every contribution reaches the case',
  '100% refunded if a goal is unmet',
  'Article 32 · Article 226',
  'For one person, or a whole community',
]

export default function LandingBanner() {
  const strip = [...ITEMS, ...ITEMS]
  return (
    <div className="banner" aria-label="How Gaerkaanooni works at a glance">
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
