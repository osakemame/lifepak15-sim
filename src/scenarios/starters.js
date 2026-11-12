// Scénarios de départ (fournis par le formateur) : 15 situations, chacune en variante « Stable » et « Évolutif »
// (la situation n°5 en 4 variantes). Tous peuvent être modifiés ou supprimés ; les modifications sont partagées
// par tous les formateurs (voir netlify/functions/scenarios.mjs).
//
// Réglages à valider : pour l'évolutif, l'évolution des constantes se fait en 10 minutes (600 s) et le passage
// en ACR a lieu à T+10 min. Les valeurs d'arrivée marquées « (à valider) » ne figuraient pas dans la fiche d'origine.

const T = 600; // durée d'évolution : 10 minutes
const ZERO = { sys: 0, dia: 0 }; // PNI non mesurable

const ramps = (target, durationSec = T) =>
  Object.entries(target).map(([key, to]) => ({ at: 0, type: 'ramp', key, to, durationSec }));
const rhythm = (at, r) => ({ at, type: 'rhythm', rhythm: r });
const setVals = (at, values) => ({ at, type: 'set', values });

let n = 0;
const variantCount = {};
const make = (num, name, variant, consigne, start, dsa, events = []) => {
  n += 1;
  variantCount[num] = (variantCount[num] ?? 0) + 1;
  return {
    id: `depart-${String(num).padStart(2, '0')}-${String.fromCharCode(96 + variantCount[num])}`,
    name,
    variant,
    consigne,
    start,
    dsa,
    events,
    order: n,
    updatedAt: 0,
  };
};
const noShock = { shocksPlanned: 0, afterShock: 'keep' };
const shocks = (k, afterShock = 'keep') => ({ shocksPlanned: k, afterShock });

export const STARTERS = [
  // 1
  make(1, 'Hémorragie extériorisée', 'Stable (contrôlée)',
    'Pouls filant. Hémorragie contrôlée par pansement compressif ou garrot, paramètres stables sous oxygénothérapie (SpO2 93 % sous O2).',
    { rhythm: 'tachy', hr: 120, spo2: 93, sys: 85, dia: 50 }, noShock),
  make(1, 'Hémorragie extériorisée', 'Évolutif (non contrôlée → ACR)',
    'Hémorragie non contrôlée, décompte liquidien important : aggravation de la détresse circulatoire, puis ACR par désamorçage de la pompe (FV puis asystolie à T+10 min). 0 choc : RCP exclusive.',
    { rhythm: 'tachy', hr: 120, spo2: 93, sys: 85, dia: 50 }, noShock,
    [...ramps({ hr: 140, spo2: 88, sys: 65, dia: 40 }), rhythm(T, 'fv'), setVals(T, ZERO), rhythm(T + 90, 'asystolie')]),
  // 2
  make(2, 'Suite d\'une OVA (obstruction des voies aériennes)', 'Stable',
    'Corps étranger expulsé, toux efficace résiduelle, patient eupnéique. SpO2 98 % à l\'air.',
    { rhythm: 'sinus', hr: 80, spo2: 98, sys: 120, dia: 80 }, noShock),
  make(2, 'Suite d\'une OVA (obstruction des voies aériennes)', 'Évolutif',
    'Détresse respiratoire secondaire (irritation / œdème des voies aériennes ou micro-corps étranger résiduel) en 10 à 15 min : 110 bpm, 135/85, SpO2 92 % sous O2.',
    { rhythm: 'sinus', hr: 80, spo2: 98, sys: 120, dia: 80 }, noShock,
    ramps({ hr: 110, spo2: 92, sys: 135, dia: 85 })),
  // 3
  make(3, 'Inconscient qui respire suite à une chute', 'Stable',
    'Perte de connaissance isolée post-chute, patient en PLS, paramètres stables. SpO2 97 % à l\'air.',
    { rhythm: 'sinus', hr: 75, spo2: 97, sys: 115, dia: 75 }, noShock),
  make(3, 'Inconscient qui respire suite à une chute', 'Évolutif',
    'Aggravation neurologique (chute du Glasgow, hypertension intracrânienne : bradycardie, hypertension) avec détresse respiratoire secondaire en 10 à 15 min : 55 bpm, 160/90, SpO2 90 % sous O2.',
    { rhythm: 'sinus', hr: 75, spo2: 97, sys: 115, dia: 75 }, noShock,
    ramps({ hr: 55, spo2: 90, sys: 160, dia: 90 })),
  // 4
  make(4, 'Inconscient qui respire suite à un malaise', 'Stable',
    'Malaise lipothymique ou comateux non compliqué, stabilisé en PLS sous oxygène. SpO2 96 % à l\'air.',
    { rhythm: 'sinus', hr: 80, spo2: 96, sys: 120, dia: 80 }, noShock),
  make(4, 'Inconscient qui respire suite à un malaise', 'Évolutif (FV → ACR)',
    'Malaise d\'origine cardiaque qui dégénère en fibrillation ventriculaire à T+10 min : ACR, RCP et DAE, 1 choc ou plus (réglé à 2 chocs conseillés à la suite).',
    { rhythm: 'sinus', hr: 80, spo2: 96, sys: 120, dia: 80 }, shocks(2),
    [rhythm(T, 'fv'), setVals(T, ZERO)]),
  // 5
  make(5, 'ACR à l\'arrivée', 'Avec chocs - Stable',
    'ACR constaté d\'emblée, FV. Protocole RCP + DAE appliqué sans modification du rythme initial. 1 choc ou plus (réglé à 2).',
    { rhythm: 'fv', hr: 0, spo2: 0, sys: 0, dia: 0 }, shocks(2)),
  make(5, 'ACR à l\'arrivée', 'Avec chocs - Évolutif',
    'ACR en FV : 1 choc, puis passage à un rythme non choquable (asystolie) pendant les cycles de réanimation.',
    { rhythm: 'fv', hr: 0, spo2: 0, sys: 0, dia: 0 }, shocks(1, 'asystolie')),
  make(5, 'ACR à l\'arrivée', 'Sans choc - Stable',
    'ACR constaté d\'emblée, asystolie (ou AESP : rythme modifiable). 0 choc : RCP pure.',
    { rhythm: 'asystolie', hr: 0, spo2: 0, sys: 0, dia: 0 }, noShock),
  make(5, 'ACR à l\'arrivée', 'Sans choc - Évolutif',
    'ACR en asystolie, puis passage à un rythme choquable (FV) à T+4 min, lors des cycles de réanimation : 1 choc.',
    { rhythm: 'asystolie', hr: 0, spo2: 0, sys: 0, dia: 0 }, shocks(1),
    [rhythm(240, 'fv')]),
  // 6
  make(6, 'AVP conscient avec hémorragie interne', 'Stable',
    'Hémorragie interne compensée, patient conscient, pression artérielle pincée, sous oxygénothérapie, restriction des mouvements rachidiens. SpO2 94 % sous O2.',
    { rhythm: 'tachy', hr: 115, spo2: 94, sys: 90, dia: 60 }, noShock),
  make(6, 'AVP conscient avec hémorragie interne', 'Évolutif',
    'Aggravation du choc hémorragique : effondrement tensionnel (PAS < 90), marbrures, altération de la conscience. Valeurs d\'arrivée (à valider) : 135 bpm, 75/45, SpO2 90 %.',
    { rhythm: 'tachy', hr: 115, spo2: 94, sys: 90, dia: 60 }, noShock,
    ramps({ hr: 135, spo2: 90, sys: 75, dia: 45 })),
  // 7
  make(7, 'AVP inconscient', 'Stable',
    'Traumatisé crânien inconscient, axe tête-cou-tronc maintenu, ventilation stable. SpO2 95 % sous O2.',
    { rhythm: 'sinus', hr: 85, spo2: 95, sys: 120, dia: 80 }, noShock),
  make(7, 'AVP inconscient', 'Évolutif',
    'Encombrement des voies aériennes supérieures ou atteinte cérébrale secondaire : détresse respiratoire aiguë en 10 à 15 min : 60 bpm, 100/60, SpO2 88 % sous O2.',
    { rhythm: 'sinus', hr: 85, spo2: 95, sys: 120, dia: 80 }, noShock,
    ramps({ hr: 60, spo2: 88, sys: 100, dia: 60 })),
  // 8
  make(8, 'AVP inconscient avec hémorragie interne', 'Stable',
    'Polytraumatisé inconscient en choc hypovolémique compensé. Pouls filant. SpO2 92 % sous O2.',
    { rhythm: 'tachy', hr: 125, spo2: 92, sys: 85, dia: 50 }, noShock),
  make(8, 'AVP inconscient avec hémorragie interne', 'Évolutif (AESP → ACR)',
    'Aggravation rapide du choc hémorragique, épuisement cardiovasculaire : ACR en AESP à T+10 min. 0 choc. Valeurs avant l\'ACR (à valider) : 140 bpm, 65/40, SpO2 88 %.',
    { rhythm: 'tachy', hr: 125, spo2: 92, sys: 85, dia: 50 }, noShock,
    [...ramps({ hr: 140, spo2: 88, sys: 65, dia: 40 }), rhythm(T, 'aesp'), setVals(T, ZERO)]),
  // 9
  make(9, 'AVC (accident vasculaire cérébral)', 'Stable',
    'Déficit neurologique focal stable (FAST positif), conscience préservée, pouls régulier. SpO2 97 % à l\'air.',
    { rhythm: 'sinus', hr: 78, spo2: 97, sys: 160, dia: 95 }, noShock),
  make(9, 'AVC (accident vasculaire cérébral)', 'Évolutif',
    'Extension de l\'ischémie ou hémorragie cérébrale massive : altération secondaire de la conscience (coma) menaçant les voies aériennes. Valeurs d\'arrivée (à valider) : 65 bpm, 190/105, SpO2 93 %.',
    { rhythm: 'sinus', hr: 78, spo2: 97, sys: 160, dia: 95 }, noShock,
    ramps({ hr: 65, spo2: 93, sys: 190, dia: 105 })),
  // 10
  make(10, 'Douleur thoracique non traumatique', 'Stable (sans évolution)',
    'Douleur thoracique constrictive persistante, EVS/EN à 7/10, paramètres stables. L\'ECG retrouve un STEMI transmis au régulateur. SpO2 96 % à l\'air.',
    { rhythm: 'stemi', hr: 90, spo2: 96, sys: 130, dia: 85 }, noShock),
  make(10, 'Douleur thoracique non traumatique', 'Évolutif (FV → ACR à 10 min)',
    'Aggravation de l\'ischémie (130 bpm, 80/50, SpO2 91 % sous O2) puis passage brutal en FV à T+10 min : RCP immédiate et DAE avec 1 choc ou plus (réglé à 2).',
    { rhythm: 'stemi', hr: 90, spo2: 96, sys: 130, dia: 85 }, shocks(2),
    [...ramps({ hr: 130, spo2: 91, sys: 80, dia: 50 }, T - 60), rhythm(T, 'fv'), setVals(T, ZERO)]),
  // 11
  make(11, 'Crise d\'asthme', 'Stable (sans ACR)',
    'Crise modérée à sévère, sifflements audibles, tirage, amélioration progressive sous oxygénothérapie et aide à la prise de médicaments (inhalateur). SpO2 91 % sous O2.',
    { rhythm: 'tachy', hr: 110, spo2: 91, sys: 130, dia: 80 }, noShock),
  make(11, 'Crise d\'asthme', 'Évolutif (ACR par asphyxie)',
    'Épuisement respiratoire total, silence thoracique, cyanose intense : ACR par asphyxie (AESP) à T+10 min. 0 choc. Valeurs avant l\'ACR (à valider) : 130 bpm, SpO2 85 %.',
    { rhythm: 'tachy', hr: 110, spo2: 91, sys: 130, dia: 80 }, noShock,
    [...ramps({ hr: 130, spo2: 85 }), rhythm(T, 'aesp'), setVals(T, ZERO)]),
  // 12
  make(12, 'Hypoglycémie', 'Stable',
    'Sueurs, tremblements, troubles du comportement modérés. Glycémie capillaire < 0,6 g/L (< 3,3 mmol/L), corrigée par du sucre sur avis médical. SpO2 98 % à l\'air.',
    { rhythm: 'sinus', hr: 105, spo2: 98, sys: 125, dia: 80 }, noShock),
  make(12, 'Hypoglycémie', 'Évolutif',
    'Aggravation de la déplétion en glucose : perte de connaissance profonde (coma hypoglycémique), détresse neurologique majeure. Valeurs d\'arrivée (à valider) : 120 bpm, 110/70, SpO2 96 %.',
    { rhythm: 'sinus', hr: 105, spo2: 98, sys: 125, dia: 80 }, noShock,
    ramps({ hr: 120, spo2: 96, sys: 110, dia: 70 })),
  // 13
  make(13, 'Hypothermie', 'Stable',
    'Hypothermie modérée, température < 35 °C, frissons intenses, conscience conservée, réchauffement externe passif. Pouls ralenti, difficile à percevoir ; SpO2 non détectable (vasoconstriction).',
    { rhythm: 'brady', hr: 50, spo2: 0, sys: 100, dia: 60 }, noShock),
  make(13, 'Hypothermie', 'Évolutif (FV → ACR)',
    'Aggravation vers une hypothermie sévère : perte de connaissance, collapsus, puis FV hypothermique à T+10 min (chocs selon le DAE, réglé à 2). Valeurs avant l\'ACR (à valider) : 40 bpm, 80/50.',
    { rhythm: 'brady', hr: 50, spo2: 0, sys: 100, dia: 60 }, shocks(2),
    [...ramps({ hr: 40, sys: 80, dia: 50 }), rhythm(T, 'fv'), setVals(T, ZERO)]),
  // 14
  make(14, 'Affection liée à la chaleur (coup de chaleur)', 'Stable',
    'Crampes, fatigue, céphalées, peau chaude et rouge ; température > 40 °C. Refroidissement progressif et hydratation. SpO2 96 % à l\'air.',
    { rhythm: 'tachy', hr: 130, spo2: 96, sys: 100, dia: 60 }, noShock),
  make(14, 'Affection liée à la chaleur (coup de chaleur)', 'Évolutif',
    'Coup de chaleur malin (hyperthermie > 40 °C, troubles de la conscience, convulsions) : défaillance multiviscérale et collapsus. Valeurs d\'arrivée (à valider) : 150 bpm, 80/45, SpO2 92 %.',
    { rhythm: 'tachy', hr: 130, spo2: 96, sys: 100, dia: 60 }, noShock,
    ramps({ hr: 150, spo2: 92, sys: 80, dia: 45 })),
  // 15
  make(15, 'Intoxication (médicamenteuse, éthylique ou aux gaz)', 'Stable',
    'Intoxication simple : nausées, vomissements, conscience altérée mais stable ; respect des consignes d\'isolement et de protection. SpO2 92 % sous O2 (faussement rassurante en cas d\'intoxication au CO).',
    { rhythm: 'sinus', hr: 60, spo2: 92, sys: 95, dia: 60 }, noShock),
  make(15, 'Intoxication (médicamenteuse, éthylique ou aux gaz)', 'Évolutif (ACR par asphyxie)',
    'Dépression respiratoire centrale progressive (surdosage) puis arrêt ventilatoire menant à l\'ACR (asystolie) à T+10 min. 0 choc. Valeurs avant l\'ACR (à valider) : 45 bpm, 80/45, SpO2 80 %.',
    { rhythm: 'sinus', hr: 60, spo2: 92, sys: 95, dia: 60 }, noShock,
    [...ramps({ hr: 45, spo2: 80, sys: 80, dia: 45 }), rhythm(T, 'asystolie'), setVals(T, ZERO)]),
];
