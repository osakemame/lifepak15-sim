// Déroulement d'un scénario sur l'état du formateur : chargement, démarrage, pause, reprise, arrêt.
// Fonctions pures (le temps est passé en paramètre). La chronologie est convertie en évolutions (host.ramps)
// et en changements programmés (host.scheduled) à heure absolue, que advance() (ramps.js) fait avancer.

import { makeRamp } from './ramps.js';

const uid = (now, i) => `${now}-sc${i}`;

// Charge un scénario : valeurs de départ appliquées, écran du stagiaire remis à zéro, chronologie en attente.
// `temp` = scénario temporaire (non enregistré sur le serveur).
export function loadScenario(host, sc, { temp = false } = {}) {
  return {
    ...host,
    mspType: sc.id,
    rhythm: sc.start.rhythm,
    vitals: { hr: sc.start.hr, spo2: sc.start.spo2, sys: sc.start.sys, dia: sc.start.dia },
    ramps: [],
    scheduled: [],
    connections: { ...host.connections, padsAttached: false },
    dsa: { ...host.dsa, shocksPlanned: sc.dsa.shocksPlanned, afterShock: sc.dsa.afterShock, forceNext: 'auto' },
    resetId: host.resetId + 1,
    scenario: { id: sc.id, name: sc.name, variant: sc.variant, status: 'ready', startedAt: null, pausedAt: null, temp, snapshot: sc },
  };
}

export function startScenario(host, now) {
  const sc = host.scenario?.snapshot;
  if (!sc) return host;
  const ramps = [];
  const scheduled = [];
  sc.events.forEach((e, i) => {
    const at = now + e.at * 1000;
    if (e.type === 'ramp') {
      ramps.push({ ...makeRamp({ key: e.key, to: e.to, durationMs: e.durationSec * 1000, delayMs: e.at * 1000, now }), id: uid(now, i) });
    } else if (e.type === 'rhythm') scheduled.push({ id: uid(now, i), at, rhythm: e.rhythm });
    else scheduled.push({ id: uid(now, i), at, set: e.values });
  });
  return { ...host, ramps, scheduled, scenario: { ...host.scenario, status: 'running', startedAt: now, pausedAt: null } };
}

export function pauseScenario(host, now) {
  if (host.scenario?.status !== 'running') return host;
  return { ...host, scenario: { ...host.scenario, status: 'paused', pausedAt: now } };
}

// À la reprise, toute la chronologie est décalée de la durée de la pause
export function resumeScenario(host, now) {
  const sc = host.scenario;
  if (sc?.status !== 'paused') return host;
  const d = now - sc.pausedAt;
  return {
    ...host,
    ramps: (host.ramps ?? []).map((r) => ({ ...r, startAt: r.startAt + d })),
    scheduled: (host.scheduled ?? []).map((x) => ({ ...x, at: x.at + d })),
    scenario: { ...sc, status: 'running', startedAt: sc.startedAt + d, pausedAt: null },
  };
}

export function stopScenario(host) {
  if (!host.scenario) return host;
  return { ...host, ramps: [], scheduled: [], scenario: { ...host.scenario, status: 'stopped' } };
}

// Temps écoulé du scénario (ms)
export function scenarioElapsed(host, now) {
  const sc = host.scenario;
  if (!sc?.startedAt) return 0;
  if (sc.status === 'paused') return sc.pausedAt - sc.startedAt;
  return Math.max(0, now - sc.startedAt);
}
