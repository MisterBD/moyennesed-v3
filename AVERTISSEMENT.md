# Avertissement

À lire avant d'utiliser cette version de l'appli (« Mes moyennes », fork personnel de MoyennesED).

## Une appli non officielle

- Cette appli n'est **ni officielle, ni validée** : elle n'a **aucun lien avec ÉcoleDirecte ni avec son éditeur Aplim**.
- Elle n'est pas non plus produite ni validée par Diego Finocchiaro, l'auteur de MoyennesED dont elle reprend le code.
- Elle est fournie **sans aucune garantie** (voir la licence, section 5) : notes ou moyennes affichées peuvent être fausses. Seul ÉcoleDirecte fait foi.

## Une API non publique, qui peut casser à tout moment

- ÉcoleDirecte ne propose pas d'API publique. L'appli imite le fonctionnement du site web d'ÉcoleDirecte (« API non documentée »).
- ÉcoleDirecte peut la modifier sans prévenir : l'appli peut alors cesser de fonctionner du jour au lendemain.
- Utilisez-la avec modération (pas d'actualisation automatique en boucle, pas de connexions répétées).
- Une mauvaise réponse à la question de double authentification peut **suspendre votre compte ÉcoleDirecte** (un mail de récupération est alors envoyé par ÉcoleDirecte).

## Uniquement avec vos propres identifiants

- Utilisez **uniquement vos propres identifiants** ÉcoleDirecte (compte élève, ou compte parent pour vos propres enfants).
- N'y entrez jamais les identifiants de quelqu'un d'autre et ne déployez pas le portail web pour d'autres personnes.
- Respectez les conditions d'utilisation d'ÉcoleDirecte et le règlement de votre établissement. En cas de doute, ou si ÉcoleDirecte vous demande de cesser, arrêtez de l'utiliser.

## Où vont vos données

**Sur téléphone (Expo Go ou appli installée)**

- L'appli parle **directement** à ÉcoleDirecte (`api.ecoledirecte.com`), sans aucun serveur intermédiaire.
- Le mot de passe et les codes de double authentification sont rangés dans le **coffre sécurisé** du téléphone (trousseau iOS, Keystore Android), jamais en clair.
- Les notes, coefficients et préférences sont gardés sur le téléphone pour l'affichage hors ligne.
- « Déconnexion » efface tout, y compris le mot de passe.

**Sur le web (portail Vercel)**

- Un navigateur ne peut pas appeler ÉcoleDirecte directement. Vos identifiants passent donc par **votre propre fonction Vercel** (le relais `api/ecoledirecte.js`, déployé sur **votre** compte Vercel), qui les transmet à ÉcoleDirecte et renvoie la réponse.
- Le relais **ne stocke rien et ne journalise rien** (ni identifiant, ni mot de passe, ni jeton, ni contenu des échanges). Il refuse tout appel autre que les 4 appels ÉcoleDirecte utilisés par l'appli.
- Comme pour tout site, Vercel garde dans **vos** journaux de projet l'adresse appelée et le code de réponse. Pour la récupération des notes, cette adresse contient le numéro interne d'élève ÉcoleDirecte ; jamais l'identifiant ni le mot de passe.
- Dans le navigateur, le mot de passe n'est gardé **qu'en mémoire**, le temps de la session : il disparaît quand on recharge ou ferme la page. Les notes sont gardées dans le stockage de session de l'onglet, effacé à sa fermeture.

**Dans tous les cas**

- Aucune donnée n'est envoyée à l'auteur original, au créateur de ce fork ni à un service tiers : ni publicité, ni statistiques, ni rapport de bug automatique.
- Le « Rapport de diagnostic » (page profil) n'est envoyé à personne : il est seulement préparé, anonymisé (sans nom, identifiant, jeton ni coordonnées), et c'est vous qui choisissez de le partager. Il contient en revanche vos notes : relisez-le avant de le transmettre.

## Aucun usage commercial

- Le code est sous licence **Creative Commons BY-NC-SA 4.0** : **aucun usage commercial** n'est autorisé (vente, abonnement, publicité, intégration dans une offre, un service ou un outil professionnel destiné à en tirer un avantage commercial).
- Toute version modifiée doit citer l'auteur original, indiquer ses modifications et rester sous la même licence.
