// Rapport de diagnostic : copie anonymisée des dernières réponses d'ÉcoleDirecte.
// Il n'est envoyé nulle part automatiquement : l'utilisateur choisit de le partager
// (par exemple pour le coller dans Claude quand l'API a changé et que l'appli casse).
import { Platform } from "react-native";

// Champs retirés avant tout partage : jetons, identité, coordonnées, photos.
const SENSITIVE_KEYS = new Set([
  "token", "x-token", "2fa-token", "gtk", "cn", "cv", "uuid",
  "identifiant", "motdepasse", "password", "username", "login", "idlogin",
  "nom", "prenom", "particule", "nomcomplet", "civilite",
  "email", "mail", "telportable", "telportableconjoint", "tel", "telephone",
  "adresse", "adresse1", "adresse2", "adresse3", "codepostal", "ville",
  "photo", "photourl", "datenaissance", "sexe",
  "socketToken".toLowerCase(),
]);

function redact(value, depth = 0) {
  if (depth > 12) { return "[...]"; }
  if (Array.isArray(value)) { return value.map((item) => redact(item, depth + 1)); }
  if (value && typeof value === "object") {
    const copy = {};
    for (const [key, inner] of Object.entries(value)) {
      copy[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? "[retiré]" : redact(inner, depth + 1);
    }
    return copy;
  }
  return value;
}

export function buildDiagnosticReport({ category, loginLogs, marksLogs }) {
  return JSON.stringify({
    date: new Date().toISOString(),
    platform: Platform.OS,
    category,
    loginResponse: redact(loginLogs ?? {}),
    marksResponses: redact(marksLogs ?? {}),
  }, null, 2);
}
