// Test du relais Vercel (api/ecoledirecte.js) sans réseau : un faux ÉcoleDirecte répond.
// Vérifie la liste fermée des appels, la transmission des jetons et cookies, et l'absence de journaux.
// Lancement : npm run test:relais
const assert = require("assert");
const handler = require("../api/ecoledirecte.js");

const logs = [];
for (const k of ["log", "warn", "error", "info", "debug"]) { console[k] = (...a) => logs.push(a.join(" ")); }
const print = (m) => process.stdout.write(m + "\n");

let lastUpstream = null;
global.fetch = async (url, opts) => {
  lastUpstream = { url, opts };
  const h = new Headers({ "x-token": "TOK-123", "2fa-token": "TWOFA-9" });
  h.append("set-cookie", "GTK=abc123; Path=/; Secure; HttpOnly");
  h.append("set-cookie", "OTHER=zz; Path=/");
  return { status: 200, headers: h, text: async () => JSON.stringify({ code: 200, token: "TOK-123", data: {} }) };
};
function request({ method, url, headers = {}, body }) { return { method, url, headers, body, [Symbol.asyncIterator]: async function* () {} }; }
function response() { const r = { headers: {}, statusCode: 200, body: "" }; r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; }; r.end = (b) => { r.body = b || ""; }; return r; }

(async () => {
  let res = response();
  await handler(request({ method: "GET", url: "/api/ecoledirecte?chemin=%2Fv3%2Flogin.awp&gtk=1&v=4.102.0", headers: { "sec-fetch-site": "same-origin" } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(lastUpstream.url.startsWith("https://api.ecoledirecte.com/v3/login.awp?v=4.102.0&gtk=1"));
  assert.strictEqual(res.headers["x-ed-cookies"], "GTK=abc123; OTHER=zz");
  print("[ok] cookie GTK relayé à l'appli");

  res = response();
  const body = 'data={"identifiant":"secret-user","motdepasse":"secret-pass"}';
  await handler(request({ method: "POST", url: "/api/ecoledirecte?chemin=%2Fv3%2Flogin.awp&v=4.102.0", headers: { "x-gtk": "abc123", "x-ed-cookies": "GTK=abc123", "content-type": "text/plain" }, body }), res);
  assert.strictEqual(lastUpstream.opts.headers["X-Gtk"], "abc123");
  assert.strictEqual(lastUpstream.opts.headers["Cookie"], "GTK=abc123");
  assert.strictEqual(lastUpstream.opts.body, body);
  assert.strictEqual(res.headers["x-token"], "TOK-123");
  assert.strictEqual(res.headers["2fa-token"], "TWOFA-9");
  assert.strictEqual(res.headers["cache-control"], "no-store");
  print("[ok] connexion relayée sans modification, jetons renvoyés, pas de cache");

  res = response();
  await handler(request({ method: "POST", url: "/api/ecoledirecte?chemin=%2Fv3%2Feleves%2F1234%2Fnotes.awp&verbe=get&v=4.102.0", headers: { "x-token": "TOK-123" }, body: 'data={"anneeScolaire":""}' }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(lastUpstream.url.includes("/v3/eleves/1234/notes.awp?v=4.102.0&verbe=get"));
  print("[ok] notes relayées");

  const refused = [
    { method: "GET", url: "/api/ecoledirecte?chemin=%2Fv3%2Flogin.awp&v=4.102.0" },
    { method: "POST", url: "/api/ecoledirecte?chemin=%2Fv3%2Feleves%2F1234%2Fmessages.awp&verbe=get&v=4", body: "data={}" },
    { method: "POST", url: "/api/ecoledirecte?chemin=%2F..%2Fadmin&v=4", body: "data={}" },
    { method: "POST", url: "/api/ecoledirecte?chemin=https%3A%2F%2Fevil.example%2Fx&v=4", body: "data={}" },
    { method: "POST", url: "/api/ecoledirecte?chemin=%2Fv3%2Feleves%2F1234%2Fnotes.awp&verbe=put&v=4", body: "data={}" },
    { method: "POST", url: "/api/ecoledirecte?chemin=%2Fv3%2Flogin.awp&v=4", body: "pas-data" },
    { method: "POST", url: "/api/ecoledirecte?chemin=%2Fv3%2Flogin.awp&v=4", body: "data={}", headers: { "sec-fetch-site": "cross-site" } },
    { method: "DELETE", url: "/api/ecoledirecte?chemin=%2Fv3%2Flogin.awp&v=4" },
  ];
  for (const r of refused) {
    lastUpstream = null; res = response();
    await handler(request({ headers: {}, ...r }), res);
    assert.ok(res.statusCode >= 400, r.url);
    assert.strictEqual(lastUpstream, null, `appel transmis alors qu'il devait être refusé : ${r.url}`);
  }
  print(`[ok] ${refused.length} appels hors liste refusés sans rien transmettre`);

  assert.strictEqual(logs.length, 0, "le relais a écrit dans les journaux");
  print("[ok] aucun journal écrit par le relais");
  print("Résultat : tout est bon");
})().catch((e) => { print("[ÉCHEC] " + e.message); process.exit(1); });
