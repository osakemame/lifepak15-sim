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
  delivered: TEXTS.delivered,
  rcp: TEXTS.startCpr,
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
    else audio.stopPump(s.pni.status === 'done');
    return () => audio.stopPump();
  }, [s.pni.status]);

  // --- Métronome RCP : 100 par minute ; avec « Abs. voies aér. » une pause après 30 (ad.) ou 15 (pédi.) compressions ---
  useEffect(() => {
    if (!s.metronome || s.phase === 'off') return undefined;
    const mode = RCP_MODES[s.rcpMode] ?? RCP_MODES['ad-abs'];
    const everyMs = 60000 / METRONOME_BPM;
    const cycle = mode.ratio ? Number(mode.ratio.split(':')[0]) : 0; // compressions avant la pause de ventilation
    let count = 0;
    let timer = null;
    const tick = () => {
      audio.metronomeClick();
      count += 1;
      if (cycle && count >= cycle) {
        count = 0;
        timer = setTimeout(tick, everyMs + TIMINGS.ventilationPause);
      } else {
        timer = setTimeout(tick, everyMs);
      }
    };
    tick();
    return () => clearTimeout(timer);
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
