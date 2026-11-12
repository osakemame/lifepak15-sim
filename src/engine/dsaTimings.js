// Durées de la séquence DSA, en millisecondes.
//
// Relevé sur vos vidéos :
//   - charge : environ 4 s pour atteindre 200 J (compteur 49, 95, 143, 200 J)
//   - PNI : environ 10 s (indiqué par l'utilisateur)
//   - compte à rebours RCP : 2:00 (indiqué par l'utilisateur)
// Les autres durées sont PROVISOIRES (non mesurées) : à ajuster ici.

export const TIMINGS = {
  padsStart: 2500, // PROVISOIRE : message « Mise en route dériv palettes » avant « Connectez les électrodes »
  analysis: 6000, // PROVISOIRE : durée de « Analyse en cours, reculez vous »
  result: 3000, // PROVISOIRE : affichage de « Choc conseillé » / « Choc non conseillé »
  charge: 4000, // relevé sur la vidéo
  blank: 900, // écran noir au moment du choc (vidéo)
  delivered: 3500, // PROVISOIRE : affichage de « Energie délivrée »
  pni: 10000, // indiqué par l'utilisateur
  ventilationPause: 4200, // relevé sur rcp_bip.mp3 : après la dernière compression, 0,6 s + 2 insufflations (2,4 s chacune) puis reprise
  ventilationTone: 1200, // durée d'une insufflation (son grave)
  ventilationEvery: 2400, // intervalle entre les 2 insufflations
  rcpSeconds: 120, // compte à rebours RCP : 2:00
};
