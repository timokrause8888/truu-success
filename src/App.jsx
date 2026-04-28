import { useState } from 'react'
import { LEVELS } from './lib/successPlan'
import { buildSales, DEFAULT_HERO_LEVEL_KEY, heroLevelAtSale } from './lib/scenario'
import { t, detectLocale, SUPPORTED_LOCALES, LOCALE_LABELS } from './lib/i18n'
import SalesTree from './components/SalesTree'
import EarningsPanel from './components/EarningsPanel'
import BoosterPanel from './components/BoosterPanel'
import HeroesLogo from './components/HeroesLogo'

// Vite-injected (siehe vite.config.js define-Block)
/* eslint-disable no-undef */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'local'
const BUILD_TIME  = typeof __BUILD_TIME__  !== 'undefined' ? __BUILD_TIME__  : ''
/* eslint-enable no-undef */

export default function App() {
  const [locale, setLocale] = useState(() => detectLocale())
  const [market, setMarket] = useState('de')
  const [heroLevelKey, setHeroLevelKey] = useState(DEFAULT_HERO_LEVEL_KEY)
  const [activeSale, setActiveSale] = useState(1)

  const sales = buildSales()
  const totalSales = sales.length
  // Hero-Level am aktuell gewählten Verkauf — kann während Click-Through
  // automatisch hochsteigen (z.B. von navigator → commander bei Sale 7).
  const heroLevelNow = heroLevelAtSale(heroLevelKey,
    activeSale > totalSales ? totalSales : activeSale)
  const startLevel = LEVELS.find(l => l.key === heroLevelKey) || LEVELS[0]
  const levelChanged = heroLevelNow.key !== startLevel.key

  return (
    <div className="page">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-brand">
            <HeroesLogo size={84} />
            <div>
              <h1 className="hero-title">{t('title', locale)}</h1>
              <p className="hero-sub">{t('subtitle', locale)}</p>
            </div>
          </div>
          <div className="hero-controls">
            <select className="lang-select" value={locale}
                    onChange={e => setLocale(e.target.value)}
                    aria-label="Language">
              {SUPPORTED_LOCALES.map(l => (
                <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
              ))}
            </select>
            <div className="version-badge">
              v{APP_VERSION} · {BUILD_TIME}
            </div>
          </div>
        </div>
        <p className="hero-intro">{t('intro', locale)}</p>
      </header>

      {/* ─── Setup-Bar ────────────────────────────────────────────── */}
      <div className="setup-bar">
        <label>
          <span className="setup-label">{t('market', locale)}</span>
          <select value={market} onChange={e => setMarket(e.target.value)}>
            <option value="de">{t('market_de', locale)}</option>
            <option value="ch">{t('market_ch', locale)}</option>
          </select>
        </label>
        <label>
          <span className="setup-label">{t('your_level', locale)}</span>
          <select value={heroLevelKey} onChange={e => setHeroLevelKey(e.target.value)}>
            {LEVELS.map(l => (
              <option key={l.key} value={l.key}>
                {l.label} · {market === 'ch' ? l.chBonus : l.deBonus} {market === 'ch' ? 'CHF' : '€'}
              </option>
            ))}
          </select>
        </label>
        {/* Live-Anzeige: aktuelles Hero-Level beim aktiven Verkauf
           (steigt automatisch beim Stufenwechsel) */}
        <div className={`level-now ${levelChanged ? 'changed' : ''}`}>
          <span className="setup-label">JETZT</span>
          <strong>{heroLevelNow.label}</strong>
          {levelChanged && <span className="level-up">↑ aufgestiegen</span>}
        </div>
      </div>

      {/* ─── Hauptbereich ─────────────────────────────────────────── */}
      <main className="main-grid">
        <section className="tree-section">
          <SalesTree
            heroLevelKey={heroLevelKey}
            sales={sales}
            activeSale={activeSale}
            market={market}
            locale={locale}
            onSelectSale={setActiveSale}
          />
          <div className="sale-nav">
            <button
              className="sale-nav-btn"
              onClick={() => setActiveSale(s => Math.max(1, s - 1))}
              disabled={activeSale <= 1}
            >{t('prev', locale)}</button>
            <div className="sale-nav-pills">
              {sales.map(s => (
                <button
                  key={s.n}
                  className={`sale-pill ${activeSale === s.n ? 'active' : ''}`}
                  onClick={() => setActiveSale(s.n)}
                  title={t('sale_n', locale, { n: s.n })}
                >{s.n}</button>
              ))}
              <button
                className={`sale-pill all ${activeSale > totalSales ? 'active' : ''}`}
                onClick={() => setActiveSale(totalSales + 1)}
              >{t('show_all', locale)}</button>
            </div>
            <button
              className="sale-nav-btn primary"
              onClick={() => setActiveSale(s => Math.min(totalSales + 1, s + 1))}
              disabled={activeSale > totalSales}
            >{t('next', locale)}</button>
          </div>
        </section>

        <aside className="earnings-section">
          <EarningsPanel
            heroLevelKey={heroLevelKey}
            sales={sales}
            activeSale={activeSale}
            market={market}
            locale={locale}
          />
          <BoosterPanel
            heroLevelKey={heroLevelKey}
            sales={sales}
            activeSale={activeSale}
            market={market}
            locale={locale}
          />
        </aside>
      </main>

      <footer className="page-footer">
        <p className="disclaimer">{t('disclaimer', locale)}</p>
        <a className="cta" href="https://go.truu.com" target="_blank" rel="noopener noreferrer">
          {t('contact', locale)} →
        </a>
      </footer>
    </div>
  )
}
