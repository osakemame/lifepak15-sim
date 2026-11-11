// Protocole de messages échangés entre Formateur (hôte) et Stagiaire.
// Chaque message : { type, payload, ts }

export const MSG = {
  // Liaison
  HELLO: 'HELLO', // stagiaire -> formateur, à la connexion
  PING: 'PING', // dans les deux sens, mesure de latence + maintien de la liaison
  PONG: 'PONG',

  // Formateur -> stagiaire
  STATE: 'STATE', // instantané complet de l'état de la session
  TEST: 'TEST', // message d'essai (étape 1)

  // Stagiaire -> formateur
  ACTION: 'ACTION', // action du stagiaire, alimente le journal (ex. NIBP, CPR, ANALYZE...)
};

export const makeMessage = (type, payload = {}) => ({ type, payload, ts: Date.now() });

// Réponse automatique aux PING. Renvoie true si le message a été traité ici.
export function handleLinkMessage(conn, msg, onLatency) {
  if (msg.type === MSG.PING) {
    conn.send(makeMessage(MSG.PONG, { sentAt: msg.payload?.sentAt }));
    return true;
  }
  if (msg.type === MSG.PONG) {
    if (msg.payload?.sentAt) onLatency(Date.now() - msg.payload.sentAt);
    return true;
  }
  return false;
}

// Délais de surveillance de la liaison (réseau 4G : on reste tolérant)
export const HEARTBEAT_MS = 5000;
export const LINK_TIMEOUT_MS = 15000;
