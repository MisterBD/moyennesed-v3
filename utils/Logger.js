// Journaux de développement : visibles seulement en mode développement (__DEV__),
// jamais dans une version installée ou publiée sur le web.
// Règle : ne JAMAIS y écrire un identifiant, un mot de passe, un jeton, un cookie
// ni une réponse brute d'ÉcoleDirecte (elle contient des données personnelles).
const enabled = typeof __DEV__ !== "undefined" && __DEV__;

function write(prefix, message, warn) {
  if (!enabled) { return; }
  if (warn) { console.warn(`${prefix} - ${message}`); }
  else { console.log(`${prefix} - ${message}`); }
}

export class Logger {
  static load(message, warn=false) { write("LOAD ", message, warn); }
  static login(message, warn=false) { write("LOGIN", message, warn); }
  static marks(message, warn=false) { write("MARKS", message, warn); }
  static core(message, warn=false) { write("CORE ", message, warn); }
  static info(message, warn=false) { write("INFO ", message, warn); }
};
