// Valeurs de référence issues du RTN de secourisme (juillet 2026), telles que fournies.
// Aucune valeur ajoutée ici : ce qui manque dans le RTN reste à null.

// Tableau 4 (fréquence ventilatoire, mouvements/min) et tableau 5 (fréquence cardiaque, bpm)
export const AGE_GROUPS = {
  adulte: { label: 'Adulte', ageNote: 'adulte', fc: [60, 100], fr: [12, 20] },
  enfant: { label: 'Enfant', ageNote: 'environ 10 ans', fc: [70, 140], fr: [20, 30] },
  nourrisson: { label: 'Nourrisson', ageNote: "jusqu'à 1 an", fc: [100, 160], fr: [30, 40] },
  nouveauNe: { label: 'Nouveau-né', ageNote: '0 à 7 jours', fc: [120, 160], fr: [40, 60] },
};

export const SPO2_NORMALE = [94, 100]; // %

// Pression artérielle normale de l'adulte : 120/80 mmHg (valeur retenue par l'utilisateur ;
// le texte du RTN indique "autour de 100" en systolique, on utilise 120 pour la simulation).
export const PA_ADULTE = { systolique: 120, diastolique: 80 }; // mmHg

// Chez l'enfant : pas de valeur de référence dans le RTN (varie selon sexe, âge, taille, poids).
// Le secouriste transmet la valeur mesurée pour avis médical.
export const PA_ENFANT = null;

// Énergie de choc : fixe à 200 J pour tous les âges (décision utilisateur, mode DSA).
export const ENERGIE_CHOC_J = 200;
