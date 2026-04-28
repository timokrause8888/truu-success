// HeroesLogo — Goldenes truu Heroes-Logo. SVG-Reproduktion eines Tropfens
// mit Tangenten-Geometrie (scharfer Top, kreisrunder Boden) — analog zum
// patron-Logo aus truu-tasks. Inline SVG, damit's mit-skaliert.

export default function HeroesLogo({ size = 60, color = '#b8860b' }) {
  // Tangenten-Geometrie: oben spitz, unten Kreis. Höhe = size, Breite ~0.7×size.
  const w = size * 0.72
  const h = size
  const cx = w / 2
  const r = w * 0.46            // unterer Kreisradius
  const cy = h - r              // Mittelpunkt des Kreises
  const tipY = 0                // Spitze ganz oben
  // Tangentenpunkte am Kreis, von denen aus geraden Linien zur Spitze gehen
  const dx = Math.sqrt(cy * cy - r * r) * (r / cy)
  const dy = (r * r) / cy
  const tx = cx - dx
  const ty = cy - dy
  const txR = cx + dx
  return (
    <svg width={size * 0.9} height={size} viewBox={`0 0 ${w} ${h}`}
         xmlns="http://www.w3.org/2000/svg" aria-label="truu heroes">
      <defs>
        <linearGradient id="heroes-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8c660" />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor="#7a5800" />
        </linearGradient>
      </defs>
      <path
        d={`M ${cx} ${tipY}
            L ${tx} ${ty}
            A ${r} ${r} 0 1 0 ${txR} ${ty}
            Z`}
        fill="url(#heroes-grad)"
        stroke="#7a5800"
        strokeWidth="1"
      />
      {/* "h" für Heroes — schlank, weiß */}
      <text
        x={cx}
        y={cy + r * 0.4}
        textAnchor="middle"
        fontFamily="Roboto, sans-serif"
        fontWeight="900"
        fontSize={r * 1.4}
        fill="#fff"
        style={{ letterSpacing: '-0.02em' }}
      >h</text>
    </svg>
  )
}
