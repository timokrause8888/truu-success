// scenario.js — Das konkrete Verkaufs-Szenario, das auf der Webseite
// durchgeklickt wird. Hero (= "Du") ist fertig ausgebildeter Expert,
// macht Wasserstudie + Vortrag + Abschluss bei jedem Verkauf, an dem
// er beteiligt ist. Die direkten Kunden empfehlen weiter — ihre Sub-
// Empfehlungen werden mit hierarchischer Outline-Notation beschriftet
// (1, 1.1, 1.1.1, 2.1, 2.1.1, 3.1, 6.1).
//
// Verkaufsbaum (Display-Labels in []):
//
//                          DU
//          /  /  /  /  \  \
//        [1][2][3][4][5][6]                ← Sales 1,2,3,4,6,7
//         |  |  |        |
//      [1.1][2.1][3.1] [6.1]                ← Sales 5,9,10,12
//         |  |
//      [1.1.1][2.1.1]                       ← Sales 8,11
//         |
//      [1.1.1.1]                            ← Sale 13
//
// Stufenwechsel-Logik: User wählt Start-Level oben (z.B. 'navigator');
// mit jedem Verkauf kommt ein success Punkt dazu, bei Erreichen der
// nächsten Schwelle wechselt die Stufe automatisch und der Verdienst-
// plan rechnet hoch (z.B. nav 0-6 → commander ab 7).

import { LEVELS, levelForPoints } from './successPlan'

export const DEFAULT_HERO_LEVEL_KEY = 'navigator'

const HERO_LABELS = {
  hero:   'Du',
  // Reihe 1: Direktkunden des Heros, linear nummeriert 1-6
  cust1:  '1',  cust2:  '2',  cust3:  '3',  cust4:  '4',
  cust6:  '5',  cust7:  '6',
  // Reihe 2: Sub-Empfehlungen
  cust5:  '1.1',   cust9:  '2.1',   cust10: '3.1',  cust12: '6.1',
  // Reihe 3: Sub-Sub-Empfehlungen
  cust8:  '1.1.1', cust11: '2.1.1',
  // Reihe 4: Sub-Sub-Sub
  cust13: '1.1.1.1',
}

export function buildHeroes(heroLevelKey = DEFAULT_HERO_LEVEL_KEY, atSaleN = null) {
  const startLevel = LEVELS.find(l => l.key === heroLevelKey) || LEVELS[0]
  const accumulatedPoints = atSaleN != null
    ? startLevel.min + atSaleN
    : startLevel.min
  const currentHeroLevel = levelForPoints(accumulatedPoints)
  const navigatorLevel = LEVELS[0]
  const mk = (id, sponsorId) => ({
    id, sponsorId,
    label: HERO_LABELS[id] || id,
    level: id === 'hero' ? currentHeroLevel : navigatorLevel,
  })
  return [
    mk('hero',   null),
    // Reihe 1
    mk('cust1',  'hero'),
    mk('cust2',  'hero'),
    mk('cust3',  'hero'),
    mk('cust4',  'hero'),
    mk('cust6',  'hero'),    // = '5' im Display
    mk('cust7',  'hero'),    // = '6' im Display
    // Reihe 2
    mk('cust5',  'cust1'),   // 1.1
    mk('cust9',  'cust2'),   // 2.1
    mk('cust10', 'cust3'),   // 3.1
    mk('cust12', 'cust7'),   // 6.1
    // Reihe 3
    mk('cust8',  'cust5'),   // 1.1.1
    mk('cust11', 'cust9'),   // 2.1.1
    // Reihe 4
    mk('cust13', 'cust8'),   // 1.1.1.1
  ]
}

export function heroLevelAtSale(heroLevelKey, saleN) {
  const startLevel = LEVELS.find(l => l.key === heroLevelKey) || LEVELS[0]
  return levelForPoints(startLevel.min + saleN)
}

/**
 * Die 13 Verkäufe in chronologischer Reihenfolge.
 * Sales 1-8 wie zuvor (Hero direkt, dann Sub von Kunde 1, …).
 * Sales 9-13 sind weitere Sub-Empfehlungen aus verschiedenen Zweigen.
 */
export function buildSales() {
  const direct = (n, customerId, narrative) => ({
    n, customerId,
    directSellerId: 'hero', consultantId: 'hero', expertId: 'hero', stationId: 'hero',
    narrative,
  })
  const subRecommendation = (n, customerId, fromId, narrative) => ({
    n, customerId,
    directSellerId: fromId, consultantId: 'hero', expertId: 'hero', stationId: 'hero',
    narrative,
  })
  return [
    direct(1, 'cust1', 'Du empfiehlst direkt deinen ersten Kunden — du machst alles selbst.'),
    direct(2, 'cust2', 'Zweiter Direktverkauf.'),
    direct(3, 'cust3', 'Dritter Direktverkauf.'),
    direct(4, 'cust4', 'Vierter Direktverkauf.'),
    subRecommendation(5, 'cust5', 'cust1',
      'Kunde 1 empfiehlt weiter — du übernimmst Wasserstudie, Vortrag und Abschluss. Differenzprovision für dich, Empfehler-Provision für Kunde 1.'),
    direct(6, 'cust6', 'Sechster Direktverkauf — du erreichst gleich die nächste Karrierestufe.'),
    direct(7, 'cust7', 'Siebter Direktverkauf — Stufenwechsel: navigator → commander!'),
    subRecommendation(8, 'cust8', 'cust5',
      'Sub-Empfehlung: Kunde 1.1 (selbst über Kunde 1 in dein Team gekommen) empfiehlt seinen ersten Kunden weiter. Kunde 1 bekommt 0 € (gleiche Stufe), du verdienst die Differenzprovision.'),
    subRecommendation(9, 'cust9', 'cust2',
      'Kunde 2 empfiehlt weiter — neuer Sub-Zweig. Empfehler-Provision an Kunde 2, Differenzprovision an dich.'),
    subRecommendation(10, 'cust10', 'cust3',
      'Auch Kunde 3 zieht nach und empfiehlt seinen ersten Kunden.'),
    subRecommendation(11, 'cust11', 'cust9',
      'Kunde 2.1 empfiehlt selbst weiter — zweite Generation im 2-er Zweig. Kunde 2 bekommt 0 € (gleiche Stufe), du wieder die Differenzprovision.'),
    subRecommendation(12, 'cust12', 'cust7',
      'Kunde 6 empfiehlt weiter — der bisher inaktive Direktkunde wird zum Empfehler.'),
    subRecommendation(13, 'cust13', 'cust8',
      'Sub-Sub-Empfehlung: Kunde 1.1.1 empfiehlt seinen ersten Kunden. Drei Generationen Differenzprovision rollen jetzt durch — kein Empfehler dazwischen bekommt was, weil alle auf navigator-Stufe sind.'),
  ]
}
