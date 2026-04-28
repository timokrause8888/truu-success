// SalesTree — Visualisiert den 8-Verkaufs-Baum als SVG mit Männchen.
// Hero (Du) oben, 6 Direktverkäufe (Kunden 1, 2, 3, 4, 6, 7) als Reihe
// unter ihm, Kunde 5 als Kind von Kunde 1, Kunde 8 als Kind von Kunde 5.
//
// Klickt der Nutzer auf eine Sale-Pille (1-8), wird dieser Verkauf als
// "aktuell" markiert: das Kunden-Männchen + die Provisions-Pfade werden
// hervorgehoben. Die Beträge an den Linien zeigen, was an den jeweiligen
// Empfänger fließt.

import React, { useMemo } from 'react'
import { commissionLines, aggregateByHero } from '../lib/successPlan'
import { t } from '../lib/i18n'

// ─── Layout-Konstanten ─────────────────────────────────────────────
const W = 720          // SVG-Breite
const H = 520          // SVG-Höhe
const HERO_X = W / 2
const HERO_Y = 80
const ROW1_Y = 240     // Direktkunden-Reihe
const ROW2_Y = 360     // Sub-Empfehlung (Kunde 5)
const ROW3_Y = 460     // Sub-Sub-Empfehlung (Kunde 8)
const FIG_R  = 26      // Männchen-Kopf-Radius

// Position-Map pro Hero/Kunde
function positions() {
  // 6 Direkt-Kunden in Reihe 1 (1,2,3,4,6,7) — gleichmäßig verteilt
  const cols = [1, 2, 3, 4, 6, 7]
  const startX = 80
  const endX = W - 80
  const step = (endX - startX) / (cols.length - 1)
  const dir = {}
  cols.forEach((n, i) => { dir[`cust${n}`] = { x: startX + i * step, y: ROW1_Y } })
  return {
    hero:  { x: HERO_X, y: HERO_Y },
    ...dir,
    cust5: { x: dir.cust1.x, y: ROW2_Y },     // unter Kunde 1
    cust8: { x: dir.cust1.x, y: ROW3_Y },     // unter Kunde 5
  }
}

// Stick-Figure-Pfad: einfache Strichmännchen, gold gefüllt für Hero,
// hellgrau für Kunden, grün-hervorgehoben wenn aktiv.
function StickFigure({ x, y, label, role, isActive, isHero, onClick }) {
  // role: 'hero' | 'customer' | 'subcustomer' | 'subsubcustomer'
  const fill = isHero
    ? 'url(#fig-gold)'
    : isActive ? '#43a047' : '#bcbcbc'
  const ringColor = isActive ? '#2e7d32' : (isHero ? '#7a5800' : '#888')
  return (
    <g
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s' }}
      transform={`translate(${x},${y})`}
    >
      {/* Aktiver Pulse-Ring */}
      {isActive && (
        <circle r={FIG_R + 8} fill="none" stroke="#43a047" strokeWidth="2" opacity="0.5">
          <animate attributeName="r" from={FIG_R + 6} to={FIG_R + 14} dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Kopf */}
      <circle r={FIG_R} fill={fill} stroke={ringColor} strokeWidth="2" />
      {/* Körper als Strichmännchen */}
      <line x1="0" y1={FIG_R} x2="0" y2={FIG_R + 36} stroke={ringColor} strokeWidth="3.5" />
      <line x1="0" y1={FIG_R + 12} x2="-18" y2={FIG_R + 4} stroke={ringColor} strokeWidth="3.5" />
      <line x1="0" y1={FIG_R + 12} x2="18" y2={FIG_R + 4} stroke={ringColor} strokeWidth="3.5" />
      <line x1="0" y1={FIG_R + 36} x2="-14" y2={FIG_R + 60} stroke={ringColor} strokeWidth="3.5" />
      <line x1="0" y1={FIG_R + 36} x2="14" y2={FIG_R + 60} stroke={ringColor} strokeWidth="3.5" />
      {/* Krone für Hero */}
      {isHero && (
        <g transform={`translate(0, ${-FIG_R - 8})`}>
          <path d="M -16 0 L -10 -10 L -5 -3 L 0 -12 L 5 -3 L 10 -10 L 16 0 Z"
                fill="#f5d061" stroke="#7a5800" strokeWidth="1" />
          <circle cx="-10" cy="-10" r="2" fill="#fff" />
          <circle cx="0" cy="-12" r="2" fill="#fff" />
          <circle cx="10" cy="-10" r="2" fill="#fff" />
        </g>
      )}
      {/* Label */}
      <text textAnchor="middle" y={FIG_R + 78}
            fontSize="13" fontWeight="700" fill="#1d1d1f"
            fontFamily="Roboto, sans-serif">
        {label}
      </text>
    </g>
  )
}

export default function SalesTree({ heroes, sales, activeSale, market, locale, onSelectSale }) {
  const pos = positions()
  const showAll = activeSale > sales.length

  // Verkäufe, die in der aktuellen Visualisierung "aktiv" sind:
  // Single-Mode: nur der gewählte Verkauf. All-Mode: alle 8.
  const activeSales = useMemo(() => {
    if (showAll) return sales
    return sales.filter(s => s.n === activeSale)
  }, [sales, activeSale, showAll])

  // Provisionslinien für die aktiven Verkäufe — werden auf den
  // Verbindungslinien zwischen den Männchen angezeigt.
  const provisionLabels = useMemo(() => {
    const labels = []   // {from, to, lines: [...{kind, amount, recipient}]}
    for (const sale of activeSales) {
      const lines = commissionLines(sale, heroes, market)
      // Pro Verkauf: zeichne Geld-Pfad vom Customer-Männchen nach oben
      // zum Empfänger. Wir aggregieren Provisionen pro Empfänger.
      const agg = aggregateByHero(lines)
      const customerId = sale.customerId
      for (const [recipientId, amounts] of agg.entries()) {
        labels.push({
          fromId: customerId,
          toId: recipientId,
          saleN: sale.n,
          amount: amounts.total,
          breakdown: amounts,
        })
      }
    }
    return labels
  }, [activeSales, heroes, market])

  function FigureFor(id) {
    const hero = heroes.find(h => h.id === id)
    if (!hero) return null
    const p = pos[id]
    if (!p) return null
    const isActiveCustomer = activeSales.some(s => s.customerId === id)
    const isActiveRecipient = activeSales.some(s =>
      [s.directSellerId, s.consultantId, s.expertId, s.stationId].includes(id))
    const isActive = isActiveCustomer || (isActiveRecipient && !isActiveCustomer && id !== 'hero')
    const isHero = id === 'hero'
    const label = id === 'hero'
      ? t('you', locale)
      : t('customer_short', locale, { n: id.replace('cust', '') })
    return (
      <StickFigure
        key={id}
        x={p.x} y={p.y}
        label={label}
        isActive={isActiveCustomer}
        isHero={isHero}
        onClick={() => {
          // Klick auf Customer-Männchen → springe zu dem Verkauf, in
          // dem dieser Customer der gekaufte ist. Klick auf Hero macht
          // nichts.
          if (isHero) return
          const sale = sales.find(s => s.customerId === id)
          if (sale) onSelectSale(sale.n)
        }}
      />
    )
  }

  // Verbindungs-Linien (Sponsor-Tree, statisch grau) — die zeigen
  // einfach die Hierarchie. Provisions-Pfeile sind extra darüber.
  const sponsorLines = [
    { from: 'cust1', to: 'hero' }, { from: 'cust2', to: 'hero' },
    { from: 'cust3', to: 'hero' }, { from: 'cust4', to: 'hero' },
    { from: 'cust6', to: 'hero' }, { from: 'cust7', to: 'hero' },
    { from: 'cust5', to: 'cust1' },
    { from: 'cust8', to: 'cust5' },
  ]

  return (
    <div className="sales-tree-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="sales-tree-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Goldener Verlauf für Hero-Männchen */}
          <linearGradient id="fig-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5d061" />
            <stop offset="60%" stopColor="#b8860b" />
            <stop offset="100%" stopColor="#7a5800" />
          </linearGradient>
          {/* Pfeil für aktive Provisions-Pfade */}
          <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2e7d32" />
          </marker>
        </defs>

        {/* Hierarchie-Linien (immer sichtbar, dezent) */}
        {sponsorLines.map((l, i) => {
          const a = pos[l.from], b = pos[l.to]
          if (!a || !b) return null
          return (
            <line key={i}
              x1={a.x} y1={a.y - FIG_R} x2={b.x} y2={b.y + FIG_R + 60}
              stroke="#d0d0d0" strokeWidth="2" strokeDasharray="4 4" />
          )
        })}

        {/* Provisions-Pfade (aktiv) */}
        {provisionLabels.map((p, i) => {
          if (p.toId === p.fromId) return null
          const a = pos[p.fromId], b = pos[p.toId]
          if (!a || !b) return null
          // Geldpfad als grüne Linie vom Kunden zum Empfänger
          const labelX = (a.x + b.x) / 2
          const labelY = (a.y + b.y) / 2
          return (
            <g key={`prov-${i}`}>
              <line
                x1={a.x} y1={a.y - FIG_R}
                x2={b.x} y2={b.y + FIG_R}
                stroke="#43a047" strokeWidth="2.5"
                markerEnd="url(#arrow-active)"
                opacity="0.85"
              />
              {/* Pillenförmiges Geld-Label */}
              <g transform={`translate(${labelX},${labelY})`}>
                <rect x="-46" y="-13" width="92" height="26" rx="13"
                      fill="#fff" stroke="#43a047" strokeWidth="1.5" />
                <text x="0" y="5" textAnchor="middle"
                      fontSize="13" fontWeight="700" fill="#1b5e20"
                      fontFamily="Roboto, sans-serif">
                  +{p.amount.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US')} {market === 'ch' ? 'CHF' : '€'}
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
