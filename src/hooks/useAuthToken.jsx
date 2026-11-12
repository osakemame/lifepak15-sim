import React, { useCallback, useRef, useState } from 'react';
import { cachedToken, forgetToken, login } from '../services/scenarioApi.js';

/**
 * Code formateur : demandé uniquement pour créer, modifier, supprimer ou enregistrer un scénario.
 * Le code est vérifié par le serveur ; le navigateur ne garde qu'un jeton de 2 h (jamais le code).
 *
 *   const { withToken, codeModal } = useAuthToken();
 *   await withToken((token) => saveScenarioOnServer(token, sc));   // affiche la fenêtre du code si besoin
 */
export function useAuthToken() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(null);

  const ask = useCallback(
    () =>
      new Promise((resolve, reject) => {
        pending.current = { resolve, reject };
        setCode('');
        setError('');
        setOpen(true);
      }),
    []
  );

  const submit = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const token = await login(code);
      setOpen(false);
      pending.current?.resolve(token);
    } catch (err) {
      setError(err.offline ? 'Serveur injoignable.' : err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setOpen(false);
    const e = new Error('Annulé');
    e.cancelled = true;
    pending.current?.reject(e);
  };

  const withToken = useCallback(
    async (fn) => {
      let token = cachedToken() ?? (await ask());
      try {
        return await fn(token);
      } catch (err) {
        if (!err.needLogin) throw err;
        forgetToken();
        token = await ask();
        return fn(token);
      }
    },
    [ask]
  );

  const codeModal = open ? (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-anthracite-600 bg-anthracite-800 p-5">
        <h2 className="text-lg font-bold">Code formateur</h2>
        <p className="text-sm text-gray-300">
          Ce code est demandé pour créer, modifier, supprimer ou enregistrer un scénario.
        </p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={8}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-lg bg-lcd border border-anthracite-600 p-3 text-center text-3xl tracking-[0.4em] font-mono"
        />
        {error && <p className="text-sm text-yellow-300">{error}</p>}
        <div className="flex gap-3">
          <button type="button" className="btn flex-1" onClick={cancel}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary flex-1" disabled={busy || code.length < 4}>
            Valider
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return { withToken, codeModal };
}
