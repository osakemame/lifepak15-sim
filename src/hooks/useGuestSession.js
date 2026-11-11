import { useCallback, useEffect, useRef, useState } from 'react';
import { openGuestPeer } from '../services/session.js';
import {
  HEARTBEAT_MS,
  LINK_TIMEOUT_MS,
  MSG,
  handleLinkMessage,
  makeMessage,
} from '../services/messages.js';

const RETRY_DELAY_MS = 3000;

/**
 * Session côté STAGIAIRE (invité PeerJS).
 * - Se connecte au formateur grâce au code PIN.
 * - Se reconnecte automatiquement si la liaison tombe.
 *
 * status : 'connecting' | 'connected' | 'reconnecting' | 'error'
 */
export function useGuestSession({ pin }) {
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [hostState, setHostState] = useState(null); // dernier STATE reçu du formateur
  const [lastTest, setLastTest] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const connRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer = null;
    let heartbeat = null;
    let peer = null;
    setStatus('connecting');
    setError(null);

    const stopLink = () => {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      connRef.current = null;
      if (peer) {
        peer.destroy();
        peer = null;
      }
    };

    const connect = async (first) => {
      try {
        const res = await openGuestPeer(pin);
        if (cancelled) {
          res.peer.destroy();
          return;
        }
        peer = res.peer;
        const conn = res.conn;
        connRef.current = conn;
        let lastSeen = Date.now();
        setStatus('connected');
        setError(null);
        conn.send(makeMessage(MSG.HELLO, { role: 'trainee' }));

        const lost = () => {
          if (cancelled || connRef.current !== conn) return;
          stopLink();
          setStatus('reconnecting');
          retryTimer = setTimeout(() => connect(false), RETRY_DELAY_MS);
        };

        conn.on('data', (msg) => {
          lastSeen = Date.now();
          if (handleLinkMessage(conn, msg, setLatency)) return;
          if (msg.type === MSG.STATE) setHostState(msg.payload);
          if (msg.type === MSG.TEST) setLastTest({ ...msg.payload, ts: msg.ts });
        });
        conn.on('close', lost);
        conn.on('error', lost);
        peer.on('error', lost);

        // Maintien de la liaison + détection d'une coupure silencieuse (fréquente en 4G)
        heartbeat = setInterval(() => {
          if (Date.now() - lastSeen > LINK_TIMEOUT_MS) lost();
          else if (conn.open) conn.send(makeMessage(MSG.PING, { sentAt: Date.now() }));
        }, HEARTBEAT_MS);
      } catch (err) {
        if (cancelled) return;
        if (first) {
          setError(err);
          setStatus('error');
        } else {
          // Pendant une reconnexion (le formateur recharge peut-être sa page) : on continue d'essayer
          retryTimer = setTimeout(() => connect(false), RETRY_DELAY_MS);
        }
      }
    };

    connect(true);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      stopLink();
    };
  }, [pin, attempt]);

  const send = useCallback((type, payload) => {
    if (connRef.current?.open) connRef.current.send(makeMessage(type, payload));
  }, []);

  const ping = useCallback(() => send(MSG.PING, { sentAt: Date.now() }), [send]);
  // Action du stagiaire (étape 1 : essai ; plus tard NIBP, CPR, ANALYZE, CHOC...)
  const sendAction = useCallback((action, detail) => send(MSG.ACTION, { action, detail }), [send]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { status, error, latency, hostState, lastTest, ping, sendAction, retry };
}
