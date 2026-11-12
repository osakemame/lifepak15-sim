// Textes de l'écran du LIFEPAK 15 (mode DSA), relevés sur les photos et vidéos fournies.
// Tout est regroupé ici pour pouvoir corriger un libellé sans toucher au reste du code.
//
// Les textes marqués PROVISOIRE n'ont pas été vus sur l'appareil : ils sont déduits de vos
// indications et sont à vérifier.

export const TEXTS = {
  modeDsa: 'Mode DSA',

  // Fenêtres (vues sur les vidéos DSA)
  pressAnalyse: 'Appuyer sur ANALYSE',
  analysing: 'Analyse en cours, reculez vous',
  connectPads: 'Connectez les électrodes',
  startCpr: 'Débuter RCP',

  // Résultat de l'analyse
  shockNotAdvised: 'Choc non conseillé',
  shockAdvised: 'Choc conseillé', // PROVISOIRE : non vu en DSA, sur votre indication

  // Charge et choc (textes relevés en mode manuel, repris avec l'en-tête « Mode DSA »)
  charging: (joules) => `Chargement à ${joules}J`,
  chargedLine1: (joules) => `${joules}J disponibles`,
  chargedLine2: 'Appuyer bouton CHOC!',
  delivered: 'Energie délivrée',

  // Bandeau d'état (en bas de l'écran)
  band: {
    surveillance: 'Mode DSA - Surveillance',
    spo2NoSensor: 'SpO2: Capteur non détecté',
    padsStart: 'Mise en route dériv palettes',
  },
};

// Modes du métronome RCP (menu vu sur la vidéo). Le formateur choisit le mode dans le scénario.
// Libellé du bandeau : seul le premier a été vu sur l'appareil, les autres sont PROVISOIRES.
export const RCP_MODES = {
  'ad-abs': {
    menu: 'Ad. - Abs. voies aér.',
    band: 'RCP: Ad. - Abs. voies aér.  30:2',
    ratio: '30:2',
    provisional: false,
  },
  'ad-voies': {
    menu: 'Adulte - Voies aér.',
    band: 'RCP: Adulte - Voies aér.',
    ratio: null, // compressions continues, sans pause
    provisional: true,
  },
  'ped-abs': {
    menu: 'Pédi. - Abs. voies aér.',
    band: 'RCP: Pédi. - Abs. voies aér.  15:2',
    ratio: '15:2',
    provisional: true,
  },
  'ped-voies': {
    menu: 'Pédi. - Voies aér.',
    band: 'RCP: Pédi. - Voies aér.',
    ratio: null,
    provisional: true,
  },
};

export const METRONOME_BPM = 100; // compressions par minute (indiqué par l'utilisateur)
export const SHOCK_JOULES = 200; // énergie fixe en DSA (indiqué par l'utilisateur)
