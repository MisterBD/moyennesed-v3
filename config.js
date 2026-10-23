// Réglages de l'appli, au même endroit.
// Chaque valeur a un défaut qui marche ; on peut la remplacer sans toucher au code
// avec une variable d'environnement EXPO_PUBLIC_... (voir .env.example).
import { Platform } from "react-native";

// Adresse de l'API ÉcoleDirecte (non publique, elle peut changer sans prévenir).
export const ECOLEDIRECTE_API_URL =
  process.env.EXPO_PUBLIC_ECOLEDIRECTE_API_URL || "https://api.ecoledirecte.com";

// Version d'API envoyée à ÉcoleDirecte (paramètre « v »). Valeur relevée en octobre 2026
// dans une bibliothèque libre maintenue. Si la connexion casse, c'est la première chose à vérifier.
export const ECOLEDIRECTE_API_VERSION =
  process.env.EXPO_PUBLIC_ECOLEDIRECTE_API_VERSION || "4.102.0";

// Sur le web, le navigateur ne peut pas appeler ÉcoleDirecte directement (CORS) :
// l'appli passe par le relais du même site (fonction Vercel api/ecoledirecte.js).
// Sur téléphone, l'appli appelle ÉcoleDirecte en direct.
export const RELAIS_WEB_URL = process.env.EXPO_PUBLIC_RELAIS_URL || "/api/ecoledirecte";
export const PASSE_PAR_LE_RELAIS = Platform.OS === "web";

// Liens affichés dans l'appli (crédit à l'auteur original, exigé par la licence).
export const LIEN_DEPOT_ORIGINAL = "https://github.com/diegofino15/moyennesed-v3";
export const LIEN_LICENCE = "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr";
export const LIEN_DEPOT_FORK =
  process.env.EXPO_PUBLIC_LIEN_DEPOT_FORK || "https://github.com/MisterBD/moyennesed-v3";
