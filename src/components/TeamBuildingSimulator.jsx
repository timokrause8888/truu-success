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
    // MODELL: 10 PARALLELE DIREKTLINIEN.
    //
    // L1, L2, ..., L10 sind keine MLM-Tiefe (L1→L2→L3...), sondern 10 direkte
    // Linien unter MIR. Jeder L_n-Expert ist von mir persönlich rekrutiert.
    //
    // PUNKT-GUTSCHRIFT-REGEL:
    //   - Käufer bekommt 0 für eigenen Anlagenkauf.
    //   - Verkäufer + alle Upline (= nur ICH) bekommen +1.
    //
    // Konkret:
    //   - Ich rekrutiere L_n: ich +1, L_n = 0  (für jede Linie n=1..10)
    //   - L_n verkauft (eigene Line-Sales): L_n +1, ich +1
    //   - L_n hat eigene Downline — die ist NICHT in der Matrix, ihre Sales
    //     sind im sales_n bereits aggregiert. Das L_n-Cumul wächst entsprechend.
    //
    // Per L_n-Expert (averaged):
    //   l_n.cumul += 0 beim Recruit (er ist Käufer, nicht Verkäufer)
    //   l_n.cumul += sales_n / monthlyTotalSales je Total-Sale
    //                 (sales_n = monthlyPerLn[n] = lineSales[n] / counts[n])
    //
    // VERDIENST-Berechnung:
    //   Pro Monat = Σ über Linien n: lineSales[n] × max(0, myBonus − L_n_bonus)
    //   → Jede Linie zählt einzeln. Diff zu L_n wirkt nur auf Sales von Linie n.
    const events = []
    let myCumul = 0
    const lCumuls = Array.from({ length: 10 }, () => 0)  // Index 0 = L1
    let prevMyLevel = LEVELS[0]
    const prevLevels = Array.from({ length: 10 }, () => LEVELS[0])
    let prevCounts = Array.from({ length: 10 }, () => 0)
    const stepCounters = {}
    function nextStep(y) {
      stepCounters[y] = (stepCounters[y] || 0) + 1
      return stepCounters[y]
    }
    function snapshot(counts) {
      const myLevel = levelForPoints(myCumul)
      const myBonus = market === 'ch' ? myLevel.chBonus : myLevel.deBonus
      const lInfo = lCumuls.map((cumul, idx) => {
        const cnt = counts[idx] || 0
        const level = (cnt > 0) ? levelForPoints(cumul) : LEVELS[0]
        const bonus = market === 'ch' ? level.chBonus : level.deBonus
        return {
          cumul, count: cnt, level, bonus,
          diffPerSale: Math.max(0, myBonus - bonus),
        }
      })
      return { myLevel, myBonus, lInfo }
    }

    for (const y of YEARS) {
      const lines = matrix[y] || {}
      const counts = LINES.map(l => Number(lines[l]?.experts) || 0)
      const newRecruits = counts.map((c, i) => Math.max(0, c - prevCounts[i]))
      const totalNew = newRecruits.reduce((s, n) => s + n, 0)

      // Monthly sales pro Linie und pro L_n-Expert
      // monthlyPerLn[n] = sales_n (Sales pro L_n-Expert in der eigenen Linie)
      const lineSales = LINES.map(l => {
        const c = lines[l] || {}
        return (Number(c.experts) || 0) * (Number(c.sales) || 0)
      })
      const monthlyTotalSales = lineSales.reduce((s, x) => s + x, 0)
      const monthlyPerLn = counts.map((cnt, n) => {
        if (cnt <= 0) return 0
        return lineSales[n] / cnt   // = sales_n (Per-Expert-Sales-Rate für Linie n)
      })

      // Recruitment-Korrektur am Jahreswechsel
      // Käufer = 0, Verkäufer/Upline = +1. Da L_n direkt unter MIR steht,
      // bin ich der einzige Verkäufer beim Recruit → nur ICH bekomme +1.
      // L_n-Cumul bleibt 0 vom Recruit (sie SIND der Käufer).
      if (totalNew > 0) {
        myCumul += totalNew
        const snap = snapshot(counts)
        const linesNote = newRecruits.map((n, i) => n > 0 ? `L${i+1}+${n}` : null).filter(Boolean).join(' · ')
        events.push({
          year: y, step: nextStep(y),
          kind: y === 1 ? 'init' : 'recruitNew',
          note: y === 1
            ? `Start: ${totalNew} Recruits direkt von mir · ${linesNote}`
            : `Jahreswechsel: ${linesNote} (alle direkt von mir rekrutiert)`,
          counts, monthlyTotalSales, monthlyPerLn, lineSales,
          myCumul, ...snap,
          myJump: snap.myLevel.key !== prevMyLevel.key,
          anyJump: snap.lInfo.some((info, i) => info.level.key !== prevLevels[i].key),
          monthlyDiff: 0,
        })
        prevMyLevel = snap.myLevel
        for (let n = 0; n < 10; n++) prevLevels[n] = snap.lInfo[n].level
      }
      prevCounts = counts.slice()

      for (let m = 1; m <= 12; m++) {
        // Sale-by-Sale, iteriert PRO LINIE (jede Linie unabhängig).
        // Pro Sale in Linie n: my +1, L_n (per Expert) += 1/counts[n]
        // Diff/Sale = max(0, myBonus − L_n_bonus) ← gilt nur für SALES von Linie n
        let monthDiffSum = 0
        for (let n = 0; n < 10; n++) {
          if (counts[n] <= 0 || lineSales[n] <= 0) continue
          const lineMonthlySales = Math.round(lineSales[n])
          const lStepN = 1 / counts[n]
          for (let s = 1; s <= lineMonthlySales; s++) {
            myCumul += 1
            lCumuls[n] += lStepN
            const snap = snapshot(counts)
            // Verdienst aus diesem Sale: Diff zur L_n-Stufe (eigene Linie!)
            monthDiffSum += snap.lInfo[n].diffPerSale
            const myJump = snap.myLevel.key !== prevMyLevel.key
            const jumpedLevels = []
            for (let k = 0; k < 10; k++) {
              if (snap.lInfo[k].level.key !== prevLevels[k].key && counts[k] > 0) {
                jumpedLevels.push(`L${k+1} ⬆ ${snap.lInfo[k].level.label}`)
              }
            }
            if (myJump || jumpedLevels.length > 0) {
              const parts = []
              if (myJump) parts.push(`MEIN ⬆ ${snap.myLevel.label}`)
              parts.push(...jumpedLevels)
              events.push({
                year: y, month: m, sale: s, step: nextStep(y),
                kind: 'jump',
                note: `L${n+1} Sale ${s}: ${parts.join(' · ')}`,
                counts, monthlyTotalSales, monthlyPerLn, lineSales,
                myCumul, ...snap,
                myJump, anyJump: jumpedLevels.length > 0, monthlyDiff: 0,
              })
              prevMyLevel = snap.myLevel
              for (let k = 0; k < 10; k++) prevLevels[k] = snap.lInfo[k].level
            }
          }
        }
        // End-of-Month
        const snap = snapshot(counts)
        events.push({
          year: y, month: m, step: nextStep(y),
          kind: 'monthEnd',
          note: `Monat ${m} Ende`,
          counts, monthlyTotalSales, monthlyPerLn, lineSales,
          myCumul, ...snap,
          myJump: false, anyJump: false,
          monthlyDiff: monthDiffSum,
        })
      }
    }
    return events
  }, [matrix, market])

  // Aggregat pro Jahr — für die Haupt-Tabelle. Summiert die 12 Monate eines
  // Jahres, nimmt das Level am Jahres-ENDE als repräsentativ.
  const perYear = useMemo(() => {
    const out = {}
    for (const y of YEARS) {
      const monthsOfY = monthlyTrace.filter(m => m.year === y && m.kind === 'monthEnd')
      if (!monthsOfY.length) continue
      const last = monthsOfY[monthsOfY.length - 1]
      const yearlyDiff = monthsOfY.reduce((s, m) => s + m.monthlyDiff, 0)
      const monthlySalesEnd = last.monthlyTotalSales
      const yearlySales = monthlySalesEnd * 12
      let expertsTotal = 0
      const lines = matrix[y] || {}
      for (const l of LINES) expertsTotal += Number(lines[l]?.experts) || 0
      // L1-Info aus lInfo-Array (Index 0 = L1)
      const l1Info = last.lInfo?.[0] || { level: LEVELS[0], cumul: 0, diffPerSale: 0 }
      out[y] = {
        expertsTotal,
        monthlySales: monthlySalesEnd,
        yearlySales,
        myLevel: last.myLevel,
        l1Level: l1Info.level,
        diffPerSale: l1Info.diffPerSale,
        monthlyDiff: yearlyDiff / 12,   // Durchschnitt — Diff variiert bei Stufensprung
        yearlyDiff,
        cumulPoints: last.myCumul,
        l1CumulPoints: l1Info.cumul,
        lInfo: last.lInfo,  // alle 10 Levels für L2..L10-Anzeige
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
        <strong>Modell — 10 parallele Direktlinien:</strong> L1..L10 sind keine MLM-Tiefe, sondern 10 von dir <em>direkt</em> rekrutierte Linien. Jede ist unabhängig.<br/>
        <strong>Punktgutschrift:</strong> beim Recruit bekommt nur DU +1 (du verkaufst, L_n kauft = 0). Bei eigenen Sales von L_n: L_n +1, du +1.<br/>
        <strong>Verdienst pro Monat:</strong> Σ über alle Linien n von <code>lineSales[n] × max(0, MeinTarif − L_n-Tarif)</code>. Jede Linie zählt einzeln, Diff zu L_n wirkt nur auf deren Sales.<br/>
        <strong>Sale-by-Sale-Detail:</strong> jeder Stufensprung (MEIN ⬆ und/oder L1 ⬆) bekommt eine eigene Zeile mit Schritt-Nummer (Y/SS) — voll nachvollziehbar.<br/>
        <strong>Diff-Formel:</strong> <code>max(0, MeinTarif − L1Tarif)</code> je Sale, summiert über den Monat (Tarif zum Sale-Zeitpunkt — Stufensprünge mid-month wirken sofort).
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
        💡 Klick auf eine Jahres-Zeile → alle Schritte (Recruitment-Start ▸ Stufensprünge ⬆ ▸ Monatsende) werden ausgeklappt. Pro Jahr fortlaufende Schritt-Nummer Y/SS.
      </div>
    </div>
  )
}

// Untertabelle: alle Events eines Jahres (init / recruitNew / jump / monthEnd)
// Jeder Event = eine Zeile. Schritt-Nummer (Y/SS) zeigt Reihenfolge im Jahr.
// Tabelle zeigt MEIN-Stand + L1..L10 jeweils mit Anteil/Stand/Level/Tarif/Diff
// → wird breit, daher horizontal scrollbar.
function MonthDetail({ year, months, market, currency }) {
  // Welche Levels sind im Szenario aktiv? (count > 0 in irgendeinem Event)
  const activeLevels = []
  for (let n = 0; n < 10; n++) {
    if (months.some(m => (m.counts?.[n] || 0) > 0 || (m.lInfo?.[n]?.count || 0) > 0)) {
      activeLevels.push(n)
    }
  }
  // Mindestens L1 anzeigen, auch wenn 0 — sonst sieht man gar nichts
  if (activeLevels.length === 0) activeLevels.push(0)

  // colSpan = fixe (Schritt, Ereignis, Sales, MEIN Stand, MEIN Level, MEIN Tarif)
  //         + 4 Spalten je aktivem Level (Anteil, Stand, Level, Tarif, Diff = 5)
  //         + Verdienst Monat
  const innerCols = 6 + activeLevels.length * 5 + 1

  return (
    <tr>
      <td colSpan={13} style={{ padding: 0, background: '#fffdf5' }}>
        <div style={{ overflowX: 'auto', borderLeft: '4px solid #c9a55a' }}>
        <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
          <thead>
            <tr style={{ background: '#fff5cc88', fontSize: 11 }}>
              <th style={th}>Schritt</th>
              <th style={th}>Ereignis</th>
              <th style={th}>Sales (Total)</th>
              <th style={th}>MEIN Stand</th>
              <th style={th}>MEIN Level</th>
              <th style={th}>MEIN Tarif</th>
              {activeLevels.map(n => (
                <React.Fragment key={`th-${n}`}>
                  <th style={{ ...th, borderLeft: '2px solid #f0d57a', background: '#ffeebb88' }}>
                    L{n+1}-Anteil<br/>pro Expert
                  </th>
                  <th style={{ ...th, background: '#ffeebb88' }}>L{n+1}-Stand</th>
                  <th style={{ ...th, background: '#ffeebb88' }}>L{n+1} Level</th>
                  <th style={{ ...th, background: '#ffeebb88' }}>L{n+1} Tarif</th>
                  <th style={{ ...th, background: '#ffeebb88' }}>Diff zu L{n+1}</th>
                </React.Fragment>
              ))}
              <th style={{ ...th, borderLeft: '2px solid #f0d57a' }}>Verdienst Monat<br/>(Diff vs L1)</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m, idx) => {
              const myJumpStyle = m.myJump ? { background: '#dcfce788', fontWeight: 700 } : {}
              const rowBg =
                m.kind === 'init'        ? '#fff7d622' :
                m.kind === 'recruitNew'  ? '#fff7d622' :
                m.kind === 'jump'        ? '#fef9c322' :
                /* monthEnd */              'transparent'
              const stepLabel = `${m.year}/${String(m.step).padStart(2,'0')}`
              return (
                <tr key={`${m.year}-${m.step}-${idx}`} style={{ borderTop: '1px solid #f0d57a', background: rowBg }}>
                  <td style={{ ...td, fontWeight: m.kind === 'monthEnd' ? 700 : 500 }}>{stepLabel}</td>
                  <td style={{ ...td, fontSize: 11, color: m.kind === 'jump' ? '#7a4a00' : '#555', maxWidth: 280, whiteSpace: 'normal' }}>{m.note || '—'}</td>
                  <td style={td}>{m.monthlyTotalSales}</td>
                  <td style={{ ...td, ...myJumpStyle }}>{Math.round(m.myCumul)}</td>
                  <td style={{ ...td, ...myJumpStyle }}>{m.myLevel?.label || '—'}{m.myJump ? ' ⬆' : ''}</td>
                  <td style={{ ...td, ...myJumpStyle }}>{m.myBonus} {currency}</td>
                  {activeLevels.map(n => {
                    const lvl = m.lInfo?.[n] || { cumul: 0, level: { label: '—' }, bonus: 0, diffPerSale: 0 }
                    const cnt = m.counts?.[n] || 0
                    const anteil = m.monthlyPerLn?.[n] || 0
                    const isOff = cnt === 0
                    const cellSty = { ...td, opacity: isOff ? 0.4 : 1 }
                    return (
                      <React.Fragment key={`td-${n}-${idx}`}>
                        <td style={{ ...cellSty, borderLeft: '2px solid #f0d57a' }}>
                          {isOff ? '—' : anteil.toFixed(2)}
                        </td>
                        <td style={cellSty}>{isOff ? '—' : Math.round(lvl.cumul)}</td>
                        <td style={cellSty}>{isOff ? '—' : (lvl.level?.label || '—')}</td>
                        <td style={cellSty}>{isOff ? '—' : `${lvl.bonus} ${currency}`}</td>
                        <td style={{ ...cellSty, color: lvl.diffPerSale > 0 ? '#080' : '#999', fontWeight: 600 }}>
                          {isOff ? '—' : `${m.myBonus} − ${lvl.bonus} = ${lvl.diffPerSale}`}
                        </td>
                      </React.Fragment>
                    )
                  })}
                  <td style={{ ...td, borderLeft: '2px solid #f0d57a', fontWeight: m.kind === 'monthEnd' ? 700 : 400, color: m.kind === 'monthEnd' ? '#3a2900' : '#999' }}>
                    {m.kind === 'monthEnd' ? `${Math.round(m.monthlyDiff).toLocaleString('de-DE')} ${currency}` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </td>
    </tr>
  )
}

const th = { padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: 11, fontFamily: 'system-ui, sans-serif' }
const td = { padding: '6px 8px', whiteSpace: 'nowrap' }
