// EarningsPanel — Verdienst des Heroes pro aktiv gewähltem Verkauf
// + kumulative Summe. Verwendet pro Verkauf das tatsächliche Hero-
// Level (steigt automatisch hoch bei Stufenwechsel).

import { useMemo } from 'react'
import { commissionLines, aggregateByHero } from '../lib/successPlan'
import { buildHeroes } from '../lib/scenario'
import { t } from '../lib/i18n'

const KIND_KEY = {
  success: 'success_bonus',
  station: 'station_bonus',
  consultant: 'consultant_reward',
  expert: 'expert_reward',
}
const KIND_TIP = {
  success: 'tip_success',
  station: 'tip_station',
  consultant: 'tip_consultant',
  expert: 'tip_expert',
}

function fmt(n, locale, market) {
  const loc = locale === 'de' || locale === 'ch' || locale === 'bar' ? 'de-DE' : 'en-US'
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: market === 'ch' ? 'CHF' : 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

export default function EarningsPanel({ heroLevelKey, sales, activeSale, market, locale }) {
  const showAll = activeSale > sales.length

  // Provisionen für aktuellen Verkauf
  const currentSaleAgg = useMemo(() => {
    if (showAll) return null
    const sale = sales.find(s => s.n === activeSale)
    if (!sale) return null
    const heroes = buildHeroes(heroLevelKey, sale.n)
    const lines = commissionLines(sale, heroes, market)
    return aggregateByHero(lines).get('hero') || { success: 0, station: 0, consultant: 0, expert: 0, total: 0 }
  }, [sales, activeSale, heroLevelKey, market, showAll])

  // Kumulativ — pro Sale eigenes Hero-Level
  const cumulative = useMemo(() => {
    const upto = showAll ? sales.length : activeSale
    const totals = { success: 0, station: 0, consultant: 0, expert: 0, total: 0 }
    for (let i = 0; i < upto && i < sales.length; i++) {
      const sale = sales[i]
      const heroes = buildHeroes(heroLevelKey, sale.n)
      const lines = commissionLines(sale, heroes, market)
      const a = aggregateByHero(lines).get('hero')
      if (a) {
        totals.success += a.success
        totals.station += a.station
        totals.consultant += a.consultant
        totals.expert += a.expert
        totals.total += a.total
      }
    }
    return totals
  }, [sales, activeSale, heroLevelKey, market, showAll])

  const sale = sales.find(s => s.n === activeSale)

  return (
    <div className="earnings-panel">
      <h2 className="panel-title">{t('earnings_title', locale)}</h2>

      {!showAll && sale && currentSaleAgg && (
        <div className="earnings-card current">
          <div className="card-head">
            <span className="badge">{t('sale_n', locale, { n: sale.n })}</span>
            <span className="card-total">+{fmt(currentSaleAgg.total, locale, market)}</span>
          </div>
          <p className="narrative">{sale.narrative}</p>
          <ul className="breakdown">
            {['success', 'station', 'consultant', 'expert'].map(kind => {
              const amount = currentSaleAgg[kind]
              if (!amount) return null
              return (
                <li key={kind} className={`row ${kind}`}>
                  <span className="row-label" title={t(KIND_TIP[kind], locale)}>
                    {t(KIND_KEY[kind], locale)}
                    <span className="info-dot">ⓘ</span>
                  </span>
                  <span className="row-amount">+{fmt(amount, locale, market)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="earnings-card cumulative">
        <div className="card-head">
          <span className="card-title-small">
            {showAll
              ? `${t('earnings_total', locale)} (${sales.length} ${t('sale_label', locale)})`
              : `${t('earnings_total', locale)} (${t('sale_n', locale, { n: activeSale })})`}
          </span>
          <span className="card-total big">{fmt(cumulative.total, locale, market)}</span>
        </div>
        <ul className="breakdown small">
          <li className="row success">
            <span className="row-label">{t('success_bonus', locale)}</span>
            <span className="row-amount">{fmt(cumulative.success, locale, market)}</span>
          </li>
          <li className="row station">
            <span className="row-label">{t('station_bonus', locale)}</span>
            <span className="row-amount">{fmt(cumulative.station, locale, market)}</span>
          </li>
          <li className="row consultant">
            <span className="row-label">{t('consultant_reward', locale)}</span>
            <span className="row-amount">{fmt(cumulative.consultant, locale, market)}</span>
          </li>
          <li className="row expert">
            <span className="row-label">{t('expert_reward', locale)}</span>
            <span className="row-amount">{fmt(cumulative.expert, locale, market)}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
