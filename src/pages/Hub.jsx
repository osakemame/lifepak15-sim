import React, { useState } from 'react';
import { MSP_TYPES } from '../scenarios/mspTypes.js';
import { isValidPin } from '../services/session.js';

// Page d'accueil : le formateur crée une session, le stagiaire la rejoint avec le code à 4 chiffres.
export default function Hub({ initialPin = '', onCreate, onJoin }) {
  const [mode, setMode] = useState(initialPin ? 'join' : null); // null | 'create' | 'join'
  const [mspType, setMspType] = useState(MSP_TYPES[0].id);
  const [pin, setPin] = useState(initialPin);

  const pinOk = isValidPin(pin);

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-wide">Simulateur LIFEPAK 15</h1>
        <p className="text-sm text-gray-400">Formation secourisme · SDIS 24</p>
      </header>

      {mode === null && (
        <div className="w-full max-w-sm flex flex-col gap-3">
          <button className="btn btn-primary" onClick={() => setMode('create')}>
            Créer une session (Formateur)
          </button>
          <button className="btn" onClick={() => setMode('join')}>
            Rejoindre une session (Stagiaire)
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <label className="text-sm text-gray-300" htmlFor="msp">
            Type de mise en situation (MSP)
          </label>
          <select
            id="msp"
            className="rounded-lg bg-anthracite-800 border border-anthracite-600 p-3 text-base"
            value={mspType}
            onChange={(e) => setMspType(e.target.value)}
          >
            {MSP_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Le contenu détaillé des scénarios (constantes, rythmes, événements) sera ajouté à une
            étape suivante.
          </p>
          <button className="btn btn-primary" onClick={() => onCreate(mspType)}>
            Créer la session
          </button>
          <button className="btn" onClick={() => setMode(null)}>
            Retour
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <label className="text-sm text-gray-300" htmlFor="pin">
            Code de session à 4 chiffres
          </label>
          <input
            id="pin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="rounded-lg bg-lcd border border-anthracite-600 p-4 text-center text-4xl tracking-[0.5em] font-mono text-fc"
            placeholder="0000"
          />
          <button className="btn btn-primary" disabled={!pinOk} onClick={() => onJoin(pin)}>
            Rejoindre
          </button>
          <button className="btn" onClick={() => setMode(null)}>
            Retour
          </button>
        </div>
      )}
    </div>
  );
}
