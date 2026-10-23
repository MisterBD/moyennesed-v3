# Modifications apportées à MoyennesED

Ce dépôt est une **version modifiée** de [MoyennesED v3](https://github.com/diegofino15/moyennesed-v3), créée par **Diego Finocchiaro** et publiée sous licence [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr).
Point de départ : commit `8f5356a` du dépôt d'origine (avril 2024, version 3.4.6).
Comme l'exige la licence, ce fichier liste les modifications. La licence reste CC BY-NC-SA 4.0.

## 23/10/2026 : version personnelle « Mes moyennes » (3.4.6-perso.1)

### Sécurité et confidentialité

- Le mot de passe et les codes de double authentification (`cn`, `cv`) sont rangés dans le coffre sécurisé du téléphone (`expo-secure-store`) au lieu d'être stockés en clair (`utils/Storage.js`). Les identifiants d'une ancienne installation sont déplacés automatiquement puis effacés.
- Sur le web, le mot de passe n'est gardé qu'en mémoire, et les données de l'onglet sont effacées à sa fermeture (`sessionStorage`).
- Suppression des deux lignes qui écrivaient le mot de passe et les identifiants dans les journaux. Les journaux ne fonctionnent plus qu'en mode développement et ne contiennent plus ni identifiant, ni nom, ni jeton (`utils/Logger.js`).
- « Déconnexion » efface aussi le coffre sécurisé.

### Aucune donnée envoyée ailleurs qu'à ÉcoleDirecte

- Retrait de la publicité Google AdMob et du déverrouillage de la moyenne par vidéo publicitaire (`utils/AdsHandler.js`, `AdHiddenComponent.js` supprimés), ainsi que de la demande de suivi publicitaire (`react-native-permissions`).
- Retrait de l'envoi des rapports de bugs vers la base Firebase de l'auteur. Remplacé par un « Rapport de diagnostic » préparé sur l'appareil, anonymisé (`utils/Diagnostic.js`), que l'utilisateur partage s'il le souhaite.
- Retrait du compte de démonstration qui envoyait les identifiants au serveur de l'auteur (`api.moyennesed.my.to`).
- Retrait du lien de contact par mail, de la politique de confidentialité et des liens d'avis vers l'appli officielle ; ajout de liens vers l'appli originale, ce dépôt, la licence et l'avertissement.

### Connexion à ÉcoleDirecte

- Nouveau client unique `core/EcoleDirecteAPI.js` (remplace axios) adapté au fonctionnement actuel d'ÉcoleDirecte : cookie et en-tête « GTK », version d'API 4.102.0, en-têtes `x-token` et `2FA-Token`, connexion avec codes de confiance après double authentification. Flux reconstitué d'après la bibliothèque libre `ecoledirecte` 0.4.0 (hacf-fr, octobre 2026).
- Reconnexion automatique quand le jeton expire (codes 520 et 525), sans boucle infinie ; une erreur renvoie toujours -1 (corrige un plantage possible).
- Double authentification : messages d'erreur clairs ; corrige un plantage si une reconnexion redemandait la question.
- Décodage base64 sans la dépendance `buffer` (non déclarée dans le projet d'origine).

### Construction sans fichiers secrets

- Plus aucun fichier secret nécessaire : `utils/firebaseUtils.js` et `.env` (identifiants AdMob) ne sont plus utilisés. Réglages facultatifs centralisés dans `config.js`, documentés dans `.env.example`.
- Retrait de l'identifiant de projet EAS, des identifiants d'application et des identifiants AdMob de l'auteur ; nom affiché « Mes moyennes », identifiant `fr.mesmoyennes.perso`.
- Suppression des dossiers natifs `android/` et `ios/` figés en SDK 50 : ils sont régénérés au besoin par `npx expo prebuild`.

### Mise à jour technique

- Passage d'Expo SDK 50 à **SDK 58** (React Native 0.88, React 19, Reanimated 4, Gesture Handler 3, `@gorhom/bottom-sheet` 5) pour fonctionner avec l'appli Expo Go actuelle. Passage de yarn à npm (`package-lock.json`).
- `react-native-pressable-scale` (plus maintenue, en partie incompatible avec Reanimated 4) remplacée par un composant local `ui/views/global_components/PressableScale.js`.
- Retrait de `expo-dev-client`, `expo-build-properties`, `firebase`, `react-native-google-mobile-ads`, `react-native-permissions`, `react-native-vector-icons`, `axios` et des plugins Babel devenus inutiles. Point d'entrée `index.js`.

### Version web (portail Vercel)

- Export web statique (`npm run build:web`) et configuration Vercel (`vercel.json`), bouton de déploiement en un clic dans le README.
- Relais serverless `api/ecoledirecte.js` : transmet à ÉcoleDirecte uniquement les 4 appels utilisés par l'appli (liste fermée), n'accepte que les appels de la page elle-même, ne stocke et ne journalise rien.
- Variantes navigateur : panneau du bas (`BottomSheet.web.js`, la bibliothèque d'origine ne s'anime pas dans un navigateur), animations Lottie masquées (`LottieAnimation.web.js`), pas de vibrations ni de photo de profil.

### Textes et documentation

- Textes de l'appli : nom « Mes moyennes », mention « version personnelle et non officielle de MoyennesED (Diego Finocchiaro) », crédit et licence dans la page profil, textes sur la confidentialité mis à jour.
- Nouveau `README.md` en français ; README d'origine conservé dans `README-original.md` ; ajout de `AVERTISSEMENT.md`, `CLAUDE.md` et de ce fichier.
- Tests ajoutés : `tests/relais.test.js` (relais) et `tests/parcours-web.js` (parcours complet dans Chromium contre un faux ÉcoleDirecte, `tests/faux-ecoledirecte.js`).
