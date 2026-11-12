// État de la session tenu par le FORMATEUR (hôte) et envoyé au stagiaire dans le message STATE.
// Il décrit ce qui est branché, les constantes du patient et le scénario DSA.

export const defaultHostState = (mspType = null) => ({
  mspType,
  // Ce qui est branché sur le patient (modifiable en cours de scénario)
  connections: {
    ecgLeads: false, // câble ECG 4 brins : FC en vert
    spo2: false, // capteur SpO2 : FP (SpO2) en bleu
    cuff: true, // brassard PNI
    padsAttached: false, // électrodes posées (validation du formateur avant l'analyse)
  },
  // Constantes du patient. Valeurs de départ modifiables ; PA normale adulte = 120/80 (choix utilisateur).
  vitals: { hr: 75, spo2: 98, sys: 120, dia: 80 },
  rhythm: 'sinus', // rythme affiché sur le tracé ECG (voir engine/rhythms.js)
  scenario: null, // scénario chargé { id, name, variant, status, startedAt, pausedAt, temp, snapshot } (engine/runner.js)
  ramps: [], // évolutions progressives en cours (engine/ramps.js)
  scheduled: [], // changements de rythme programmés
  // Scénario DSA
  dsa: {
    afterShock: 'keep', // rythme appliqué après un choc délivré ('keep' = inchangé)
    shocksPlanned: 1, // nombre d'analyses « choc conseillé » avant « choc non conseillé »
    forceNext: 'auto', // 'auto' | 'advised' | 'not' : résultat imposé pour la prochaine analyse
    forceId: 0, // change à chaque nouveau forçage
  },
  resetId: 0, // incrémenté pour remettre l'écran du stagiaire à zéro
});

// Complète un état partiel (ancien état enregistré, ou STATE reçu avant que tout soit défini).
export function normalizeHostState(raw) {
  const d = defaultHostState(raw?.mspType ?? null);
  return {
    ...d,
    ...raw,
    connections: { ...d.connections, ...(raw?.connections ?? {}) },
    vitals: { ...d.vitals, ...(raw?.vitals ?? {}) },
    dsa: { ...d.dsa, ...(raw?.dsa ?? {}) },
    ramps: Array.isArray(raw?.ramps) ? raw.ramps : [],
    scheduled: Array.isArray(raw?.scheduled) ? raw.scheduled : [],
  };
}

// ---------- Enregistrement local (navigateur du formateur) : reprise après rafraîchissement ----------
const key = (kind, pin) => `lp15.${kind}.${pin}`;

function read(kind, pin) {
  try {
    const raw = localStorage.getItem(key(kind, pin));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(kind, pin, value) {
  try {
    localStorage.setItem(key(kind, pin), JSON.stringify(value));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export const loadHostState = (pin) => (pin ? read('state', pin) : null);
export const saveHostState = (pin, state) => pin && write('state', pin, state);
export const loadJournal = (pin) => (pin ? (read('journal', pin) ?? []) : []);
export const saveJournal = (pin, journal) => pin && write('journal', pin, journal);

export function clearHostData(pin) {
  try {
    localStorage.removeItem(key('state', pin));
    localStorage.removeItem(key('journal', pin));
  } catch {
    /* ignore */
  }
}
