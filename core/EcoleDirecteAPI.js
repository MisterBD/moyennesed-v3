// Client de l'API ÉcoleDirecte (non officielle, non documentée).
// Tous les appels réseau de l'appli passent par ce fichier.
//
// - Téléphone : appel direct à api.ecoledirecte.com.
// - Web : appel au relais du même site (api/ecoledirecte.js, fonction Vercel), car le
//   navigateur ne peut pas appeler ÉcoleDirecte directement (CORS).
//
// Flux de connexion (relevé en octobre 2026 sur une bibliothèque libre maintenue) :
//   1. GET  /v3/login.awp?gtk=1        -> cookie « GTK »
//   2. POST /v3/login.awp              -> en-tête X-Gtk + cookie, réponse : jeton « x-token »
//      (+ « 2FA-Token » si ÉcoleDirecte demande la double authentification, code 250)
//   3. POST /v3/connexion/doubleauth.awp?verbe=get   -> question (base64)
//      POST /v3/connexion/doubleauth.awp?verbe=post  -> codes de confiance « cn » et « cv »
//   4. On refait 1 et 2 en envoyant cn/cv : plus de question les fois suivantes.
//   5. POST /v3/eleves/<id>/notes.awp?verbe=get      -> notes
//
// Règle absolue : rien ici ne journalise un identifiant, un mot de passe, un jeton ou un cookie.
import { Platform } from "react-native";

import { ECOLEDIRECTE_API_URL, ECOLEDIRECTE_API_VERSION, RELAIS_WEB_URL, PASSE_PAR_LE_RELAIS } from "../config";
import { encodeStringValueToUTF8 } from "../utils/Utils";

// État de la session, en mémoire seulement (jamais écrit sur le disque).
const session = {
  token: "",
  twoFaToken: "",
  cookies: new Map(),
};

export function getSessionToken() { return session.token; }

export function resetSession() {
  session.token = "";
  session.twoFaToken = "";
  session.cookies.clear();
}

// En-têtes « navigateur » attendus par ÉcoleDirecte. Sur le web, c'est le relais qui les ajoute
// (un navigateur interdit de les modifier).
const BROWSER_HEADERS = Platform.OS === "web" ? {} : {
  "Origin": "https://www.ecoledirecte.com",
  "Referer": "https://www.ecoledirecte.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9",
};

const COOKIE_ATTRIBUTES = new Set(["path", "domain", "expires", "max-age", "samesite", "secure", "httponly", "priority", "partitioned"]);

// Lit les cookies d'une réponse.
// - « set-cookie » (téléphone) : « A=1; Path=/; Secure, B=2; Path=/ »
// - « x-ed-cookies » (relais web) : « A=1; B=2 »
function rememberCookies(rawHeader, fromRelay) {
  if (!rawHeader) { return; }
  const pattern = fromRelay ? /(?:^|;\s*)([A-Za-z0-9_\-]+)=([^;]*)/g : /(?:^|,\s*)([A-Za-z0-9_\-]+)=([^;,]*)/g;
  for (const match of rawHeader.matchAll(pattern)) {
    if (!COOKIE_ATTRIBUTES.has(match[1].toLowerCase())) { session.cookies.set(match[1], match[2]); }
  }
}

function cookieHeader() {
  return Array.from(session.cookies.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}

function buildUrl(path, query) {
  const params = { ...query, v: ECOLEDIRECTE_API_VERSION };
  const queryString = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  if (PASSE_PAR_LE_RELAIS) { return `${RELAIS_WEB_URL}?chemin=${encodeURIComponent(path)}&${queryString}`; }
  return `${ECOLEDIRECTE_API_URL}${path}?${queryString}`;
}

// Appel générique. Renvoie { httpStatus, json } ; httpStatus vaut 0 si le réseau est coupé.
async function call({ method = "POST", path, query = {}, data = {}, extraHeaders = {} }) {
  const headers = {
    "Accept": "application/json, text/plain, */*",
    ...BROWSER_HEADERS,
    ...extraHeaders,
  };
  if (method === "POST") {
    // Le relais attend du texte brut (pour recevoir le corps sans transformation).
    headers["Content-Type"] = PASSE_PAR_LE_RELAIS ? "text/plain;charset=UTF-8" : "application/x-www-form-urlencoded";
  }
  if (session.token) { headers["X-Token"] = session.token; }
  if (session.twoFaToken) { headers["2FA-Token"] = session.twoFaToken; }
  const cookies = cookieHeader();
  if (cookies) { headers[PASSE_PAR_LE_RELAIS ? "X-Ed-Cookies" : "Cookie"] = cookies; }

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: method === "POST" ? `data=${JSON.stringify(data)}` : undefined,
      credentials: PASSE_PAR_LE_RELAIS ? "same-origin" : "include",
    });
  } catch (error) {
    return { httpStatus: 0, json: null };
  }

  rememberCookies(response.headers.get(PASSE_PAR_LE_RELAIS ? "x-ed-cookies" : "set-cookie"), PASSE_PAR_LE_RELAIS);
  const newTwoFaToken = response.headers.get("2fa-token");
  if (newTwoFaToken) { session.twoFaToken = newTwoFaToken; }

  let json = null;
  try { json = JSON.parse(await response.text()); } catch (error) { json = null; }

  const newToken = response.headers.get("x-token") || json?.token;
  if (newToken) { session.token = newToken; }

  return { httpStatus: response.status, json };
}

// Étape 1 : cookie GTK. Renvoie sa valeur, ou "" si ÉcoleDirecte n'en a pas donné.
async function fetchGtk() {
  session.cookies.delete("GTK");
  await call({ method: "GET", path: "/v3/login.awp", query: { gtk: "1" } });
  return session.cookies.get("GTK") ?? "";
}

// Connexion. trustedDevice = { cn, cv } obtenus après une double authentification réussie.
export async function login(username, password, trustedDevice) {
  resetSession();
  const gtk = await fetchGtk();

  const data = {
    identifiant: encodeStringValueToUTF8(username),
    motdepasse: encodeStringValueToUTF8(password),
    isReLogin: false,
  };
  if (trustedDevice?.cn && trustedDevice?.cv) {
    data.cn = trustedDevice.cn;
    data.cv = trustedDevice.cv;
    data.uuid = "";
    data.fa = [{ cn: trustedDevice.cn, cv: trustedDevice.cv }];
  }

  return call({
    method: "POST",
    path: "/v3/login.awp",
    data,
    extraHeaders: gtk ? { "X-Gtk": gtk } : {},
  });
}

// Double authentification : récupère la question et les réponses possibles (en base64).
export async function getDoubleAuthQuestion() {
  return call({ method: "POST", path: "/v3/connexion/doubleauth.awp", query: { verbe: "get" }, data: {} });
}

// Double authentification : envoie la réponse choisie (telle que reçue, en base64).
// En cas de succès, json.data contient { cn, cv }.
export async function postDoubleAuthAnswer(choice) {
  return call({ method: "POST", path: "/v3/connexion/doubleauth.awp", query: { verbe: "post" }, data: { choix: choice } });
}

// Notes d'un élève (année en cours).
export async function getMarks(accountID) {
  return call({ method: "POST", path: `/v3/eleves/${encodeURIComponent(accountID)}/notes.awp`, query: { verbe: "get" }, data: { anneeScolaire: "" } });
}
