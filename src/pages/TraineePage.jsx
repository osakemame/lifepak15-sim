import React, { useEffect } from 'react';
import { useGuestSession } from '../hooks/useGuestSession.js';
import { saveSession } from '../services/session.js';
import { mspLabel } from '../scenarios/mspTypes.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Diagnostic from '../components/Diagnostic.jsx';

// Écran STAGIAIRE (paysage uniquement). Étape 1 : connexion au formateur et test de liaison.
// L'interface du LIFEPAK 15 (écran, boutons, tracés, sons) arrive aux étapes 2 et 3.
export default function TraineePage({ pin, onQuit }) {
  const { status, error, latency, hostState, lastTest, ping, sendAction, retry } =
    useGuestSession({ pin });

  // Mémorise la session pour la reconnexion automatique après rafraîchissement
  useEffect(() => {
    saveSession({ role: 'trainee', pin });
  }, [pin]);

  return (
    <div className="trainee-root h-full">
      {/* Consigne affichée uniquement en portrait */}
      <div className="portrait-warning h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">⟳</div>
        <p className="text-xl font-semibold">Tournez l'appareil en mode paysage</p>
        <p className="text-sm text-gray-400">
          L'écran du moniteur s'affiche uniquement en orientation horizontale.
        </p>
      </div>

      <div className="trainee-content h-full flex flex-col gap-3 p-4">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Stagiaire · session {pin}</h1>
          <StatusBadge status={status} latency={latency} />
        </header>

        {status === 'error' ? (
          <Diagnostic error={error} onRetry={retry} onQuit={onQuit} />
        ) : (
          <div className="flex-1 grid grid-cols-2 gap-3">
            <section className="rounded-xl bg-anthracite-800 border border-anthracite-600 p-4 space-y-2">
              <h2 className="font-semibold">Session</h2>
              <p className="text-sm text-gray-300">
                MSP : {hostState ? mspLabel(hostState.mspType) : '—'}
              </p>
              <div className="flex gap-3 pt-2">
                <button className="btn" onClick={ping} disabled={status !== 'connected'}>
                  Mesurer la latence
                </button>
                <button
                  className="btn"
                  onClick={() => sendAction('TEST', "Action d'essai du stagiaire")}
                  disabled={status !== 'connected'}
                >
                  Envoyer une action d'essai
                </button>
              </div>
            </section>

            <section className="rounded-xl bg-lcd border border-anthracite-600 p-4">
              <h2 className="font-semibold text-fc">Messages du formateur</h2>
              <p className="text-sm text-gray-300 pt-2">
                {lastTest ? lastTest.text : 'Aucun message reçu.'}
              </p>
            </section>
          </div>
        )}

        <button className="btn self-start" onClick={onQuit}>
          Quitter la session
        </button>
      </div>
    </div>
  );
}
