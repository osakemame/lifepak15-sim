import { useEffect } from 'react';

// Empêche la mise en veille de l'écran (important : si l'écran du formateur s'éteint,
// la liaison peut se couper). Nécessite HTTPS (fourni par Netlify) et un navigateur compatible.
export function useWakeLock(enabled = true) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return undefined;

    let lock = null;
    let cancelled = false;

    const request = async () => {
      try {
        const l = await navigator.wakeLock.request('screen');
        if (cancelled) l.release().catch(() => {});
        else lock = l;
      } catch {
        /* refusé ou non supporté : on ignore */
      }
    };

    // Le verrou est relâché par le navigateur quand l'onglet passe en arrière-plan.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (lock) lock.release().catch(() => {});
    };
  }, [enabled]);
}
