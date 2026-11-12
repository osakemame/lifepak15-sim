import { useCallback, useEffect, useRef } from 'react';
import { RCP_MODES, TEXTS, METRONOME_BPM } from '../engine/lp15Texts.js';
import { TIMINGS } from '../engine/dsaTimings.js';
import * as audio from '../services/audio.js';

// Phrases dites par l'appareil : alignées sur les textes affichés à l'écran (demande de l'utilisateur).
const SPEECH = {
  padsWait: TEXTS.connectPads,
  analysing: TEXTS.analysing,
  shockAdvised: TEXTS.shockAdvised,
  notAdvised: TEXTS.shockNotAdvised,
  ready: TEXTS.chargedLine2.replace('!', ''),
  // « Energie délivrée » : affichage seulement, pas de voix (demande de l'utilisateur)
  rcp: 'Commencer la RCP', // la voix dit « commencer la RCP » ; l'écran affiche « Débuter RCP »
  awaitAnalyse: TEXTS.pressAnalyse,
};

/**
 * Fait jouer les sons et les voix de l'écran du stagiaire à partir de l'état de la séquence DSA.
 * Retourne onBeat(), à appeler à chaque complexe QRS du tracé (bip du pouls).
 */
export function useDsaAudio({ s, host }) {
  const hostRef = useRef(host);
  hostRef.current = host;
  const sRef = useRef(s);
  sRef.current = s;

  // --- Voix et sons liés aux changements de phase ---
  useEffect(() => {
    if (s.phase === 'off') {
      audio.stopAll();
      return undefined;
    }
    audio.stopCharge();
    audio.stopReady();
    if (SPEECH[s.phase]) audio.speak(SPEECH[s.phase]);
    if (s.phase === 'charging') audio.startCharge(TIMINGS.charge);
    if (s.phase === 'ready') audio.startReady();
    if (s.phase === 'blank') {
      audio.stopSpeech();
      audio.shockClack();
    }
    return () => {
      audio.stopCharge();
      audio.stopReady();
    };
  }, [s.phase]);

  // --- Pompe PNI ---
  useEffect(() => {
    if (s.pni.status === 'measuring') audio.startPump();
    else audio.stopPump();
    return () => audio.stopPump();
  }, [s.pni.status]);

  // --- Métronome RCP : 100 par minute, en continu tant qu'il n'est pas arrêté (menu RCP ou extinction).
  // Modes « Abs. voies aér. » (30:2 adulte, 15:2 pédiatrique), d'après rcp_bip.mp3 :
  //   la 3e compression avant la fin est remplacée par une cloche en 3 temps, puis après la dernière compression,
  //   2 insufflations (son grave de 1,2 s) pendant que le métronome continue en fond à bas volume.
  useEffect(() => {
    if (!s.metronome || s.phase === 'off') return undefined;
    const mode = RCP_MODES[s.rcpMode] ?? RCP_MODES['ad-abs'];
    const everyMs = 60000 / METRONOME_BPM;
    const cycle = mode.ratio ? Number(mode.ratio.split(':')[0]) : 0; // compressions avant les insufflations
    let count = 0;
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };
    const tick = () => {
      count += 1;
      if (cycle && count === cycle - 2) audio.bell();
      else audio.metronomeClick();
      if (cycle && count >= cycle) {
        count = 0;
        const start = everyMs; // les insufflations commencent au battement suivant
        later(() => audio.ventTone(TIMINGS.ventilationTone), start);
        later(() => audio.ventTone(TIMINGS.ventilationTone), start + TIMINGS.ventilationEvery);
        for (let k = 1; k * everyMs < TIMINGS.ventilationPause - everyMs / 2; k += 1) {
          later(() => audio.metronomeClick(true), start + k * everyMs);
        }
        later(tick, everyMs + TIMINGS.ventilationPause);
      } else {
        later(tick, everyMs);
      }
    };
    tick();
    return () => timers.forEach((id) => clearTimeout(id));
  }, [s.metronome, s.rcpMode, s.phase === 'off']);

  // --- Bip du pouls, synchronisé sur le tracé ---
  const onBeat = useCallback(() => {
    const st = sRef.current;
    const h = hostRef.current;
    if (st.phase === 'off' || st.phase === 'blank') return;
    const c = h.connections;
    // Le bip suit la source de fréquence : câble ECG (QRS) ou capteur SpO2 (pouls)
    if (!c.ecgLeads && !c.spo2 && !c.padsAttached) return;
    if (h.rhythm === 'fv' || h.rhythm === 'asystolie') return;
    if (!h.vitals.hr) return;
    audio.beepPulse(c.spo2 ? h.vitals.spo2 : 100);
  }, []);

  // Coupe tout en quittant la page
  useEffect(() => () => audio.stopAll(), []);

  return { onBeat };
}
