import { useCallback, useEffect, useReducer, useRef } from 'react';
import { RCP_MODES, SHOCK_JOULES } from '../engine/lp15Texts.js';
import { TIMINGS } from '../engine/dsaTimings.js';
import { cuffAt, decideAdvised, initialState, reducer } from '../engine/dsaMachine.js';

/**
 * Fait tourner la séquence DSA de l'écran stagiaire.
 *  - host   : état envoyé par le formateur (branchements, constantes, scénario)
 *  - log    : (action, detail, source) -> journal du formateur (débriefing)
 *  - report : envoie au formateur l'état courant de l'écran (phase, chocs...)
 * Retourne { s, actions } : l'état de la machine et les 4 boutons actifs du stagiaire.
 */
export function useDsa({ host, log, report }) {
  const [s, dispatch] = useReducer(reducer, undefined, initialState);
  const hostRef = useRef(host);
  hostRef.current = host;
  const logRef = useRef(log);
  logRef.current = log;

  // --- Remise à zéro demandée par le formateur ---
  useEffect(() => {
    dispatch({ type: 'RESET' });
  }, [host.resetId]);

  // --- Minuteurs liés à la phase courante ---
  useEffect(() => {
    let timer = null;
    let interval = null;

    switch (s.phase) {
      case 'padsStart':
        timer = setTimeout(
          () =>
            dispatch({
              type: 'PADS_PROMPT',
              attached: Boolean(hostRef.current.connections.padsAttached),
            }),
          TIMINGS.padsStart
        );
        break;
      case 'analysing':
        timer = setTimeout(() => {
          const { advised, forceId } = decideAdvised(hostRef.current, s);
          dispatch({ type: 'ANALYSIS_DONE', advised, forceId });
        }, TIMINGS.analysis);
        break;
      case 'shockAdvised':
        timer = setTimeout(() => dispatch({ type: 'TO_CHARGING' }), TIMINGS.result);
        break;
      case 'notAdvised':
        timer = setTimeout(
          () => dispatch({ type: 'TO_RCP', seconds: TIMINGS.rcpSeconds }),
          TIMINGS.result
        );
        break;
      case 'charging': {
        const start = Date.now();
        interval = setInterval(() => {
          const p = Math.min(1, (Date.now() - start) / TIMINGS.charge);
          dispatch({ type: 'CHARGE_TICK', charge: Math.round(p * SHOCK_JOULES) });
          if (p >= 1) {
            clearInterval(interval);
            dispatch({ type: 'CHARGE_DONE' });
          }
        }, 100);
        break;
      }
      case 'blank':
        timer = setTimeout(() => dispatch({ type: 'SHOCK_SHOWN' }), TIMINGS.blank);
        break;
      case 'delivered':
        timer = setTimeout(
          () => dispatch({ type: 'TO_RCP', seconds: TIMINGS.rcpSeconds }),
          TIMINGS.delivered
        );
        break;
      case 'rcp':
        interval = setInterval(() => dispatch({ type: 'RCP_TICK' }), 1000);
        break;
      default:
        break;
    }

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
    // Les minuteurs ne dépendent que de la phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase]);

  // --- Le formateur valide la pose des électrodes : l'analyse peut commencer ---
  const padsAttached = Boolean(host.connections.padsAttached);
  useEffect(() => {
    if (s.phase === 'padsWait' && padsAttached) dispatch({ type: 'PADS_ATTACHED' });
  }, [s.phase, padsAttached]);

  // --- Mesure PNI (environ 10 s) ---
  useEffect(() => {
    if (s.pni.status !== 'measuring') return undefined;
    const start = Date.now();
    const interval = setInterval(() => {
      const { vitals } = hostRef.current;
      const p = (Date.now() - start) / TIMINGS.pni;
      if (p >= 1) {
        clearInterval(interval);
        dispatch({ type: 'PNI_DONE', sys: vitals.sys, dia: vitals.dia });
      } else {
        dispatch({ type: 'PNI_TICK', cuff: cuffAt(p, vitals.sys, vitals.dia) });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [s.pni.status]);

  // --- Journal : événements de l'appareil (changements de phase) ---
  const lastPhase = useRef(null);
  useEffect(() => {
    if (lastPhase.current === s.phase) return;
    lastPhase.current = s.phase;
    const say = (action, detail) => logRef.current?.(action, detail, 'appareil');
    switch (s.phase) {
      case 'padsWait':
        say('ANALYSE', 'Attente des électrodes : « Connectez les électrodes »');
        break;
      case 'analysing':
        say('ANALYSE', `Analyse n°${s.analyses} en cours`);
        break;
      case 'shockAdvised':
        say('ANALYSE', 'Résultat : choc conseillé');
        break;
      case 'notAdvised':
        say('ANALYSE', 'Résultat : choc non conseillé');
        break;
      case 'ready':
        say('CHOC', `${SHOCK_JOULES} J disponibles, appui sur CHOC attendu`);
        break;
      case 'rcp':
        say('RCP', 'Début des 2 minutes de RCP');
        break;
      case 'awaitAnalyse':
        say('RCP', 'Fin des 2 minutes : « Appuyer sur ANALYSE »');
        break;
      default:
        break;
    }
  }, [s.phase, s.analyses]);

  // --- État de l'écran remonté au formateur ---
  useEffect(() => {
    report?.({
      phase: s.phase,
      analyses: s.analyses,
      shocksDelivered: s.shocksDelivered,
      metronome: s.metronome,
      pni: s.pni.status,
      consumedForceId: s.consumedForceId,
    });
  }, [s.phase, s.analyses, s.shocksDelivered, s.metronome, s.pni.status, s.consumedForceId, report]);

  // --- Les 4 boutons actifs du stagiaire : RCP, ANALYSE, CHOC, PNI ---
  const analyse = useCallback(() => {
    if (s.phase !== 'surveillance' && s.phase !== 'awaitAnalyse') return;
    logRef.current?.('ANALYSE', 'Appui sur ANALYSE');
    dispatch({
      type: 'ANALYSE_PRESS',
      attached: Boolean(hostRef.current.connections.padsAttached),
    });
  }, [s.phase]);

  const shock = useCallback(() => {
    if (s.phase !== 'ready') return;
    logRef.current?.('CHOC', `Choc délivré : ${SHOCK_JOULES} J (choc n°${s.shocksDelivered + 1})`);
    dispatch({ type: 'SHOCK_PRESS' });
  }, [s.phase, s.shocksDelivered]);

  const rcp = useCallback(() => {
    const mode = RCP_MODES[hostRef.current.dsa.rcpMode] ?? RCP_MODES['ad-abs'];
    logRef.current?.('RCP', s.metronome ? 'Métronome arrêté' : `Métronome démarré (${mode.menu})`);
    dispatch({ type: 'METRO_TOGGLE' });
  }, [s.metronome]);

  const pni = useCallback(() => {
    if (s.pni.status === 'measuring') return;
    if (!hostRef.current.connections.cuff) {
      logRef.current?.('PNI', 'Appui sur PNI sans brassard branché');
      return;
    }
    logRef.current?.('PNI', 'Lancement de la mesure');
    dispatch({ type: 'PNI_START' });
  }, [s.pni.status]);

  // Fin de mesure PNI : résultat dans le journal
  const lastPni = useRef('idle');
  useEffect(() => {
    if (lastPni.current !== s.pni.status && s.pni.status === 'done') {
      logRef.current?.('PNI', `Résultat : ${s.pni.sys}/${s.pni.dia} mmHg (moyenne ${s.pni.map})`, 'appareil');
    }
    lastPni.current = s.pni.status;
  }, [s.pni.status, s.pni.sys, s.pni.dia, s.pni.map]);

  return { s, actions: { analyse, shock, rcp, pni } };
}
