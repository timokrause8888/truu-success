# truu-success

Interaktiver Verdienstrechner für den **truu Heroes Success Plan**.

Live: [truu-success.vercel.app](https://truu-success.vercel.app) (sobald
Vercel-Deploy durch ist) · später [success.truu.com](https://success.truu.com)

## Was es zeigt

Ein klickbarer Verkaufsbaum mit 8 Verkäufen — Hero ("Du") oben, 6 direkte
Kunden, plus eine Sub-Empfehlung von Kunde #1 (Sale 5) und eine
Sub-Sub-Empfehlung von Kunde #5 (Sale 8). Pro Klick wird angezeigt:

- **Empfehler-Provision** (success bonus, mit Differenzprovisions-Logik)
- **truu Station Bonus** (55 €)
- **Consultant Reward** (110 €) — Wasserstudie-Position
- **Expert Reward** (110 €) — Vortrag + Abschluss-Position
- **Total** pro Verkauf + kumulativ

Booster (Station, Power, World) werden separat angezeigt mit Quali-Status.

## Tech-Stack

- React 18 + Vite
- Vanilla SVG (keine Chart-Library)
- 10 Sprachen via leichtem in-house i18n
- Vercel-Deploy via GitHub-Integration

## Lokal starten

```
npm install
npm run dev
```

## Datenbank

Aktuell stateless — alle Berechnungen rein im Frontend. Optionale
Lead-Erfassung läuft später über die existierende **truu-save**-Supabase
(Project: `zegpxnedcoxhekptofny`), eigene Tabellen mit `success_`-Prefix
zur Trennung von den anderen truu-save-Daten.

## Plan-Quelle

Stand: Plan-Version 04/2026 (THALL/202604DE), siehe
`/Users/timokrause/Library/.../uploads/20260428_success_plan_all_DE.pdf`.
