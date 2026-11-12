import { useCallback, useEffect, useMemo, useState } from 'react';
import { STARTERS } from '../scenarios/starters.js';
import { mergeScenarios } from '../scenarios/scenarioModel.js';
import { fetchServerScenarios } from '../services/scenarioApi.js';

/**
 * Liste des scénarios = scénarios de départ + scénarios enregistrés sur le serveur (partagés par tous les formateurs).
 * status : 'loading' | 'ok' | 'offline' (serveur injoignable : on affiche les scénarios de départ en lecture seule)
 */
export function useScenarios() {
  const [server, setServer] = useState(null);
  const [status, setStatus] = useState('loading');

  const refresh = useCallback(async () => {
    try {
      setServer(await fetchServerScenarios());
      setStatus('ok');
    } catch {
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const list = useMemo(() => mergeScenarios(STARTERS, server), [server]);
  return { list, status, refresh };
}
