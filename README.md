# Mes moyennes : version personnelle de MoyennesED

> [!WARNING]
> **Application non officielle**, sans aucun lien avec ÉcoleDirecte ni avec son éditeur Aplim.
> Elle utilise une API **non publique** d'ÉcoleDirecte, qui peut changer ou casser à tout moment.
> À utiliser **uniquement avec vos propres identifiants**, dans le respect des conditions d'utilisation d'ÉcoleDirecte, et **sans aucun usage commercial**.
> Sur téléphone, vos données restent sur l'appareil. Sur le web, vos identifiants passent par **votre propre** fonction Vercel avant d'arriver à ÉcoleDirecte.
> À lire avant toute utilisation : [AVERTISSEMENT.md](AVERTISSEMENT.md).

## Ce que fait l'appli

Pour les élèves et les parents dont l'établissement utilise ÉcoleDirecte :

- elle se connecte à votre compte ÉcoleDirecte (élève ou parent, plusieurs enfants possibles, double authentification gérée) ;
- elle récupère les notes et calcule la **moyenne générale**, les **moyennes par matière** et la **moyenne de la classe** ;
- quand l'établissement ne donne pas les coefficients, elle les **devine** (devoir surveillé, oral, matière principale...) et vous pouvez les **corriger à la main** ;
- elle affiche l'évolution de la moyenne sous forme de courbe et garde les notes pour les consulter hors ligne (sur téléphone).

Elle marche de deux façons : **sur téléphone** (avec l'appli Expo Go) et **dans un navigateur** (portail web hébergé sur votre compte Vercel).

## Crédits et licence

- **Auteur original : Diego Finocchiaro**, créateur de MoyennesED. Dépôt d'origine : <https://github.com/diegofino15/moyennesed-v3>. L'appli officielle MoyennesED est disponible sur l'App Store et Google Play. Ce fork n'est ni produit ni validé par l'auteur original.
- **Licence inchangée : [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr)** (texte complet dans [LICENSE](LICENSE)). En clair :
  - **BY** : on cite l'auteur original et on indique ce qui a été modifié (voir [CHANGELOG-FORK.md](CHANGELOG-FORK.md)) ;
  - **NC** : aucun usage commercial (pas de vente, pas d'intégration dans une offre payante, pas de publicité) ;
  - **SA** : toute version modifiée doit être partagée sous la même licence.
- Le README d'origine est conservé tel quel dans [README-original.md](README-original.md).
- Le nom « MoyennesED » et le logo appartiennent à leur auteur ; cette version s'affiche sous le nom « Mes moyennes » pour ne pas être confondue avec l'appli officielle.

## Ce qui change par rapport à l'original

En résumé (détail complet dans [CHANGELOG-FORK.md](CHANGELOG-FORK.md)) :

- **Sécurité** : le mot de passe est rangé dans le coffre sécurisé du téléphone (trousseau iOS, Keystore Android), plus jamais en clair ; il n'apparaît plus dans les journaux. Sur le web, il n'est gardé qu'en mémoire, le temps de la session.
- **Aucune donnée envoyée ailleurs qu'à ÉcoleDirecte** : publicité, envoi de rapports de bugs vers la base Firebase de l'auteur et compte de démonstration retirés.
- **Connexion mise à jour** pour le fonctionnement actuel d'ÉcoleDirecte (jeton « GTK », version d'API 4.102.0, double authentification).
- **Se construit sans les fichiers secrets de l'auteur** : il n'en faut plus aucun ; les réglages facultatifs sont documentés dans [.env.example](.env.example).
- **Expo SDK 58** : fonctionne avec l'appli Expo Go actuelle des stores.
- **Version web** déployable sur Vercel, avec un relais limité aux seuls appels ÉcoleDirecte utilisés.

## Option 1 : le portail web sur Vercel (le plus simple)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FMisterBD%2Fmoyennesed-v3&project-name=mes-moyennes&repository-name=mes-moyennes)

### En un clic

1. Créez un compte gratuit sur [github.com](https://github.com) et sur [vercel.com](https://vercel.com) (« Continue with GitHub »). L'offre gratuite Hobby de Vercel est prévue pour un usage personnel et non commercial : c'est exactement le cas ici.
2. Cliquez sur le bouton **Deploy with Vercel** ci-dessus.
3. Vercel propose de créer une copie du dépôt sur **votre** compte GitHub (nom proposé : `mes-moyennes`) : validez, puis cliquez sur **Deploy**.
4. Après 2 à 4 minutes, Vercel affiche l'adresse de votre portail, du type `https://mes-moyennes-xxxx.vercel.app`.
5. Ouvrez cette adresse sur votre téléphone ou votre ordinateur et connectez-vous avec **vos** identifiants ÉcoleDirecte. Sur téléphone, « Ajouter à l'écran d'accueil » donne une icône comme une appli.

Aucune variable d'environnement n'est nécessaire. Chaque modification poussée sur la branche principale de votre copie redéploie le portail automatiquement.

### Depuis Claude (claude.ai ou Claude Code)

Si vous préférez que Claude fasse les étapes à votre place :

- **Avec Claude Code sur le web** (claude.ai/code, compte GitHub connecté) : après le déploiement en un clic ci-dessus, ouvrez votre dépôt `mes-moyennes` dans Claude Code et demandez vos modifications. Claude crée une branche et une demande de fusion ; Vercel publie une **adresse d'aperçu** pour la tester avant de fusionner.
- **Avec Claude Code sur votre ordinateur**, demandez simplement :
  > « Clone le dépôt https://github.com/MisterBD/moyennesed-v3, installe les dépendances, vérifie que `npm run verifier` passe, puis déploie-le sur mon compte Vercel avec `npx vercel` et donne-moi l'adresse. »

  Claude lancera `npx vercel` ; une page de connexion Vercel s'ouvrira dans votre navigateur, c'est vous qui vous identifiez.

### Bon à savoir

- L'adresse `*.vercel.app` est publique : gardez-la pour vous. Elle ne donne accès à rien sans identifiants ÉcoleDirecte, et le relais refuse tout appel autre que les 4 utilisés par l'appli.
- Sur le web, recharger la page oblige à se reconnecter : c'est voulu, le mot de passe n'est stocké nulle part.
- Dans le navigateur, la photo de profil ne s'affiche pas et le geste « tirer vers le bas pour actualiser » n'existe pas : pour voir les nouvelles notes, rechargez la page et reconnectez-vous.

## Option 2 : sur téléphone avec Expo Go

Il faut un ordinateur (Mac, Windows ou Linux) pour lancer l'appli, et le téléphone sur le même réseau Wi-Fi.

1. Sur le téléphone : installez **Expo Go** depuis l'App Store ou Google Play.
2. Sur l'ordinateur : installez [Node.js 22 (LTS)](https://nodejs.org) et [Git](https://git-scm.com).
3. Dans un terminal :
   ```bash
   git clone https://github.com/MisterBD/moyennesed-v3.git mes-moyennes
   cd mes-moyennes
   npm install
   npx expo start
   ```
4. Un QR code s'affiche. **iPhone** : scannez-le avec l'appareil photo. **Android** : scannez-le depuis l'appli Expo Go.
5. L'appli s'ouvre dans Expo Go : connectez-vous avec vos identifiants ÉcoleDirecte.

Si le téléphone ne trouve pas l'ordinateur (réseau d'entreprise, Wi-Fi invité), lancez `npx expo start --tunnel`.

Expo Go ne sait lancer que la dernière version d'Expo (ici le SDK 58). Le jour où l'appli Expo Go du store passe à une version plus récente, demandez à Claude : « mets le projet à jour vers la dernière version d'Expo avec `npx expo install expo@latest --fix`, puis vérifie avec `npm run verifier` ».

Pour installer une vraie appli sur le téléphone, sans Expo Go, il faut passer par [EAS Build](https://docs.expo.dev/build/introduction/) avec un compte Expo (et un compte Apple Developer payant pour l'iPhone) : le fichier `eas.json` est prêt, profil `preview` (fichier APK pour Android).

## L'améliorer avec Claude

Le fichier [CLAUDE.md](CLAUDE.md) explique à Claude Code comment le projet est organisé et les règles à respecter. Ouvrez le dossier (ou votre dépôt sur claude.ai/code) et demandez en langage courant. Quelques exemples :

- « La connexion ne marche plus : lance `npm run test:relais`, regarde le rapport de diagnostic que je te colle, et corrige le client ÉcoleDirecte. »
- « Ajoute un écran qui affiche les devoirs à faire pour la semaine. » (Claude devra ajouter l'appel ÉcoleDirecte correspondant au relais, de façon limitée.)
- « Affiche la moyenne en vert au-dessus de 14 et en orange en dessous de 10. »
- « Ajoute une alerte quand une nouvelle note arrive depuis la dernière ouverture. »
- « Ajoute un graphique qui compare ma moyenne à celle de la classe dans chaque matière. »
- « Change les coefficients devinés : l'oral compte double et non triple. »
- « Explique-moi simplement comment est calculée la moyenne générale. »

Après chaque modification, demandez à Claude de lancer les vérifications :

| Commande | Ce qu'elle vérifie |
|---|---|
| `npm run verifier` | l'appli se construit pour le web, Android et iOS |
| `npm run test:relais` | le relais Vercel ne laisse passer que les appels prévus et n'écrit aucun journal |
| `npm run test:web` | parcours complet dans un vrai navigateur, contre un **faux** ÉcoleDirecte (première fois : `npx playwright install chromium`) |

## Ce qui a été testé, et ce qui reste à tester en réel

Testé le 23/10/2026, sans compte ÉcoleDirecte :

- construction réussie pour le web, Android et iOS (Expo SDK 58) ;
- relais Vercel : 3 appels autorisés transmis correctement, 8 appels hors liste refusés, aucun journal ;
- parcours web complet dans Chromium contre un faux ÉcoleDirecte qui imite le flux actuel : accueil, connexion, double authentification, reconnexion avec les codes de confiance, notes, moyennes, détail d'une matière, page profil, aucun mot de passe ni jeton dans le navigateur, aucune erreur JavaScript.

Reste à tester **en réel**, avec un vrai compte :

1. la connexion au **vrai** ÉcoleDirecte, sur le web (via le relais Vercel) et sur téléphone (direct) : le flux a été reconstitué à partir d'une bibliothèque libre maintenue (octobre 2026), pas sur un vrai compte ;
2. la double authentification réelle (question, réponse, puis plus de question aux connexions suivantes) ;
3. un compte **parent** avec plusieurs enfants ;
4. l'appli dans **Expo Go** sur un vrai iPhone et un vrai Android (animations, panneau du bas, vibrations, coffre sécurisé) ;
5. le déploiement réel sur Vercel (bouton, puis connexion depuis le portail).

Si quelque chose casse, ouvrez la page profil > **Rapport de diagnostic** : il prépare un rapport anonymisé à donner à Claude.

## Organisation du code

| Dossier / fichier | Rôle |
|---|---|
| `App.js`, `index.js` | démarrage de l'appli |
| `core/EcoleDirecteAPI.js` | **tous** les appels à ÉcoleDirecte |
| `core/` (autres fichiers) | comptes, notes, matières, calcul des moyennes et des coefficients |
| `ui/` | les écrans et composants (les fichiers `.web.js` sont les variantes navigateur) |
| `utils/Storage.js` | rangement des données (coffre sécurisé pour les identifiants) |
| `api/ecoledirecte.js` | relais Vercel pour la version web |
| `config.js`, `.env.example` | réglages et leurs valeurs par défaut |
| `tests/` | tests du relais et parcours web avec un faux ÉcoleDirecte |
