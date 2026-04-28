// scenario.js — Das konkrete 8-Verkaufs-Szenario, das auf der Webseite
// durchgeklickt wird. Hero (= "Du") ist fertig ausgebildeter Expert,
// macht Wasserstudie + Vortrag + Abschluss bei jedem Verkauf, an dem
// er beteiligt ist.
//
// Verkaufsbaum:
//
//                    DU (Hero, fertiger Expert)
//                  /  /  /  \  \  \
//                 1  2  3  4  6  7
//                 |
//                 5
//                 |
//                 8
//
// Sales 1, 2, 3, 4, 6, 7 sind Direktverkäufe vom Hero (= Eigenverkauf).
// Sale 5 wird von Kunde #1 empfohlen — Hero macht Studie + Abschluss.
// Sale 8 wird von Kunde #5 empfohlen — Hero macht Studie + Abschluss.

import { LEVELS, levelForPoints } from './successPlan'

// Hero-Default-Level: fertiger Expert mit ausreichend Punkten, dass die
// Differenzprovision-Logik sinnvoll greift. Wir nehmen commander★★ (43-90)
// als plausiblen Mid-Career-Stand für die Visualisierung.
export const DEFAULT_HERO_LEVEL_KEY = 'commander_2'

/**
 * Liefert die Heroes-Liste für das Szenario, abhängig vom gewählten
 * Hero-Level. Die direkten Kunden (#1, #5) werden in dem Moment, in
 * dem sie selbst verkaufen, zu navigatoren — sie haben dann 1 success
 * Punkt aus ihrem ersten eigenen Verkauf. Wir vereinfachen aber: alle
 * Empfehler-Kunden gelten als navigator, da sie nur 1-2 Punkte haben.
 */
export function buildHeroes(heroLevelKey = DEFAULT_HERO_LEVEL_KEY) {
  const heroLevel = LEVELS.find(l => l.key === heroLevelKey) || LEVELS[3]
  const navigatorLevel = LEVELS[0]   // navigator
  return [
    { id: 'hero',     label: 'Du',          sponsorId: null,   level: heroLevel },
    { id: 'cust1',    label: 'Kunde 1',     sponsorId: 'hero', level: navigatorLevel },
    { id: 'cust2',    label: 'Kunde 2',     sponsorId: 'hero', level: navigatorLevel },
    { id: 'cust3',    label: 'Kunde 3',     sponsorId: 'hero', level: navigatorLevel },
    { id: 'cust4',    label: 'Kunde 4',     sponsorId: 'hero', level: navigatorLevel },
    { id: 'cust5',    label: 'Kunde 5',     sponsorId: 'cust1', level: navigatorLevel },
    { id: 'cust6',    label: 'Kunde 6',     sponsorId: 'hero', level: navigatorLevel },
    { id: 'cust7',    label: 'Kunde 7',     sponsorId: 'hero', level: navigatorLevel },
    { id: 'cust8',    label: 'Kunde 8',     sponsorId: 'cust5', level: navigatorLevel },
  ]
}

/**
 * Die 8 Verkäufe in chronologischer Reihenfolge. Jeder Verkauf
 * spezifiziert wer empfohlen hat (directSeller), wer die Studie
 * macht (consultant), wer den Abschluss macht (expert) und wer das
 * Wasser ausgeteilt hat (station).
 *
 * Hero ist fertiger Expert → er bekommt sowohl consultant als auch
 * expert reward bei jedem Verkauf, an dem er beteiligt ist. Der
 * direkte Empfehler kann aber ein Kunde aus seiner Downline sein.
 */
export function buildSales(heroes, market = 'de') {
  void market
  return [
    {
      n: 1, customerId: 'cust1',
      directSellerId: 'hero',  consultantId: 'hero', expertId: 'hero', stationId: 'hero',
      narrative: 'Du empfiehlst direkt deinen ersten Kunden — du machst alles selbst.',
    },
    {
      n: 2, customerId: 'cust2',
      directSellerId: 'hero',  consultantId: 'hero', expertId: 'hero', stationId: 'hero',
      narrative: 'Zweiter Direktverkauf.',
    },
    {
      n: 3, customerId: 'cust3',
      directSellerId: 'hero',  consultantId: 'hero', expertId: 'hero', stationId: 'hero',
      narrative: 'Dritter Direktverkauf.',
    },
    {
      n: 4, customerId: 'cust4',
      directSellerId: 'hero',  consultantId: 'hero', expertId: 'hero', stationId: 'hero',
      narrative: 'Vierter Direktverkauf.',
    },
    {
      n: 5, customerId: 'cust5',
      // Kunde #1 empfiehlt; Hero macht Wasserstudie, Vortrag, Abschluss
      directSellerId: 'cust1', consultantId: 'hero', expertId: 'hero', stationId: 'hero',
      narrative: 'Kunde 1 empfiehlt weiter — du übernimmst Wasserstudie, Vortrag und Abschluss. Differenzprovision für dich, Empfehler-Provision für Kunde 1.',
    },
    {
      n: 6, customerId: 'cust6',
      directSellerId: 'hero',  consultantId: 'hero', expertId: 'hero', stationId: 'hero',
      narrative: 'Sechster Direktverkauf — du erreichst die nächste Karrierestufe.',
    },
    {
      n: 7, customerId: 'cust7',
      directSellerId: 'hero',  consultantId: 'hero', expertId: 'hero', stationId: 'hero',
      narrative: 'Siebter Direktverkauf.',
    },
    {
      n: 8, customerId: 'cust8',
      // Kunde #5 empfiehlt; Hero macht alles
      directSellerId: 'cust5', consultantId: 'hero', expertId: 'hero', stationId: 'hero',
      narrative: 'Sub-Empfehlung: Kunde 5 (selbst über Kunde 1 in dein Team gekommen) empfiehlt seinen ersten Kunden weiter. Du verdienst zusätzlich an dieser zweiten Generation.',
    },
  ]
}

void levelForPoints
