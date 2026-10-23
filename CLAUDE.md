# CLAUDE.md : guide pour modifier « Mes moyennes »

Fork personnel et non officiel de MoyennesED (Diego Finocchiaro), licence CC BY-NC-SA 4.0.
L'utilisateur n'est pas développeur : explique simplement, en français, ce que tu changes et pourquoi.

## Le projet

- Appli Expo **SDK 58** (React Native 0.88, React 19), en **JavaScript** (pas de TypeScript).
- Deux cibles : téléphone via **Expo Go** (appel direct à ÉcoleDirecte) et **web** via react-native-web, hébergé sur Vercel (appels via le relais `api/ecoledirecte.js`).
- Pas de serveur à nous, pas de base de données : tout tourne sur l'appareil, sauf le relais web (fonction Vercel sans état).

## Où est quoi

- `core/EcoleDirecteAPI.js` : **seul** fichier qui parle au réseau (connexion avec jeton GTK, double authentification, notes). Toute nouvelle donnée ÉcoleDirecte passe par une fonction ajoutée ici.
- `core/UserData.js` : session, comptes (élève, parent et enfants), cache. `core/Account.js`, `Period.js`, `Subject.js`, `Mark.js` : modèle et calcul des moyennes. `core/CoefficientsManager.js` : coefficients devinés et personnalisés.
- `ui/views/authstack/` : accueil et connexion. `ui/views/appstack/` : moyennes et profil. `ui/views/global_components/` : composants communs.
- Fichiers `*.web.js` : variante navigateur choisie automatiquement par Metro (`BottomSheet.web.js`, `LottieAnimation.web.js`).
- `utils/Storage.js` : `Storage` (données ordinaires) et `SecretStorage` (identifiants : expo-secure-store sur téléphone, mémoire seulement sur le web).
- `utils/Logger.js` : journaux, actifs seulement en développement. `utils/Diagnostic.js` : rapport anonymisé.
- `api/ecoledirecte.js` : relais Vercel, **liste fermée** de chemins (`ROUTES`). `vercel.json` : build web et en-têtes.
- `config.js` + `.env.example` : réglages (URL et version de l'API ÉcoleDirecte, adresse du relais, liens).
- `tests/` : test du relais et parcours web complet contre un **faux** ÉcoleDirecte (`tests/faux-ecoledirecte.js`).

## Commandes

```bash
npm install                 # dépendances
npx expo start              # lancer (QR code pour Expo Go, touche w pour le web)
npx vercel dev              # web + relais en local (l'appli web a besoin du relais pour se connecter)
npm run verifier            # construit web, Android et iOS : à lancer après chaque modification
npm run test:relais         # le relais ne laisse passer que les appels prévus, sans journal
npm run test:web            # parcours complet dans Chromium (1re fois : npx playwright install chromium)
npx expo install <paquet>   # ajouter une bibliothèque compatible avec Expo Go
```

## Règles à respecter

1. **Jamais** d'identifiant, de mot de passe, de jeton (`x-token`, `2FA-Token`), de cookie ni de réponse brute d'ÉcoleDirecte dans un journal (`console.*`, `Logger`), un message d'erreur ou un fichier. Passe par `Logger` avec des messages génériques.
2. Le mot de passe et les codes `cn`/`cv` vont **uniquement** dans `SecretStorage`. Jamais dans `Storage`, AsyncStorage, localStorage ou sessionStorage.
3. Aucune donnée envoyée ailleurs qu'à ÉcoleDirecte : pas de publicité, d'analytics, de suivi, de rapport automatique ni de service tiers.
4. Tout appel réseau passe par `core/EcoleDirecteAPI.js`. Un nouvel appel ÉcoleDirecte = l'ajouter aussi à `ROUTES` dans `api/ecoledirecte.js`, avec le chemin le plus précis possible (le relais ne doit jamais devenir un proxy ouvert), puis compléter `tests/relais.test.js`.
5. Bibliothèques : uniquement celles qui marchent dans **Expo Go** et sur le web ; installer avec `npx expo install`. Si une bibliothèque ne marche pas sur le web, créer une variante `.web.js`.
6. **Licence** : garder `LICENSE`, le crédit à Diego Finocchiaro (README, page profil) et la licence CC BY-NC-SA 4.0. Aucun usage commercial.
7. **Chaque modification** est notée dans `CHANGELOG-FORK.md` (exigence de la licence : indiquer les modifications).
8. Avant de dire « c'est fait » : `npm run verifier` et `npm run test:relais` doivent passer ; `npm run test:web` si l'écran de connexion ou les appels réseau ont changé. Rappeler ce qui reste à tester sur un vrai compte.
9. Textes de l'appli en français. Ne jamais tester avec les identifiants de quelqu'un d'autre que l'utilisateur.

## API ÉcoleDirecte (non officielle)

- Paramètre `v` = `ECOLEDIRECTE_API_VERSION` (config.js, 4.102.0 en octobre 2026). Si la connexion renvoie un code inattendu, vérifier d'abord cette version dans une bibliothèque libre maintenue (par exemple le paquet Python `ecoledirecte`, dépôt hacf-fr/ecoledirecte_api).
- Codes utiles dans le JSON de réponse : 200 OK, 250 double authentification demandée, 505 identifiant ou mot de passe incorrect, 520 / 525 jeton invalide ou expiré (reconnexion automatique).
- Le rapport de diagnostic (page profil) donne les dernières réponses anonymisées : demande-le à l'utilisateur quand quelque chose casse.
