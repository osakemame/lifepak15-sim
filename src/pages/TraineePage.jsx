import React, { useEffect, useMemo, useState } from 'react';
import { useGuestSession } from '../hooks/useGuestSession.js';
import { useWakeLock } from '../hooks/useWakeLock.js';
import { useNow } from '../hooks/useNow.js';
import { useDsa } from '../hooks/useDsa.js';
import { useDsaAudio } from '../hooks/useDsaAudio.js';
import { audioState, onAudioState, setMuted, unlockAudio } from '../services/audio.js';
import { saveSession } from '../services/session.js';
import { normalizeHostState } from '../engine/hostState.js';
import { buildView } from '../engine/viewModel.js';
import Device from '../components/lp15/Device.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Diagnostic from '../components/Diagnostic.jsx';

const TOP_BAR = 34; // hauteur réservée à la barre du haut (px)

function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  } catch {
    /* plein écran indisponible : on ignore */
  }
}

// Écran STAGIAIRE (paysage uniquement) : face avant du LIFEPAK 15 en mode DSA.
// Le stagiaire n'utilise que RCP, ANALYSE, CHOC et PNI ; tout le reste de la face avant est décoratif.
export default function TraineePage({ pin, onQuit }) {
  const { status, error, latency, hostState, sendAction, sendStatus, retry } = useGuestSession({ pin });

  // Mémorise la session pour la reconnexion automatique après rafraîchissement
  useEffect(() => {
    saveSession({ role: 'trainee', pin });
  }, [pin]);

  useWakeLock(true);

  const host = useMemo(() => normalizeHostState(hostState), [hostState]);
  const { s, actions } = useDsa({ host, log: sendAction, report: sendStatus });
  const { onBeat } = useDsaAudio({ s, host });
  const nowMs = useNow(250);

  // Son : les navigateurs exigent un geste de l'utilisateur avant de jouer (le 1er toucher l'active)
  const [audioReady, setAudioReady] = useState(audioState() === 'running');
  const [mute, setMute] = useState(false);
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    const off = onAudioState((st) => setAudioReady(st === 'running'));
    const poll = setInterval(() => setAudioReady(audioState() === 'running'), 500);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      off();
      clearInterval(poll);
    };
  }, []);
  const toggleMute = () => {
    setMuted(!mute);
    setMute(!mute);
  };
  const view = buildView({ host, s, now: new Date(nowMs) });

  const quit = () => {
    if (window.confirm('Quitter la session ?')) onQuit();
  };

  return (
    <div className="trainee-root h-full bg-black">
      {/* Consigne affichée uniquement en portrait */}
      <div className="portrait-warning h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">⟳</div>
        <p className="text-xl font-semibold">Tournez l'appareil en mode paysage</p>
        <p className="text-sm text-gray-400">
          L'écran du moniteur s'affiche uniquement en orientation horizontale.
        </p>
      </div>

      <div className="trainee-content h-full flex flex-col">
        <header
          className="flex items-center justify-between gap-2 px-2 text-xs text-gray-300"
          style={{ height: TOP_BAR }}
        >
          <span className="font-semibold">Session {pin}</span>
          <div className="flex items-center gap-2">
            {!audioReady && !mute && <span className="text-yellow-300">Touchez l'écran pour activer le son</span>}
            <button className="px-2 py-1 rounded bg-anthracite-700" onClick={toggleMute}>
              {mute ? 'Son coupé' : 'Son activé'}
            </button>
            <StatusBadge status={status} latency={latency} />
            <button className="px-2 py-1 rounded bg-anthracite-700" onClick={toggleFullscreen}>
              Plein écran
            </button>
            <button className="px-2 py-1 rounded bg-anthracite-700" onClick={quit}>
              Quitter
            </button>
          </div>
        </header>

        {status === 'error' ? (
          <div className="p-4 max-w-md mx-auto">
            <Diagnostic error={error} onRetry={retry} onQuit={onQuit} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <Device view={view} actions={{ ...actions, onBeat }} reserveTop={TOP_BAR} />
          </div>
        )}
      </div>
    </div>
  );
}
