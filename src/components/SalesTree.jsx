// SalesTree — Visualisiert den 8-Verkaufs-Baum. Hero (Du) oben mit
// Krone, 6 Direktkunden in Reihe 1, Sub-Empfehlung Kunde 1.1 in Reihe 2,
// Sub-Sub Kunde 1.1.1 in Reihe 3.
//
// Visuelle Regeln (mit User abgestimmt):
//   • Direkte Linien (adjacent in der Sponsor-Kette) zeigen NUR den
//     success bonus (= Empfehler- oder Differenzprovision), nicht den
//     Gesamtverdienst. Andere Komponenten (Station, Consultant, Expert)
//     stehen rechts im Earnings-Panel.
//   • Bei Empfehlungen aus Reihe 2/3 wird die Linie zum Hero NICHT
//     senkrecht durch die Zwischen-Männchen geführt, sondern als
//     geschwungene Kurve außen herum.
//   • Wird ein Empfehler in der Kette übersprungen, weil er auf gleicher
//     Stufe wie sein Downline steht (z.B. Kunde 1 in Sale 8 — beide
//     navigator), zeigen wir trotzdem ein '0 €'-Label an seiner Position
//     als Lerneffekt.

import { useMemo } from 'react'
import { commissionLines } from '../lib/successPlan'
import { buildHeroes } from '../lib/scenario'
import { t } from '../lib/i18n'

// ─── Layout ────────────────────────────────────────────────────────
const W = 760
const H = 640
const HERO_X = W / 2
const HERO_Y = 70
const ROW1_Y = 220
const ROW2_Y = 360
const ROW3_Y = 480
const ROW4_Y = 580
const FIG_R  = 18

function positions() {
  // 6 Direktkunden gleichmäßig in Reihe 1
  const cols = ['cust1', 'cust2', 'cust3', 'cust4', 'cust6', 'cust7']
  const startX = 75, endX = W - 75
  const step = (endX - startX) / (cols.length - 1)
  const dir = {}
  cols.forEach((id, i) => { dir[id] = { x: startX + i * step, y: ROW1_Y } })
  return {
    hero:   { x: HERO_X, y: HERO_Y },
    ...dir,
    // Reihe 2: Sub-Empfehlungen unter ihren jeweiligen Sponsoren
    cust5:  { x: dir.cust1.x, y: ROW2_Y },   // 1.1
    cust9:  { x: dir.cust2.x, y: ROW2_Y },   // 2.1
    cust10: { x: dir.cust3.x, y: ROW2_Y },   // 3.1
    cust12: { x: dir.cust7.x, y: ROW2_Y },   // 6.1 (unter Direkt-Kunde "6" = cust7)
    // Reihe 3: Sub-Sub-Empfehlungen
    cust8:  { x: dir.cust1.x, y: ROW3_Y },   // 1.1.1
    cust11: { x: dir.cust2.x, y: ROW3_Y },   // 2.1.1
    // Reihe 4
    cust13: { x: dir.cust1.x, y: ROW4_Y },   // 1.1.1.1
  }
}

// ─── Strichmännchen (kleiner als zuvor, mit Label im Kopf) ────────
function StickFigure({ x, y, label, isActive, isHero, onClick }) {
  const fill = isHero
    ? 'url(#fig-gold)'
    : isActive ? '#43a047' : '#bcbcbc'
  const ringColor = isActive ? '#2e7d32' : (isHero ? '#7a5800' : '#888')
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      transform={`translate(${x},${y})`}
    >
      {isActive && (
        <circle r={FIG_R + 6} fill="none" stroke="#43a047" strokeWidth="2" opacity="0.5">
          <animate attributeName="r" from={FIG_R + 4} to={FIG_R + 12} dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Kopf */}
      <circle r={FIG_R} fill={fill} stroke={ringColor} strokeWidth="2" />
      {/* Body */}
      <line x1="0" y1={FIG_R} x2="0" y2={FIG_R + 28} stroke={ringColor} strokeWidth="3" />
      <line x1="0" y1={FIG_R + 8} x2="-14" y2={FIG_R + 2} stroke={ringColor} strokeWidth="3" />
      <line x1="0" y1={FIG_R + 8} x2="14" y2={FIG_R + 2} stroke={ringColor} strokeWidth="3" />
      <line x1="0" y1={FIG_R + 28} x2="-11" y2={FIG_R + 48} stroke={ringColor} strokeWidth="3" />
      <line x1="0" y1={FIG_R + 28} x2="11" y2={FIG_R + 48} stroke={ringColor} strokeWidth="3" />
      {/* Krone für Hero */}
      {isHero && (
        <g transform={`translate(0, ${-FIG_R - 5})`}>
          <path d="M -13 0 L -8 -8 L -4 -3 L 0 -10 L 4 -3 L 8 -8 L 13 0 Z"
                fill="#f5d061" stroke="#7a5800" strokeWidth="1" />
        </g>
      )}
      {/* Label IM Kopf — kleinere Männchen, Text geht in den Kopf */}
      <text textAnchor="middle" y={5}
            fontSize={isHero ? 11 : 10} fontWeight="800"
            fill={isHero ? '#fff' : '#fff'}
            fontFamily="Roboto, sans-serif"
            style={{ pointerEvents: 'none' }}>
        {label}
      </text>
    </g>
  )
}

// ─── Geschwungener SVG-Pfad — geht außen ums Cluster herum ──────
// Für Empfehlungen aus Reihe 2 oder 3 zum Hero: nicht durch die
// Zwischen-Männchen, sondern als sanfte Bezier-Kurve nach außen.
// Side: 'left' oder 'right' (auto = gegen die Mitte).
function curvedPathD(sx, sy, ex, ey) {
  // Bias: wenn Start-X links der Mitte → Kurve geht nach links raus,
  //       sonst nach rechts.
  const dir = sx < W / 2 ? -1 : 1
  const offset = 160 * dir
  const cx1 = sx + offset
  const cy1 = sy
  const cx2 = ex + offset
  const cy2 = ey
  return `M ${sx},${sy} C ${cx1},${cy1} ${cx2},${cy2} ${ex},${ey}`
}

// Punkt entlang der Kurve bei t=0.5 — für Label-Position
function curvedPathMidpoint(sx, sy, ex, ey) {
  const dir = sx < W / 2 ? -1 : 1
  const offset = 160 * dir
  const cx1 = sx + offset, cy1 = sy
  const cx2 = ex + offset, cy2 = ey
  // Cubic Bezier point at t=0.5
  const t = 0.5, omt = 1 - t
  const x = omt*omt*omt*sx + 3*omt*omt*t*cx1 + 3*omt*t*t*cx2 + t*t*t*ex
  const y = omt*omt*omt*sy + 3*omt*omt*t*cy1 + 3*omt*t*t*cy2 + t*t*t*ey
  return { x, y }
}

export default function SalesTree({ heroLevelKey, sales, activeSale, market, locale, onSelectSale }) {
  const pos = positions()
  const showAll = activeSale > sales.length
  const totalSales = sales.length

  // Heroes-Layout fürs Tree-Drawing — wir nehmen den Stand BEIM aktuell
  // gewählten Verkauf, damit z.B. das aktive Männchen die richtige Stufe
  // hat (für Tooltip/Kontext). Im All-Mode zeigen wir den Endstand.
  const heroesAtSale = useMemo(() => {
    const n = showAll ? totalSales : activeSale
    return buildHeroes(heroLevelKey, n)
  }, [heroLevelKey, activeSale, showAll, totalSales])

  // Aktive Verkäufe (Single oder All-Mode)
  const activeSales = useMemo(() => {
    if (showAll) return sales
    return sales.filter(s => s.n === activeSale)
  }, [sales, activeSale, showAll])

  // Provisionslinien für die aktiven Verkäufe — pro Verkauf den Hero-Stand
  // im Moment dieses Verkaufs verwenden.
  const provisionsBySale = useMemo(() => {
    return activeSales.map(sale => {
      const heroesNow = buildHeroes(heroLevelKey, sale.n)
      const lines = commissionLines(sale, heroesNow, market, { includeZeroLines: true })
      // Filter: nur success-Linien sind für Tree-Visualisierung relevant;
      // Station/Consultant/Expert flossen an den Hero (oder andere) und
      // erscheinen rechts im Earnings-Panel.
      const successLines = lines.filter(l => l.kind === 'success')
      return { sale, heroesNow, successLines }
    })
  }, [activeSales, heroLevelKey, market])

  // Sponsor-Hierarchie-Linien (immer dezent sichtbar, gestrichelt)
  const sponsorLines = [
    // Reihe 1 → Hero
    { from: 'cust1', to: 'hero' }, { from: 'cust2', to: 'hero' },
    { from: 'cust3', to: 'hero' }, { from: 'cust4', to: 'hero' },
    { from: 'cust6', to: 'hero' }, { from: 'cust7', to: 'hero' },
    // Reihe 2 → Reihe 1
    { from: 'cust5',  to: 'cust1' },
    { from: 'cust9',  to: 'cust2' },
    { from: 'cust10', to: 'cust3' },
    { from: 'cust12', to: 'cust7' },
    // Reihe 3 → Reihe 2
    { from: 'cust8',  to: 'cust5' },
    { from: 'cust11', to: 'cust9' },
    // Reihe 4 → Reihe 3
    { from: 'cust13', to: 'cust8' },
  ]

  function FigureFor(id) {
    const hero = heroesAtSale.find(h => h.id === id)
    if (!hero) return null
    const p = pos[id]
    if (!p) return null
    const isActiveCustomer = activeSales.some(s => s.customerId === id)
    const isHero = id === 'hero'
    const label = hero.label
    return (
      <StickFigure
        key={id}
        x={p.x} y={p.y}
        label={label}
        isActive={isActiveCustomer}
        isHero={isHero}
        onClick={() => {
          if (isHero) return
          const sale = sales.find(s => s.customerId === id)
          if (sale) onSelectSale(sale.n)
        }}
      />
    )
  }

  // ─── Provisions-Pfad-Rendering ────────────────────────────────
  // Für jeden Sale: laufe die Sponsor-Kette vom directSeller aufwärts.
  // Adjacent-Segmente (directSeller→Sponsor, dann Sponsor→Sponsor.Sponsor)
  // werden als gerade Linie gezeichnet, jeweils mit dem Differenzprov.
  // Beträge ≥ 2 Tier-Sprünge zum Hero: geschwungene Kurve außen vorbei.
  const provisionVisuals = useMemo(() => {
    const visuals = []   // {kind: 'segment'|'curve'|'zero', sx,sy,ex,ey, amount, key, saleN}
    provisionsBySale.forEach(({ sale, heroesNow, successLines }, sIx) => {
      // Map: recipientId → success amount (auch 0)
      const byRecipient = new Map(successLines.map(l => [l.recipient, l.amount]))
      // Sponsor-Kette vom directSeller bis ganz nach oben
      const chain = []
      let curId = sale.directSellerId
      while (curId) {
        chain.push(curId)
        const h = heroesNow.find(x => x.id === curId)
        if (!h) break
        curId = h.sponsorId
      }
      // chain[0] = directSeller, chain[N-1] = Hero (hopefully)

      // Bought-Customer-Position als Start für die ersten Segmente
      const boughtId = sale.customerId
      const boughtP = pos[boughtId]

      // Segment 1: bought → directSeller (immer adjacent, gerade Linie)
      const ds = chain[0]
      const dsP = pos[ds]
      if (boughtP && dsP) {
        const amount = byRecipient.get(ds) || 0
        visuals.push({
          kind: 'segment', key: `${sale.n}-bought-ds`, saleN: sale.n,
          sx: boughtP.x, sy: boughtP.y - FIG_R,
          ex: dsP.x, ey: dsP.y + FIG_R + 50,
          amount,
          isZero: amount === 0,
        })
      }

      // Weitere Sponsor-Segmente — wenn mehr als 1 Tier in der Kette
      // ABOVE directSeller: für jedes Glied entweder gerade Linie (wenn
      // das Glied Provision bekommt) oder Zero-Marker (wenn 0).
      // Hero (= chain[last]) bekommt die geschwungene Kurve, falls er
      // nicht direkt über directSeller hängt.
      for (let i = 1; i < chain.length; i++) {
        const upperId = chain[i]
        const lowerId = chain[i - 1]
        const upperP = pos[upperId]
        const lowerP = pos[lowerId]
        if (!upperP || !lowerP) continue
        const amount = byRecipient.get(upperId) || 0
        const isHero = upperId === 'hero'
        const isAdjacentToHero = isHero && i === 1
        if (isHero && !isAdjacentToHero) {
          // Hero ist mehrere Tiers entfernt → Kurve direkt vom bought-
          // Customer außen herum zum Hero.
          visuals.push({
            kind: 'curve', key: `${sale.n}-curve-hero`, saleN: sale.n,
            sx: boughtP.x, sy: boughtP.y - FIG_R - 5,
            ex: upperP.x, ey: upperP.y + FIG_R + 50,
            amount,
          })
        } else {
          // Adjacent-Segment vom unteren Männchen zum oberen
          visuals.push({
            kind: 'segment', key: `${sale.n}-${lowerId}-${upperId}`, saleN: sale.n,
            sx: lowerP.x, sy: lowerP.y - FIG_R,
            ex: upperP.x, ey: upperP.y + FIG_R + 50,
            amount,
            isZero: amount === 0,
          })
        }
      }
      void sIx
    })
    return visuals
  }, [provisionsBySale])

  return (
    <div className="sales-tree-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="sales-tree-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="fig-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d061" />
            <stop offset="60%" stopColor="#b8860b" />
            <stop offset="100%" stopColor="#7a5800" />
          </linearGradient>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2e7d32" />
          </marker>
          <marker id="arrow-zero" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#999" />
          </marker>
        </defs>

        {/* Sponsor-Hierarchie (immer sichtbar, gestrichelt) */}
        {sponsorLines.map((l, i) => {
          const a = pos[l.from], b = pos[l.to]
          if (!a || !b) return null
          return (
            <line key={`sp-${i}`}
              x1={a.x} y1={a.y - FIG_R} x2={b.x} y2={b.y + FIG_R + 50}
              stroke="#dcdcdc" strokeWidth="1.5" strokeDasharray="3 4" />
          )
        })}

        {/* Provisions-Pfade — Curves zuerst (damit Segmente drüber) */}
        {provisionVisuals.filter(v => v.kind === 'curve').map(v => {
          const fmtAmount = `+${v.amount.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')} ${market === 'ch' ? 'CHF' : '€'}`
          const mid = curvedPathMidpoint(v.sx, v.sy, v.ex, v.ey)
          return (
            <g key={v.key}>
              <path d={curvedPathD(v.sx, v.sy, v.ex, v.ey)}
                    fill="none" stroke="#43a047" strokeWidth="2.5"
                    markerEnd="url(#arrow-active)" opacity="0.85" />
              <g transform={`translate(${mid.x},${mid.y})`}>
                <rect x="-50" y="-12" width="100" height="24" rx="12"
                      fill="#fff" stroke="#43a047" strokeWidth="1.5" />
                <text x="0" y="5" textAnchor="middle"
                      fontSize="12" fontWeight="700" fill="#1b5e20">
                  {fmtAmount}
                </text>
              </g>
            </g>
          )
        })}

        {/* Adjacent-Segmente */}
        {provisionVisuals.filter(v => v.kind === 'segment').map(v => {
          const labelX = (v.sx + v.ex) / 2
          const labelY = (v.sy + v.ey) / 2
          if (v.isZero) {
            return (
              <g key={v.key}>
                <line x1={v.sx} y1={v.sy} x2={v.ex} y2={v.ey}
                      stroke="#bbb" strokeWidth="2" strokeDasharray="5 4"
                      markerEnd="url(#arrow-zero)" />
                <g transform={`translate(${labelX},${labelY})`}>
                  <rect x="-26" y="-11" width="52" height="22" rx="11"
                        fill="#f5f5f5" stroke="#bbb" strokeWidth="1" />
                  <text x="0" y="4" textAnchor="middle"
                        fontSize="11" fontWeight="700" fill="#888">
                    0 {market === 'ch' ? 'CHF' : '€'}
                  </text>
                </g>
              </g>
            )
          }
          const fmtAmount = `+${v.amount.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')} ${market === 'ch' ? 'CHF' : '€'}`
          return (
            <g key={v.key}>
              <line x1={v.sx} y1={v.sy} x2={v.ex} y2={v.ey}
                    stroke="#43a047" strokeWidth="2.5"
                    markerEnd="url(#arrow-active)" opacity="0.9" />
              <g transform={`translate(${labelX},${labelY})`}>
                <rect x="-44" y="-11" width="88" height="22" rx="11"
                      fill="#fff" stroke="#43a047" strokeWidth="1.5" />
                <text x="0" y="4" textAnchor="middle"
                      fontSize="12" fontWeight="700" fill="#1b5e20">
                  {fmtAmount}
                </text>
              </g>
            </g>
          )
        })}

        {/* Männchen-Layer — über die Linien */}
        {Object.keys(pos).map(id => FigureFor(id))}
      </svg>
      {void t /* keep import in case needed later */}
    </div>
  )
}
