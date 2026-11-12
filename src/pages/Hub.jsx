import React, { useState } from 'react';
import Footer from '../components/Footer.jsx';
import { isValidPin } from '../services/session.js';

// Page d'accueil : le formateur crée une session, le stagiaire la rejoint avec le code à 4 chiffres.
export default function Hub({ initialPin = '', onCreate, onJoin }) {
  const [mode, setMode] = useState(initialPin ? 'join' : null); // null | 'create' | 'join'
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
          <p className="text-sm text-gray-300">
            Un code à 4 chiffres sera créé. Vous choisirez le scénario (MSP) sur la page du formateur.
          </p>
          <button className="btn btn-primary" onClick={() => onCreate(null)}>
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
      <Footer />
    </div>
  );
}
