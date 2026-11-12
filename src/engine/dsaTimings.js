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
  ventilationPause: 5000, // PROVISOIRE : silence du métronome pour les 2 insufflations (modes « Abs. voies aér. » 30:2 et 15:2)
  rcpSeconds: 120, // compte à rebours RCP : 2:00
};
