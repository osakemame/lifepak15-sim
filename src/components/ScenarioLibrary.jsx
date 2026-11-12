import React, { useState } from 'react';
import { RHYTHMS } from '../engine/rhythms.js';
import { scenarioTitle } from '../scenarios/scenarioModel.js';
import ScenarioEditor, { blankScenario, describeEvent } from './ScenarioEditor.jsx';
import { newScenarioId } from '../scenarios/scenarioModel.js';

// Bibliothèque des scénarios (plein écran) : liste, fiche, création / modification, suppression.
export default function ScenarioLibrary({ list, status, current, onClose, onLoad, onSave, onDelete }) {
  const [view, setView] = useState({ name: 'list' }); // list | detail | edit
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [message, setMessage] = useState('');

  // Regroupement par situation (le nom), dans l'ordre de la liste
  const groups = [];
  list.forEach((s) => {
    let g = groups.find((x) => x.name === s.name);
    if (!g) groups.push((g = { name: s.name, items: [] }));
    g.items.push(s);
  });

  const back = () => setView({ name: 'list' });

  const doDelete = async (sc) => {
    try {
      await onDelete(sc);
      setConfirmDelete(null);
      back();
    } catch (e) {
      if (!e.cancelled) setMessage(e.message || 'Suppression impossible');
      setConfirmDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-anthracite-900">
      <div className="mx-auto max-w-md space-y-4 p-4">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold">
            {view.name === 'edit' ? 'Éditeur de scénario' : view.name === 'detail' ? 'Fiche du scénario' : 'Scénarios (MSP)'}
          </h1>
          <button className="btn !px-3 !py-1" onClick={view.name === 'list' ? onClose : back}>
            {view.name === 'list' ? 'Fermer' : 'Retour'}
          </button>
        </header>

        {status === 'offline' && (
          <p className="rounded-lg bg-anthracite-800 p-3 text-xs text-yellow-300">
            Serveur injoignable : seuls les scénarios de départ sont affichés (lecture seule) et on ne peut pas enregistrer.
            Vous pouvez quand même créer une MSP temporaire.
          </p>
        )}
        {message && <p className="text-sm text-yellow-300">{message}</p>}

        {view.name === 'list' && (
          <>
            <button className="btn btn-primary w-full" onClick={() => setView({ name: 'edit', draft: blankScenario() })}>
              + Nouvelle MSP (ou MSP temporaire)
            </button>
            {groups.length === 0 && <p className="text-sm text-gray-400">Aucun scénario.</p>}
            {groups.map((g) => (
              <section key={g.name} className="rounded-xl border border-anthracite-600 bg-anthracite-800 p-3">
                <h2 className="mb-2 text-sm font-semibold">{g.name}</h2>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((s) => (
                    <button
                      key={s.id}
                      className={`btn !px-3 !py-2 text-sm ${current === s.id ? '!bg-fc !text-black' : ''}`}
                      onClick={() => setView({ name: 'detail', id: s.id })}
                    >
                      {s.variant || 'Scénario'}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}

        {view.name === 'detail' && (() => {
          const sc = list.find((s) => s.id === view.id);
          if (!sc) return <p>Scénario introuvable.</p>;
          return (
            <div className="space-y-3">
              <h2 className="text-xl font-bold">{scenarioTitle(sc)}</h2>
              <p className="whitespace-pre-wrap text-sm text-gray-200">{sc.consigne || 'Pas de consigne.'}</p>
              <div className="rounded-xl bg-anthracite-800 p-3 text-sm">
                <p className="mb-1 font-semibold">Départ</p>
                <p>
                  {RHYTHMS[sc.start.rhythm]?.label} · FC {sc.start.hr || '---'} · SpO2 {sc.start.spo2 || '---'} % · PNI{' '}
                  {sc.start.sys ? `${sc.start.sys}/${sc.start.dia}` : 'non mesurable'}
                </p>
                <p className="mt-1">
                  Chocs conseillés : {sc.dsa.shocksPlanned}
                  {sc.dsa.afterShock !== 'keep' ? ` · après un choc : ${RHYTHMS[sc.dsa.afterShock]?.label}` : ''}
                </p>
                <p className="mb-1 mt-2 font-semibold">Chronologie</p>
                {sc.events.length === 0 ? (
                  <p className="text-gray-400">Aucune évolution.</p>
                ) : (
                  <ul className="space-y-1 text-gray-200">
                    {sc.events.map((e, i) => (
                      <li key={i}>{describeEvent(e)}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button className="btn btn-primary w-full" onClick={() => onLoad(sc, { temp: false })}>
                Charger ce scénario
              </button>
              <div className="grid grid-cols-3 gap-2">
                <button className="btn" onClick={() => setView({ name: 'edit', draft: sc })}>
                  Modifier
                </button>
                <button className="btn" onClick={() => setView({ name: 'edit', draft: { ...sc, id: newScenarioId(), name: sc.name, variant: `${sc.variant} (copie)`, order: 1000 } })}>
                  Dupliquer
                </button>
                <button className="btn" onClick={() => setConfirmDelete(sc)} disabled={status === 'offline'}>
                  Supprimer
                </button>
              </div>
              <p className="text-xs text-gray-500">Modifier, enregistrer et supprimer demandent le code formateur.</p>
            </div>
          );
        })()}

        {view.name === 'edit' && (
          <ScenarioEditor
            initial={view.draft}
            canSave={status !== 'offline'}
            onCancel={back}
            onUseTemp={(sc) => onLoad(sc, { temp: true })}
            onSave={async (sc) => {
              await onSave(sc);
              setView({ name: 'detail', id: sc.id });
            }}
          />
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-anthracite-600 bg-anthracite-800 p-5">
            <h2 className="text-lg font-bold">Supprimer ce scénario ?</h2>
            <p className="text-sm text-gray-300">
              « {scenarioTitle(confirmDelete)} » disparaîtra pour tous les formateurs.
            </p>
            <div className="flex gap-3">
              <button className="btn flex-1" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button className="btn btn-primary flex-1" onClick={() => doDelete(confirmDelete)}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
