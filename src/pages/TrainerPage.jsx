import React, { useEffect, useRef, useState } from 'react';
import { useHostSession } from '../hooks/useHostSession.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { saveSession } from '../services/session.js';
import { mspLabel } from '../scenarios/mspTypes.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Diagnostic from '../components/Diagnostic.jsx';
import TrainerPanel from '../components/TrainerPanel.jsx';
import { advance, applyRhythm } from '../engine/ramps.js';
import { RHYTHMS } from '../engine/rhythms.js';

const card = 'rounded-xl bg-anthracite-800 border border-anthracite-600 p-4';

// Libellés de la phase de l'écran du stagiaire (pour la page formateur)
const PHASES = {
  surveillance: 'Surveillance',
  padsStart: 'Mise en route dériv palettes',
  padsWait: 'Attend les électrodes',
  awaitAnalyse: 'Attend un appui sur ANALYSE',
  analysing: 'Analyse en cours',
  shockAdvised: 'Choc conseillé',
  notAdvised: 'Choc non conseillé',
  charging: 'Charge en cours',
  ready: 'Chargé : attend le bouton CHOC',
  blank: 'Choc en cours',
  delivered: 'Énergie délivrée',
  rcp: 'RCP (compte à rebours)',
  off: 'Appareil éteint',
};

const SOURCES = { stagiaire: 'Stagiaire', appareil: 'Appareil', formateur: 'Formateur' };
const sourceColor = {
  stagiaire: 'text-spo2',
  appareil: 'text-gray-400',
  formateur: 'text-choc',
};

// Écran FORMATEUR (portrait). Étape 2 : code de session, état de l'écran du stagiaire,
// panneau de test provisoire et journal horodaté. La télécommande complète arrive à l'étape 4.
export default function TrainerPage({ pin: savedPin, resume, mspType, onQuit }) {
  const {
    pin,
    status,
    error,
    latency,
    host,
    setHost,
    journal,
    clearJournal,
    logLocal,
    traineeStatus,
    ping,
    sendTest,
    retry,
    eraseSavedData,
  } = useHostSession({ pin: savedPin, resume, mspType });

  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'end' | 'clear' | null

  useWakeLock(true);

  // --- Évolutions progressives et changements de rythme programmés : avancent avec l'horloge ---
  const hostRef = useRef(host);
  hostRef.current = host;
  useEffect(() => {
    const timer = setInterval(() => {
      const { patch, events } = advance(hostRef.current, Date.now());
      if (!patch) return;
      setHost((h) => ({ ...h, ...patch }));
      events.forEach((e) => logLocal(e.action, e.detail));
    }, 500);
    return () => clearInterval(timer);
  }, [setHost, logLocal]);

  // --- Rythme après un choc délivré (réglé dans le scénario) ---
  const prevShocks = useRef(0);
  useEffect(() => {
    const n = traineeStatus?.shocksDelivered ?? 0;
    const after = hostRef.current.dsa.afterShock;
    if (n > prevShocks.current && after && after !== 'keep') {
      setHost((h) => applyRhythm(h, after));
      logLocal('Rythme', `Après le choc n°${n} : ${RHYTHMS[after]?.label}`);
    }
    prevShocks.current = n;
  }, [traineeStatus?.shocksDelivered, setHost, logLocal]);

  // Mémorise la session pour la reprise automatique après rafraîchissement
  useEffect(() => {
    if (pin) saveSession({ role: 'trainer', pin, mspType: host.mspType });
  }, [pin, host.mspType]);

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
  const waitingForPads = traineeStatus?.phase === 'padsWait' && !host.connections.padsAttached;

  const validatePads = () => {
    setHost((h) => ({ ...h, connections: { ...h.connections, padsAttached: true } }));
    logLocal('Électrodes', 'Pose des électrodes validée par le formateur');
  };

  const endSession = () => {
    eraseSavedData();
    onQuit();
  };

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
          <section className={`${card} text-center`}>
            <p className="text-sm text-gray-400">Code de session</p>
            <p className="font-mono text-6xl tracking-[0.3em] text-fc py-2">{pin ?? '····'}</p>
            <p className="text-sm text-gray-400">MSP : {mspLabel(host.mspType)}</p>
            <button className="btn mt-3" onClick={copyLink} disabled={!pin}>
              {copied ? 'Lien copié ✓' : 'Copier le lien stagiaire'}
            </button>
          </section>

          {error && <p className="text-xs text-yellow-300">Avertissement réseau : {error.type}</p>}

          <section className={`${card} space-y-2`}>
            <h2 className="font-semibold">Écran du stagiaire</h2>
            {traineeStatus ? (
              <>
                <p className="text-lg text-choc">{PHASES[traineeStatus.phase] ?? traineeStatus.phase}</p>
                <p className="text-sm text-gray-400">
                  Analyses : {traineeStatus.analyses} · Chocs délivrés : {traineeStatus.shocksDelivered} ·
                  Métronome : {traineeStatus.metronome ? 'actif' : 'arrêté'}
                  {traineeStatus.pni === 'measuring' ? ' · PNI en cours' : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Aucun stagiaire connecté pour le moment.</p>
            )}
            {waitingForPads && (
              <button className="btn btn-primary w-full" onClick={validatePads}>
                Valider : électrodes posées
              </button>
            )}
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

          <TrainerPanel host={host} setHost={setHost} logLocal={logLocal} />

          <section className={card}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Journal des actions</h2>
              {journal.length > 0 && (
                <button className="text-sm text-gray-400 underline" onClick={() => setConfirm('clear')}>
                  Effacer
                </button>
              )}
            </div>
            {journal.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune action pour le moment.</p>
            ) : (
              <ul className="space-y-1 text-sm font-mono">
                {journal.map((entry, i) => (
                  <li key={`${entry.ts}-${i}`}>
                    <span className="text-gray-400">{time(entry.ts)}</span>{' '}
                    <span className={sourceColor[entry.source] ?? 'text-gray-400'}>
                      [{SOURCES[entry.source] ?? entry.source}]
                    </span>{' '}
                    {entry.action}
                    {entry.detail ? ` — ${entry.detail}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <button className="btn" onClick={() => setConfirm('end')}>
        Terminer la session
      </button>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-anthracite-600 bg-anthracite-800 p-5">
            <h2 className="text-lg font-bold">
              {confirm === 'end' ? 'Terminer la session ?' : 'Effacer le journal ?'}
            </h2>
            <p className="text-sm text-gray-300">
              {confirm === 'end'
                ? 'Le journal des actions de cette session sera effacé. Assurez-vous d\'avoir terminé le débriefing.'
                : 'Toutes les lignes du journal seront supprimées.'}
            </p>
            <div className="flex gap-3">
              <button className="btn flex-1" onClick={() => setConfirm(null)}>
                Annuler
              </button>
              <button
                className="btn btn-primary flex-1"
                onClick={() => {
                  if (confirm === 'end') endSession();
                  else {
                    clearJournal();
                    setConfirm(null);
                  }
                }}
              >
                {confirm === 'end' ? 'Terminer' : 'Effacer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
