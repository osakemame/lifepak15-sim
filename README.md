# Simulateur LIFEPAK 15 — SDIS 24

Application web de simulation d'un moniteur-défibrillateur LIFEPAK 15 en **mode DSA** (semi-automatique) pour la formation secourisme.
Deux écrans reliés en temps réel : **Stagiaire** (face avant du LIFEPAK 15, paysage) et **Formateur** (télécommande, portrait).

**État : étape 3 sur 5** — écran du stagiaire, séquence DSA, tracés animés, sons et voix.

## Feuille de route

| Étape | Contenu | État |
|---|---|---|
| 1 | Squelette React/Vite/Tailwind, hub, liaison PeerJS, reconnexion | fait |
| 2 | Écran Stagiaire (face avant, séquence DSA, PNI), panneau de test formateur, journal | **fait** |
| 3 | Tracés animés (ECG, pléthysmographie SpO2) et sons / voix | **fait** |
| 4 | Télécommande Formateur complète (rampes de constantes, rythmes, événements) | à venir |
| 5 | Scénarios (MSP), enregistrement sur Netlify, débriefing | à venir |

## Ajouts de l'étape 3

- **Tracés animés** (balayage de gauche à droite) : 1 ECG + 2 tracés SpO2 identiques. Rythmes : sinusal, tachycardie sinusale, bradycardie sinusale sévère, STEMI, BAV complet, TV, FV, asystolie, AESP (`src/engine/rhythms.js`). Le rythme se choisit pour l'instant dans un menu provisoire de la page formateur. Sans pouls (FV, asystolie, AESP) le tracé SpO2 est plat.
- **Sons** (Web Audio, `src/services/audio.js`) : bip du pouls synchronisé sur le tracé (hauteur qui baisse avec la SpO2), métronome RCP 100/min, charge 400 → 1200 Hz, tonalité « prêt », « clac » du choc, pompe PNI.
- **Voix** (synthèse vocale du navigateur, français) : mêmes phrases que l'écran : « Connectez les électrodes », « Analyse en cours, reculez vous », « Choc conseillé », « Choc non conseillé », « Appuyer bouton CHOC », « Energie délivrée », « Débuter RCP », « Appuyer sur ANALYSE ».
- **Son** : les navigateurs exigent un toucher avant de jouer un son (message « Touchez l'écran pour activer le son ») ; bouton « Son activé / coupé » en haut.
- **MARCHE** : le stagiaire éteint l'appareil (écran noir, tout est effacé, y compris le métronome) et le rallume (retour au début de la session, selon les réglages du formateur à cet instant).
- **RCP** : menu « Métronome RCP » (5 choix) ; la LED RCP reste allumée dès le 1er appui jusqu'à l'extinction.

## Ce que fait l'étape 2

**Écran du stagiaire** : face avant du LIFEPAK 15 reproduite en CSS, étiquettes en français comme sur l'appareil. Seuls **RCP, ANALYSE, CHOC (bouton rouge) et PNI** réagissent ; le reste est décoratif.

Séquence DSA :
1. **ANALYSE** (1er appui) → « Mise en route dériv palettes » → « Connectez les électrodes » : l'écran attend que le **formateur valide la pose des électrodes**.
2. « Analyse en cours, reculez vous » → **« Choc conseillé »** ou **« Choc non conseillé »**, selon le scénario du formateur.
3. Choc conseillé : l'appareil **se charge tout seul** (« Chargement à 200J »), puis « 200J disponibles / Appuyer bouton CHOC! ». Le stagiaire appuie sur **CHOC** → « Energie délivrée ».
4. « Débuter RCP » avec compte à rebours **2:00 → 0:00** ; à 0:00, « Appuyer sur ANALYSE » : le stagiaire doit rappuyer sur ANALYSE.
5. **PNI** : mesure d'environ 10 s (la pression du brassard monte), puis affichage des valeurs du formateur.

L'écran déduit seul ce qu'il affiche de ce qui est branché (le formateur peut le changer en cours de scénario) : câble ECG 4 brins → « FC » en vert ; capteur SpO2 → « FP (SpO2) » en bleu ; mesure PNI seule → « FP (PNI) » en blanc ; capteur absent → « --- » et « SpO2: Capteur non détecté ».

**Bouton RCP** : ouvre sur l'écran du stagiaire un menu de 5 choix (Ad. - Abs. voies Aér. 30:2 / Adulte - Voies aér. / Pédi. - Abs. voies Aér. 15:2 / Pédi. - Voies aér. / Arrêter métronome). Le choix lance le métronome (100/min) ; « Arrêter métronome » le coupe, sans bruit. Ce choix n'existe pas côté formateur.

**ANALYSE** peut être appuyé à tout moment (sauf pendant la mise en route, l'attente des électrodes, l'analyse et l'instant du choc) et relance une analyse.

**Page formateur (provisoire)** : branchements, constantes, nombre de chocs conseillés à la suite, résultat imposé pour la prochaine analyse, validation des électrodes, remise à zéro de l'écran du stagiaire. La vraie télécommande arrive à l'étape 4.

**Journal** : horodaté (actions du stagiaire, événements de l'appareil, validations du formateur). Il est **conservé dans le navigateur du formateur** (il survit à un rafraîchissement) et n'est effacé que sur confirmation (« Terminer la session » ou « Effacer »).

## Réglages à connaître

| Fichier | Contenu |
|---|---|
| `src/engine/dsaTimings.js` | Durées de la séquence (analyse, charge, affichage des résultats…). Celles marquées PROVISOIRE sont à ajuster. |
| `src/engine/lp15Texts.js` | Tous les textes de l'écran. Ceux marqués PROVISOIRE n'ont pas été vus sur l'appareil. |
| `src/engine/referenceValues.js` | Valeurs de référence du RTN (juillet 2026), PA normale adulte 120/80, énergie 200 J. |
| `src/engine/hostState.js` | État de départ de la session (branchements, constantes, scénario DSA). |

## À vérifier sur l'appareil réel (hypothèses de cette version)

- Durées : analyse 6 s, affichage des résultats 3 s, « Energie délivrée » 3,5 s, message « Mise en route dériv palettes » 2,5 s.
- Fenêtres de charge et de choc : textes relevés en mode manuel, repris avec l'en-tête « Mode DSA » (fond blanc comme en manuel).
- Textes du bandeau pour les modes « Adulte - Voies aér. », « Pédi. - Abs. voies aér. », « Pédi. - Voies aér. ».
- Le métronome ne démarre plus tout seul avec « Débuter RCP » : le stagiaire le lance par le menu RCP (à confirmer).
- Menu RCP : les 5 choix se touchent directement à l'écran (l'appareil réel utilise les touches latérales de l'écran).
- PAM calculée par la formule classique ; l'appareil réel donne des valeurs légèrement différentes.
- Pas de limite de temps entre « 200J disponibles » et l'appui sur CHOC.
- Sons : métronome à 883 Hz (relevé sur la vidéo ; votre description disait 1000 Hz) ; tonalité « prêt », bip du pouls, pompe PNI et « clac » : réglages provisoires dans `src/services/audio.js`.
- Modes « Abs. voies aér. » (30:2 et 15:2) : pause de 5 s du métronome après 30 (ou 15) compressions, valeur provisoire (`ventilationPause` dans `dsaTimings.js`).
- Les formes des rythmes sont des approximations pédagogiques.

## Lancer en local

Prérequis : [Node.js](https://nodejs.org) 18 ou plus récent.

```bash
npm install
npm run dev -- --host
```

Ouvrez l'adresse affichée (ex. `http://localhost:5173`). Pour tester avec un téléphone sur le même Wi-Fi, utilisez l'adresse « Network » affichée.

### Tester

1. Appareil A : **Créer une session (Formateur)** → un code à 4 chiffres s'affiche.
2. Appareil B (paysage) : **Rejoindre une session (Stagiaire)** → saisir le code.
3. Stagiaire : appuyer sur **ANALYSE** → le formateur voit « Attend les électrodes » et valide ; suivre la séquence.
4. Formateur : brancher la SpO2 ou le câble ECG, changer les constantes, imposer « Choc conseillé » / « Non conseillé ».
5. Rafraîchir une des deux pages : la liaison se rétablit, le journal du formateur est conservé.

Si les deux rôles sont testés dans **le même navigateur** (deux onglets), ils partagent la mémoire locale : la reprise après rafraîchissement peut alors se tromper de rôle. Utilisez deux appareils (comme sur le terrain).

## Déployer sur Netlify

Inchangé : dépôt GitHub, import dans Netlify, les réglages sont lus dans `netlify.toml` (commande `npm run build`, dossier `dist`). Pour mettre à jour : remplacer les fichiers dans GitHub, Netlify redéploie tout seul (**15 crédits par déploiement**, plafond de 300 crédits par mois en plan gratuit : regroupez vos modifications).

Il n'y a pas de QR code : seul le code à 4 chiffres est utilisé. Le formateur peut copier un lien du type `https://….netlify.app/?pin=1234`.

## Remarques sur PeerJS

- Le serveur public gratuit de PeerJS met les deux appareils en relation, puis les données passent en direct (WebRTC). Sur certains réseaux (4G d'opérateurs particuliers, Wi-Fi filtré), la liaison peut échouer : un écran de diagnostic l'indique.
- **Le formateur est l'hôte** : si son téléphone s'éteint ou perd le réseau, la session est interrompue. L'écran du formateur reste allumé (navigateur compatible) et la session reprend après un rafraîchissement.
- Si le stagiaire rafraîchit sa page, la séquence DSA repart de zéro (la liaison, elle, se rétablit toute seule).

## Structure

```
src/
  pages/        Hub, TrainerPage (formateur), TraineePage (stagiaire)
  components/   StatusBadge, Diagnostic, TrainerPanel (provisoire), lp15/ (face avant : Device, Screen, icônes, CSS)
  hooks/        useHostSession, useGuestSession, useDsa (séquence DSA), useDsaAudio (sons et voix), useNow, useFitScale, useWakeLock
  services/     session (PIN, PeerJS), messages (protocole), peerConfig, audio (sons et voix)
  engine/       dsaMachine (états), rhythms (tracés), viewModel (ce que l'écran affiche), hostState, lp15Texts, dsaTimings, referenceValues
  scenarios/    mspTypes (liste des types de MSP)
```

## Valeurs de référence (RTN secourisme, juillet 2026)

| | Adulte | Enfant (~10 ans) | Nourrisson (≤ 1 an) | Nouveau-né (0-7 j) |
|---|---|---|---|---|
| Fréquence cardiaque (bpm) | 60 à 100 | 70 à 140 | 100 à 160 | 120 à 160 |
| Fréquence ventilatoire (mvt/min) | 12 à 20 | 20 à 30 | 30 à 40 | 40 à 60 |

SpO2 normale : 94 à 100 %. PA normale de l'adulte retenue pour la simulation : 120/80 mmHg. Pas de valeur de référence chez l'enfant (le secouriste transmet la mesure pour avis médical).

---
SDIS 24 - LTN H. BRU - CIS Sarlat
