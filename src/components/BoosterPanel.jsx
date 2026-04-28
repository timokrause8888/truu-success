// BoosterPanel — zeigt unter den Verdiensten die Booster:
//   • truu Station Bonus (kumulativ)
//   • Power Booster (pauschal 400 € ab 16 Punkten/Mon)
//   • World Booster (Pool-Anteil, Schätzwert)
//
// Die Booster-Sektion zeigt explizit, ob der Hero bereits qualifiziert
// ist — als Lern-Effekt fürs Verständnis der Schwellen.

import { useMemo } from 'react'
import {
  boosterPointsByHero,
  POWER_BOOSTER_FLAT, POWER_BOOSTER_THRESHOLD,
  WORLD_BOOSTER_THRESHOLD, WORLD_BOOSTER_EUR_PER_POINT,
} from '../lib/successPlan'
import { t } from '../lib/i18n'

function fmt(n, locale, market) {
  const loc = locale === 'de' || locale === 'ch' ? 'de-DE' : 'en-US'
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: market === 'ch' ? 'CHF' : 'EUR',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

export default function BoosterPanel({ heroes, sales, activeSale, market, locale }) {
  void heroes
  const showAll = activeSale > sales.length
  const upto = showAll ? sales.length : activeSale
  const slice = sales.slice(0, Math.max(0, upto))

  const points = useMemo(() => {
    const m = boosterPointsByHero(slice)
    return m.get('hero') || 0
  }, [slice])

  const stationCount = slice.filter(s => s.stationId === 'hero').length
  const stationTotal = stationCount * (market === 'ch' ? 60 : 55)

  const powerQualified = points >= POWER_BOOSTER_THRESHOLD
  const worldQualified = points >= WORLD_BOOSTER_THRESHOLD
  const worldEstimate = worldQualified ? points * WORLD_BOOSTER_EUR_PER_POINT : 0

  return (
    <div className="booster-panel">
      <h3 className="panel-title-sub">{t('boosters_title', locale)}</h3>

      <div className="booster-row">
        <div className="booster-card">
          <div className="booster-icon">💧</div>
          <div className="booster-body">
            <div className="booster-name">{t('booster_station', locale)}</div>
            <div className="booster-value">{fmt(stationTotal, locale, market)}</div>
            <div className="booster-meta">{stationCount} × {market === 'ch' ? '60 CHF' : '55 €'}</div>
          </div>
        </div>

        <div className={`booster-card ${powerQualified ? 'qualified' : 'pending'}`}>
          <div className="booster-icon">⚡</div>
          <div className="booster-body">
            <div className="booster-name">{t('booster_power', locale)}</div>
            <div className="booster-value">
              {powerQualified ? fmt(POWER_BOOSTER_FLAT, locale, market) : '—'}
            </div>
            <div className="booster-meta">
              {points} / {POWER_BOOSTER_THRESHOLD} {t('points', locale)}
              {' · '}{powerQualified ? t('qualified', locale) : t('not_qualified', locale)}
            </div>
          </div>
        </div>

        <div className={`booster-card ${worldQualified ? 'qualified' : 'pending'}`}>
          <div className="booster-icon">🌍</div>
          <div className="booster-body">
            <div className="booster-name">{t('booster_world', locale)}</div>
            <div className="booster-value">
              {worldQualified ? `~${fmt(worldEstimate, locale, market)}` : '—'}
            </div>
            <div className="booster-meta">
              {points} / {WORLD_BOOSTER_THRESHOLD} {t('points', locale)}
              {' · '}{worldQualified ? t('qualified', locale) : t('not_qualified', locale)}
            </div>
          </div>
        </div>
      </div>

      <p className="booster-tips">
        ⚡ {t('tip_power', locale)}<br />
        🌍 {t('tip_world', locale)}
      </p>
    </div>
  )
}
