import React from 'react';

// Messages d'aide selon le type d'erreur PeerJS / réseau.
// Usage principal prévu en extérieur via 4G : on guide l'utilisateur vers les bons réflexes.
function explain(error) {
  switch (error?.type) {
    case 'peer-unavailable':
      return {
        title: 'Code introuvable',
        text: "Aucune session ne correspond à ce code. Vérifiez les 4 chiffres et que le formateur a bien créé la session (son écran doit rester ouvert).",
      };
    case 'timeout':
      return {
        title: 'Pas de réponse',
        text: "La connexion n'a pas abouti. Vérifiez votre réseau (4G ou Wi-Fi) et réessayez. Certains réseaux filtrés bloquent ce type de liaison : essayez en 4G.",
      };
    case 'unavailable-id':
      return {
        title: 'Code déjà utilisé',
        text: 'Ce code est déjà pris par une autre session. Créez une nouvelle session.',
      };
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return {
        title: 'Serveur de connexion injoignable',
        text: "Impossible de joindre le serveur de mise en relation. Vérifiez la couverture réseau, désactivez un éventuel filtrage (Wi-Fi d'entreprise) et essayez en 4G.",
      };
    case 'webrtc':
      return {
        title: 'Liaison directe impossible',
        text: "Les deux appareils n'arrivent pas à se connecter directement. Essayez avec un autre réseau (4G sur l'un des deux).",
      };
    default:
      return {
        title: 'Connexion impossible',
        text: error?.message || 'Une erreur est survenue. Réessayez.',
      };
  }
}

export default function Diagnostic({ error, onRetry, onQuit }) {
  const { title, text } = explain(error);
  return (
    <div className="rounded-xl border border-red-500/50 bg-red-950/40 p-4 space-y-3">
      <h2 className="text-lg font-bold text-red-300">{title}</h2>
      <p className="text-sm text-red-100/90">{text}</p>
      {error?.type && <p className="text-xs text-red-200/50">Code technique : {error.type}</p>}
      <div className="flex gap-3">
        {onRetry && (
          <button className="btn" onClick={onRetry}>
            Réessayer
          </button>
        )}
        {onQuit && (
          <button className="btn" onClick={onQuit}>
            Retour à l'accueil
          </button>
        )}
      </div>
    </div>
  );
}
