// Configuration PeerJS.
// Par défaut : serveur de signalisation public gratuit de PeerJS (aucun compte requis).
// Pour utiliser votre propre serveur ou des serveurs TURN, définir des variables
// d'environnement Vite (fichier .env ou variables Netlify) :
//   VITE_PEER_HOST, VITE_PEER_PORT, VITE_PEER_PATH, VITE_PEER_SECURE
//   VITE_ICE_SERVERS = JSON, ex. [{"urls":"turn:...","username":"...","credential":"..."}]

const env = import.meta.env;

export const peerOptions = {
  debug: 1, // 0 = silencieux, 1 = erreurs, 2 = avertissements, 3 = tout
};

if (env.VITE_PEER_HOST) {
  peerOptions.host = env.VITE_PEER_HOST;
  peerOptions.port = Number(env.VITE_PEER_PORT || 443);
  peerOptions.path = env.VITE_PEER_PATH || '/';
  peerOptions.secure = env.VITE_PEER_SECURE !== 'false';
}

if (env.VITE_ICE_SERVERS) {
  try {
    peerOptions.config = { iceServers: JSON.parse(env.VITE_ICE_SERVERS) };
  } catch (e) {
    console.warn('VITE_ICE_SERVERS invalide, valeurs PeerJS par défaut utilisées.', e);
  }
}
