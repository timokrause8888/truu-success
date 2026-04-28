// successPlan.js — Provisions-Berechnungslogik für den truu Heroes
// Success Plan. Stand: Plan-Version 04/2026 (THALL/202604DE).
//
// Kern-Konstanten direkt aus der Broschüre. Alle € netto.
// CH-Sätze gelten für Verkäufe in der Schweiz, unabhängig vom Wohnsitz
// des Heroes (laut Broschüre + Abklärung mit Geschäftsführung).

/* ─── Karriere-Levels (success Punkte ⇒ Empfehler-Provision) ───── */
export const LEVELS = [
  // Bronze
  { key: 'navigator',       label: 'navigator',         min: 0,    max: 6,    deBonus: 165, chBonus: 180, group: 'bronze' },
  { key: 'commander',       label: 'commander',         min: 7,    max: 18,   deBonus: 220, chBonus: 240, group: 'bronze' },
  { key: 'commander_1',     label: 'commander ★',       min: 19,   max: 42,   deBonus: 275, chBonus: 300, group: 'bronze' },
  { key: 'commander_2',     label: 'commander ★★',      min: 43,   max: 90,   deBonus: 330, chBonus: 360, group: 'bronze' },
  // Silver
  { key: 'captain',         label: 'captain',           min: 91,   max: 180,  deBonus: 385, chBonus: 420, group: 'silver' },
  { key: 'captain_1',       label: 'captain ★',         min: 181,  max: 350,  deBonus: 440, chBonus: 480, group: 'silver' },
  { key: 'captain_2',       label: 'captain ★★',        min: 351,  max: 650,  deBonus: 495, chBonus: 540, group: 'silver' },
  { key: 'captain_3',       label: 'captain ★★★',       min: 651,  max: 1100, deBonus: 550, chBonus: 600, group: 'silver' },
  // Gold
  { key: 'admiral',         label: 'admiral',           min: 1101, max: 1800, deBonus: 605, chBonus: 660, group: 'gold' },
  { key: 'admiral_1',       label: 'admiral ★',         min: 1801, max: 3000, deBonus: 660, chBonus: 720, group: 'gold' },
  { key: 'admiral_2',       label: 'admiral ★★',        min: 3001, max: 5000, deBonus: 715, chBonus: 780, group: 'gold' },
  { key: 'truu_legend',     label: 'truu legend ★★★',   min: 5001, max: Infinity, deBonus: 770, chBonus: 840, group: 'gold' },
]

/* ─── Sonst-Bonisse ───────────────────────────────────────────── */
export const STATION_BONUS = { de: 55, ch: 60 }   // CH-Schätzung; Broschüre nennt nur DE
export const CONSULTANT_REWARD = 110              // Wasserstudie-Position
export const EXPERT_REWARD = 110                  // Vortrag + Abschluss-Position
export const POWER_BOOSTER_FLAT = 400             // pauschal ab 16 Booster-Punkten/Mon
export const POWER_BOOSTER_THRESHOLD = 16
export const WORLD_BOOSTER_THRESHOLD = 12
// World-Booster ist Pool-anteilig; die Broschüre nennt 400-1.100 €
// als typischen Range bei 12 Punkten. Wir nehmen einen mittleren
// Erwartungswert von 43 €/Booster-Punkt für die Schätzung.
export const WORLD_BOOSTER_EUR_PER_POINT = 43

// Lizenzgebühren (für die optionale Netto-Kalkulation)
export const LICENSE_CONSULTANT = 48      // €/Monat
export const LICENSE_EXPERT = 268         // €/Monat

/* ─── Helper: Level für eine bestimmte Punkt-Anzahl finden ───── */
export function levelForPoints(points) {
  return LEVELS.find(l => points >= l.min && points <= l.max) || LEVELS[0]
}

/**
 * Empfehler-Provision (success bonus) für einen Hero auf einem
 * Karrierelevel, gegen den Tarif des direkten Verkäufers gerechnet
 * (Differenzprovision). Bei Eigenverkauf: voller Tarif.
 *
 * @param {Object} heroLevel — eines der LEVELS-Objekte (Empfehler)
 * @param {Object|null} downlineLevel — Level des direkten Verkäufers
 *   (null = Eigenverkauf)
 * @param {'de'|'ch'} market
 */
export function successBonusFor(heroLevel, downlineLevel, market = 'de') {
  const heroBonus = market === 'ch' ? heroLevel.chBonus : heroLevel.deBonus
  if (!downlineLevel) return heroBonus  // Eigenverkauf
  const downlineBonus = market === 'ch' ? downlineLevel.chBonus : downlineLevel.deBonus
  return Math.max(0, heroBonus - downlineBonus)
}

/**
 * Berechnet alle Provisions-Linien für einen einzelnen Verkauf.
 * Gibt eine Liste zurück, jeweils {recipient, kind, amount, note}.
 *
 * @param {Object} sale
 * @param {string} sale.directSellerId — Hero, der den Verkauf direkt
 *   gemacht hat (= dessen Empfehlung den Kunden zu uns brachte)
 * @param {string} sale.consultantId — Hero, der die Wasserstudie macht
 * @param {string} sale.expertId — Hero, der den Vortrag + Abschluss macht
 * @param {string} sale.stationId — Hero, der das Wasser ausgeteilt hat
 * @param {Array<{id: string, sponsorId: string|null, level: Object,
 *   licenseInTraining?: boolean}>} heroes — alle relevanten Heroes
 * @param {'de'|'ch'} market
 * @returns {Array<{recipient: string, kind: string, amount: number, note?: string}>}
 */
export function commissionLines(sale, heroes, market = 'de') {
  const byId = new Map(heroes.map(h => [h.id, h]))
  const lines = []

  // ─── 1. Empfehler-Kette (Differenzprovision) ──────────────────
  // Vom direkten Verkäufer aufwärts: jeder bekommt die Differenz
  // zwischen seinem Tarif und dem höchsten bereits ausgezahlten
  // Tarif unter ihm (= 'Roll-up' im klassischen MLM).
  let highestPaidBonus = 0   // höchster Tarif, der bereits weiter unten gezahlt wurde
  let currentId = sale.directSellerId
  while (currentId) {
    const hero = byId.get(currentId)
    if (!hero) break
    const bonus = market === 'ch' ? hero.level.chBonus : hero.level.deBonus
    const diff = Math.max(0, bonus - highestPaidBonus)
    if (diff > 0) {
      lines.push({
        recipient: hero.id,
        kind: 'success',
        amount: diff,
        note: highestPaidBonus === 0
          ? `Empfehler-Provision (${hero.level.label})`
          : `Differenz (${hero.level.label} − ${highestPaidBonus} €)`,
      })
      highestPaidBonus = bonus
    }
    currentId = hero.sponsorId
  }

  // ─── 2. truu Station Bonus ────────────────────────────────────
  if (sale.stationId) {
    lines.push({
      recipient: sale.stationId,
      kind: 'station',
      amount: market === 'ch' ? STATION_BONUS.ch : STATION_BONUS.de,
      note: 'Wasser ausgeteilt',
    })
  }

  // ─── 3. Consultant Reward (Wasserstudie) ──────────────────────
  if (sale.consultantId) {
    lines.push({
      recipient: sale.consultantId,
      kind: 'consultant',
      amount: CONSULTANT_REWARD,
      note: 'Wasserstudie betreut',
    })
  }

  // ─── 4. Expert Reward (Vortrag + Abschluss) ───────────────────
  if (sale.expertId) {
    lines.push({
      recipient: sale.expertId,
      kind: 'expert',
      amount: EXPERT_REWARD,
      note: 'Vortrag + Abschluss',
    })
  }

  return lines
}

/**
 * Aggregiert Provisionslinien zu einer Summe pro Hero.
 *
 * @param {Array<{recipient, kind, amount}>} lines
 * @returns {Map<string, {success, station, consultant, expert, total}>}
 */
export function aggregateByHero(lines) {
  const map = new Map()
  for (const l of lines) {
    if (!map.has(l.recipient)) {
      map.set(l.recipient, { success: 0, station: 0, consultant: 0, expert: 0, total: 0 })
    }
    const r = map.get(l.recipient)
    r[l.kind] = (r[l.kind] || 0) + l.amount
    r.total += l.amount
  }
  return map
}

/**
 * Booster-Punkte aus Verkäufen ableiten. Wer am Vertrag direkt
 * beteiligt ist (consultant/expert), bekommt seine Punkte.
 *
 * @param {Array<sale>} sales
 * @returns {Map<string, number>} — Hero-ID ⇒ Booster-Punkte
 */
export function boosterPointsByHero(sales) {
  const map = new Map()
  for (const s of sales) {
    if (s.consultantId) map.set(s.consultantId, (map.get(s.consultantId) || 0) + 1)
    if (s.expertId)     map.set(s.expertId,     (map.get(s.expertId)     || 0) + 1)
  }
  return map
}

/**
 * Success Punkte (= Karrierelevel-Punkte). 1 pro home/mobile, 2 pro
 * fountain. Hier vereinfachen wir: 1 Punkt pro Anlage.
 */
export function successPointsByHero(sales) {
  const map = new Map()
  for (const s of sales) {
    // Empfehler-Punkt geht an den Sponsor des direkten Verkäufers?
    // Nein — success Punkte zählen für JEDEN, der den Verkauf
    // ermöglicht hat. Vereinfacht zählen wir hier nur den direkten
    // Verkäufer; in der Praxis können auch Punkte aufwärts gerollt
    // werden. Für die UI-Visualisierung reicht das.
    if (s.directSellerId) {
      map.set(s.directSellerId, (map.get(s.directSellerId) || 0) + 1)
    }
  }
  return map
}
