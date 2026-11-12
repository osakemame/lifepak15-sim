import React, { useState } from 'react';
import { RHYTHMS } from '../engine/rhythms.js';
import {
  VITAL_LABELS,
  VITAL_LIMITS,
  applyRhythm,
  clampVital,
  makeRamp,
  makeScheduledRhythm,
} from '../engine/ramps.js';
import { useNow } from '../hooks/useNow.js';

// Télécommande du FORMATEUR : rythme, constantes (avec évolutions progressives), branchements,
// scénario DSA, remarque pour le journal.

const card = 'rounded-xl bg-anthracite-800 border border-anthracite-600 p-4 space-y-3';
const field = 'rounded-lg bg-lcd border border-anthracite-600 py-1 text-center font-mono text-lg';

function Toggle({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-lg bg-anthracite-700 px-3 py-3 text-left"
    >
      <span>{label}</span>
      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${value ? 'bg-fc text-black' : 'bg-anthracite-600 text-gray-300'}`}>
        {value ? 'Oui' : 'Non'}
      </span>
    </button>
  );
}

function NumberField({ value, min, max, onChange, className = 'w-16' }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      min={min}
      max={max}
      onChange={(e) => e.target.value !== '' && onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
      className={`${field} ${className}`}
    />
  );
}

function Stepper({ label, value, min, max, step = 1, onChange }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn !px-3 !py-1" onClick={() => set(value - step)}>
          −
        </button>
        <NumberField value={value} min={min} max={max} onChange={set} />
        <button type="button" className="btn !px-3 !py-1" onClick={() => set(value + step)}>
          +
        </button>
      </div>
    </div>
  );
}

const fmtDur = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
};

// Une constante : valeur immédiate (− / +) et évolution progressive vers une valeur cible
function VitalRow({ vkey, host, setHost, logLocal }) {
  const [lo, hi] = VITAL_LIMITS[vkey];
  const value = host.vitals[vkey];
  const [target, setTarget] = useState(value);
  const [min, setMin] = useState(3);
  const [sec, setSec] = useState(0);
  const [delay, setDelay] = useState(0);

  const setNow = (v) =>
    setHost((h) => ({
      ...h,
      vitals: { ...h.vitals, [vkey]: clampVital(vkey, v) },
      ramps: (h.ramps ?? []).filter((r) => r.key !== vkey), // une valeur imposée annule l'évolution en cours
    }));

  const launch = () => {
    const durationMs = (min * 60 + sec) * 1000;
    const ramp = makeRamp({ key: vkey, to: target, durationMs, delayMs: delay * 1000, now: Date.now() });
    setHost((h) => ({ ...h, ramps: [...(h.ramps ?? []).filter((r) => r.key !== vkey), ramp] }));
    logLocal(
      'Évolution',
      `${VITAL_LABELS[vkey]} vers ${ramp.to} en ${fmtDur(durationMs)}${delay ? `, dans ${fmtDur(delay * 1000)}` : ''}`
    );
  };

  return (
    <div className="space-y-2 rounded-lg bg-anthracite-700 p-3">
      <Stepper label={VITAL_LABELS[vkey]} value={value} min={lo} max={hi} onChange={setNow} />
      <details>
        <summary className="cursor-pointer text-sm text-gray-300">Évolution progressive…</summary>
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>Valeur à atteindre</span>
            <NumberField value={target} min={lo} max={hi} onChange={setTarget} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>en</span>
            <div className="flex items-center gap-1">
              <NumberField value={min} min={0} max={60} onChange={setMin} className="w-14" /> min
              <NumberField value={sec} min={0} max={59} onChange={setSec} className="w-14" /> s
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>départ dans</span>
            <div className="flex items-center gap-1">
              <NumberField value={delay} min={0} max={3600} onChange={setDelay} className="w-16" /> s
            </div>
          </div>
          <button type="button" className="btn btn-primary w-full" onClick={launch}>
            Lancer l'évolution
          </button>
        </div>
      </details>
    </div>
  );
}

export default function TrainerPanel({ host, setHost, logLocal }) {
  const now = useNow(1000);
  const [rhythmChoice, setRhythmChoice] = useState(host.rhythm);
  const [rhythmDelay, setRhythmDelay] = useState(0);
  const [note, setNote] = useState('');

  const setConn = (key, value) => setHost((h) => ({ ...h, connections: { ...h.connections, [key]: value } }));
  const setDsa = (patch) => setHost((h) => ({ ...h, dsa: { ...h.dsa, ...patch } }));
  const force = (mode) =>
    setDsa({ forceNext: mode, forceId: mode === 'auto' ? host.dsa.forceId : host.dsa.forceId + 1 });

  const reset = () =>
    setHost((h) => ({
      ...h,
      resetId: h.resetId + 1,
      connections: { ...h.connections, padsAttached: false },
      dsa: { ...h.dsa, forceNext: 'auto' },
    }));

  const applyNow = () => {
    if (rhythmDelay <= 0) {
      setHost((h) => applyRhythm(h, rhythmChoice));
      logLocal('Rythme', RHYTHMS[rhythmChoice].label);
    } else {
      const sc = makeScheduledRhythm({ rhythm: rhythmChoice, delayMs: rhythmDelay * 1000, now: Date.now() });
      setHost((h) => ({ ...h, scheduled: [...(h.scheduled ?? []), sc] }));
      logLocal('Rythme', `${RHYTHMS[rhythmChoice].label} programmé dans ${fmtDur(rhythmDelay * 1000)}`);
    }
  };

  const cancelRamp = (r) => {
    setHost((h) => ({ ...h, ramps: (h.ramps ?? []).filter((x) => x.id !== r.id) }));
    logLocal('Évolution', `${VITAL_LABELS[r.key]} : évolution annulée`);
  };
  const cancelScheduled = (sc) => {
    setHost((h) => ({ ...h, scheduled: (h.scheduled ?? []).filter((x) => x.id !== sc.id) }));
    logLocal('Rythme', 'Changement de rythme programmé annulé');
  };

  const addNote = () => {
    if (!note.trim()) return;
    logLocal('Remarque', note.trim());
    setNote('');
  };

  const c = host.connections;
  const ramps = host.ramps ?? [];
  const scheduled = host.scheduled ?? [];

  return (
    <>
      {(ramps.length > 0 || scheduled.length > 0) && (
        <section className={card}>
          <h2 className="font-semibold">Évolutions en cours</h2>
          {ramps.map((r) => {
            const waiting = now < r.startAt;
            const p = waiting ? 0 : Math.min(1, (now - r.startAt) / Math.max(1, r.durationMs));
            return (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-anthracite-700 p-3 text-sm">
                <div>
                  <p>
                    {VITAL_LABELS[r.key]} → <b>{r.to}</b>
                  </p>
                  <p className="text-gray-400">
                    {waiting
                      ? `départ dans ${fmtDur(r.startAt - now)}`
                      : `${Math.round(p * 100)} % · reste ${fmtDur(r.startAt + r.durationMs - now)}`}
                  </p>
                </div>
                <button type="button" className="btn !px-3 !py-1" onClick={() => cancelRamp(r)}>
                  Annuler
                </button>
              </div>
            );
          })}
          {scheduled.map((sc) => (
            <div key={sc.id} className="flex items-center justify-between gap-2 rounded-lg bg-anthracite-700 p-3 text-sm">
              <div>
                <p>
                  Rythme → <b>{RHYTHMS[sc.rhythm]?.label}</b>
                </p>
                <p className="text-gray-400">dans {fmtDur(sc.at - now)}</p>
              </div>
              <button type="button" className="btn !px-3 !py-1" onClick={() => cancelScheduled(sc)}>
                Annuler
              </button>
            </div>
          ))}
        </section>
      )}

      <section className={card}>
        <h2 className="font-semibold">Rythme (tracé ECG)</h2>
        <p className="text-sm text-gray-300">
          Actuel : <b>{RHYTHMS[host.rhythm]?.label}</b>
        </p>
        <select
          value={rhythmChoice}
          onChange={(e) => setRhythmChoice(e.target.value)}
          className="w-full rounded-lg bg-anthracite-700 border border-anthracite-600 p-3"
        >
          {Object.entries(RHYTHMS).map(([key, r]) => (
            <option key={key} value={key}>
              {r.label}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>Appliquer dans</span>
          <div className="flex items-center gap-1">
            <NumberField value={rhythmDelay} min={0} max={3600} onChange={setRhythmDelay} className="w-16" /> s
          </div>
        </div>
        <button type="button" className="btn btn-primary w-full" onClick={applyNow}>
          {rhythmDelay > 0 ? 'Programmer le rythme' : 'Appliquer le rythme'}
        </button>
        <p className="text-xs text-gray-500">
          La FC prend la valeur type du rythme (FV et asystolie : 0, l'écran affiche « --- »), modifiable ensuite.
        </p>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Constantes</h2>
        {['hr', 'spo2', 'sys', 'dia'].map((k) => (
          <VitalRow key={k} vkey={k} host={host} setHost={setHost} logLocal={logLocal} />
        ))}
        <p className="text-xs text-gray-500">
          La PNI affiche ces valeurs 10 secondes après l'appui du stagiaire sur PNI.
        </p>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Branchements</h2>
        <Toggle label="Câble ECG 4 brins (FC en vert)" value={c.ecgLeads} onChange={(x) => setConn('ecgLeads', x)} />
        <Toggle label="Capteur SpO2 (FP SpO2 en bleu)" value={c.spo2} onChange={(x) => setConn('spo2', x)} />
        <Toggle label="Brassard PNI" value={c.cuff} onChange={(x) => setConn('cuff', x)} />
        <Toggle label="Électrodes posées (validation)" value={c.padsAttached} onChange={(x) => setConn('padsAttached', x)} />
      </section>

      <section className={card}>
        <h2 className="font-semibold">Scénario DSA</h2>
        <Stepper
          label="Chocs conseillés à la suite"
          value={host.dsa.shocksPlanned}
          min={0}
          max={9}
          onChange={(x) => setDsa({ shocksPlanned: x })}
        />
        <div>
          <p className="mb-1 text-sm">Imposer la prochaine analyse</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['auto', 'Selon le scénario'],
              ['advised', 'Choc conseillé'],
              ['not', 'Non conseillé'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => force(key)}
                className={`btn !px-2 !py-2 text-sm ${host.dsa.forceNext === key ? '!bg-choc !text-black' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm">
          Rythme après un choc délivré
          <select
            value={host.dsa.afterShock}
            onChange={(e) => setDsa({ afterShock: e.target.value })}
            className="mt-1 w-full rounded-lg bg-anthracite-700 border border-anthracite-600 p-3"
          >
            <option value="keep">Inchangé</option>
            {Object.entries(RHYTHMS).map(([key, r]) => (
              <option key={key} value={key}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn w-full" onClick={reset}>
          Remettre l'écran du stagiaire à zéro
        </button>
      </section>

      <section className={card}>
        <h2 className="font-semibold">Remarque pour le débriefing</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Ex. : n'a pas sécurisé la zone"
            className="min-w-0 flex-1 rounded-lg bg-lcd border border-anthracite-600 px-3 py-2"
          />
          <button type="button" className="btn" onClick={addNote}>
            Ajouter
          </button>
        </div>
      </section>
    </>
  );
}
