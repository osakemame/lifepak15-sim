# Simulateur LIFEPAK 15 — SDIS 24

Application web de simulation d'un moniteur-défibrillateur LIFEPAK 15 (mode DSA) pour la formation secourisme.
Deux écrans reliés en temps réel : **Stagiaire** (moniteur, paysage) et **Formateur** (télécommande, portrait).

**État : étape 1 sur 5** — squelette, hub de session, liaison PeerJS avec code à 4 chiffres.

## Feuille de route

| Étape | Contenu | État |
|---|---|---|
| 1 | Squelette React/Vite/Tailwind, hub, liaison PeerJS, reconnexion, journal de test | fait |
| 2 | Écran Stagiaire : design du LIFEPAK 15 (boutons, écran) | à venir |
| 3 | Tracés Canvas (ECG, pléthysmographie SpO2) et sons / voix (pas de capnographie : le LP15 simulé n'en a pas) | à venir |
| 4 | Télécommande Formateur (constantes, rythmes, rampes) | à venir |
| 5 | Scénarios et journal de débriefing | à venir |

## Lancer en local

Prérequis : [Node.js](https://nodejs.org) 18 ou plus récent.

```bash
npm install
npm run dev -- --host
```

Ouvrez l'adresse affichée (ex. `http://localhost:5173`) sur le PC. Pour tester avec un téléphone sur le même Wi-Fi, utilisez l'adresse « Network » affichée.

### Tester la liaison

1. Appareil A : **Créer une session (Formateur)** → un code à 4 chiffres s'affiche.
2. Appareil B : **Rejoindre une session (Stagiaire)** → saisir le code.
3. Les deux badges passent à « Connecté ». Essayez « Mesurer la latence », « Envoyer un essai » (formateur → stagiaire) et « Envoyer une action d'essai » (stagiaire → journal du formateur).
4. Rafraîchissez une des deux pages : la liaison doit se rétablir toute seule.

À tester absolument **en 4G sur les deux appareils** (usage prévu en extérieur).

## Déployer sur Netlify

1. Créez un dépôt GitHub et poussez-y le contenu de ce dossier (`node_modules` et `dist` sont exclus par `.gitignore`).
2. Sur [netlify.com](https://www.netlify.com) : **Add new site → Import an existing project → GitHub**, choisissez le dépôt.
3. Les réglages sont lus dans `netlify.toml` (commande `npm run build`, dossier `dist`). Cliquez sur **Deploy**.
4. Ouvrez l'adresse `https://….netlify.app` sur les deux appareils.

Il n'y a pas de QR code : seul le code à 4 chiffres est utilisé. Le formateur peut copier un lien du type `https://….netlify.app/?pin=1234` : le stagiaire n'a plus qu'à appuyer sur « Rejoindre ».

## Remarques sur PeerJS

- Par défaut, l'application utilise le serveur public gratuit de PeerJS pour mettre les deux appareils en relation, puis les données passent en direct (WebRTC). Aucun compte n'est nécessaire.
- Ce serveur public n'offre aucune garantie de disponibilité. Sur certains réseaux (4G d'opérateurs particuliers, Wi-Fi filtré), la liaison directe peut échouer : un écran de diagnostic l'indique.
- Pour renforcer la fiabilité plus tard (serveur PeerJS personnel, serveur TURN), des variables d'environnement sont prévues dans `src/services/peerConfig.js`.
- **Le formateur est l'hôte** : si son téléphone s'éteint ou perd le réseau, la session est interrompue. L'écran du formateur reste allumé automatiquement (sur navigateur compatible) et la session se reprend après un rafraîchissement.

## Structure

```
src/
  pages/        Hub, TrainerPage (formateur), TraineePage (stagiaire)
  components/   StatusBadge, Diagnostic
  hooks/        useHostSession, useGuestSession, useWakeLock
  services/     session (PIN, PeerJS), messages (protocole), peerConfig
  engine/       referenceValues (valeurs du RTN juillet 2026)
  scenarios/    mspTypes (liste des types de MSP)
```

## Valeurs de référence (RTN secourisme, juillet 2026)

Enregistrées dans `src/engine/referenceValues.js`, telles que fournies :

| | Adulte | Enfant (~10 ans) | Nourrisson (≤ 1 an) | Nouveau-né (0-7 j) |
|---|---|---|---|---|
| Fréquence cardiaque (bpm) | 60 à 100 | 70 à 140 | 100 à 160 | 120 à 160 |
| Fréquence ventilatoire (mvt/min) | 12 à 20 | 20 à 30 | 30 à 40 | 40 à 60 |

SpO2 normale : 94 à 100 %. Pression artérielle normale de l'adulte retenue pour la simulation : 120/80 mmHg (le RTN indique « autour de 100 » en systolique). Pas de valeur de référence chez l'enfant : le secouriste transmet la mesure pour avis médical.

---
SDIS 24 - LTN H. BRU - CIS Sarlat
