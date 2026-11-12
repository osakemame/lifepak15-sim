// Sons (Web Audio) et voix (synthèse vocale du navigateur) de l'écran du stagiaire.
// Tout est synthétisé : aucun fichier audio. Les fréquences marquées PROVISOIRE sont à ajuster ici.

export const SOUND = {
  // Relevés sur vos enregistrements (rcp_bip.mp3) : clic de 35 ms à 883 Hz toutes les 0,6 s ;
  // cloche (2885 + 1098 Hz) sur la 3e compression avant la fin ; insufflations : 330 Hz pendant 1,2 s.
  metronomeHz: 883,
  metronomeMs: 35,
  bellHz: 2885,
  bellHz2: 1098,
  ventHz: 330,
  ventMs: 1200,
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
  loadPni();
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

// Clic du métronome RCP (faint = fond sonore pendant les insufflations, environ 30 % du volume)
export function metronomeClick(faint = false) {
  tone(SOUND.metronomeHz, SOUND.metronomeMs, { gain: faint ? 0.12 : 0.4 });
}

// Cloche d'avertissement « en 3 temps » avant les insufflations, reproduite d'après rcp_bip.mp3 :
// un fond continu à 1119 Hz et 3 sons à 2885 Hz de plus en plus courts et faibles (durées ≈ 180, 140 et 70 ms),
// le tout démarrant 40 ms après le clic du métronome de ce battement.
function envelopeTone(freq, points, gainScale = 1) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  points.forEach(([t, v]) => g.gain.linearRampToValueAtTime(v * gainScale, t0 + t));
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + points[points.length - 1][0] + 0.02);
}
export function bell() {
  metronomeClick(); // le battement du métronome est joué normalement
  envelopeTone(SOUND.bellHz, [
    [0.03, 0], [0.05, 0.55], [0.2, 0.55], [0.24, 0], // 1er son
    [0.26, 0], [0.28, 0.42], [0.38, 0.42], [0.41, 0], // 2e son
    [0.45, 0], [0.47, 0.34], [0.5, 0.34], [0.54, 0], // 3e son
  ]);
  envelopeTone(SOUND.bellHz2, [[0.03, 0], [0.05, 0.2], [0.5, 0.2], [0.54, 0]]);
}

// Insufflation : son grave de 1,2 s qui s'atténue
export function ventTone(ms = SOUND.ventMs) {
  const c = ensure();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = SOUND.ventHz;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.65, t0 + 0.01);
  g.gain.linearRampToValueAtTime(0.3, t0 + ms / 1000 - 0.02);
  g.gain.linearRampToValueAtTime(0, t0 + ms / 1000);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + ms / 1000 + 0.02);
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

// Pompe du brassard PNI : votre enregistrement (public/sounds/pni.mp3, ≈ 6 s), joué au début de la mesure.
// Si le fichier ne peut pas être chargé, on joue un bruit de moteur synthétique.
let pniBuffer = null;
let pniLoading = false;
let pniSrc = null;
function loadPni() {
  if (pniBuffer || pniLoading) return;
  const c = ensure();
  if (!c) return;
  pniLoading = true;
  let base = '/';
  try {
    base = import.meta.env.BASE_URL || '/';
  } catch {
    /* hors Vite (tests) */
  }
  fetch(`${base}sounds/pni.mp3`)
    .then((r) => r.arrayBuffer())
    .then((ab) => c.decodeAudioData(ab))
    .then((buf) => {
      pniBuffer = buf;
    })
    .catch(() => {
      pniLoading = false;
    });
}
let pumpTimer = null;
export function startPump() {
  stopPump();
  loadPni();
  const c = ensure();
  if (c && pniBuffer && !muted) {
    pniSrc = c.createBufferSource();
    pniSrc.buffer = pniBuffer;
    const g = c.createGain();
    g.gain.value = 6; // l'enregistrement est très faible (crête à -21 dB)
    pniSrc.connect(g).connect(master);
    pniSrc.start();
    return;
  }
  const hit = () => noise(160, { gain: 0.35, lowpass: 600 });
  hit();
  pumpTimer = setInterval(hit, 420);
}
export function stopPump() {
  if (pumpTimer) clearInterval(pumpTimer);
  pumpTimer = null;
  if (pniSrc) {
    try {
      pniSrc.stop();
    } catch {
      /* déjà arrêté */
    }
    pniSrc = null;
  }
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
