// Générateur de rythmes : tracé ECG et onde de pouls (pléthysmographie SpO2), échantillon par échantillon.
// Aucune dépendance à React : utilisé par components/lp15/TraceCanvas.jsx.
//
// Les formes sont des approximations pédagogiques (sommes de gaussiennes), pas des enregistrements réels.

export const RHYTHMS = {
  sinus: { label: 'Rythme sinusal', pulse: true },
  tachy: { label: 'Tachycardie sinusale', pulse: true },
  brady: { label: 'Bradycardie sinusale sévère', pulse: true },
  stemi: { label: 'Sus-décalage ST (STEMI)', pulse: true },
  bav: { label: 'BAV complet', pulse: true },
  tv: { label: 'Tachycardie ventriculaire', pulse: true },
  fv: { label: 'Fibrillation ventriculaire', pulse: false },
  asystolie: { label: 'Asystolie', pulse: false },
  aesp: { label: 'AESP (activité électrique sans pouls)', pulse: false },
};

export const DEFAULT_RHYTHM = 'sinus';

const g = (x, c, w) => Math.exp(-((x - c) * (x - c)) / (2 * w * w));

// Un battement sinusal complet sur une phase de 0 à 1 (onde P, QRS, onde T)
function sinusBeat(p, { stElev = 0 } = {}) {
  let v = 0.12 * g(p, 0.12, 0.028); // P
  v += -0.12 * g(p, 0.275, 0.007); // Q
  v += 1.0 * g(p, 0.3, 0.0095); // R
  v += -0.26 * g(p, 0.328, 0.009); // S
  if (stElev) {
    // Sus-décalage ST : le segment ST monte et se fond dans une onde T ample (« dôme »)
    v += stElev * g(p, 0.46, 0.085);
    v += stElev * 0.35 * g(p, 0.37, 0.04);
  } else {
    v += 0.3 * g(p, 0.56, 0.055); // T
  }
  return v;
}

// QRS large (BAV complet : échappement ventriculaire, TV)
function wideBeat(p) {
  return 0.85 * g(p, 0.2, 0.05) - 0.35 * g(p, 0.34, 0.05) - 0.25 * g(p, 0.6, 0.09);
}

// Onde de pouls : montée rapide, descente lente avec encoche dicrote
function plethShape(p) {
  const rise = 1 / (1 + Math.exp(-(p - 0.12) * 60));
  const fall = Math.exp(-Math.max(0, p - 0.14) * 3.2);
  return rise * fall + 0.12 * g(p, 0.42, 0.04);
}

const wrap = (x) => x - Math.floor(x);

/**
 * Crée un générateur. À chaque pas : step(dt, { rhythm, hr, spo2 }) -> { ecg, pleth, qrs }
 *  - ecg   : amplitude de -1 à 1 environ
 *  - pleth : amplitude de 0 à 1 (0 = pied de l'onde, 1 = sommet)
 *  - qrs   : true à l'instant d'un complexe QRS (déclenche le bip)
 */
export function createGenerator() {
  let vPhase = 0; // phase ventriculaire (QRS)
  let aPhase = 0; // phase auriculaire (BAV)
  let pPhase = 0; // phase du pouls
  let t = 0;
  let noise = 0;

  return {
    step(dt, { rhythm, hr, spo2 = 98 }) {
      t += dt;
      const rate = Math.max(0, hr) / 60; // battements par seconde
      let ecg = 0;
      let qrs = false;
      const prevV = vPhase;

      switch (rhythm) {
        case 'fv': {
          const m = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.35 * t + 1);
          ecg =
            m *
            (0.45 * Math.sin(2 * Math.PI * 4.6 * t) +
              0.3 * Math.sin(2 * Math.PI * 6.9 * t + 1.3) +
              0.2 * Math.sin(2 * Math.PI * 3.1 * t + 0.4));
          break;
        }
        case 'asystolie':
          noise = noise * 0.9 + (Math.random() - 0.5) * 0.02;
          ecg = noise + 0.015 * Math.sin(2 * Math.PI * 0.3 * t);
          break;
        case 'tv': {
          vPhase = wrap(vPhase + dt * rate);
          ecg = 0.8 * Math.sin(2 * Math.PI * vPhase) + 0.2 * Math.sin(4 * Math.PI * vPhase + 0.6);
          qrs = vPhase < prevV;
          break;
        }
        case 'bav': {
          // Les ondes P (≈ 85/min) et les QRS larges (rythme d'échappement) sont indépendants
          vPhase = wrap(vPhase + dt * rate);
          aPhase = wrap(aPhase + dt * (85 / 60));
          ecg = 0.12 * g(aPhase, 0.5, 0.03) + 0.9 * wideBeat(vPhase);
          qrs = vPhase < prevV;
          break;
        }
        default: {
          vPhase = wrap(vPhase + dt * rate);
          ecg = sinusBeat(vPhase, { stElev: rhythm === 'stemi' ? 0.45 : 0 });
          if (rhythm === 'aesp') ecg *= 0.7;
          qrs = vPhase < prevV;
        }
      }

      // Pouls : seulement si le rythme donne un pouls
      let pleth = 0.5;
      if (RHYTHMS[rhythm]?.pulse && rate > 0) {
        pPhase = wrap(pPhase + dt * rate);
        const amp = 0.55 + 0.45 * Math.min(1, Math.max(0.2, (spo2 - 60) / 40));
        pleth = 0.05 + 0.9 * plethShape(pPhase) * amp;
      } else {
        pleth = 0.5 + 0.015 * Math.sin(2 * Math.PI * 0.25 * t); // ligne quasi plate (respiration)
      }
      return { ecg, pleth, qrs };
    },
  };
}
