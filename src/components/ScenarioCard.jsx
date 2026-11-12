import React, { useState } from 'react';
import { useNow } from '../hooks/useNow.js';
import { scenarioElapsed } from '../engine/runner.js';
import { scenarioTitle } from '../scenarios/scenarioModel.js';

const card = 'rounded-xl bg-anthracite-800 border border-anthracite-600 p-4 space-y-3';
const STATUS = {
  ready: 'Chargé, prêt à démarrer',
  running: 'En cours',
  paused: 'En pause',
  done: 'Chronologie terminée',
  stopped: 'Arrêté',
};
const clock = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

// Scénario en cours sur la page du formateur : chronomètre, démarrage, pause, arrêt, enregistrement d'une MSP temporaire
export default function ScenarioCard({ host, onOpenLibrary, onStart, onPause, onResume, onStop, onReload, onSaveTemp }) {
  const now = useNow(500);
  const [showConsigne, setShowConsigne] = useState(false);
  const sc = host.scenario;

  if (!sc) {
    return (
      <section className={card}>
        <h2 className="font-semibold">Scénario (MSP)</h2>
        <p className="text-sm text-gray-400">Aucun scénario chargé : vous pouvez aussi tout régler à la main ci-dessous.</p>
        <button className="btn btn-primary w-full" onClick={onOpenLibrary}>
          Choisir un scénario
        </button>
      </section>
    );
  }

  const snap = sc.snapshot;
  const elapsed = scenarioElapsed(host, now);

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{scenarioTitle(snap)}</h2>
          <p className="text-sm text-gray-400">
            {STATUS[sc.status] ?? sc.status}
            {sc.temp ? ' · MSP temporaire (non enregistrée)' : ''}
          </p>
        </div>
        <p className="font-mono text-3xl text-fc">{clock(elapsed)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sc.status === 'ready' && (
          <button className="btn btn-primary col-span-2" onClick={onStart}>
            Démarrer le scénario
          </button>
        )}
        {sc.status === 'running' && (
          <button className="btn" onClick={onPause}>
            Pause
          </button>
        )}
        {sc.status === 'paused' && (
          <button className="btn btn-primary" onClick={onResume}>
            Reprendre
          </button>
        )}
        {(sc.status === 'running' || sc.status === 'paused') && (
          <button className="btn" onClick={onStop}>
            Arrêter
          </button>
        )}
        {(sc.status === 'done' || sc.status === 'stopped') && (
          <button className="btn btn-primary col-span-2" onClick={onReload}>
            Recharger le scénario
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn" onClick={() => setShowConsigne((v) => !v)}>
          {showConsigne ? 'Masquer la consigne' : 'Voir la consigne'}
        </button>
        <button className="btn" onClick={onOpenLibrary}>
          Changer de scénario
        </button>
      </div>
      {sc.temp && (
        <button className="btn w-full" onClick={onSaveTemp}>
          Enregistrer cette MSP (code formateur)
        </button>
      )}
      {showConsigne && <p className="whitespace-pre-wrap text-sm text-gray-200">{snap.consigne || 'Pas de consigne.'}</p>}
    </section>
  );
}
