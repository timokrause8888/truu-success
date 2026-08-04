import { useState } from 'react'
import { LEVELS } from './lib/successPlan'
import { buildSales, DEFAULT_HERO_LEVEL_KEY, heroLevelAtSale } from './lib/scenario'
import { t, detectLocale, FLAGS, LOCALES_ORDER, LOCALE_LABELS } from './lib/i18n'
import SalesTree from './components/SalesTree'
import EarningsPanel from './components/EarningsPanel'
import BoosterPanel from './components/BoosterPanel'
import HeroesLogo from './components/HeroesLogo'
import PlanPdfViewer from './components/PlanPdfViewer'

/* eslint-disable no-undef */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'local'
const BUILD_TIME  = typeof __BUILD_TIME__  !== 'undefined' ? __BUILD_TIME__  : ''
/* eslint-enable no-undef */

// Vier Männchen-Stile zur Auswahl. Mini-Vorschau-SVG pro Button.
const FIGURE_OPTIONS = [
  { key: 'stick',  label: 'Strichmännchen' },
  { key: 'drop',   label: 'Wassertropfen' },
  { key: 'avatar', label: 'Avatar-Kreis' },
  { key: 'cape',   label: 'Helden mit Cape' },
]

export default function App() {
  const [locale, setLocale] = useState(() => detectLocale())
  const [market, setMarket] = useState('de')
  const [heroLevelKey, setHeroLevelKey] = useState(DEFAULT_HERO_LEVEL_KEY)
  const [activeSale, setActiveSale] = useState(0)         // 0 = Start (kein Verkauf)
  const [figureStyle, setFigureStyle] = useState('avatar')
  const [pdfOpen, setPdfOpen] = useState(false)
  // Modus-Auswahl ganz oben: Eigenumsatz (= aktueller Klick-Calculator) vs.
  // Teamaufbau (= kommt als nächste Iteration). Default: Eigenumsatz.
  const [mode, setMode] = useState('eigen')   // 'eigen' | 'team'

  const sales = buildSales()
  const totalSales = sales.length
  const heroLevelNow = heroLevelAtSale(heroLevelKey,
    activeSale > totalSales ? totalSales : activeSale)
  const startLevel = LEVELS.find(l => l.key === heroLevelKey) || LEVELS[0]
  const levelChanged = heroLevelNow.key !== startLevel.key

  return (
    <div className="page">
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
            {/* Flaggen-Reihe wie bei truu-save / truu-tasks */}
            <div className="language-switcher">
              {LOCALES_ORDER.map(l => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`language-btn ${locale === l ? 'active' : ''}`}
                  title={LOCALE_LABELS[l]}
                >{FLAGS[l]}</button>
              ))}
            </div>
            <div className="version-badge">
              aktuelle Version: {APP_VERSION} | {BUILD_TIME}
            </div>
          </div>
        </div>
        <p className="hero-intro">{t('intro', locale)}</p>
      </header>

      {/* Modus-Tabs (Eigenumsatz vs. Teamaufbau) — eigene Zeile direkt
         über der Setup-Bar. Zwei große Buttons in Weiß, geteilt 50/50. */}
      <div className="mode-bar">
        <button
          className={`mode-btn ${mode === 'eigen' ? 'active' : ''}`}
          onClick={() => setMode('eigen')}
        >
          <span className="mode-btn-icon">👤</span>
          <span className="mode-btn-label">{t('mode_eigen', locale)}</span>
          <span className="mode-btn-sub">{t('mode_eigen_sub', locale)}</span>
        </button>
        <button
          className={`mode-btn ${mode === 'team' ? 'active' : ''}`}
          onClick={() => setMode('team')}
        >
          <span className="mode-btn-icon">👥</span>
          <span className="mode-btn-label">{t('mode_team', locale)}</span>
          <span className="mode-btn-sub">{t('mode_team_sub', locale)}</span>
        </button>
      </div>

      {/* Setup-Bar: Markt + Karrierestatus + Trennstrich + Stilauswahl + JETZT */}
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

        <div className="setup-divider" />

        {/* Stil-Auswahl als Pill-Group */}
        <div className="style-picker">
          <span className="setup-label">Stil</span>
          <div className="style-pills">
            {FIGURE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                className={`style-pill ${figureStyle === opt.key ? 'active' : ''}`}
                onClick={() => setFigureStyle(opt.key)}
                title={opt.label}
              >
                <StylePreview kind={opt.key} />
                <span className="style-pill-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setup-divider" />

        <div className={`level-now ${levelChanged ? 'changed' : ''}`}>
          <span className="setup-label">JETZT</span>
          <strong>{heroLevelNow.label}</strong>
          {levelChanged && <span className="level-up">↑ aufgestiegen</span>}
        </div>
      </div>

      {mode === 'team' && (
        <main className="team-coming-soon">
          <div className="team-coming-card">
            <div className="team-coming-icon">👥</div>
            <h2>{t('team_soon_title', locale)}</h2>
            <p>{t('team_soon_text', locale)}</p>
            <button className="cta cta-secondary" onClick={() => setMode('eigen')}>
              ← {t('mode_eigen', locale)}
            </button>
          </div>
        </main>
      )}

      {mode === 'eigen' && (
      <main className="main-grid">
        <section className="tree-section">
          <SalesTree
            heroLevelKey={heroLevelKey}
            sales={sales}
            activeSale={activeSale}
            market={market}
            locale={locale}
            onSelectSale={setActiveSale}
            figureStyle={figureStyle}
          />
          <div className="sale-nav">
            <button
              className="sale-nav-btn"
              onClick={() => setActiveSale(s => Math.max(0, s - 1))}
              disabled={activeSale <= 0}
            >{t('prev', locale)}</button>
            <div className="sale-nav-pills">
              <button
                className={`sale-pill ${activeSale === 0 ? 'active' : ''}`}
                onClick={() => setActiveSale(0)}
                title="Start"
              >·</button>
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
      )}

      <footer className="page-footer">
        <p className="disclaimer">{t('disclaimer', locale)}</p>
        <div className="footer-actions">
          <button type="button" className="cta cta-secondary" onClick={() => setPdfOpen(true)}>
            {t('pdf_btn', locale)}
          </button>
          <a className="cta" href="https://go.truu.com" target="_blank" rel="noopener noreferrer">
            {t('contact', locale)} →
          </a>
        </div>
      </footer>

      <PlanPdfViewer open={pdfOpen} onClose={() => setPdfOpen(false)} locale={locale} />
    </div>
  )
}

// Mini-Vorschau-SVG für jeden Stil (im Stil-Picker)
function StylePreview({ kind }) {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26">
      {kind === 'stick' && (
        <g>
          <circle cx="11" cy="7" r="5" fill="#b8860b" />
          <line x1="11" y1="12" x2="11" y2="20" stroke="#b8860b" strokeWidth="2" />
          <line x1="11" y1="14" x2="6" y2="12" stroke="#b8860b" strokeWidth="2" />
          <line x1="11" y1="14" x2="16" y2="12" stroke="#b8860b" strokeWidth="2" />
          <line x1="11" y1="20" x2="7" y2="25" stroke="#b8860b" strokeWidth="2" />
          <line x1="11" y1="20" x2="15" y2="25" stroke="#b8860b" strokeWidth="2" />
        </g>
      )}
      {kind === 'drop' && (
        <path d="M 11 1 L 4 13 A 7 7 0 1 0 18 13 Z" fill="#b8860b" />
      )}
      {kind === 'avatar' && (
        <g>
          <circle cx="11" cy="11" r="9" fill="none" stroke="#b8860b" strokeWidth="2" />
          <circle cx="11" cy="11" r="6" fill="#b8860b" />
        </g>
      )}
      {kind === 'cape' && (
        <g>
          <path d="M 4 6 Q 1 18 4 22 L 18 22 Q 21 18 18 6 L 14 6 Q 14 18 11 20 Q 8 18 8 6 Z"
                fill="#b8860b" />
          <circle cx="11" cy="6" r="3.5" fill="#f5d8a8" stroke="#7a5800" strokeWidth="0.8" />
        </g>
      )}
    </svg>
  )
}
