import { useCallback, useEffect, useRef, useState } from 'react';
import { openHostPeer } from '../services/session.js';
import {
  HEARTBEAT_MS,
  LINK_TIMEOUT_MS,
  MSG,
  handleLinkMessage,
  makeMessage,
} from '../services/messages.js';
import {
  clearHostData,
  loadHostState,
  loadJournal,
  normalizeHostState,
  saveHostState,
  saveJournal,
} from '../engine/hostState.js';

const JOURNAL_MAX = 500;

/**
 * Session côté FORMATEUR (hôte PeerJS).
 * - Crée (ou reprend) le code PIN et attend la connexion du stagiaire.
 * - Garde l'état de la session (branchements, constantes, scénario DSA) et l'envoie au stagiaire.
 * - Reçoit les actions du stagiaire dans un journal horodaté, conservé dans le navigateur du
 *   formateur : il survit à un rafraîchissement de la page et n'est effacé que sur demande.
 *
 * status : 'starting' | 'waiting' | 'connected' | 'error'
 */
export function useHostSession({ pin: initialPin, resume, mspType }) {
  const [pin, setPin] = useState(initialPin || null);
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [traineeStatus, setTraineeStatus] = useState(null);

  // État de la session : repris du navigateur en cas de reprise, sinon valeurs par défaut
  const [host, setHost] = useState(() => {
    const saved = resume && initialPin ? loadHostState(initialPin) : null;
    return normalizeHostState({ ...(saved ?? {}), mspType: mspType ?? saved?.mspType ?? null });
  });

  const [journal, setJournal] = useState([]);
  const [journalReady, setJournalReady] = useState(false);

  const peerRef = useRef(null);
  const connRef = useRef(null);
  const lastSeenRef = useRef(0);
  const hostRef = useRef(host);

  // --- Journal : chargement à la reprise (ou remise à zéro d'une nouvelle session), puis enregistrement ---
  useEffect(() => {
    if (!pin) return;
    if (resume) setJournal(loadJournal(pin));
    else clearHostData(pin);
    setJournalReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  useEffect(() => {
    if (pin && journalReady) saveJournal(pin, journal);
  }, [pin, journal, journalReady]);

  // --- État de la session : enregistrement local + envoi au stagiaire ---
  useEffect(() => {
    hostRef.current = host;
    if (pin) saveHostState(pin, host);
    if (connRef.current?.open) connRef.current.send(makeMessage(MSG.STATE, host));
  }, [host, pin]);

  // --- Liaison PeerJS ---
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
        conn.send(makeMessage(MSG.STATE, hostRef.current));
      };
      if (conn.open) onOpen();
      else conn.on('open', onOpen);

      conn.on('data', (msg) => {
        lastSeenRef.current = Date.now();
        if (handleLinkMessage(conn, msg, setLatency)) return;
        if (msg.type === MSG.ACTION) {
          const { action, detail, source } = msg.payload ?? {};
          setJournal((j) => [{ ts: msg.ts, action, detail, source: source ?? 'stagiaire' }, ...j].slice(0, JOURNAL_MAX));
        }
        if (msg.type === MSG.STATUS) setTraineeStatus(msg.payload);
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

        // Pas de nouvelles du stagiaire depuis trop longtemps : on le considère parti
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

  // Le formateur ajoute lui-même une ligne au journal (ex. remarque pour le débriefing)
  const logLocal = useCallback((action, detail) => {
    setJournal((j) => [{ ts: Date.now(), action, detail, source: 'formateur' }, ...j].slice(0, JOURNAL_MAX));
  }, []);

  const clearJournal = useCallback(() => setJournal([]), []);

  // Fin de session : on efface aussi l'état enregistré dans ce navigateur
  const eraseSavedData = useCallback(() => {
    if (pin) clearHostData(pin);
  }, [pin]);

  return {
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
  };
}
