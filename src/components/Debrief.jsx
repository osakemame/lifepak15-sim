import React from 'react';
import { computeDebrief, formatDelay } from '../engine/debrief.js';

const card = 'rounded-xl bg-anthracite-800 border border-anthracite-600 p-4';

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-anthracite-700 py-1 text-sm last:border-0">
      <span className="text-gray-300">{label}</span>
      <span className="text-right font-mono">{value}</span>
    </div>
  );
}

// Résumé automatique pour le débriefing (calculé à partir du journal, affiché à l'écran seulement)
export default function Debrief({ journal }) {
  const d = computeDebrief(journal);
  if (!d) return null;
  const dash = (ms) => (ms == null ? '—' : formatDelay(ms));

  return (
    <section className={card}>
      <h2 className="mb-2 font-semibold">Résumé pour le débriefing</h2>
      <Row label="Durée depuis le début" value={formatDelay(d.durationMs)} />
      <Row label="1er appui sur ANALYSE" value={dash(d.firstAnalyseMs)} />
      <Row label="1er choc délivré" value={dash(d.firstShockMs)} />
      <Row label="Analyses / chocs conseillés" value={`${d.analyses} / ${d.shockAdvisedCount}`} />
      <Row label="Chocs délivrés" value={d.shocks} />
      {d.shockDelays.map((ms, i) => (
        <Row key={i} label={`Délai « Appuyer bouton CHOC » → choc n°${i + 1}`} value={dash(ms)} />
      ))}
      <Row label="Cycles de RCP de 2 min lancés" value={d.rcpCycles} />
      <Row label="Métronome lancé après" value={dash(d.metronomeMs)} />
      <Row label="Mesures PNI" value={d.pni.length ? d.pni.map((p) => p.replace('Résultat : ', '')).join(' · ') : '—'} />
      {d.powerOffs > 0 && <Row label="Appareil éteint" value={`${d.powerOffs} fois`} />}
    </section>
  );
}
