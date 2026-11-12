# Simulateur LIFEPAK 15 — SDIS 24

Application web de simulation d'un moniteur-défibrillateur LIFEPAK 15 en **mode DSA** (semi-automatique) pour la formation secourisme.
Deux écrans reliés en temps réel : **Stagiaire** (face avant du LIFEPAK 15, paysage) et **Formateur** (télécommande, portrait).

**État : étape 2 sur 5** — écran du stagiaire, séquence DSA complète, panneau de test formateur, journal conservé.

## Feuille de route

| Étape | Contenu | État |
|---|---|---|
| 1 | Squelette React/Vite/Tailwind, hub, liaison PeerJS, reconnexion | fait |
| 2 | Écran Stagiaire (face avant, séquence DSA, PNI), panneau de test formateur, journal | **fait** |
| 3 | Tracés animés (ECG, pléthysmographie SpO2) et sons / voix | à venir |
| 4 | Télécommande Formateur complète (rampes de constantes, rythmes, événements) | à venir |
| 5 | Scénarios (MSP), enregistrement sur Netlify, débriefing | à venir |

## Ce que fait l'étape 2

**Écran du stagiaire** : face avant du LIFEPAK 15 reproduite en CSS, étiquettes en français comme sur l'appareil. Seuls **RCP, ANALYSE, CHOC (bouton rouge) et PNI** réagissent ; le reste est décoratif.

Séquence DSA :
1. **ANALYSE** (1er appui) → « Mise en route dériv palettes » → « Connectez les électrodes » : l'écran attend que le **formateur valide la pose des électrodes**.
2. « Analyse en cours, reculez vous » → **« Choc conseillé »** ou **« Choc non conseillé »**, selon le scénario du formateur.
3. Choc conseillé : l'appareil **se charge tout seul** (« Chargement à 200J »), puis « 200J disponibles / Appuyer bouton CHOC! ». Le stagiaire appuie sur **CHOC** → « Energie délivrée ».
4. « Débuter RCP » avec compte à rebours **2:00 → 0:00** (le métronome démarre tout seul) ; à 0:00, « Appuyer sur ANALYSE » : le stagiaire doit rappuyer sur ANALYSE.
5. **PNI** : mesure d'environ 10 s (la pression du brassard monte), puis affichage des valeurs du formateur.

L'écran déduit seul ce qu'il affiche de ce qui est branché (le formateur peut le changer en cours de scénario) : câble ECG 4 brins → « FC » en vert ; capteur SpO2 → « FP (SpO2) » en bleu ; mesure PNI seule → « FP (PNI) » en blanc ; capteur absent → « --- » et « SpO2: Capteur non détecté ».

**Page formateur (provisoire)** : branchements, constantes, nombre de chocs conseillés à la suite, résultat imposé pour la prochaine analyse, mode du métronome, validation des électrodes, remise à zéro de l'écran du stagiaire. La vraie télécommande arrive à l'étape 4.

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
- Le métronome démarre tout seul avec « Débuter RCP » (déduit de la vidéo) ; RCP l'arrête ou le relance.
- Un appui sur ANALYSE pendant le compte à rebours n'est pas pris en compte (seulement en attente d'analyse).
- PAM calculée par la formule classique ; l'appareil réel donne des valeurs légèrement différentes.
- Pas de limite de temps entre « 200J disponibles » et l'appui sur CHOC.
- Tracés : statiques (pointillés, ligne plate, ou un complexe générique quand les électrodes sont validées). Les vrais tracés viennent à l'étape 3.

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
  hooks/        useHostSession, useGuestSession, useDsa (séquence DSA), useNow, useFitScale, useWakeLock
  services/     session (PIN, PeerJS), messages (protocole), peerConfig
  engine/       dsaMachine (états), viewModel (ce que l'écran affiche), hostState, lp15Texts, dsaTimings, referenceValues
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
