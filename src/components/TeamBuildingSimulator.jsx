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

import { useEffect, useMemo, useState } from 'react'
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
  const perYear = useMemo(() => {
    const out = {}
    let cumulPoints = 0
    for (const y of YEARS) {
      const lines = matrix[y] || {}
      let expertsTotal = 0
      let monthlySales = 0
      for (const l of LINES) {
        const cell = lines[l] || { experts: 0, sales: 0 }
        const e = Number(cell.experts) || 0
        const s = Number(cell.sales) || 0
        expertsTotal += e
        monthlySales += e * s   // pro Monat
      }
      const yearlySales = monthlySales * 12
      cumulPoints += yearlySales

      // Mein eigenes Level (alle Team-Sales kumuliert)
      const myLevel = levelForPoints(cumulPoints)
      const myBonus = market === 'ch' ? myLevel.chBonus : myLevel.deBonus

      // Linie-1-Expert Level (Punkte / aktuelle L1-Anzahl)
      const l1Count = Number(lines[1]?.experts) || 0
      const perL1Points = l1Count > 0 ? cumulPoints / l1Count : 0
      const l1Level = l1Count > 0 ? levelForPoints(perL1Points) : LEVELS[0]
      const l1Bonus = market === 'ch' ? l1Level.chBonus : l1Level.deBonus

      // Differenz pro Verkauf — meine Stufe minus L1-Stufe.
      // Roll-Up: alle Verkäufe in beliebiger Linie zahlen mir genau diese
      // Differenz (L1 ist immer Upline mit höchstem Niveau unter mir).
      const diffPerSale = Math.max(0, myBonus - l1Bonus)
      const monthlyDiff = monthlySales * diffPerSale
      const yearlyDiff = yearlySales * diffPerSale

      out[y] = {
        expertsTotal, monthlySales, yearlySales,
        myLevel, l1Level, diffPerSale, monthlyDiff, yearlyDiff, cumulPoints,
      }
    }
    return out
  }, [matrix, market])

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
            opacity: showDebug ? 0.5 : 0.06,
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: 11,
            cursor: 'pointer',
            padding: '6px 12px',
          }}
          title="Berechnungs-Details ein-/ausblenden"
        >{showDebug ? '▲ Rechenweg ausblenden' : '▽ debug'}</button>
      </div>

      {showDebug && (
        <DebugTrace
          matrix={matrix}
          perYear={perYear}
          market={market}
          currency={currency}
          navigatorBonus={navigatorBonus}
        />
      )}
    </div>
  )
}

// ───────── Debug-Trace: Schritt-für-Schritt der Berechnung ─────────
// Zeigt für JEDES Jahr alle Zwischenwerte: Eingaben → kumulierte Punkte
// → MEIN Level + Tarif → L1-Anzahl + per-L1-Punkte → L1-Level + Tarif
// → Differenz pro Verkauf → Monatliches/Jährliches Total.
//
// So kann der User-/Tester nachvollziehen, ob die Stufengleichheit
// korrekt erkannt wird (L1=ME → diff=0) und wo Übergänge passieren.
function DebugTrace({ matrix, perYear, market, currency, navigatorBonus }) {
  const navBonus = navigatorBonus
  return (
    <div style={{
      marginTop: 18, padding: 16,
      background: '#fffbe6', border: '1.5px solid #f0d57a',
      borderRadius: 10, fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: 12, color: '#3a2900',
      overflowX: 'auto',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 10, fontFamily: 'inherit', fontSize: 14 }}>
        🔬 Berechnungs-Detail (Schritt für Schritt pro Jahr)
      </div>
      <div style={{ marginBottom: 12, fontFamily: 'system-ui, sans-serif', fontSize: 12 }}>
        Markt: <strong>{market.toUpperCase()}</strong> · navigator-Tarif: <strong>{navBonus} {currency}</strong> ·
        Diff-Formel: <code>max(0, MeinTarif − L1Tarif) × MonatsVerkäufe</code>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1200 }}>
        <thead>
          <tr style={{ background: '#f0d57a44' }}>
            <th style={th}>Jahr</th>
            <th style={th}>Linien-Eingabe<br/>(Experts × Sales)</th>
            <th style={th}>Σ Experts</th>
            <th style={th}>Sales/Mon</th>
            <th style={th}>Sales/Jahr</th>
            <th style={th}>kumul. Team-Punkte</th>
            <th style={th}>MEIN Level</th>
            <th style={th}>MEIN Tarif</th>
            <th style={th}>L1 Anzahl</th>
            <th style={th}>per-L1<br/>Punkte</th>
            <th style={th}>L1 Level</th>
            <th style={th}>L1 Tarif</th>
            <th style={th}>Diff/Verkauf</th>
            <th style={th}>Diff/Monat</th>
            <th style={th}>Diff/Jahr</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(perYear).map(yKey => {
            const y = Number(yKey)
            const r = perYear[y]
            const lines = matrix[y] || {}
            const lineCells = Object.entries(lines)
              .filter(([_, c]) => (Number(c.experts) || 0) > 0 || (Number(c.sales) || 0) > 0)
              .map(([l, c]) => `L${l}: ${c.experts || 0}×${c.sales || 0}`)
              .join(', ') || '—'
            const myBonus = market === 'ch' ? r.myLevel?.chBonus : r.myLevel?.deBonus
            const l1Bonus = market === 'ch' ? r.l1Level?.chBonus : r.l1Level?.deBonus
            const l1Count = Number(lines[1]?.experts) || 0
            const perL1 = l1Count > 0 ? r.cumulPoints / l1Count : 0
            const isStufengleich = l1Count === 1 && r.cumulPoints > 0
            return (
              <tr key={y} style={{ borderTop: '1px solid #e0c060' }}>
                <td style={td}><strong>{y}</strong></td>
                <td style={{ ...td, fontSize: 11 }}>{lineCells}</td>
                <td style={td}>{r.expertsTotal || 0}</td>
                <td style={td}>{r.monthlySales || 0}</td>
                <td style={td}>{r.yearlySales || 0}</td>
                <td style={td}>{Math.round(r.cumulPoints || 0)}</td>
                <td style={{ ...td, fontWeight: 700 }}>{r.myLevel?.label || '—'}</td>
                <td style={td}>{myBonus} {currency}</td>
                <td style={{ ...td, color: l1Count === 0 ? '#bbb' : (l1Count === 1 ? '#c00' : '#080') }}>
                  {l1Count}{isStufengleich && ' ⚠'}
                </td>
                <td style={td}>{Math.round(perL1)}</td>
                <td style={{ ...td, fontWeight: 700 }}>{r.l1Level?.label || '—'}</td>
                <td style={td}>{l1Bonus} {currency}</td>
                <td style={{ ...td, color: r.diffPerSale > 0 ? '#080' : '#c00', fontWeight: 700 }}>
                  {myBonus} − {l1Bonus} = <strong>{r.diffPerSale}</strong> {currency}
                </td>
                <td style={td}>{Math.round(r.monthlyDiff || 0).toLocaleString('de-DE')} {currency}</td>
                <td style={td}>{Math.round(r.yearlyDiff || 0).toLocaleString('de-DE')} {currency}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.6, color: '#7a5d00', fontFamily: 'system-ui, sans-serif' }}>
        <strong>⚠ Stufengleichheit-Hinweis:</strong> Bei <code>L1 Anzahl = 1</code> hat der einzige L1-Expert
        per Definition genau MEINE Punkte (alles, was unter mir liegt, ist auch unter ihm) → gleiches Level
        → Diff = 0. So funktioniert das Roll-Up im MLM. Beobachte vor allem den Wechsel von 1 → 2 L1-Experten:
        plötzlich halbieren sich die per-L1-Punkte, L1 fällt auf eine niedrigere Stufe, MEIN Diff wird größer.
      </div>
    </div>
  )
}

const th = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, fontFamily: 'system-ui, sans-serif' }
const td = { padding: '6px 8px', whiteSpace: 'nowrap' }
