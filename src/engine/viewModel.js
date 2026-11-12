// Traduit (état du formateur + état de la machine DSA + heure) en « ce qu'affiche l'écran ».
// Fonction pure : l'écran (components/lp15/Screen.jsx) ne contient aucune logique métier.

import { RHYTHMS } from './rhythms.js';
import { RCP_MODES, RCP_STOP_LABEL, SHOCK_JOULES, TEXTS } from './lp15Texts.js';

const pad2 = (n) => String(n).padStart(2, '0');
export const formatClock = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
export const formatCountdown = (sec) => `${Math.floor(sec / 60)}:${pad2(sec % 60)}`;

// Bloc fréquence (en haut à gauche) : l'étiquette et la couleur dépendent de la source.
//   câble ECG 4 brins -> « FC » vert ; capteur SpO2 -> « FP (SpO2) » bleu ;
//   mesure PNI seule -> « FP (PNI) » blanc ; rien -> « FC » vert avec « --- ».
function heartBlock(c, v, s) {
  const hr = v.hr > 0 ? v.hr : null; // FC à 0 (FV, asystolie) : « --- »
  if (c.ecgLeads) return { label: 'FC', color: 'green', value: hr };
  if (c.spo2) return { label: 'FP (SpO2)', color: 'blue', value: hr };
  if (s.pni.status === 'done') return { label: 'FP (PNI)', color: 'white', value: hr };
  return { label: 'FC', color: 'green', value: null };
}

function pniBlock(s) {
  if (s.pni.status === 'measuring') return { mode: 'measuring', cuff: s.pni.cuff };
  if (s.pni.status === 'done') {
    if (!(s.pni.sys > 0)) return { mode: 'none' }; // non mesurable (ACR, choc majeur) : tirets
    return { mode: 'done', sys: s.pni.sys, dia: s.pni.dia, map: s.pni.map };
  }
  return { mode: 'none' };
}

function modalFor(s) {
  switch (s.phase) {
    case 'awaitAnalyse':
      return { kind: 'dsa', title: TEXTS.modeDsa, lines: [TEXTS.pressAnalyse] };
    case 'padsWait':
      return { kind: 'pads', title: TEXTS.modeDsa, lines: [TEXTS.connectPads] };
    case 'analysing':
      return { kind: 'dsa', title: TEXTS.modeDsa, lines: [TEXTS.analysing] };
    case 'shockAdvised':
      return { kind: 'dsa', title: TEXTS.modeDsa, lines: [TEXTS.shockAdvised] };
    case 'notAdvised':
      return { kind: 'dsa', title: TEXTS.modeDsa, lines: [TEXTS.shockNotAdvised] };
    case 'rcp':
      return {
        kind: 'rcp',
        title: TEXTS.modeDsa,
        lines: [TEXTS.startCpr],
        countdown: formatCountdown(s.rcpRemaining),
      };
    case 'charging':
      return {
        kind: 'charging',
        title: TEXTS.modeDsa,
        lines: [TEXTS.charging(SHOCK_JOULES)],
        charge: s.charge,
        target: SHOCK_JOULES,
      };
    case 'ready':
      return {
        kind: 'ready',
        title: TEXTS.modeDsa,
        lines: [TEXTS.chargedLine1(SHOCK_JOULES), TEXTS.chargedLine2],
      };
    case 'delivered':
      return { kind: 'delivered', title: TEXTS.modeDsa, lines: [TEXTS.delivered] };
    default:
      return null; // surveillance, padsStart, blank
  }
}

// Lignes du bandeau d'état (deux lignes visibles au maximum, comme sur l'appareil).
function bandLines(c, s, hasModal) {
  const lines = [];
  if (s.phase === 'padsStart') lines.push(TEXTS.band.padsStart);
  // « SpO2: Capteur non détecté » n'apparaît que lorsqu'une fenêtre est affichée (vu sur les vidéos)
  if (!c.spo2 && hasModal) lines.push(TEXTS.band.spo2NoSensor);
  // La ligne RCP apparaît quand le métronome est actif (mode choisi par le stagiaire).
  if (s.metronome) lines.push((RCP_MODES[s.rcpMode] ?? RCP_MODES['ad-abs']).band);
  if (s.phase === 'surveillance' || s.phase === 'padsStart') lines.push(TEXTS.band.surveillance);
  return lines.slice(0, 2);
}

export function buildView({ host, s, now }) {
  const c = host.connections;
  const v = host.vitals;
  const modal = modalFor(s);

  return {
    clock: formatClock(now),
    off: s.phase === 'off', // appareil éteint : écran noir
    blank: s.phase === 'blank', // écran noir au moment du choc
    heart: heartBlock(c, v, s),
    // Sans pouls (FV, asystolie, AESP) : la SpO2 s'affiche en tirets
    spo2: { value: c.spo2 && RHYTHMS[host.rhythm]?.pulse !== false && v.spo2 > 0 ? v.spo2 : null, connected: c.spo2 },
    pni: pniBlock(s),
    traces: {
      // Étape 2 : tracés statiques. L'animation (balayage, rythmes) arrive à l'étape 3.
      ecgLabel: s.padsLead ? 'Palettes x1.0' : 'II x1.0',
      // pointillés = rien de branché ; ligne continue = palettes actives sans signal ; tracé = signal
      rhythm: host.rhythm,
      hr: v.hr,
      spo2: v.spo2,
      ecgMode: c.ecgLeads || c.padsAttached ? 'signal' : s.padsLead ? 'flat' : 'dashed',
      spo2Signal: c.spo2,
    },
    modal,
    band: bandLines(c, s, Boolean(modal)),
    rcpMenu: s.menuOpen
      ? [
          ...Object.entries(RCP_MODES).map(([key, m]) => ({ key, label: m.menu, active: s.metronome && s.rcpMode === key })),
          { key: 'stop', label: RCP_STOP_LABEL, active: false },
        ]
      : null,
    leds: {
      power: s.phase !== 'off',
      rcp: s.rcpLed,
      analyse: s.phase === 'analysing',
      pni: s.pni.status === 'measuring',
    },
    shockReady: s.phase === 'ready',
  };
}
