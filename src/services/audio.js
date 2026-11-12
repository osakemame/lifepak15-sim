// Sons (Web Audio) et voix (synthèse vocale du navigateur) de l'écran du stagiaire.
// Tout est synthétisé : aucun fichier audio. Les fréquences marquées PROVISOIRE sont à ajuster ici.

export const SOUND = {
  metronomeHz: 883, // relevé sur la vidéo (votre description donnait 1000 Hz : à trancher)
  metronomeMs: 70,
  chargeFrom: 400, // balayage de la charge, indiqué par l'utilisateur : 400 -> 1200 Hz
  chargeTo: 1200,
  readyHz: 1200, // PROVISOIRE : tonalité « prêt » (bips répétés tant que le choc n'est pas délivré)
  readyOnMs: 220,
  readyOffMs: 220,
  beepBase: 880, // PROVISOIRE : bip du pouls à 100 % de SpO2 ; la hauteur baisse avec la SpO2
  beepPerPercent: 12, // PROVISOIRE : Hz perdus par % de SpO2 en moins
  beepMin: 330,
  beepMs: 90,
};

let ctx = null;
let master = null;
let muted = false;
const listeners = new Set();

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  ctx.onstatechange = () => listeners.forEach((fn) => fn(ctx.state));
  return ctx;
}

// À appeler lors d'un geste de l'utilisateur (les navigateurs bloquent le son avant)
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
  try {
    window.speechSynthesis?.resume();
  } catch {
    /* synthèse vocale indisponible */
  }
}

export const audioState = () => (ctx ? ctx.state : 'suspended');
export function onAudioState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = value ? 0 : 0.5;
  if (value) stopSpeech();
}
export const isMuted = () => muted;

// Une note courte avec enveloppe (évite les claquements)
function tone(freq, ms, { type = 'sine', gain = 0.6, when = 0 } = {}) {
  const c = ensure();
  if (!c || muted) return null;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  g.gain.setValueAtTime(gain, t0 + ms / 1000 - 0.01);
  g.gain.linearRampToValueAtTime(0, t0 + ms / 1000);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + ms / 1000 + 0.02);
  return o;
}

// Bip du pouls : la hauteur baisse quand la SpO2 baisse
export function beepPulse(spo2 = 100) {
  const f = Math.max(SOUND.beepMin, SOUND.beepBase - (100 - Math.min(100, spo2)) * SOUND.beepPerPercent);
  tone(f, SOUND.beepMs, { gain: 0.45 });
}

// Clic du métronome RCP
export function metronomeClick() {
  tone(SOUND.metronomeHz, SOUND.metronomeMs, { gain: 0.7 });
}

// Charge : tonalité qui monte de 400 à 1200 Hz pendant la durée de la charge
let chargeNode = null;
export function startCharge(durationMs) {
  stopCharge();
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(SOUND.chargeFrom, t0);
  o.frequency.linearRampToValueAtTime(SOUND.chargeTo, t0 + durationMs / 1000);
  g.gain.value = 0.5;
  o.connect(g).connect(master);
  o.start(t0);
  chargeNode = { o, g };
}
export function stopCharge() {
  if (!chargeNode) return;
  try {
    chargeNode.o.stop();
  } catch {
    /* déjà arrêté */
  }
  chargeNode = null;
}

// Tonalité « prêt » : bips répétés jusqu'à l'appui sur CHOC
let readyTimer = null;
export function startReady() {
  stopReady();
  const play = () => tone(SOUND.readyHz, SOUND.readyOnMs, { gain: 0.5 });
  play();
  readyTimer = setInterval(play, SOUND.readyOnMs + SOUND.readyOffMs);
}
export function stopReady() {
  if (readyTimer) clearInterval(readyTimer);
  readyTimer = null;
}

// Bruit court (choc, pompe)
function noise(ms, { gain = 0.5, lowpass = 1500, when = 0 } = {}) {
  const c = ensure();
  if (!c || muted) return;
  const len = Math.ceil((c.sampleRate * ms) / 1000);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lowpass;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start(c.currentTime + when);
}

// Choc délivré : « clac » sec
export function shockClack() {
  noise(120, { gain: 0.9, lowpass: 3000 });
  tone(140, 90, { type: 'square', gain: 0.5 });
}

// Pompe du brassard PNI (PROVISOIRE) : petits à-coups de moteur pendant la mesure, souffle à la fin
let pumpTimer = null;
export function startPump() {
  stopPump();
  const hit = () => noise(160, { gain: 0.35, lowpass: 600 });
  hit();
  pumpTimer = setInterval(hit, 420);
}
export function stopPump(release = false) {
  if (pumpTimer) clearInterval(pumpTimer);
  pumpTimer = null;
  if (release) noise(700, { gain: 0.3, lowpass: 2500 });
}

// ---------- Voix ----------
let frVoice = null;
function pickVoice() {
  try {
    const voices = window.speechSynthesis?.getVoices?.() ?? [];
    frVoice = voices.find((v) => v.lang?.toLowerCase().startsWith('fr')) ?? null;
  } catch {
    frVoice = null;
  }
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function speak(text) {
  if (muted) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    if (frVoice) u.voice = frVoice;
    u.rate = 0.95;
    synth.speak(u);
  } catch {
    /* synthèse vocale indisponible : on continue sans voix */
  }
}
export function stopSpeech() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignoré */
  }
}

// Coupe tous les sons (extinction de l'appareil, départ de la page)
export function stopAll() {
  stopCharge();
  stopReady();
  stopPump();
  stopSpeech();
}
