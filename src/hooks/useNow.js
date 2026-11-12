import { useEffect, useState } from 'react';

// Horloge qui se rafraîchit régulièrement (heure affichée, compte à rebours, barre de charge...)
export function useNow(intervalMs = 200) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
