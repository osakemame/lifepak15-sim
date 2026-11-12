// Résumé automatique pour le débriefing, calculé à partir du journal (lignes les plus récentes en premier).
// Fonction pure : aucune donnée n'est conservée ailleurs que dans le journal du formateur.

const fmt = (ms) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
};
export const formatDelay = fmt;

export function computeDebrief(journal) {
  const entries = [...journal].sort((a, b) => a.ts - b.ts); // du plus ancien au plus récent
  if (!entries.length) return null;

  // Origine du temps : dernier démarrage de scénario, sinon première ligne du journal
  const starts = entries.filter((e) => e.action === 'Scénario' && /^Démarré/.test(e.detail ?? ''));
  const t0 = starts.length ? starts[starts.length - 1].ts : entries[0].ts;
  const after = entries.filter((e) => e.ts >= t0);

  const firstAnalysePress = after.find((e) => e.source === 'stagiaire' && e.action === 'ANALYSE');
  const analyses = after.filter((e) => e.source === 'appareil' && /^Analyse n°/.test(e.detail ?? ''));
  const advised = after.filter((e) => e.source === 'appareil' && /choc conseillé$/.test(e.detail ?? '') && !/non/.test(e.detail));
  const shocks = after.filter((e) => e.source === 'stagiaire' && e.action === 'CHOC');
  const ready = after.filter((e) => e.source === 'appareil' && e.action === 'CHOC');
  const cycles = after.filter((e) => e.source === 'appareil' && /^Début des 2 minutes/.test(e.detail ?? ''));
  const metro = after.find((e) => e.source === 'stagiaire' && e.action === 'RCP' && /métronome démarré/.test(e.detail ?? ''));
  const pni = after.filter((e) => e.source === 'appareil' && e.action === 'PNI');
  const powerOff = after.filter((e) => e.action === 'MARCHE' && /éteint/.test(e.detail ?? ''));

  // Délai entre « Appuyer bouton CHOC » (appareil prêt) et l'appui du stagiaire
  const shockDelays = shocks.map((s) => {
    const r = [...ready].reverse().find((x) => x.ts <= s.ts);
    return r ? s.ts - r.ts : null;
  });

  return {
    durationMs: entries[entries.length - 1].ts - t0,
    firstAnalyseMs: firstAnalysePress ? firstAnalysePress.ts - t0 : null,
    firstShockMs: shocks.length ? shocks[0].ts - t0 : null,
    analyses: analyses.length,
    shockAdvisedCount: advised.length,
    shocks: shocks.length,
    shockDelays,
    rcpCycles: cycles.length,
    metronomeMs: metro ? metro.ts - t0 : null,
    pni: pni.map((e) => e.detail),
    powerOffs: powerOff.length,
  };
}
