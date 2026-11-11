import Peer from 'peerjs';
import { peerOptions } from './peerConfig.js';

// Le code PIN à 4 chiffres sert à fabriquer l'identifiant PeerJS de l'hôte (le formateur).
// Le préfixe évite les collisions avec d'autres applications utilisant le même serveur public.
const PEER_PREFIX = 'lp15sdis24-';
export const peerIdFromPin = (pin) => `${PEER_PREFIX}${pin}`;

export const generatePin = () => String(Math.floor(Math.random() * 10000)).padStart(4, '0');
export const isValidPin = (pin) => /^\d{4}$/.test(pin);

/**
 * Ouvre le pair "hôte" (formateur).
 * - Nouvelle session : si le code est déjà pris, un autre code est tiré automatiquement.
 * - Reprise (keepPin = true) : on réessaie le MÊME code, car l'ancien pair peut rester
 *   enregistré quelques secondes sur le serveur après un rafraîchissement de page.
 * Résout { peer, pin }.
 */
export function openHostPeer({ pin, keepPin = false, maxAttempts = 8 } = {}) {
  return new Promise((resolve, reject) => {
    let attempt = 0;

    const tryOpen = (candidate) => {
      attempt += 1;
      const peer = new Peer(peerIdFromPin(candidate), peerOptions);

      const onOpen = () => {
        peer.off('error', onError);
        resolve({ peer, pin: candidate });
      };

      const onError = (err) => {
        peer.off('open', onOpen);
        peer.destroy();
        if (err.type === 'unavailable-id' && attempt < maxAttempts) {
          if (keepPin) setTimeout(() => tryOpen(candidate), 2000);
          else tryOpen(generatePin());
        } else {
          reject(err);
        }
      };

      peer.once('open', onOpen);
      peer.once('error', onError);
    };

    tryOpen(pin || generatePin());
  });
}

/**
 * Ouvre le pair "invité" (stagiaire) et se connecte à l'hôte du code PIN.
 * Résout { peer, conn }. Rejette avec { type: 'peer-unavailable' } si le code n'existe pas,
 * ou { type: 'timeout' } si la connexion n'aboutit pas.
 */
export function openGuestPeer(pin, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const peer = new Peer(undefined, peerOptions);
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      peer.destroy();
      reject(err);
    };

    const timer = setTimeout(() => fail({ type: 'timeout' }), timeoutMs);

    peer.once('error', fail);

    peer.once('open', () => {
      const conn = peer.connect(peerIdFromPin(pin), { reliable: true });
      conn.once('open', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        peer.off('error', fail);
        resolve({ peer, conn });
      });
      conn.once('error', fail);
    });
  });
}

// Mémorisation de la session dans le navigateur (reprise automatique après rafraîchissement)
const STORAGE_KEY = 'lp15.session';
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 h

export function saveSession(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.savedAt || Date.now() - data.savedAt > MAX_AGE_MS) return null;
    if (!isValidPin(data.pin) || !['trainer', 'trainee'].includes(data.role)) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
