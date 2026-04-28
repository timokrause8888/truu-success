import React, { useMemo, useState } from 'react'
import { LEVELS } from './lib/successPlan'
import { buildHeroes, buildSales, DEFAULT_HERO_LEVEL_KEY } from './lib/scenario'
import { t, detectLocale, SUPPORTED_LOCALES, LOCALE_LABELS } from './lib/i18n'
import SalesTree from './components/SalesTree'
import EarningsPanel from './components/EarningsPanel'
import BoosterPanel from './components/BoosterPanel'
import HeroesLogo from './components/HeroesLogo'

export default function App() {
  const [locale, setLocale] = useState(() => detectLocale())
  const [market, setMarket] = useState('de')                  // 'de' | 'ch'
  const [heroLevelKey, setHeroLevelKey] = useState(DEFAULT_HERO_LEVEL_KEY)
  const [activeSale, setActiveSale] = useState(1)             // 1-basiert; 0 = noch nichts

  const heroes = useMemo(() => buildHeroes(heroLevelKey), [heroLevelKey])
  const sales  = useMemo(() => buildSales(heroes, market),    [heroes, market])
  const totalSales = sales.length

  return (
    <div className="page">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-brand">
            <HeroesLogo size={68} />
            <div>
              <h1 className="hero-title">{t('title', locale)}</h1>
              <p className="hero-sub">{t('subtitle', locale)}</p>
            </div>
          </div>
          <div className="hero-controls">
            <select className="lang-select" value={locale} onChange={e => setLocale(e.target.value)}
                    aria-label="Sprache">
              {SUPPORTED_LOCALES.map(l => (
                <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="hero-intro">{t('intro', locale)}</p>
      </header>

      {/* ─── Setup-Bar (Markt, Karrierelevel) ─────────────────────── */}
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
      </div>

      {/* ─── Hauptbereich: Tree links + Earnings rechts ─────────── */}
      <main className="main-grid">
        <section className="tree-section">
          <SalesTree
            heroes={heroes}
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
            heroes={heroes}
            sales={sales}
            activeSale={activeSale}
            market={market}
            locale={locale}
          />
          <BoosterPanel
            heroes={heroes}
            sales={sales}
            activeSale={activeSale}
            market={market}
            locale={locale}
          />
        </aside>
      </main>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="page-footer">
        <p className="disclaimer">{t('disclaimer', locale)}</p>
        <a className="cta" href="https://go.truu.com" target="_blank" rel="noopener noreferrer">
          {t('contact', locale)} →
        </a>
      </footer>
    </div>
  )
}
