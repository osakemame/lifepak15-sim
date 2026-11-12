// Évolutions progressives des constantes (rampes) et changements de rythme programmés.
// Fonctions pures : le temps (now) est passé en paramètre, ce qui permet de reprendre après un
// rafraîchissement de la page du formateur (les rampes sont calculées à partir de l'heure).

import { RHYTHM_HR } from './rhythms.js';

export const VITAL_LIMITS = { hr: [0, 250], spo2: [0, 100], sys: [30, 260], dia: [10, 180] };
export const VITAL_LABELS = {
  hr: 'FC (bpm)',
  spo2: 'SpO2 (%)',
  sys: 'PNI systolique (mmHg)',
  dia: 'PNI diastolique (mmHg)',
};

export const clampVital = (key, value) => {
  const [lo, hi] = VITAL_LIMITS[key];
  return Math.min(hi, Math.max(lo, Math.round(value)));
};

let seq = 0;
const newId = (now) => `${now}-${(seq += 1)}`;

// Une rampe : la valeur part de sa valeur au moment du départ et rejoint `to` en `durationMs`
export function makeRamp({ key, to, durationMs, delayMs = 0, now }) {
  return { id: newId(now), key, to: clampVital(key, to), durationMs, startAt: now + delayMs, from: null };
}

export function makeScheduledRhythm({ rhythm, delayMs, now }) {
  return { id: newId(now), rhythm, at: now + delayMs };
}

// Applique un rythme : la FC prend la valeur type du rythme (modifiable ensuite par le formateur)
export function applyRhythm(host, rhythm) {
  return {
    ...host,
    rhythm,
    vitals: { ...host.vitals, hr: RHYTHM_HR[rhythm] ?? host.vitals.hr },
    ramps: (host.ramps ?? []).filter((r) => r.key !== 'hr'),
  };
}

/**
 * Fait avancer les rampes et les changements de rythme programmés.
 * Retourne { patch, events } ; patch est null s'il n'y a rien à changer.
 *   patch  : { vitals, ramps, scheduled, rhythm? } à fusionner dans l'état du formateur
 *   events : [{ action, detail }] à écrire dans le journal
 */
export function advance(host, now) {
  const ramps = host.ramps ?? [];
  const scheduled = host.scheduled ?? [];
  if (!ramps.length && !scheduled.length) return { patch: null, events: [] };

  const events = [];
  let vitals = host.vitals;
  let rhythm = host.rhythm;
  let changed = false;

  const nextRamps = [];
  for (const r of ramps) {
    if (now < r.startAt) {
      nextRamps.push(r);
      continue;
    }
    const ramp = r.from == null ? { ...r, from: vitals[r.key] } : r;
    if (r.from == null) {
      changed = true;
      events.push({ action: 'Évolution', detail: `${VITAL_LABELS[r.key]} : départ de ${ramp.from} vers ${r.to}` });
    }
    const p = ramp.durationMs > 0 ? Math.min(1, (now - ramp.startAt) / ramp.durationMs) : 1;
    const value = clampVital(r.key, ramp.from + (r.to - ramp.from) * p);
    if (value !== vitals[r.key]) {
      vitals = { ...vitals, [r.key]: value };
      changed = true;
    }
    if (p >= 1) {
      events.push({ action: 'Évolution', detail: `${VITAL_LABELS[r.key]} : ${r.to} atteint` });
      changed = true;
    } else {
      nextRamps.push(ramp);
    }
  }

  const nextScheduled = [];
  for (const sc of scheduled) {
    if (now < sc.at) {
      nextScheduled.push(sc);
      continue;
    }
    rhythm = sc.rhythm;
    vitals = { ...vitals, hr: RHYTHM_HR[sc.rhythm] ?? vitals.hr };
    events.push({ action: 'Rythme', detail: `Rythme programmé appliqué : ${sc.rhythm}` });
    changed = true;
  }

  if (!changed) return { patch: null, events: [] };
  return { patch: { vitals, ramps: nextRamps, scheduled: nextScheduled, rhythm }, events };
}
