// Relais ÉcoleDirecte pour la version web (fonction serverless Vercel).
//
// Pourquoi : un navigateur ne peut pas appeler api.ecoledirecte.com depuis un autre site (CORS).
// L'appli web appelle donc ce relais, hébergé sur VOTRE compte Vercel, qui transmet la demande
// à ÉcoleDirecte et renvoie la réponse telle quelle.
//
// Garanties :
// - liste fermée : seuls les 4 appels utilisés par l'appli passent, tout le reste est refusé (403) ;
// - rien n'est stocké (pas de base, pas de fichier, pas de cache) ;
// - rien n'est journalisé : ni identifiant, ni mot de passe, ni jeton, ni cookie, ni corps de requête ;
// - seuls les appels venant de la page elle-même sont acceptés (en-tête Sec-Fetch-Site).
//
// Appel : /api/ecoledirecte?chemin=/v3/login.awp&v=4.102.0&gtk=1

const ECOLEDIRECTE = "https://api.ecoledirecte.com";

// Chemins autorisés et valeurs de « verbe » acceptées.
const ROUTES = [
  { method: "GET", pattern: /^\/v3\/login\.awp$/, verbes: null, gtkOnly: true },
  { method: "POST", pattern: /^\/v3\/login\.awp$/, verbes: null },
  { method: "POST", pattern: /^\/v3\/connexion\/doubleauth\.awp$/, verbes: ["get", "post"] },
  { method: "POST", pattern: /^\/v3\/eleves\/\d{1,12}\/notes\.awp$/, verbes: ["get"] },
];

const MAX_BODY = 16 * 1024;
// Caractères visibles uniquement (ni espace, ni retour à la ligne : pas d'injection d'en-tête).
const TOKEN_FORMAT = /^[\x21-\x7E]{1,4096}$/;
const COOKIE_PAIR = /^([A-Za-z0-9_\-]{1,64})=([^;,\s]{0,4096})$/;

function refuse(res, status, message) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({ code: status, message }));
}

function headerValue(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function readRawBody(req) {
  // Le client envoie du text/plain : Vercel le laisse sous forme de texte.
  if (typeof req.body === "string") { return req.body; }
  if (Buffer.isBuffer(req.body)) { return req.body.toString("utf8"); }
  if (req.body && typeof req.body === "object") { return null; }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) { return null; }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

// « A=1; B=2 » envoyé par l'appli -> en-tête Cookie pour ÉcoleDirecte (format vérifié).
function cookiesFromClient(raw) {
  if (!raw) { return ""; }
  const pairs = [];
  for (const part of String(raw).split(";")) {
    const match = part.trim().match(COOKIE_PAIR);
    if (match) { pairs.push(`${match[1]}=${match[2]}`); }
  }
  return pairs.slice(0, 20).join("; ");
}

// Set-Cookie d'ÉcoleDirecte -> « A=1; B=2 » renvoyé à l'appli (nom et valeur seulement).
function cookiesForClient(upstreamHeaders) {
  const list = typeof upstreamHeaders.getSetCookie === "function"
    ? upstreamHeaders.getSetCookie()
    : (upstreamHeaders.get("set-cookie") ? [upstreamHeaders.get("set-cookie")] : []);
  const pairs = [];
  for (const cookie of list) {
    const match = cookie.split(";")[0].trim().match(COOKIE_PAIR);
    if (match) { pairs.push(`${match[1]}=${match[2]}`); }
  }
  return pairs.join("; ");
}

module.exports = async function relaisEcoleDirecte(req, res) {
  // 1. Uniquement des appels de la page elle-même (pas d'un autre site).
  const fetchSite = headerValue(req, "sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") { return refuse(res, 403, "Origine refusée"); }

  // 2. Chemin et paramètres autorisés.
  const url = new URL(req.url, "http://relais.local");
  const chemin = url.searchParams.get("chemin") || "";
  const route = ROUTES.find((r) => r.method === req.method && r.pattern.test(chemin));
  if (!route) { return refuse(res, 403, "Appel non autorisé par le relais"); }

  const version = url.searchParams.get("v") || "";
  if (!/^[0-9.]{1,20}$/.test(version)) { return refuse(res, 400, "Version d'API invalide"); }
  const upstreamQuery = new URLSearchParams({ v: version });
  if (route.gtkOnly) {
    if (url.searchParams.get("gtk") !== "1") { return refuse(res, 403, "Appel non autorisé par le relais"); }
    upstreamQuery.set("gtk", "1");
  }
  if (route.verbes) {
    const verbe = url.searchParams.get("verbe");
    if (!route.verbes.includes(verbe)) { return refuse(res, 403, "Appel non autorisé par le relais"); }
    upstreamQuery.set("verbe", verbe);
  }

  // 3. Corps : uniquement « data=... », taille limitée.
  let body;
  if (req.method === "POST") {
    body = await readRawBody(req);
    if (body === null || body.length > MAX_BODY || !body.startsWith("data=")) {
      return refuse(res, 400, "Corps de requête invalide");
    }
  }

  // 4. En-têtes transmis : jetons ÉcoleDirecte et cookies, format vérifié. Rien d'autre.
  const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Origin": "https://www.ecoledirecte.com",
    "Referer": "https://www.ecoledirecte.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
  };
  if (req.method === "POST") { headers["Content-Type"] = "application/x-www-form-urlencoded"; }
  for (const [incoming, outgoing] of [["x-token", "X-Token"], ["2fa-token", "2FA-Token"], ["x-gtk", "X-Gtk"]]) {
    const value = headerValue(req, incoming);
    if (value && TOKEN_FORMAT.test(value)) { headers[outgoing] = value; }
  }
  const cookies = cookiesFromClient(headerValue(req, "x-ed-cookies"));
  if (cookies) { headers["Cookie"] = cookies; }

  // 5. Appel à ÉcoleDirecte.
  let upstream;
  try {
    upstream = await fetch(`${ECOLEDIRECTE}${chemin}?${upstreamQuery.toString()}`, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    // Volontairement aucun détail : l'erreur pourrait contenir des données de la requête.
    return refuse(res, 502, "ÉcoleDirecte ne répond pas");
  }

  // 6. Réponse renvoyée telle quelle, avec les jetons et cookies utiles à l'appli.
  const text = await upstream.text();
  res.statusCode = upstream.status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  const token = upstream.headers.get("x-token");
  if (token && TOKEN_FORMAT.test(token)) { res.setHeader("x-token", token); }
  const twoFaToken = upstream.headers.get("2fa-token");
  if (twoFaToken && TOKEN_FORMAT.test(twoFaToken)) { res.setHeader("2fa-token", twoFaToken); }
  const clientCookies = cookiesForClient(upstream.headers);
  if (clientCookies) { res.setHeader("x-ed-cookies", clientCookies); }
  res.end(text);
};
