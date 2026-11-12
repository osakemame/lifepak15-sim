// Machine à états de l'écran du stagiaire en mode DSA (semi-automatique).
// Fonction pure : aucun son, aucun minuteur, aucun affichage ici (voir hooks/useDsa.js).
//
// Séquence (confirmée par vos réponses et vos vidéos) :
//   surveillance --ANALYSE--> padsStart (« Mise en route dériv palettes »)
//     -> padsWait (« Connectez les électrodes », jusqu'à validation du formateur)
//     -> analysing (« Analyse en cours, reculez vous »)
//        -> shockAdvised (« Choc conseillé ») -> charging -> ready (« Appuyer bouton CHOC! »)
//             --CHOC--> blank -> delivered (« Energie délivrée ») -> rcp (« Débuter RCP » 2:00)
//        -> notAdvised (« Choc non conseillé ») -> rcp
//   rcp (2:00 -> 0:00) -> awaitAnalyse (« Appuyer sur ANALYSE »), le stagiaire doit rappuyer sur ANALYSE.

import { SHOCK_JOULES } from './lp15Texts.js';

export const initialState = () => ({
  phase: 'surveillance',
  padsLead: false, // dérivation « palettes » activée (après le premier appui sur ANALYSE)
  analyses: 0, // nombre d'analyses lancées
  shocksDelivered: 0,
  metronome: false,
  rcpLed: false, // LED du bouton RCP : allumée dès le 1er appui sur RCP, jusqu'à l'extinction de l'appareil
  rcpMode: 'ad-abs', // dernier mode de métronome choisi par le stagiaire
  menuOpen: false, // menu du bouton RCP affiché
  charge: 0, // joules affichés pendant la charge
  rcpRemaining: 0, // secondes restantes du compte à rebours RCP
  consumedForceId: 0, // dernier forçage du formateur déjà appliqué
  pni: { status: 'idle', cuff: 0, sys: null, dia: null, map: null }, // idle | measuring | done
});

// Pression du brassard affichée pendant la mesure (visuel) : monte, puis redescend vers la systolique.
export function cuffAt(p, sys) {
  const peak = sys + 25;
  if (p < 0.7) return Math.round(20 + (peak - 20) * (p / 0.7));
  return Math.round(peak - (peak - sys) * ((p - 0.7) / 0.3));
}

// Résultat de la prochaine analyse, décidé par le scénario du formateur :
//  - 'forceNext' (choc conseillé / non conseillé) s'applique une seule fois, à la prochaine analyse ;
//  - sinon : « choc conseillé » tant que le nombre de chocs prévus n'est pas atteint.
export function decideAdvised(host, s) {
  const { forceNext, forceId, shocksPlanned } = host.dsa;
  if (forceNext !== 'auto' && forceId !== s.consumedForceId) {
    return { advised: forceNext === 'advised', forceId };
  }
  return { advised: s.shocksDelivered < shocksPlanned, forceId: s.consumedForceId };
}

const startAnalysis = (s) => ({
  ...s,
  phase: 'analysing',
  analyses: s.analyses + 1,
  metronome: false,
  menuOpen: false,
});

// ANALYSE peut être appuyé à tout moment, sauf pendant le démarrage, l'attente des électrodes,
// l'analyse elle-même et l'instant du choc.
const ANALYSE_BLOCKED = ['padsStart', 'padsWait', 'analysing', 'blank'];

export function reducer(s, a) {
  // Appareil éteint : seul MARCHE (ou la remise à zéro du formateur) réagit
  if (s.phase === 'off' && a.type !== 'POWER_ON' && a.type !== 'RESET') return s;
  switch (a.type) {
    case 'RESET':
      return initialState();

    // MARCHE : l'extinction efface tous les réglages ; le rallumage repart comme au début de la session
    case 'POWER_OFF':
      return { ...initialState(), phase: 'off', consumedForceId: s.consumedForceId };

    case 'POWER_ON':
      return s.phase === 'off' ? { ...initialState(), consumedForceId: s.consumedForceId } : s;

    case 'ANALYSE_PRESS':
      if (ANALYSE_BLOCKED.includes(s.phase)) return s;
      // Premier appui : l'appareil passe sur les palettes (message « Mise en route dériv palettes »)
      if (!s.padsLead) return { ...s, phase: 'padsStart', padsLead: true, metronome: false, menuOpen: false };
      return a.attached ? startAnalysis(s) : { ...s, phase: 'padsWait', metronome: false, menuOpen: false };

    case 'PADS_PROMPT':
      if (s.phase !== 'padsStart') return s;
      return a.attached ? startAnalysis(s) : { ...s, phase: 'padsWait' };

    case 'PADS_ATTACHED':
      return s.phase === 'padsWait' ? startAnalysis(s) : s;

    case 'ANALYSIS_DONE':
      if (s.phase !== 'analysing') return s;
      return {
        ...s,
        phase: a.advised ? 'shockAdvised' : 'notAdvised',
        consumedForceId: a.forceId ?? s.consumedForceId,
      };

    case 'TO_CHARGING':
      return { ...s, phase: 'charging', charge: 0 };

    case 'CHARGE_TICK':
      return s.phase === 'charging' ? { ...s, charge: Math.min(SHOCK_JOULES, a.charge) } : s;

    case 'CHARGE_DONE':
      return s.phase === 'charging' ? { ...s, phase: 'ready', charge: SHOCK_JOULES } : s;

    case 'SHOCK_PRESS':
      if (s.phase !== 'ready') return s;
      return { ...s, phase: 'blank', shocksDelivered: s.shocksDelivered + 1 };

    case 'SHOCK_SHOWN':
      return s.phase === 'blank' ? { ...s, phase: 'delivered' } : s;

    case 'TO_RCP':
      // Le métronome ne démarre pas tout seul : le stagiaire le lance avec le bouton RCP
      return { ...s, phase: 'rcp', rcpRemaining: a.seconds };

    case 'RCP_TICK': {
      if (s.phase !== 'rcp') return s;
      const left = s.rcpRemaining - 1;
      return left > 0
        ? { ...s, rcpRemaining: left }
        : { ...s, phase: 'awaitAnalyse', rcpRemaining: 0, metronome: false };
    }

    case 'RCP_MENU':
      if (s.phase === 'analysing' || s.phase === 'blank') return s;
      return { ...s, menuOpen: !s.menuOpen, rcpLed: true };

    case 'RCP_CHOOSE':
      // a.mode : clé de RCP_MODES, ou 'stop' (« Arrêter métronome »)
      if (s.phase === 'analysing' || s.phase === 'blank') return s;
      return a.mode === 'stop'
        ? { ...s, metronome: false, menuOpen: false, rcpLed: true }
        : { ...s, metronome: true, rcpMode: a.mode, menuOpen: false, rcpLed: true };

    case 'PNI_START':
      return s.pni.status === 'measuring' ? s : { ...s, pni: { ...s.pni, status: 'measuring', cuff: 20 } };

    case 'PNI_TICK':
      return s.pni.status === 'measuring' ? { ...s, pni: { ...s.pni, cuff: a.cuff } } : s;

    case 'PNI_DONE': {
      // PAM approchée (formule classique) : l'appareil réel ne suit pas exactement cette formule
      const map = Math.round((a.sys + 2 * a.dia) / 3);
      return { ...s, pni: { status: 'done', cuff: 0, sys: a.sys, dia: a.dia, map } };
    }

    default:
      return s;
  }
}
