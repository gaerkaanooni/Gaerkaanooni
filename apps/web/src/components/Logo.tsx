/**
 * Brand mark — "The Tilted Balance".
 *
 * A scales-of-justice shown under deliberate tilt: one pan bearing weight, the
 * beam off-level but the column holding upright. It says exactly what the product
 * promises — the state acts gaerkaanooni (unlawfully); we answer with the law,
 * and we do not fall over under the pressure. The tilt is the thesis.
 */
export default function Logo({
  size = 28,
  tone = 'seal',
}: {
  size?: number
  tone?: 'seal' | 'ink'
}) {
  const mark = tone === 'ink' ? '#211b10' : '#b3201c'
  const foil = tone === 'ink' ? '#211b10' : '#f3ecdc'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Gaerkaanooni"
      focusable="false"
    >
      {tone === 'seal' && <rect width="64" height="64" rx="13" fill="#b3201c" />}
      {tone === 'seal' && (
        <rect
          width="62"
          height="62"
          x="1"
          y="1"
          rx="12"
          fill="none"
          stroke="#f3ecdc"
          strokeOpacity="0.32"
          strokeWidth="1.5"
        />
      )}
      <rect x="30.6" y="14" width="2.8" height="34" rx="1.4" fill={tone === 'seal' ? '#f3ecdc' : mark} />
      <path d="M26 50 h12 l-2.4 -4 h-7.2 z" fill={tone === 'seal' ? '#f3ecdc' : mark} fillOpacity="0.9" />
      <line
        x1="14"
        y1="20"
        x2="50"
        y2="34"
        stroke={tone === 'seal' ? foil : mark}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="14"
        y1="20"
        x2="14"
        y2="28"
        stroke={tone === 'seal' ? foil : mark}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 30 q 8 10 16 0"
        stroke={tone === 'seal' ? foil : mark}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="34"
        x2="50"
        y2="42"
        stroke={tone === 'seal' ? foil : mark}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M42 44 q 8 10 16 0"
        stroke={tone === 'seal' ? foil : mark}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="14" cy="20" r="2" fill={tone === 'seal' ? '#f3ecdc' : mark} />
      <circle cx="50" cy="34" r="2" fill={tone === 'seal' ? '#f3ecdc' : mark} />
    </svg>
  )
}
