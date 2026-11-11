import React, { useEffect, useState } from 'react';
import { useHostSession } from '../hooks/useHostSession.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { saveSession } from '../services/session.js';
import { mspLabel } from '../scenarios/mspTypes.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Diagnostic from '../components/Diagnostic.jsx';

// Écran FORMATEUR (portrait). Étape 1 : création de session, code PIN, état de la liaison,
// message d'essai et journal horodaté des actions du stagiaire. La télécommande
// (constantes, rythmes, rampes) sera ajoutée à l'étape 4.
export default function TrainerPage({ pin: savedPin, resume, mspType, onQuit }) {
  const { pin, status, error, latency, journal, ping, sendTest, retry } = useHostSession({
    pin: savedPin,
    resume,
    mspType,
  });
  const [copied, setCopied] = useState(false);

  useWakeLock(true);

  // Mémorise la session pour la reprise automatique après rafraîchissement
  useEffect(() => {
    if (pin) saveSession({ role: 'trainer', pin, mspType });
  }, [pin, mspType]);

  const link = pin ? `${window.location.origin}${window.location.pathname}?pin=${pin}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  const time = (ts) => new Date(ts).toLocaleTimeString('fr-FR');

  return (
    <div className="min-h-full flex flex-col gap-4 p-4 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Formateur</h1>
        <StatusBadge status={status} latency={latency} />
      </header>

      {status === 'error' ? (
        <Diagnostic error={error} onRetry={retry} onQuit={onQuit} />
      ) : (
        <>
          <section className="rounded-xl bg-anthracite-800 border border-anthracite-600 p-4 text-center">
            <p className="text-sm text-gray-400">Code de session</p>
            <p className="font-mono text-6xl tracking-[0.3em] text-fc py-2">{pin ?? '····'}</p>
            <p className="text-sm text-gray-400">MSP : {mspLabel(mspType)}</p>
            <button className="btn mt-3" onClick={copyLink} disabled={!pin}>
              {copied ? 'Lien copié ✓' : 'Copier le lien stagiaire'}
            </button>
          </section>

          {error && status !== 'error' && (
            <p className="text-xs text-yellow-300">Avertissement réseau : {error.type}</p>
          )}

          <section className="rounded-xl bg-anthracite-800 border border-anthracite-600 p-4 space-y-3">
            <h2 className="font-semibold">Test de liaison</h2>
            <div className="flex gap-3">
              <button className="btn flex-1" onClick={ping} disabled={status !== 'connected'}>
                Mesurer la latence
              </button>
              <button
                className="btn flex-1"
                onClick={() => sendTest(`Message d'essai à ${time(Date.now())}`)}
                disabled={status !== 'connected'}
              >
                Envoyer un essai
              </button>
            </div>
          </section>

          <section className="rounded-xl bg-anthracite-800 border border-anthracite-600 p-4">
            <h2 className="font-semibold mb-2">Journal des actions</h2>
            {journal.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune action pour le moment.</p>
            ) : (
              <ul className="space-y-1 text-sm font-mono">
                {journal.map((entry, i) => (
                  <li key={`${entry.ts}-${i}`}>
                    <span className="text-gray-400">{time(entry.ts)}</span> {entry.action}
                    {entry.detail ? ` — ${entry.detail}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <button className="btn" onClick={onQuit}>
        Terminer la session
      </button>
    </div>
  );
}
