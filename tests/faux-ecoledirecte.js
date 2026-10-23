// Banc d'essai sans compte ÉcoleDirecte :
// sert l'export web (dossier dist-test) + le VRAI relais (api/ecoledirecte.js),
// branché sur un FAUX ÉcoleDirecte qui imite le flux réel (GTK, double authentification, notes).
// Identifiants de test : eleve.test / « Mot de passe! » ; bonne réponse à la question : 2010.
// Utilisé par tests/parcours-web.js (npm run test:web).
const http = require("http");
const fs = require("fs");
const path = require("path");
const relais = require("../api/ecoledirecte.js");
const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const state = { calls: [], twoFaDone: false };

function fakeED(url, opts) {
  const u = new URL(url);
  const h = new Headers();
  const body = opts.body || "";
  state.calls.push(`${opts.method} ${u.pathname}${u.search}`);
  const json = (o) => ({ status: 200, headers: h, text: async () => JSON.stringify(o) });
  if (u.searchParams.get("v") !== "4.102.0") { return json({ code: 517, message: "version" }); }
  if (u.pathname === "/v3/login.awp" && opts.method === "GET" && u.searchParams.get("gtk") === "1") {
    h.append("set-cookie", "GTK=gtk-valeur-42; Path=/; Secure; HttpOnly"); return json({ code: 200 });
  }
  if (u.pathname === "/v3/login.awp" && opts.method === "POST") {
    if (opts.headers["X-Gtk"] !== "gtk-valeur-42" || opts.headers["Cookie"] !== "GTK=gtk-valeur-42") { return json({ code: 516, message: "GTK manquant" }); }
    const data = JSON.parse(body.slice(5));
    if (data.identifiant !== "eleve.test" || data.motdepasse !== "Mot%20de%20passe!") { return json({ code: 505, message: "mauvais mot de passe" }); }
    if (!(data.cn === "CN-1" && data.cv === "CV-1" && data.fa?.[0]?.cn === "CN-1")) {
      h.set("x-token", "TOKEN-2FA"); h.set("2fa-token", "DEUXFA-1"); return json({ code: 250, token: "TOKEN-2FA", data: {} });
    }
    h.set("x-token", "TOKEN-OK");
    return json({ code: 200, token: "TOKEN-OK", data: { accounts: [{ id: 1234, identifiant: "eleve.test", prenom: "camille", nom: "test", typeCompte: "E", main: true, anneeScolaireCourante: "2026-2027", profile: { classe: { libelle: "Seconde 2" }, sexe: "F", photo: "" } }] } });
  }
  if (u.pathname === "/v3/connexion/doubleauth.awp") {
    if (opts.headers["X-Token"] !== "TOKEN-2FA" || opts.headers["2FA-Token"] !== "DEUXFA-1") { return json({ code: 520, message: "jeton" }); }
    h.set("x-token", "TOKEN-2FA");
    if (u.searchParams.get("verbe") === "get") { return json({ code: 200, data: { question: b64("Quelle est votre année de naissance ?"), propositions: [b64("2009"), b64("2010"), b64("2011")] } }); }
    const data = JSON.parse(body.slice(5));
    if (data.choix === b64("2010")) { state.twoFaDone = true; return json({ code: 200, data: { cn: "CN-1", cv: "CV-1" } }); }
    return json({ code: 401, message: "mauvaise réponse" });
  }
  if (u.pathname === "/v3/eleves/1234/notes.awp") {
    if (opts.headers["X-Token"] !== "TOKEN-OK") { return json({ code: 525, message: "expiré" }); }
    const discipline = (id, code, nom) => ({ id, codeMatiere: code, codeSousMatiere: "", discipline: nom, coef: 1, professeurs: [{ nom: "M. Prof" }], sousMatiere: false, groupeMatiere: false, idGroupeMatiere: 0 });
    const note = (id, code, val, classe) => ({ id, devoir: "Contrôle " + id, codePeriode: "A001", codeMatiere: code, codeSousMatiere: "", coef: "1", valeur: val, noteSur: "20", moyenneClasse: classe, nonSignificatif: false, enLettre: false, date: "2026-10-01", dateSaisie: "2026-10-02" });
    h.set("x-token", "TOKEN-OK");
    return json({ code: 200, data: { parametrage: { coefficientNote: true, moyenneCoefMatiere: true, colonneCoefficientMatiere: true },
      periodes: [{ codePeriode: "A001", periode: "1er Trimestre", cloture: false, ensembleMatieres: { disciplines: [discipline(1, "FRANC", "FRANCAIS"), discipline(2, "MATHS", "MATHEMATIQUES")] } }],
      notes: [note(11, "FRANC", "14", "12,5"), note(12, "MATHS", "16", "11")] } });
  }
  return json({ code: 404 });
}

const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".ttf": "font/ttf", ".json": "application/json" };
function startServer({ root, port = 8080 }) {
  // Le relais appelle fetch() : on le détourne vers le faux ÉcoleDirecte
  global.fetch = async (url, opts) => fakeED(url, opts);
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url.startsWith("/api/ecoledirecte")) { return relais(req, res); }
      let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
      if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { p = path.join(root, "index.html"); }
      res.setHeader("Content-Type", types[path.extname(p)] || "application/octet-stream");
      fs.createReadStream(p).pipe(res);
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

module.exports = { startServer, state };
