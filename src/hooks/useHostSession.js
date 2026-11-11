import { useCallback, useEffect, useRef, useState } from 'react';
import { openHostPeer } from '../services/session.js';
import {
  HEARTBEAT_MS,
  LINK_TIMEOUT_MS,
  MSG,
  handleLinkMessage,
  makeMessage,
} from '../services/messages.js';

/**
 * Session côté FORMATEUR (hôte PeerJS).
 * - Crée (ou reprend) le code PIN et attend la connexion du stagiaire.
 * - Garde la "vérité" de l'état de session et l'envoie au stagiaire (message STATE).
 * - Reçoit les actions du stagiaire dans un journal horodaté.
 *
 * status : 'starting' | 'waiting' | 'connected' | 'error'
 */
export function useHostSession({ pin: initialPin, resume, mspType }) {
  const [pin, setPin] = useState(initialPin || null);
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [journal, setJournal] = useState([]);
  const [attempt, setAttempt] = useState(0);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const lastSeenRef = useRef(0);
  const stateRef = useRef({ mspType });

  // Instantané d'état envoyé au stagiaire (étendu aux étapes suivantes : constantes, rythme...)
  useEffect(() => {
    stateRef.current = { mspType };
    if (connRef.current?.open) connRef.current.send(makeMessage(MSG.STATE, stateRef.current));
  }, [mspType]);

  useEffect(() => {
    let cancelled = false;
    let heartbeat = null;
    setStatus('starting');
    setError(null);

    const attach = (conn) => {
      // Une nouvelle connexion remplace l'ancienne (ex. stagiaire qui recharge la page)
      if (connRef.current && connRef.current !== conn) {
        try {
          connRef.current.close();
        } catch {
          /* ignore */
        }
      }
      connRef.current = conn;

      const onOpen = () => {
        lastSeenRef.current = Date.now();
        setStatus('connected');
        conn.send(makeMessage(MSG.STATE, stateRef.current));
      };
      if (conn.open) onOpen();
      else conn.on('open', onOpen);

      conn.on('data', (msg) => {
        lastSeenRef.current = Date.now();
        if (handleLinkMessage(conn, msg, setLatency)) return;
        if (msg.type === MSG.ACTION) {
          setJournal((j) => [{ ts: msg.ts, ...msg.payload }, ...j]);
        }
      });

      const onGone = () => {
        if (connRef.current === conn) {
          connRef.current = null;
          setStatus('waiting');
        }
      };
      conn.on('close', onGone);
      conn.on('error', onGone);
    };

    openHostPeer({ pin: initialPin, keepPin: Boolean(resume) })
      .then(({ peer, pin: openedPin }) => {
        if (cancelled) {
          peer.destroy();
          return;
        }
        peerRef.current = peer;
        setPin(openedPin);
        setStatus('waiting');

        peer.on('connection', attach);
        // Perte du serveur de signalisation (réseau 4G instable) : on tente de se reconnecter
        peer.on('disconnected', () => {
          if (!cancelled && !peer.destroyed) peer.reconnect();
        });
        peer.on('error', (err) => {
          if (!cancelled && err.type !== 'peer-unavailable') setError(err);
        });

        // Surveillance : pas de nouvelles du stagiaire depuis trop longtemps => on le considère parti
        heartbeat = setInterval(() => {
          const conn = connRef.current;
          if (conn && Date.now() - lastSeenRef.current > LINK_TIMEOUT_MS) {
            connRef.current = null;
            try {
              conn.close();
            } catch {
              /* ignore */
            }
            setStatus('waiting');
          }
        }, HEARTBEAT_MS);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      connRef.current = null;
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    };
    // initialPin / resume ne changent pas pendant la vie de la page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const send = useCallback((type, payload) => {
    if (connRef.current?.open) connRef.current.send(makeMessage(type, payload));
  }, []);

  const ping = useCallback(() => send(MSG.PING, { sentAt: Date.now() }), [send]);
  const sendTest = useCallback((text) => send(MSG.TEST, { text }), [send]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return { pin, status, error, latency, journal, ping, sendTest, retry };
}
