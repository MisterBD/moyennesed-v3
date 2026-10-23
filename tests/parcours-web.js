// Parcours complet de la version web dans un vrai navigateur (Chromium), SANS compte ÉcoleDirecte :
// accueil -> connexion -> double authentification -> moyennes -> détail d'une matière -> profil.
// Lancement : npm run test:web   (la première fois : npx playwright install chromium)
// Captures d'écran : dossier dist-test-captures/
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const { startServer, state } = require("./faux-ecoledirecte");

const ROOT = path.resolve(__dirname, "..", "dist-test");
const CAPTURES = path.resolve(__dirname, "..", "dist-test-captures");
const PORT = 8090;

(async () => {
  if (!fs.existsSync(path.join(ROOT, "index.html"))) { throw new Error("export web absent : lancez « npm run test:web »"); }
  fs.mkdirSync(CAPTURES, { recursive: true });
  const server = await startServer({ root: ROOT, port: PORT });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") { errors.push(m.text()); } });
  const capture = async (name) => { await page.waitForTimeout(800); await page.screenshot({ path: path.join(CAPTURES, `${name}.png`) }); };
  const ok = (message) => console.log(`[ok] ${message}`);
  let failed = false;
  const fail = (message) => { console.log(`[ÉCHEC] ${message}`); failed = true; };

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
    await page.getByText("Mes moyennes").first().waitFor({ timeout: 20000 });
    await capture("1-accueil");
    await page.getByText("Continuer").click(); await capture("2-fonctions");
    await page.getByText("Continuer").click(); await page.waitForTimeout(600);
    await page.getByPlaceholder("Identifiant").fill("eleve.test");
    await page.getByPlaceholder("Mot de passe").fill("Mot de passe!");
    await capture("3-connexion");
    await page.getByText("Connexion", { exact: true }).click();
    await page.getByText("Quelle est votre année de naissance ?").waitFor({ timeout: 15000 });
    await capture("4-double-authentification");
    ok("double authentification affichée");
    await page.getByText("2010", { exact: true }).click();
    await page.getByText("Confirmer").click();
    await page.getByText("15,00").first().waitFor({ timeout: 20000 });
    await capture("5-moyennes");
    ok("connexion réussie, moyenne générale calculée (15,00)");
    if (await page.getByText("Quelle est votre année de naissance ?").count()) { fail("la fenêtre de double authentification est restée ouverte"); }

    await page.getByText("Francais", { exact: true }).first().click();
    await page.waitForTimeout(1200); await capture("6-detail-matiere");
    await page.keyboard.press("Escape"); await page.waitForTimeout(800);
    ok("détail d'une matière ouvert puis fermé");

    const header = await page.getByText("Bonjour Camille !").boundingBox();
    await page.mouse.click(header.x + header.width + 40, header.y + header.height / 2);
    await page.getByText("Version modifiée de MoyennesED", { exact: false }).first().scrollIntoViewIfNeeded();
    await capture("7-profil-credit");
    ok("page profil avec crédit à l'auteur et licence");

    const expected = ["GET /v3/login.awp", "POST /v3/login.awp", "POST /v3/connexion/doubleauth.awp", "POST /v3/connexion/doubleauth.awp", "GET /v3/login.awp", "POST /v3/login.awp", "POST /v3/eleves/1234/notes.awp"];
    const calls = state.calls.map((c) => c.split("?")[0]);
    if (JSON.stringify(calls) === JSON.stringify(expected)) { ok("appels à ÉcoleDirecte dans l'ordre attendu (7)"); } else { fail(`appels inattendus : ${calls.join(", ")}`); }

    const stored = await page.evaluate(() => JSON.stringify([Object.keys(localStorage), Object.values(localStorage), Object.values(sessionStorage)]));
    if (/Mot de passe|Mot%20de|eleve\.test|CN-1|TOKEN|DEUXFA|gtk-valeur/.test(stored)) { fail("identifiant, mot de passe ou jeton trouvé dans le stockage du navigateur"); }
    else { ok("aucun identifiant, mot de passe ni jeton dans le stockage du navigateur"); }

    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("Bienvenue sur").first().waitFor({ timeout: 15000 });
    ok("après rechargement de la page : retour à l'accueil (mot de passe oublié)");

    if (errors.length) { fail(`erreurs JavaScript : ${errors.join(" | ")}`); } else { ok("aucune erreur JavaScript"); }
  } catch (e) {
    fail(e.message.split("\n")[0]);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failed ? "Résultat : ÉCHEC" : `Résultat : tout est bon (captures dans ${path.relative(process.cwd(), CAPTURES)}/)`);
  process.exit(failed ? 1 : 0);
})();
