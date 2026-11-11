import React from 'react';

const LABELS = {
  starting: { text: 'Démarrage…', color: 'bg-yellow-400' },
  waiting: { text: 'En attente du stagiaire', color: 'bg-yellow-400' },
  connecting: { text: 'Connexion…', color: 'bg-yellow-400' },
  reconnecting: { text: 'Reconnexion…', color: 'bg-yellow-400' },
  connected: { text: 'Connecté', color: 'bg-fc' },
  error: { text: 'Erreur', color: 'bg-red-500' },
};

export default function StatusBadge({ status, latency }) {
  const { text, color } = LABELS[status] ?? LABELS.error;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-anthracite-800 border border-anthracite-600 px-3 py-1 text-sm">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {text}
      {status === 'connected' && latency != null && (
        <span className="text-gray-400">· {latency} ms</span>
      )}
    </span>
  );
}
