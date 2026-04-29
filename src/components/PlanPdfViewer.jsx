// PlanPdfViewer — Fullscreen-Modal mit der Original Success-Plan-Broschüre
// als PDF. Verwendet die native Browser-PDF-Anzeige via <iframe>.
// Plus: Download-Button + 'In neuem Tab öffnen' für Mobile-User, bei
// denen iframes mit PDFs manchmal nicht zuverlässig laufen (iOS Safari).
//
// Sprach-Mapping:
//   de, bar          → success-plan-de.pdf  (Bayerisch nutzt das DE-PDF)
//   en               → success-plan-en.pdf
//   es               → success-plan-es.pdf
//   alle anderen     → success-plan-en.pdf  (EN als universeller Fallback,
//                      bis es lokalisierte Fassungen gibt)

import { useEffect } from 'react'
import { t } from '../lib/i18n'

// Welches PDF wird für welche UI-Sprache angezeigt?
function pdfUrlForLocale(locale) {
  switch (locale) {
    case 'de':
    case 'bar':
      return '/success-plan-de.pdf'
    case 'es':
      return '/success-plan-es.pdf'
    case 'en':
      return '/success-plan-en.pdf'
    default:
      // Bulgarisch, Französisch, Italienisch, Niederländisch, Portugiesisch,
      // Russisch — bis wir eigene PDFs haben, bekommen alle das EN-PDF.
      return '/success-plan-en.pdf'
  }
}

export default function PlanPdfViewer({ open, onClose, locale }) {
  // Body-Scroll während Modal offen ist verhindern
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const PDF_URL = pdfUrlForLocale(locale)

  return (
    <div className="pdf-modal-backdrop" onClick={onClose}>
      <div className="pdf-modal" onClick={e => e.stopPropagation()}>
        <div className="pdf-modal-header">
          <span className="pdf-modal-title">📖 {t('pdf_title', locale)}</span>
          <div className="pdf-modal-actions">
            <a
              href={PDF_URL}
              download="truu-success-plan.pdf"
              className="pdf-btn pdf-btn-primary"
              title={t('pdf_download_tip', locale)}
            >⬇ {t('pdf_download', locale)}</a>
            <a
              href={PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-btn"
            >↗ {t('pdf_open_tab', locale)}</a>
            <button
              type="button"
              onClick={onClose}
              className="pdf-btn pdf-btn-close"
              aria-label={t('pdf_close', locale)}
            >✕</button>
          </div>
        </div>
        <iframe
          // key=PDF_URL erzwingt Reload des iframe, wenn sich die Sprache
          // ändert während das Modal noch offen ist.
          key={PDF_URL}
          src={PDF_URL + '#view=FitH'}
          title="truu success plan"
          className="pdf-modal-iframe"
        />
        <div className="pdf-modal-fallback">
          {t('pdf_fallback', locale)}
          {' '}
          <a href={PDF_URL} target="_blank" rel="noopener noreferrer">
            {t('pdf_open_tab', locale)}
          </a>.
        </div>
      </div>
    </div>
  )
}
