import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Versions-Stempel rechts oben — Vercel-Commit-SHA für Production,
    // 'local' für Dev. Build-Zeitstempel in Berlin-Zeit.
    __APP_VERSION__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'),
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' +
      new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })
    ),
  },
})
