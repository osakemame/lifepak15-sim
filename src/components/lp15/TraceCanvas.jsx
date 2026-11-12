import React, { useEffect, useRef } from 'react';
import { createGenerator } from '../../engine/rhythms.js';

// Tracés animés de l'écran : 1 ECG (vert) + 2 tracés SpO2 identiques (bleu), balayage de gauche à droite
// avec effacement devant le point d'écriture, comme sur un moniteur réel.

const W = 570;
const H = 520;
const SCALE = 2; // résolution interne doublée : tracé net une fois l'appareil agrandi
const SPEED = 95; // pixels par seconde (≈ 25 mm/s)
const GAP = 34; // zone effacée devant le point d'écriture
const ECG_Y = 100;
const ECG_AMP = 72;
const PLETH_Y = [270, 430]; // centres des 2 tracés SpO2
const PLETH_H = 90;
const GREEN = '#7dff2e';
const BLUE = '#2fb4ff';

export default function TraceCanvas({ traces, onBeat }) {
  const canvasRef = useRef(null);
  const propsRef = useRef({ traces, onBeat });
  propsRef.current = { traces, onBeat };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const gen = createGenerator();
    const ecgBuf = new Float32Array(W).fill(NaN);
    const plethBuf = new Float32Array(W).fill(NaN);
    let raf = 0;
    let last = performance.now();
    let acc = 0; // colonnes à écrire (partie fractionnaire conservée)
    let head = 0;
    let prevEcgMode = null;
    let prevPleth = null;

    const frame = (nowMs) => {
      const { traces: tr, onBeat: beat } = propsRef.current;
      const dt = Math.min(0.25, Math.max(0, (nowMs - last) / 1000));
      last = nowMs;
      acc += dt * SPEED;
      let n = Math.floor(acc);
      acc -= n;
      n = Math.min(n, W);

      const ecgOn = tr.ecgMode === 'signal';
      const plethOn = Boolean(tr.spo2Signal);
      if (prevEcgMode !== ecgOn) ecgBuf.fill(NaN);
      if (prevPleth !== plethOn) plethBuf.fill(NaN);
      prevEcgMode = ecgOn;
      prevPleth = plethOn;

      for (let i = 0; i < n; i += 1) {
        const out = gen.step(1 / SPEED, { rhythm: tr.rhythm, hr: tr.hr, spo2: tr.spo2 });
        ecgBuf[head] = ecgOn ? out.ecg : NaN;
        plethBuf[head] = plethOn ? out.pleth : NaN;
        if (out.qrs && beat) beat();
        head = (head + 1) % W;
      }

      // --- dessin ---
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';

      const drawBuf = (buf, yOf, color) => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        let pen = false;
        for (let x = 0; x < W; x += 1) {
          const d = (x - head + W) % W; // distance devant le point d'écriture
          const v = buf[x];
          if (Number.isNaN(v) || d < GAP) {
            pen = false;
          } else if (pen) {
            ctx.lineTo(x, yOf(v));
          } else {
            ctx.moveTo(x, yOf(v));
            pen = true;
          }
        }
        ctx.stroke();
      };
      const dashed = (y, color) => {
        ctx.strokeStyle = color;
        ctx.setLineDash([40, 16]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      // ECG
      if (ecgOn) drawBuf(ecgBuf, (v) => ECG_Y - v * ECG_AMP, GREEN);
      else if (tr.ecgMode === 'flat') {
        ctx.strokeStyle = GREEN;
        ctx.beginPath();
        ctx.moveTo(0, ECG_Y);
        ctx.lineTo(360, ECG_Y);
        ctx.moveTo(385, ECG_Y);
        ctx.lineTo(W, ECG_Y);
        ctx.stroke();
      } else dashed(ECG_Y, GREEN);

      // SpO2 : deux tracés identiques, comme sur l'appareil
      PLETH_Y.forEach((cy) => {
        if (plethOn) drawBuf(plethBuf, (v) => cy + PLETH_H / 2 - v * PLETH_H, BLUE);
        else dashed(cy, BLUE);
        ctx.fillStyle = '#3cc8ff';
        ctx.font = '800 17px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('SpO2', W - 8, cy - 50);
      });

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lcd-traces"
      width={W * SCALE}
      height={H * SCALE}
      style={{ width: W, height: H }}
      aria-hidden="true"
    />
  );
}
