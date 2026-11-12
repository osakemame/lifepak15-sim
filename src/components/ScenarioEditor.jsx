import React, { useState } from 'react';
import { RHYTHMS } from '../engine/rhythms.js';
import { VITAL_LABELS } from '../engine/ramps.js';
import { VITAL_KEYS, newScenarioId, validateScenario } from '../scenarios/scenarioModel.js';

const input = 'w-full rounded-lg bg-lcd border border-anthracite-600 px-3 py-2';
const num = 'w-20 rounded-lg bg-lcd border border-anthracite-600 py-1 text-center font-mono';

const fmtT = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function blankScenario() {
  return {
    id: newScenarioId(),
    name: '',
    variant: '',
    consigne: '',
    start: { rhythm: 'sinus', hr: 75, spo2: 98, sys: 120, dia: 80 },
    dsa: { shocksPlanned: 0, afterShock: 'keep' },
    events: [],
    order: 1000,
  };
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-gray-300">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, className = num }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
    />
  );
}

// Une ligne de la chronologie (évènement)
function EventRow({ ev, onChange, onRemove }) {
  const set = (patch) => onChange({ ...ev, ...patch });
  const setType = (type) => {
    if (type === 'ramp') onChange({ at: ev.at, type, key: 'hr', to: 100, durationSec: 300 });
    else if (type === 'rhythm') onChange({ at: ev.at, type, rhythm: 'fv' });
    else onChange({ at: ev.at, type, values: { sys: 0, dia: 0 } });
  };
  return (
    <div className="space-y-2 rounded-lg bg-anthracite-700 p-3 text-sm">
      <div className="flex items-center gap-2">
        <span>À T+</span>
        <NumberInput value={Math.floor(ev.at / 60)} onChange={(m) => set({ at: m * 60 + (ev.at % 60) })} className="w-14 rounded-lg bg-lcd border border-anthracite-600 py-1 text-center font-mono" />
        <span>min</span>
        <NumberInput value={ev.at % 60} onChange={(s) => set({ at: Math.floor(ev.at / 60) * 60 + Math.min(59, Math.max(0, s)) })} className="w-14 rounded-lg bg-lcd border border-anthracite-600 py-1 text-center font-mono" />
        <span>s</span>
        <button type="button" className="btn ml-auto !px-3 !py-1" onClick={onRemove}>
          Retirer
        </button>
      </div>
      <select className={input} value={ev.type} onChange={(e) => setType(e.target.value)}>
        <option value="ramp">Évolution progressive d'une constante</option>
        <option value="rhythm">Changement de rythme</option>
        <option value="set">Valeurs imposées d'un coup</option>
      </select>

      {ev.type === 'ramp' && (
        <div className="space-y-2">
          <select className={input} value={ev.key} onChange={(e) => set({ key: e.target.value })}>
            {VITAL_KEYS.map((k) => (
              <option key={k} value={k}>{VITAL_LABELS[k]}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span>vers</span>
            <NumberInput value={ev.to} onChange={(to) => set({ to })} />
            <span>en</span>
            <NumberInput value={Math.round(ev.durationSec / 60)} onChange={(m) => set({ durationSec: m * 60 })} className="w-14 rounded-lg bg-lcd border border-anthracite-600 py-1 text-center font-mono" />
            <span>min</span>
          </div>
        </div>
      )}

      {ev.type === 'rhythm' && (
        <select className={input} value={ev.rhythm} onChange={(e) => set({ rhythm: e.target.value })}>
          {Object.entries(RHYTHMS).map(([k, r]) => (
            <option key={k} value={k}>{r.label}</option>
          ))}
        </select>
      )}

      {ev.type === 'set' && (
        <div className="grid grid-cols-2 gap-2">
          {VITAL_KEYS.map((k) => (
            <label key={k} className="flex items-center justify-between gap-1">
              <span className="text-xs">{VITAL_LABELS[k]}</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="—"
                className={num}
                value={ev.values?.[k] ?? ''}
                onChange={(e) => {
                  const v = { ...ev.values };
                  if (e.target.value === '') delete v[k];
                  else v[k] = Number(e.target.value);
                  set({ values: v });
                }}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Création / modification d'un scénario (MSP).
 *  - « Utiliser sans enregistrer » : MSP temporaire, non enregistrée.
 *  - « Enregistrer » : sauvegarde sur le serveur (code formateur demandé).
 */
export default function ScenarioEditor({ initial, canSave, onCancel, onUseTemp, onSave }) {
  const [sc, setSc] = useState(initial);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (patch) => setSc((s) => ({ ...s, ...patch }));
  const setStart = (patch) => setSc((s) => ({ ...s, start: { ...s.start, ...patch } }));
  const setDsa = (patch) => setSc((s) => ({ ...s, dsa: { ...s.dsa, ...patch } }));
  const setEvent = (i, ev) => setSc((s) => ({ ...s, events: s.events.map((e, j) => (j === i ? ev : e)) }));
  const addEvent = () => setSc((s) => ({ ...s, events: [...s.events, { at: 600, type: 'rhythm', rhythm: 'fv' }] }));
  const removeEvent = (i) => setSc((s) => ({ ...s, events: s.events.filter((_, j) => j !== i) }));

  const check = () => {
    const v = validateScenario({ ...sc, events: sc.events });
    if (!v.ok) {
      setError(v.error);
      return null;
    }
    setError('');
    return v.scenario;
  };

  const useTemp = () => {
    const v = check();
    if (v) onUseTemp(v);
  };
  const save = async () => {
    const v = check();
    if (!v) return;
    setBusy(true);
    try {
      await onSave(v);
    } catch (e) {
      if (!e.cancelled) setError(e.message || 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Field label="Nom de la situation">
        <input className={input} value={sc.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex. : Hémorragie extériorisée" />
      </Field>
      <Field label="Variante (facultatif)">
        <input className={input} value={sc.variant} onChange={(e) => set({ variant: e.target.value })} placeholder="Ex. : Stable, Évolutif" />
      </Field>
      <Field label="Consigne pour le formateur">
        <textarea className={`${input} min-h-[96px]`} value={sc.consigne} onChange={(e) => set({ consigne: e.target.value })} />
      </Field>

      <section className="space-y-2 rounded-xl border border-anthracite-600 p-3">
        <h3 className="font-semibold">Situation de départ</h3>
        <select className={input} value={sc.start.rhythm} onChange={(e) => setStart({ rhythm: e.target.value })}>
          {Object.entries(RHYTHMS).map(([k, r]) => (
            <option key={k} value={k}>{r.label}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          {VITAL_KEYS.map((k) => (
            <label key={k} className="flex items-center justify-between gap-1 text-sm">
              <span>{VITAL_LABELS[k]}</span>
              <NumberInput value={sc.start[k]} onChange={(v) => setStart({ [k]: v })} />
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500">0 = « --- » à l'écran (FC, SpO2) ou PNI non mesurable.</p>
      </section>

      <section className="space-y-2 rounded-xl border border-anthracite-600 p-3">
        <h3 className="font-semibold">Chocs (DSA)</h3>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>Chocs conseillés à la suite</span>
          <NumberInput value={sc.dsa.shocksPlanned} onChange={(v) => setDsa({ shocksPlanned: Math.min(9, Math.max(0, v)) })} />
        </div>
        <Field label="Rythme après un choc délivré">
          <select className={input} value={sc.dsa.afterShock} onChange={(e) => setDsa({ afterShock: e.target.value })}>
            <option value="keep">Inchangé</option>
            {Object.entries(RHYTHMS).map(([k, r]) => (
              <option key={k} value={k}>{r.label}</option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-gray-500">Le DAE ne conseille un choc que sur FV ou TV.</p>
      </section>

      <section className="space-y-2 rounded-xl border border-anthracite-600 p-3">
        <h3 className="font-semibold">Chronologie (depuis le démarrage)</h3>
        {sc.events.length === 0 && <p className="text-sm text-gray-500">Aucun évènement : les constantes ne changent pas.</p>}
        {sc.events.map((ev, i) => (
          <EventRow key={i} ev={ev} onChange={(e) => setEvent(i, e)} onRemove={() => removeEvent(i)} />
        ))}
        <button type="button" className="btn w-full" onClick={addEvent}>
          + Ajouter un évènement
        </button>
      </section>

      {error && <p className="text-sm text-yellow-300">{error}</p>}
      <div className="grid gap-2">
        <button type="button" className="btn btn-primary" onClick={useTemp}>
          Utiliser sans enregistrer (MSP temporaire)
        </button>
        <button type="button" className="btn" onClick={save} disabled={busy || !canSave}>
          {canSave ? 'Enregistrer pour tous les formateurs' : 'Enregistrement indisponible (serveur injoignable)'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}

export const describeEvent = (e) => {
  const t = `T+${fmtT(e.at)}`;
  if (e.type === 'ramp') return `${t} · ${VITAL_LABELS[e.key]} → ${e.to} en ${fmtT(e.durationSec)}`;
  if (e.type === 'rhythm') return `${t} · rythme : ${RHYTHMS[e.rhythm]?.label}`;
  return `${t} · valeurs imposées : ${Object.entries(e.values).map(([k, v]) => `${k} ${v}`).join(', ')}`;
};
