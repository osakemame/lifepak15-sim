// Modèle d'un scénario (MSP) : validation et fusion. Fichier partagé par l'application et par la fonction
// serveur Netlify (netlify/functions/scenarios.mjs) : aucune dépendance au navigateur ni à React.
//
// Un scénario :
//  {
//    id, name, variant, consigne,
//    start:  { rhythm, hr, spo2, sys, dia },          valeurs de départ
//    dsa:    { shocksPlanned, afterShock },           chocs conseillés à la suite, rythme après un choc
//    events: [ { at, type:'ramp',   key, to, durationSec }     évolution progressive des constantes
//            | { at, type:'rhythm', rhythm }                    changement de rythme
//            | { at, type:'set',    values:{hr,spo2,sys,dia} }  valeurs imposées d'un coup ],
//    order, updatedAt
//  }
//  `at` = secondes après le démarrage du scénario.

import { RHYTHMS } from '../engine/rhythms.js';

export const VITAL_KEYS = ['hr', 'spo2', 'sys', 'dia'];
const LIMITS = { hr: [0, 250], spo2: [0, 100], sys: [0, 260], dia: [0, 180] };
const MAX_EVENTS = 40;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const clamp = (key, v) => Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], Math.round(v)));

export const newScenarioId = () => `msp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Valide et nettoie un scénario. Retourne { ok:true, scenario } ou { ok:false, error }.
 * Utilisée côté serveur avant tout enregistrement : on ne fait jamais confiance au navigateur.
 */
export function validateScenario(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Scénario absent' };
  const id = str(raw.id, 60);
  if (!/^[A-Za-z0-9_-]{3,60}$/.test(id)) return { ok: false, error: 'Identifiant invalide' };
  const name = str(raw.name, 80);
  if (!name) return { ok: false, error: 'Le nom est obligatoire' };

  const start = raw.start ?? {};
  if (!RHYTHMS[start.rhythm]) return { ok: false, error: 'Rythme de départ inconnu' };
  const startOut = { rhythm: start.rhythm };
  for (const k of VITAL_KEYS) {
    if (!isNum(start[k])) return { ok: false, error: `Valeur de départ invalide : ${k}` };
    startOut[k] = clamp(k, start[k]);
  }

  const dsa = raw.dsa ?? {};
  const afterShock = dsa.afterShock === 'keep' || RHYTHMS[dsa.afterShock] ? dsa.afterShock : 'keep';
  const dsaOut = {
    shocksPlanned: isNum(dsa.shocksPlanned) ? Math.min(9, Math.max(0, Math.round(dsa.shocksPlanned))) : 0,
    afterShock,
  };

  const evIn = Array.isArray(raw.events) ? raw.events : [];
  if (evIn.length > MAX_EVENTS) return { ok: false, error: `Trop d'évènements (maximum ${MAX_EVENTS})` };
  const events = [];
  for (const e of evIn) {
    if (!e || !isNum(e.at) || e.at < 0 || e.at > 7200) return { ok: false, error: 'Instant d\'un évènement invalide' };
    const at = Math.round(e.at);
    if (e.type === 'ramp') {
      if (!VITAL_KEYS.includes(e.key) || !isNum(e.to) || !isNum(e.durationSec) || e.durationSec < 0 || e.durationSec > 7200) {
        return { ok: false, error: 'Évolution invalide' };
      }
      events.push({ at, type: 'ramp', key: e.key, to: clamp(e.key, e.to), durationSec: Math.round(e.durationSec) });
    } else if (e.type === 'rhythm') {
      if (!RHYTHMS[e.rhythm]) return { ok: false, error: 'Rythme d\'un évènement inconnu' };
      events.push({ at, type: 'rhythm', rhythm: e.rhythm });
    } else if (e.type === 'set') {
      const values = {};
      for (const k of VITAL_KEYS) if (isNum(e.values?.[k])) values[k] = clamp(k, e.values[k]);
      if (!Object.keys(values).length) return { ok: false, error: 'Évènement « valeurs imposées » vide' };
      events.push({ at, type: 'set', values });
    } else {
      return { ok: false, error: 'Type d\'évènement inconnu' };
    }
  }
  events.sort((a, b) => a.at - b.at);

  return {
    ok: true,
    scenario: {
      id,
      name,
      variant: str(raw.variant, 60),
      consigne: str(raw.consigne, 2000),
      start: startOut,
      dsa: dsaOut,
      events,
      order: isNum(raw.order) ? raw.order : 1000,
      updatedAt: isNum(raw.updatedAt) ? raw.updatedAt : Date.now(),
    },
  };
}

// Liste affichée = scénarios de départ (sauf supprimés, remplacés s'ils ont été modifiés) + scénarios enregistrés
export function mergeScenarios(starters, server) {
  const deleted = new Set(server?.deleted ?? []);
  const byId = new Map();
  starters.forEach((s) => {
    if (!deleted.has(s.id)) byId.set(s.id, { ...s, starter: true });
  });
  (server?.scenarios ?? []).forEach((s) => {
    if (!deleted.has(s.id)) byId.set(s.id, { ...s, starter: byId.get(s.id)?.starter ?? false });
  });
  return [...byId.values()].sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000) || a.name.localeCompare(b.name, 'fr'));
}

export const scenarioTitle = (s) => (s.variant ? `${s.name} — ${s.variant}` : s.name);
