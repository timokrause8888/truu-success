// TeamBuildingSimulator — Tabellen-Simulator für Expert Teamaufbau.
//
// Idee: Du bildest Experts aus, die wiederum eigene Experts aufbauen.
// Pro Jahr (1-10) trägst du in 10 Linien ein:
//   - wieviel Experts in dieser Linie aktiv sind
//   - wieviel Verkäufe jeder dieser Experts pro Monat macht
// Die Tabelle berechnet automatisch:
//   - Experts gesamt
//   - Verkäufe gesamt pro Monat / pro Jahr
//   - Differenzprovision pro Monat / pro Jahr — basierend auf dem
//     truu Success Plan: dein eigenes Karriere-Level steigt mit den
//     kumulierten Team-Verkäufen, die Downline-Experts sind als
//     Einsteiger-Level (navigator) modelliert. Differenz-Provision
//     pro Verkauf = dein Stufen-Tarif − navigator-Tarif.
//
// Alle Zellen sind editierbar, der State persistiert in localStorage,
// damit man durchgespielte Szenarien beim nächsten Aufmachen wieder hat.

import React, { useEffect, useMemo, useState } from 'react'
import { LEVELS, levelForPoints } from '../lib/successPlan'
import { t } from '../lib/i18n'

const YEARS = Array.from({ length: 10 }, (_, i) => i + 1)
const LINES = Array.from({ length: 10 }, (_, i) => i + 1)
const STORAGE_KEY = 'truu_success_team_v1'

// Leere Matrix: years × lines × {experts, sales}
function emptyMatrix() {
  const m = {}
  for (const y of YEARS) {
    m[y] = {}
    for (const l of LINES) m[y][l] = { experts: 0, sales: 0 }
  }
  return m
}

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Defensive merge: falls sich die Anzahl Linien ändert, einsetzen
      const base = emptyMatrix()
      for (const y of YEARS) {
        for (const l of LINES) {
          if (parsed?.[y]?.[l]) base[y][l] = { experts: Number(parsed[y][l].experts) || 0, sales: Number(parsed[y][l].sales) || 0 }
        }
      }
      return base
    }
  } catch {}
  return emptyMatrix()
}

function fmtEUR(n, currency = '€') {
  return Math.round(n).toLocaleString('de-DE') + ' ' + currency
}
// Reine Zahl ohne Währung — mit deutschen Tausender-Punkten
function fmtNum(n) {
  return (Math.round(n) || 0).toLocaleString('de-DE')
}

export default function TeamBuildingSimulator({ locale = 'de', market = 'de' }) {
  const [matrix, setMatrix] = useState(loadStored)
  const [showDebug, setShowDebug] = useState(false)
  // Persistieren bei jeder Änderung
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix)) } catch {}
  }, [matrix])

  const currency = market === 'ch' ? 'CHF' : '€'
  const navigatorBonus = market === 'ch' ? LEVELS[0].chBonus : LEVELS[0].deBonus

  // ─── Kennzahlen pro Jahr ─────────────────────────────────────────────
  // WICHTIG: Mein Linie-1-Expert hat selbst eine Downline (meine L2..L10)
  // und macht eigene Verkäufe (meine Linie 1). Er sammelt also Punkte und
  // steigt im Karriere-Level mit auf. Meine Differenz-Provision pro Verkauf
  // ist daher MEIN Tarif minus dem Tarif meines L1-Experts (nicht minus
  // navigator). Aufgrund des Roll-Up-Prinzips (siehe successPlan.js,
  // commissionLines) zahlt jeder Verkauf in irgendeiner Linie nur die
  // höchste-bereits-gezahlte-Stufe darunter heraus — und das ist immer
  // L1, weil L1 mehr Team hat als L2, L2 mehr als L3 usw.
  //
  // Modellierung: Per L1-Expert-Punkte = (kumulierte Team-Sales) /
  // (aktuelle L1-Anzahl). Bei genau 1 L1-Expert hat dieser exakt MEINE
  // Punkte → gleiche Stufe → Differenz = 0 (matches MLM-Realität:
  // 'wer nur in die Tiefe baut, verdient an der Tiefe nichts mehr').
  // ─── Monat-für-Monat-Simulation (vereinfachtes L1-Modell) ───────────
  // Jeder der 120 Monate (10 Jahre × 12) wird einzeln durchgerechnet:
  //   • Mein Stand: kumul. Sales aus ALLEN Linien
  //   • L1 Stand:   kumul. Sales aus Linie 1 PRO L1-Expert (vereinfacht —
  //                 Subteams werden nicht eingerechnet, weil sich die
  //                 Differenzprovision sowieso nur auf den L1-Tarif bezieht)
  //   • Diff/Sale:  max(0, MeinTarif − L1Tarif)
  //   • Monat-Verdienst: monatl. Sales × Diff/Sale
  // Stufensprünge werden pro Monat erkannt und in der Debug-Tabelle
  // hervorgehoben. So sieht man genau wann L1 vs. ich aufsteigt.
  const monthlyTrace = useMemo(() => {
    const months = []
    let myCumul = 0           // ALLE Sales aus allen Linien
    let l1Cumul = 0           // PRO L1-Expert: sein Anteil an ALLEN Team-Sales
                              // (eigene + komplette Downline L2..L10)
    let prevMyKey = null
    let prevL1Key = null
    for (const y of YEARS) {
      const lines = matrix[y] || {}
      const l1Count = Number(lines[1]?.experts) || 0
      let monthlyTotalSales = 0
      let monthlyL1Sales = 0
      for (const l of LINES) {
        const c = lines[l] || {}
        const sales = (Number(c.experts) || 0) * (Number(c.sales) || 0)
        monthlyTotalSales += sales
        if (l === 1) monthlyL1Sales = sales
      }
      // Pro L1-Expert sieht: monatliche Total-Sales / L1-Anzahl. Bei 1 L1
      // hat dieser eine genau MEINE Punkte → gleiche Stufe → Diff = 0.
      const monthlyPerL1 = l1Count > 0 ? monthlyTotalSales / l1Count : 0
      for (let m = 1; m <= 12; m++) {
        myCumul += monthlyTotalSales
        if (l1Count > 0) l1Cumul += monthlyPerL1
        const myLevel = levelForPoints(myCumul)
        const l1Level = l1Count > 0 ? levelForPoints(l1Cumul) : LEVELS[0]
        const myBonus = market === 'ch' ? myLevel.chBonus : myLevel.deBonus
        const l1Bonus = market === 'ch' ? l1Level.chBonus : l1Level.deBonus
        const diffPerSale = Math.max(0, myBonus - l1Bonus)
        const monthlyDiff = monthlyTotalSales * diffPerSale
        const myJump = prevMyKey !== null && myLevel.key !== prevMyKey
        const l1Jump = prevL1Key !== null && l1Level.key !== prevL1Key
        months.push({
          year: y, month: m,
          monthlyTotalSales, monthlyL1Sales, l1Count, monthlyPerL1,
          myCumul, l1Cumul,
          myLevel, l1Level, myBonus, l1Bonus,
          diffPerSale, monthlyDiff,
          myJump, l1Jump,
        })
        prevMyKey = myLevel.key
        prevL1Key = l1Level.key
      }
    }
    return months
  }, [matrix, market])

  // Aggregat pro Jahr — für die Haupt-Tabelle. Summiert die 12 Monate eines
  // Jahres, nimmt das Level am Jahres-ENDE als repräsentativ.
  const perYear = useMemo(() => {
    const out = {}
    for (const y of YEARS) {
      const monthsOfY = monthlyTrace.filter(m => m.year === y)
      if (!monthsOfY.length) continue
      const last = monthsOfY[monthsOfY.length - 1]
      const yearlyDiff = monthsOfY.reduce((s, m) => s + m.monthlyDiff, 0)
      const monthlySalesEnd = last.monthlyTotalSales
      const yearlySales = monthlySalesEnd * 12
      let expertsTotal = 0
      const lines = matrix[y] || {}
      for (const l of LINES) expertsTotal += Number(lines[l]?.experts) || 0
      out[y] = {
        expertsTotal,
        monthlySales: monthlySalesEnd,
        yearlySales,
        myLevel: last.myLevel,
        l1Level: last.l1Level,
        diffPerSale: last.diffPerSale,
        monthlyDiff: yearlyDiff / 12,   // Durchschnitt — Diff variiert über Jahr bei Stufensprung
        yearlyDiff,
        cumulPoints: last.myCumul,
        l1CumulPoints: last.l1Cumul,
      }
    }
    return out
  }, [monthlyTrace, matrix])

  // Gesamt-Summen über 10 Jahre
  const totals = useMemo(() => {
    let salesYearly = 0, diffMonthly = 0, diffYearly = 0
    for (const y of YEARS) {
      const r = perYear[y] || {}
      salesYearly += r.yearlySales || 0
      diffMonthly += r.monthlyDiff || 0
      diffYearly  += r.yearlyDiff  || 0
    }
    return { salesYearly, diffMonthly, diffYearly }
  }, [perYear])

  function updateCell(year, line, key, value) {
    const num = Math.max(0, Math.floor(Number(value) || 0))
    setMatrix(m => ({
      ...m,
      [year]: {
        ...m[year],
        [line]: { ...m[year][line], [key]: num },
      },
    }))
  }

  function reset() {
    if (!confirm(t('team_reset_confirm', locale))) return
    setMatrix(emptyMatrix())
  }

  // Spreadsheet-style Tastatur-Navigation. Werte werden bei jedem
  // Tastendruck via onChange gespeichert (state → localStorage), die
  // Pfeil-/Enter-Tasten verschieben nur den Fokus.
  function onCellKeyDown(e) {
    const k = e.key
    const navKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']
    if (!navKeys.includes(k)) return
    // Bei Pfeil hoch/runter in einem Number-Input würde der Browser sonst
    // den Wert um 1 erhöhen/verringern — das ist hier nicht gewollt.
    e.preventDefault()
    const row = Number(e.currentTarget.dataset.row)
    const col = Number(e.currentTarget.dataset.col)
    let nextRow = row, nextCol = col
    if (k === 'ArrowRight') {
      nextCol = col + 1
      if (nextCol > 19) { nextCol = 0; nextRow = row + 1 }
    } else if (k === 'ArrowLeft') {
      nextCol = col - 1
      if (nextCol < 0) { nextCol = 19; nextRow = row - 1 }
    } else if (k === 'ArrowDown' || k === 'Enter') {
      nextRow = row + 1
    } else if (k === 'ArrowUp') {
      nextRow = row - 1
    }
    if (nextRow < 1 || nextRow > 10) return
    const next = document.querySelector(
      `input[data-row="${nextRow}"][data-col="${nextCol}"]`
    )
    if (next) {
      next.focus()
      next.select?.()
    }
  }

  return (
    <div className="team-sim">
      {/* Header mit Reset + Hinweis */}
      <div className="team-sim-header">
        <div>
          <h2 className="team-sim-title">{t('team_sim_title', locale)}</h2>
          <p className="team-sim-sub">{t('team_sim_sub', locale)}</p>
        </div>
        <button className="team-sim-reset" onClick={reset}>↺ {t('team_reset', locale)}</button>
      </div>

      {/* Tabelle (horizontal scrollbar bei schmalem Fenster) */}
      <div className="team-sim-scroll">
        <table className="team-sim-table">
          <thead>
            <tr>
              <th rowSpan={2} className="t-year-h">{t('team_year', locale)}</th>
              {LINES.map(l => (
                <th key={l} colSpan={2} className="t-line-h">{t('team_line', locale)} {l}</th>
              ))}
              <th rowSpan={2} className="t-calc-h sticky col-c1">
                <span className="t-h-top">{t('team_experts_total_top', locale)}</span>
                <span className="t-h-bot">{t('team_experts_total_bot', locale)}</span>
              </th>
              <th rowSpan={2} className="t-calc-h sticky col-c2">
                <span className="t-h-top">{t('team_sales_month_top', locale)}</span>
                <span className="t-h-bot">{t('team_sales_month_bot', locale)}</span>
              </th>
              <th rowSpan={2} className="t-calc-h sticky col-c3">
                <span className="t-h-top">{t('team_sales_year_top', locale)}</span>
                <span className="t-h-bot">{t('team_sales_year_bot', locale)}</span>
              </th>
              <th rowSpan={2} className="t-calc-h gold sticky col-c4">
                <span className="t-h-top">{t('team_diff_month_top', locale)}</span>
                <span className="t-h-bot">{t('team_diff_month_bot', locale)}</span>
              </th>
              <th rowSpan={2} className="t-calc-h gold sticky col-c5">
                <span className="t-h-top">{t('team_diff_year_top', locale)}</span>
                <span className="t-h-bot">{t('team_diff_year_bot', locale)}</span>
              </th>
            </tr>
            <tr>
              {LINES.map(l => (
                <>
                  <th key={`e-${l}`} className="t-sub-h">{t('team_experts_short', locale)}</th>
                  <th key={`s-${l}`} className="t-sub-h">{t('team_sales_short', locale)}</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {YEARS.map(y => {
              const r = perYear[y] || {}
              return (
                <tr key={y}>
                  <td className="t-year">{y}</td>
                  {LINES.map(l => {
                    const cell = matrix[y]?.[l] || { experts: 0, sales: 0 }
                    return (
                      <>
                        <td key={`e-${y}-${l}`} className="t-input">
                          <input
                            type="number" min={0} step={1}
                            data-row={y}
                            data-col={(l - 1) * 2}
                            value={cell.experts || ''}
                            onChange={e => updateCell(y, l, 'experts', e.target.value)}
                            onKeyDown={onCellKeyDown}
                            placeholder="–"
                          />
                        </td>
                        <td key={`s-${y}-${l}`} className="t-input">
                          <input
                            type="number" min={0} step={1}
                            data-row={y}
                            data-col={(l - 1) * 2 + 1}
                            value={cell.sales || ''}
                            onChange={e => updateCell(y, l, 'sales', e.target.value)}
                            onKeyDown={onCellKeyDown}
                            placeholder="–"
                          />
                        </td>
                      </>
                    )
                  })}
                  <td className="t-calc sticky col-c1">{fmtNum(r.expertsTotal)}</td>
                  <td className="t-calc sticky col-c2">{fmtNum(r.monthlySales)}</td>
                  <td className="t-calc sticky col-c3">{fmtNum(r.yearlySales)}</td>
                  <td className="t-calc gold sticky col-c4">{fmtEUR(r.monthlyDiff || 0, currency)}</td>
                  <td className="t-calc gold sticky col-c5">{fmtEUR(r.yearlyDiff || 0, currency)}</td>
                </tr>
              )
            })}
            {/* Summen-Zeile über 10 Jahre */}
            <tr className="t-totals">
              <td className="t-year">Σ</td>
              {LINES.map(l => (<>
                <td key={`te-${l}`} />
                <td key={`ts-${l}`} />
              </>))}
              <td className="t-calc sticky col-c1"></td>
              <td className="t-calc sticky col-c2"></td>
              <td className="t-calc sticky col-c3">{fmtNum(totals.salesYearly)}</td>
              <td className="t-calc gold sticky col-c4">{fmtEUR(totals.diffMonthly, currency)}</td>
              <td className="t-calc gold sticky col-c5">{fmtEUR(totals.diffYearly, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Level-Verlauf — pro Jahr was bin ich für ein Karriere-Level? */}
      <div className="team-sim-levels">
        <h3>{t('team_level_progress', locale)}</h3>
        <div className="team-sim-levels-row">
          {YEARS.map(y => {
            const r = perYear[y] || {}
            return (
              <div key={y} className="team-sim-level-pill">
                <span className="t-yr">{t('team_year', locale)} {y}</span>
                <strong>{r.myLevel?.label || '—'}</strong>
                <span className="t-l1">L1: {r.l1Level?.label || '—'}</span>
                <span className="t-diff">+{fmtEUR(r.diffPerSale || 0, currency)} / {t('team_per_sale', locale)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Annahmen / Disclaimer */}
      <div className="team-sim-disclaimer">
        <strong>ℹ️ {t('team_assumptions_title', locale)}:</strong>{' '}
        {t('team_assumptions_text', locale)}
      </div>

      {/* Versteckter Debug-Button — fast unsichtbar (opacity 0.06).
         Klick blendet den kompletten Schritt-für-Schritt-Rechenweg ein,
         damit man die Diff-Provisions-Logik nachvollziehen kann. */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button
          type="button"
          onClick={() => setShowDebug(v => !v)}
          style={{
            opacity: showDebug ? 0.95 : 0.45,
            background: showDebug ? '#f3f0e0' : '#fafaf6',
            border: '1px dashed #c9a55a',
            borderRadius: 6,
            color: '#5a4500',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 16px',
          }}
          title="Berechnungs-Details ein-/ausblenden"
        >{showDebug ? '▲ Detaillierter Rechenweg ausblenden' : '▽ Detaillierter Rechenweg'}</button>
      </div>

      {showDebug && (
        <DebugTrace
          matrix={matrix}
          perYear={perYear}
          monthlyTrace={monthlyTrace}
          market={market}
          currency={currency}
          navigatorBonus={navigatorBonus}
        />
      )}
    </div>
  )
}

// ───────── Debug-Trace: Schritt-für-Schritt der Berechnung ─────────
// Zeigt für JEDES Jahr alle aggregierten Werte sowie ausklappbar die
// 12 Monatsschritte (Stand-Entwicklung von ME + L1, Stufenwechsel, Diff).
function DebugTrace({ matrix, perYear, monthlyTrace, market, currency, navigatorBonus }) {
  const navBonus = navigatorBonus
  const [openYears, setOpenYears] = useState({}) // {1: true, 5: true, ...}
  function toggleYear(y) {
    setOpenYears(o => ({ ...o, [y]: !o[y] }))
  }
  return (
    <div style={{
      marginTop: 18, padding: 16,
      background: '#fffbe6', border: '1.5px solid #f0d57a',
      borderRadius: 10, fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: 12, color: '#3a2900',
      overflowX: 'auto',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 10, fontFamily: 'inherit', fontSize: 14 }}>
        🔬 Berechnungs-Detail · Monat-für-Monat
      </div>
      <div style={{ marginBottom: 12, fontFamily: 'system-ui, sans-serif', fontSize: 12, lineHeight: 1.5 }}>
        Markt: <strong>{market.toUpperCase()}</strong> · navigator-Tarif: <strong>{navBonus} {currency}</strong><br/>
        <strong>L1-Modell (MLM-korrekt):</strong> Linie-1-Expert sieht <em>alle</em> monatlichen Team-Sales (eigene Linie 1 + komplette Downline L2..L10), geteilt durch L1-Anzahl. Bei 1 L1-Expert hat dieser exakt MEINE Punkte → Stufengleichheit → Diff = 0.<br/>
        <strong>Diff-Formel:</strong> <code>max(0, MeinTarif − L1Tarif) × MonatsVerkäufe</code>
      </div>

      {/* Jahres-Übersicht — Klick auf eine Zeile klappt die 12 Monate auf */}
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100 }}>
        <thead>
          <tr style={{ background: '#f0d57a44' }}>
            <th style={th}>Jahr</th>
            <th style={th}>Linien<br/>(E×S)</th>
            <th style={th}>Sales<br/>/Mon</th>
            <th style={th}>L1<br/>Anz.</th>
            <th style={th}>L1-Stand<br/>am Jahresende</th>
            <th style={th}>L1 Level</th>
            <th style={th}>L1 Tarif</th>
            <th style={th}>MEIN<br/>Stand</th>
            <th style={th}>MEIN Level</th>
            <th style={th}>MEIN Tarif</th>
            <th style={th}>Diff/Sale<br/>am Ende</th>
            <th style={th}>Σ Verdienst<br/>Jahr</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(perYear).map(yKey => {
            const y = Number(yKey)
            const r = perYear[y]
            const lines = matrix[y] || {}
            const lineCells = Object.entries(lines)
              .filter(([_, c]) => (Number(c.experts) || 0) > 0 || (Number(c.sales) || 0) > 0)
              .map(([l, c]) => `L${l}: ${c.experts||0}×${c.sales||0}`)
              .join(', ') || '—'
            const isOpen = !!openYears[y]
            return (
              <React.Fragment key={y}>
                <tr style={{ borderTop: '1px solid #e0c060', cursor: 'pointer' }} onClick={() => toggleYear(y)}>
                  <td style={td}><strong>{y}</strong></td>
                  <td style={{ ...td, fontSize: 11 }}>{lineCells}</td>
                  <td style={td}>{r.monthlySales || 0}</td>
                  <td style={td}>{Number(lines[1]?.experts) || 0}</td>
                  <td style={td}>{Math.round(r.l1CumulPoints || 0)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.l1Level?.label || '—'}</td>
                  <td style={td}>{market === 'ch' ? r.l1Level?.chBonus : r.l1Level?.deBonus} {currency}</td>
                  <td style={td}>{Math.round(r.cumulPoints || 0)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.myLevel?.label || '—'}</td>
                  <td style={td}>{market === 'ch' ? r.myLevel?.chBonus : r.myLevel?.deBonus} {currency}</td>
                  <td style={{ ...td, fontWeight: 700, color: r.diffPerSale > 0 ? '#080' : '#c00' }}>{r.diffPerSale || 0} {currency}</td>
                  <td style={td}>{Math.round(r.yearlyDiff || 0).toLocaleString('de-DE')} {currency}</td>
                  <td style={{ ...td, color: '#9a6f00', fontWeight: 700 }}>{isOpen ? '▼' : '▶'}</td>
                </tr>
                {isOpen && <MonthDetail year={y} months={monthlyTrace.filter(m => m.year === y)} market={market} currency={currency} />}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.6, color: '#7a5d00', fontFamily: 'system-ui, sans-serif' }}>
        💡 Klick auf eine Jahres-Zeile → 12 Monatsschritte werden ausgeklappt mit detailliertem Stand und Stufensprüngen ⬆.
      </div>
    </div>
  )
}

// Untertabelle: 12 Monate eines Jahres, mit Stufensprung-Markern
function MonthDetail({ year, months, market, currency }) {
  return (
    <tr>
      <td colSpan={13} style={{ padding: 0, background: '#fffdf5' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', borderLeft: '4px solid #c9a55a' }}>
          <thead>
            <tr style={{ background: '#fff5cc88', fontSize: 11 }}>
              <th style={th}>Monat</th>
              <th style={th}>Sales (Total)</th>
              <th style={th}>L1-Anteil<br/>pro Expert</th>
              <th style={th}>L1-Stand</th>
              <th style={th}>L1 Level</th>
              <th style={th}>L1 Tarif</th>
              <th style={th}>MEIN Stand</th>
              <th style={th}>MEIN Level</th>
              <th style={th}>MEIN Tarif</th>
              <th style={th}>Diff/Sale</th>
              <th style={th}>Verdienst Monat</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => {
              const myJumpStyle = m.myJump ? { background: '#dcfce788', fontWeight: 700 } : {}
              const l1JumpStyle = m.l1Jump ? { background: '#fef3c788', fontWeight: 700 } : {}
              return (
                <tr key={`${m.year}-${m.month}`} style={{ borderTop: '1px solid #f0d57a' }}>
                  <td style={td}>{m.year}/{String(m.month).padStart(2,'0')}</td>
                  <td style={td}>{m.monthlyTotalSales}</td>
                  <td style={td}>{m.monthlyPerL1?.toFixed(2) || '—'}</td>
                  <td style={{ ...td, ...l1JumpStyle }}>{Math.round(m.l1Cumul)}</td>
                  <td style={{ ...td, ...l1JumpStyle }}>{m.l1Level?.label || '—'}{m.l1Jump ? ' ⬆' : ''}</td>
                  <td style={{ ...td, ...l1JumpStyle }}>{m.l1Bonus} {currency}</td>
                  <td style={{ ...td, ...myJumpStyle }}>{Math.round(m.myCumul)}</td>
                  <td style={{ ...td, ...myJumpStyle }}>{m.myLevel?.label || '—'}{m.myJump ? ' ⬆' : ''}</td>
                  <td style={{ ...td, ...myJumpStyle }}>{m.myBonus} {currency}</td>
                  <td style={{ ...td, color: m.diffPerSale > 0 ? '#080' : '#999', fontWeight: 600 }}>
                    {m.myBonus} − {m.l1Bonus} = <strong>{m.diffPerSale}</strong>
                  </td>
                  <td style={td}>{Math.round(m.monthlyDiff).toLocaleString('de-DE')} {currency}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </td>
    </tr>
  )
}

const th = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, fontFamily: 'system-ui, sans-serif' }
const td = { padding: '6px 8px', whiteSpace: 'nowrap' }
