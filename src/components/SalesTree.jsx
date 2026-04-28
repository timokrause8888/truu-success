// SalesTree — Visualisiert den 13-Verkaufs-Baum mit wählbarem Männchen-
// Stil (stick / drop / avatar / cape).
//
// Visuelle Regeln:
//   • FIG_R = 22 (Mittelwert zwischen ursprünglichen 26 und überarbeiteten 18)
//   • Build-up: am Anfang ist nur der Hero sichtbar; mit jedem Klick
//     erscheint das Verkaufs-Männchen + dessen Provisions-Pfade.
//   • Direkte Linien zeigen NUR den success bonus / die Differenzprovision.
//   • Kurven aus tieferen Reihen gehen mit zwei Cubic-Bezier-Segmenten
//     außen am Cluster vorbei (nicht durch andere Männchen).
//   • Empfehler in der Sponsor-Kette mit gleicher Stufe wie ihr Downline
//     bekommen ein graues '0 €'-Label.

import { useMemo } from 'react'
import { commissionLines } from '../lib/successPlan'
import { buildHeroes } from '../lib/scenario'

// ─── Layout ────────────────────────────────────────────────────────
const W = 760
const H = 660
const HERO_X = W / 2
const HERO_Y = 70
const ROW1_Y = 230
const ROW2_Y = 370
const ROW3_Y = 490
const ROW4_Y = 590
const FIG_R  = 22

function positions() {
  const cols = ['cust1', 'cust2', 'cust3', 'cust4', 'cust6', 'cust7']
  const startX = 80, endX = W - 80
  const step = (endX - startX) / (cols.length - 1)
  const dir = {}
  cols.forEach((id, i) => { dir[id] = { x: startX + i * step, y: ROW1_Y } })
  return {
    hero:   { x: HERO_X, y: HERO_Y },
    ...dir,
    cust5:  { x: dir.cust1.x, y: ROW2_Y },
    cust9:  { x: dir.cust2.x, y: ROW2_Y },
    cust10: { x: dir.cust3.x, y: ROW2_Y },
    cust12: { x: dir.cust7.x, y: ROW2_Y },
    cust8:  { x: dir.cust1.x, y: ROW3_Y },
    cust11: { x: dir.cust2.x, y: ROW3_Y },
    cust13: { x: dir.cust1.x, y: ROW4_Y },
  }
}

/* ─── Figure-Renderer (4 Stile) ───────────────────────────────── */
function StickStyle({ x, y, label, isActive, isHero }) {
  const fill = isHero ? 'url(#fig-gold)' : (isActive ? '#43a047' : '#bcbcbc')
  const ring = isActive ? '#2e7d32' : (isHero ? '#7a5800' : '#888')
  return (
    <g transform={`translate(${x},${y})`}>
      {isHero && (
        <path d="M -16 -28 L -10 -38 L -5 -32 L 0 -42 L 5 -32 L 10 -38 L 16 -28 Z"
              fill="#f5d061" stroke="#7a5800" strokeWidth="1" />
      )}
      <circle r={FIG_R} fill={fill} stroke={ring} strokeWidth="2" />
      <line x1="0" y1={FIG_R} x2="0" y2={FIG_R + 32} stroke={ring} strokeWidth="3" />
      <line x1="0" y1={FIG_R + 9} x2="-16" y2={FIG_R + 2} stroke={ring} strokeWidth="3" />
      <line x1="0" y1={FIG_R + 9} x2="16" y2={FIG_R + 2} stroke={ring} strokeWidth="3" />
      <line x1="0" y1={FIG_R + 32} x2="-12" y2={FIG_R + 54} stroke={ring} strokeWidth="3" />
      <line x1="0" y1={FIG_R + 32} x2="12" y2={FIG_R + 54} stroke={ring} strokeWidth="3" />
      <text textAnchor="middle" y={5} fontSize="12" fontWeight="700"
            fill="#fff" style={{ pointerEvents: 'none' }}>{label}</text>
    </g>
  )
}

function DropStyle({ x, y, label, isActive, isHero }) {
  const fill = isHero ? 'url(#fig-gold)' : (isActive ? '#a5d6a7' : '#d8d8dc')
  const stroke = isActive ? '#2e7d32' : (isHero ? '#7a5800' : '#888')
  // Tropfen: spitz oben, rund unten — Tangenten-Geometrie. Größe an FIG_R.
  const r = FIG_R
  const tipY = -r * 1.8
  return (
    <g transform={`translate(${x},${y})`}>
      {isHero && (
        <path d="M -14 -52 L -8 -62 L -4 -56 L 0 -66 L 4 -56 L 8 -62 L 14 -52 Z"
              fill="#f5d061" stroke="#7a5800" strokeWidth="1" />
      )}
      <path d={`M 0 ${tipY} L ${-r * 0.92} ${-r * 0.4} A ${r} ${r} 0 1 0 ${r * 0.92} ${-r * 0.4} Z`}
            fill={fill} stroke={stroke} strokeWidth="2" />
      <text textAnchor="middle" y={5}
            fontSize={isHero ? 13 : 12} fontWeight="700"
            fill={isHero ? '#fff' : (isActive ? '#1b5e20' : '#555')}
            style={{ pointerEvents: 'none' }}>{label}</text>
    </g>
  )
}

function AvatarStyle({ x, y, label, isActive, isHero }) {
  const fill = isHero ? 'url(#fig-gold)' : (isActive ? '#dcfce7' : '#f4f4f6')
  const stroke = isActive ? '#2e7d32' : (isHero ? '#7a5800' : '#bbb')
  return (
    <g transform={`translate(${x},${y})`}>
      {isHero && <circle r={FIG_R + 5} fill="none" stroke="url(#fig-gold)" strokeWidth="3" />}
      <circle r={FIG_R} fill={fill} stroke={stroke} strokeWidth="1.8" />
      <text textAnchor="middle" y={5}
            fontSize={isHero ? 14 : 13} fontWeight="700"
            fill={isHero ? '#fff' : (isActive ? '#166534' : '#444')}
            style={{ pointerEvents: 'none' }}>{label}</text>
      {isHero && (
        <g transform={`translate(${FIG_R - 4}, ${-FIG_R - 2})`}>
          <circle r="9" fill="#fff" stroke="#7a5800" strokeWidth="1" />
          <path d="M -5 1 L -3 -4 L 0 0 L 3 -5 L 5 0 Z"
                fill="#f5d061" stroke="#7a5800" strokeWidth="0.7" />
        </g>
      )}
    </g>
  )
}

function CapeStyle({ x, y, label, isActive, isHero }) {
  const ring = isActive ? '#2e7d32' : (isHero ? '#7a5800' : '#888')
  const head = isHero ? '#f5d8a8' : (isActive ? '#c8e6c9' : '#e8e8ea')
  const body = isHero ? 'url(#fig-gold-soft)' : (isActive ? '#a5d6a7' : '#f0f0f2')
  return (
    <g transform={`translate(${x},${y})`}>
      {isHero && (
        <path d={`M -${FIG_R + 8} -${FIG_R - 4} Q -${FIG_R + 26} 30 -${FIG_R + 8} 56
                  L ${FIG_R + 8} 56 Q ${FIG_R + 26} 30 ${FIG_R + 8} -${FIG_R - 4}
                  L ${FIG_R + 4} -${FIG_R - 4} Q ${FIG_R + 4} 30 0 42
                  Q -${FIG_R + 4} 30 -${FIG_R + 4} -${FIG_R - 4} Z`}
              fill="url(#fig-gold)" stroke="#7a5800" strokeWidth="1" />
      )}
      {isHero && (
        <path d="M -12 -42 L -7 -50 L -3 -46 L 0 -52 L 3 -46 L 7 -50 L 12 -42 Z"
              fill="#f5d061" stroke="#7a5800" strokeWidth="1" />
      )}
      <circle r={FIG_R - 5} cy={-22} fill={head} stroke={ring} strokeWidth="1.5" />
      <path d={`M -${FIG_R - 4} -${FIG_R - 14} L -${FIG_R - 4} 32 Q -${FIG_R - 4} 38 -${FIG_R - 8} 38
                L ${FIG_R - 8} 38 Q ${FIG_R - 4} 38 ${FIG_R - 4} 32 L ${FIG_R - 4} -${FIG_R - 14} Z`}
            fill={body} stroke={ring} strokeWidth="1.2" />
      <path d="M -8 38 L -10 58 M 8 38 L 10 58" stroke={ring} strokeWidth="3" />
      <text textAnchor="middle" y={20}
            fontSize="11" fontWeight="700"
            fill={isHero ? '#fff' : (isActive ? '#1b5e20' : '#555')}
            style={{ pointerEvents: 'none' }}>{label}</text>
    </g>
  )
}

const FIGURE_STYLES = {
  stick:  StickStyle,
  drop:   DropStyle,
  avatar: AvatarStyle,
  cape:   CapeStyle,
}

function Figure({ style, x, y, label, isActive, isHero, onClick }) {
  const StyleComp = FIGURE_STYLES[style] || StickStyle
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s' }}
    >
      {isActive && (
        <circle cx={x} cy={y} r={FIG_R + 8} fill="none"
                stroke="#43a047" strokeWidth="2" opacity="0.5">
          <animate attributeName="r" from={FIG_R + 6} to={FIG_R + 14} dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}
      <StyleComp x={x} y={y} label={label} isActive={isActive} isHero={isHero} />
    </g>
  )
}

/* ─── Kurven-Pfad: zwei Cubic-Bezier-Segmente, außen am Cluster vorbei ──── */
// Beide Segmente haben Control Points bei outerX → der Pfad bleibt
// sichtbar AUSSERHALB des Männchen-Clusters und kreuzt keine andere
// Figur. Mid-Punkt (für Label) ist (outerX, midY).
function curvedPathD(sx, sy, ex, ey) {
  const dir = sx < W / 2 ? -1 : 1
  const outerX = dir < 0 ? 28 : W - 28
  const midY = (sy + ey) / 2
  return `M ${sx},${sy}` +
         ` C ${outerX},${sy} ${outerX},${(sy + midY) / 2} ${outerX},${midY}` +
         ` C ${outerX},${(midY + ey) / 2} ${outerX},${ey} ${ex},${ey}`
}

function curvedMidpoint(sx, sy, ex, ey) {
  const dir = sx < W / 2 ? -1 : 1
  return { x: dir < 0 ? 28 : W - 28, y: (sy + ey) / 2 }
}

export default function SalesTree({
  heroLevelKey, sales, activeSale, market, locale,
  onSelectSale, figureStyle = 'stick',
}) {
  const pos = positions()
  const showAll = activeSale > sales.length
  const totalSales = sales.length

  // Welche Männchen sind sichtbar? Hero immer; Kunden nur, wenn ihr
  // Verkauf bereits durchgeklickt wurde. → Build-up-Animation.
  const visibleIds = useMemo(() => {
    const set = new Set(['hero'])
    const upto = showAll ? totalSales : activeSale
    for (let i = 0; i < upto; i++) {
      if (sales[i]?.customerId) set.add(sales[i].customerId)
    }
    return set
  }, [activeSale, showAll, sales, totalSales])

  const heroesAtSale = useMemo(() => {
    const n = showAll ? totalSales : activeSale
    return buildHeroes(heroLevelKey, n)
  }, [heroLevelKey, activeSale, showAll, totalSales])

  const activeSales = useMemo(() => {
    if (showAll) return sales
    return sales.filter(s => s.n === activeSale)
  }, [sales, activeSale, showAll])

  const provisionsBySale = useMemo(() => {
    return activeSales.map(sale => {
      const heroesNow = buildHeroes(heroLevelKey, sale.n)
      const lines = commissionLines(sale, heroesNow, market, { includeZeroLines: true })
      const successLines = lines.filter(l => l.kind === 'success')
      return { sale, heroesNow, successLines }
    })
  }, [activeSales, heroLevelKey, market])

  // Sponsor-Hierarchie-Linien — nur zwischen sichtbaren Männchen
  const sponsorLines = [
    { from: 'cust1', to: 'hero' }, { from: 'cust2', to: 'hero' },
    { from: 'cust3', to: 'hero' }, { from: 'cust4', to: 'hero' },
    { from: 'cust6', to: 'hero' }, { from: 'cust7', to: 'hero' },
    { from: 'cust5',  to: 'cust1' },
    { from: 'cust9',  to: 'cust2' },
    { from: 'cust10', to: 'cust3' },
    { from: 'cust12', to: 'cust7' },
    { from: 'cust8',  to: 'cust5' },
    { from: 'cust11', to: 'cust9' },
    { from: 'cust13', to: 'cust8' },
  ].filter(l => visibleIds.has(l.from) && visibleIds.has(l.to))

  function FigureFor(id) {
    if (!visibleIds.has(id)) return null
    const hero = heroesAtSale.find(h => h.id === id)
    if (!hero) return null
    const p = pos[id]
    if (!p) return null
    const isActiveCustomer = activeSales.some(s => s.customerId === id)
    const isHero = id === 'hero'
    const label = hero.label
    return (
      <Figure
        key={id} style={figureStyle}
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

  // Provisions-Pfade berechnen — pro Sale die Sponsor-Kette ablaufen
  const provisionVisuals = useMemo(() => {
    const visuals = []
    provisionsBySale.forEach(({ sale, heroesNow, successLines }) => {
      const byRecipient = new Map(successLines.map(l => [l.recipient, l.amount]))
      const chain = []
      let curId = sale.directSellerId
      while (curId) {
        chain.push(curId)
        const h = heroesNow.find(x => x.id === curId)
        if (!h) break
        curId = h.sponsorId
      }
      const boughtId = sale.customerId
      const boughtP = pos[boughtId]

      // Segment 1: bought → directSeller
      const ds = chain[0]
      const dsP = pos[ds]
      if (boughtP && dsP) {
        const amount = byRecipient.get(ds) || 0
        visuals.push({
          kind: 'segment', key: `${sale.n}-bought-ds`, saleN: sale.n,
          sx: boughtP.x, sy: boughtP.y - FIG_R,
          ex: dsP.x, ey: dsP.y + FIG_R + 56,
          amount, isZero: amount === 0,
        })
      }

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
          // Curve außen herum vom bought-Customer zum Hero
          visuals.push({
            kind: 'curve', key: `${sale.n}-curve-hero`, saleN: sale.n,
            sx: boughtP.x, sy: boughtP.y - FIG_R,
            ex: upperP.x, ey: upperP.y + FIG_R + 56,
            amount,
          })
        } else {
          visuals.push({
            kind: 'segment', key: `${sale.n}-${lowerId}-${upperId}`, saleN: sale.n,
            sx: lowerP.x, sy: lowerP.y - FIG_R,
            ex: upperP.x, ey: upperP.y + FIG_R + 56,
            amount, isZero: amount === 0,
          })
        }
      }
    })
    return visuals
  }, [provisionsBySale])

  const fmtAmt = (n) => `+${n.toLocaleString(locale === 'de' || locale === 'ch' || locale === 'bar' ? 'de-DE' : 'en-US')} ${market === 'ch' ? 'CHF' : '€'}`

  return (
    <div className="sales-tree-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="sales-tree-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="fig-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d061" />
            <stop offset="60%" stopColor="#b8860b" />
            <stop offset="100%" stopColor="#7a5800" />
          </linearGradient>
          <linearGradient id="fig-gold-soft" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fce8a3" />
            <stop offset="100%" stopColor="#b8860b" />
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

        {/* Sponsor-Hierarchie (gestrichelt, dezent) */}
        {sponsorLines.map((l, i) => {
          const a = pos[l.from], b = pos[l.to]
          if (!a || !b) return null
          return (
            <line key={`sp-${i}`}
              x1={a.x} y1={a.y - FIG_R} x2={b.x} y2={b.y + FIG_R + 56}
              stroke="#dcdcdc" strokeWidth="1.5" strokeDasharray="3 4" />
          )
        })}

        {/* Curves (außen am Cluster vorbei) */}
        {provisionVisuals.filter(v => v.kind === 'curve').map(v => {
          const mid = curvedMidpoint(v.sx, v.sy, v.ex, v.ey)
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
                  {fmtAmt(v.amount)}
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
                  {fmtAmt(v.amount)}
                </text>
              </g>
            </g>
          )
        })}

        {/* Männchen-Layer */}
        {Object.keys(pos).map(id => FigureFor(id))}
      </svg>
    </div>
  )
}
