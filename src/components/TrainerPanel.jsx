import React from 'react';
import { RCP_MODES } from '../engine/lp15Texts.js';

// Panneau de commande PROVISOIRE du formateur (étape 2) : juste ce qu'il faut pour tester
// l'écran du stagiaire. La vraie télécommande (rampes de constantes, rythmes, événements)
// arrive à l'étape 4.

const card = 'rounded-xl bg-anthracite-800 border border-anthracite-600 p-4 space-y-3';

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

function Stepper({ label, value, min, max, step = 1, onChange }) {
  const set = (v) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn !px-3 !py-1" onClick={() => set(value - step)}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => e.target.value !== '' && set(Number(e.target.value))}
          className="w-16 rounded-lg bg-lcd border border-anthracite-600 py-1 text-center font-mono text-lg"
        />
        <button type="button" className="btn !px-3 !py-1" onClick={() => set(value + step)}>
          +
        </button>
      </div>
    </div>
  );
}

export default function TrainerPanel({ host, setHost }) {
  const setConn = (key, value) => setHost((h) => ({ ...h, connections: { ...h.connections, [key]: value } }));
  const setVital = (key, value) => setHost((h) => ({ ...h, vitals: { ...h.vitals, [key]: value } }));
  const setDsa = (patch) => setHost((h) => ({ ...h, dsa: { ...h.dsa, ...patch } }));

  const force = (mode) => setDsa({ forceNext: mode, forceId: mode === 'auto' ? host.dsa.forceId : host.dsa.forceId + 1 });

  const reset = () =>
    setHost((h) => ({
      ...h,
      resetId: h.resetId + 1,
      connections: { ...h.connections, padsAttached: false },
      dsa: { ...h.dsa, forceNext: 'auto' },
    }));

  const c = host.connections;
  const v = host.vitals;

  return (
    <>
      <section className={card}>
        <h2 className="font-semibold">Branchements</h2>
        <Toggle label="Câble ECG 4 brins (FC en vert)" value={c.ecgLeads} onChange={(x) => setConn('ecgLeads', x)} />
        <Toggle label="Capteur SpO2 (FP SpO2 en bleu)" value={c.spo2} onChange={(x) => setConn('spo2', x)} />
        <Toggle label="Brassard PNI" value={c.cuff} onChange={(x) => setConn('cuff', x)} />
        <Toggle label="Électrodes posées (validation)" value={c.padsAttached} onChange={(x) => setConn('padsAttached', x)} />
      </section>

      <section className={card}>
        <h2 className="font-semibold">Constantes</h2>
        <Stepper label="FC (bpm)" value={v.hr} min={0} max={250} onChange={(x) => setVital('hr', x)} />
        <Stepper label="SpO2 (%)" value={v.spo2} min={0} max={100} onChange={(x) => setVital('spo2', x)} />
        <Stepper label="PNI systolique (mmHg)" value={v.sys} min={30} max={260} onChange={(x) => setVital('sys', x)} />
        <Stepper label="PNI diastolique (mmHg)" value={v.dia} min={10} max={180} onChange={(x) => setVital('dia', x)} />
        <p className="text-xs text-gray-500">
          La PNI affiche ces valeurs 10 secondes après l'appui du stagiaire sur PNI.
        </p>
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
          Métronome RCP
          <select
            value={host.dsa.rcpMode}
            onChange={(e) => setDsa({ rcpMode: e.target.value })}
            className="mt-1 w-full rounded-lg bg-anthracite-700 border border-anthracite-600 p-3"
          >
            {Object.entries(RCP_MODES).map(([key, m]) => (
              <option key={key} value={key}>
                {m.menu}
                {m.provisional ? ' (texte provisoire)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn w-full" onClick={reset}>
          Remettre l'écran du stagiaire à zéro
        </button>
      </section>
    </>
  );
}
