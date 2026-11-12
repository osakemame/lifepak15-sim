import { useLayoutEffect, useState } from 'react';

// Calcule le facteur d'échelle pour afficher un élément de taille fixe (width x height)
// dans la fenêtre, tablette ou smartphone, en conservant les proportions.
export function useFitScale(width, height, { reserveTop = 0, margin = 6 } = {}) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const compute = () => {
      const vw = window.visualViewport?.width ?? window.innerWidth;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const s = Math.min((vw - margin * 2) / width, (vh - reserveTop - margin * 2) / height);
      setScale(Math.max(0.2, s));
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    window.visualViewport?.addEventListener('resize', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
      window.visualViewport?.removeEventListener('resize', compute);
    };
  }, [width, height, reserveTop, margin]);

  return scale;
}
