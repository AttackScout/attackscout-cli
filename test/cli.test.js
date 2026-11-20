import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { EXIT, VERSION, run } from "../src/cli.js";
import { KEYS_URL } from "../src/i18n.js";
import { demarrer, resultat } from "./serveur.js";

const CLE = "as_live_0123456789abcdef0123456789abcdef0123456789abcdef";
let serveur;
afterEach(async () => {
  await serveur?.arreter();
  serveur = undefined;
});

function flux(isTTY = false) {
  let texte = "";
  return { write: (t) => (texte += t), isTTY, get texte() { return texte; } };
}

async function lancer(argv, { env = { ATTACKSCOUT_API_KEY: CLE }, tty = false, platform = "linux", fetchImpl } = {}) {
  const stdout = flux(tty);
  const stderr = flux();
  const code = await run(argv, { env, stdout, stderr, platform, fetchImpl });
  return { code, out: stdout.texte, err: stderr.texte };
}

const avecApi = async (reponse, argv = [], opts) => {
  serveur = await demarrer(reponse);
  return lancer(["check", "Exemple.FR", "--api-url", serveur.url, ...argv], opts);
};

describe("run : cas nominaux", () => {
  it("audit 201 : rapport, requête conforme, code 0", async () => {
    const r = await avecApi({ status: 201, body: resultat() }, ["--lang", "fr"], { env: { ATTACKSCOUT_API_KEY: ` ${CLE} `, LANG: "fr_FR.UTF-8" }, tty: true });
    expect(r.code).toBe(EXIT.ok);
    expect(r.out).toContain("exemple.fr");
    expect(r.out).toContain("\u001b[");
    expect(r.out).toContain("✘");
    expect(r.err).toBe("");
    const q = serveur.requetes[0];
    expect(q.method).toBe("POST");
    expect(q.url).toBe("/api/v1/public/scans");
    expect(q.headers.authorization).toBe(`Bearer ${CLE}`);
    expect(q.headers["user-agent"]).toBe(`AttackScout-CLI/${VERSION}`);
    expect(q.headers["accept-language"]).toBe("fr");
    expect(JSON.parse(q.body)).toEqual({ domain: "exemple.fr" });
    expect(r.out + r.err).not.toContain(CLE);
  });

  it("200 en cache, --json : JSON seul sur la sortie standard", async () => {
    const r = await avecApi({ status: 200, body: resultat({ cached: true }) }, ["--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.out).cached).toBe(true);
  });

  it("slash final de --api-url ignoré, NO_COLOR : ASCII sans couleur", async () => {
    serveur = await demarrer({ status: 201, body: resultat() });
    const r = await lancer(["check", "exemple.fr", "--api-url", `${serveur.url}/`], { env: { ATTACKSCOUT_API_KEY: CLE, NO_COLOR: "1", LANG: "C.UTF-8" }, tty: true });
    expect(r.out).toContain("[KO]");
    expect(r.out).not.toContain("\u001b[");
    expect(serveur.requetes[0].url).toBe("/api/v1/public/scans");
  });

  it("Windows Terminal : Unicode ; sans TTY ni --no-color : pas de couleur", async () => {
    const a = await avecApi({ status: 201, body: resultat() }, [], { env: { ATTACKSCOUT_API_KEY: CLE, WT_SESSION: "x" }, platform: "win32" });
    expect(a.out).toContain("✘");
    expect(a.out).not.toContain("\u001b[");
    const b = await avecApi({ status: 201, body: resultat() }, ["--no-color"], { env: { ATTACKSCOUT_API_KEY: CLE, LANG: "en_US.UTF-8" }, tty: true });
    expect(b.out).not.toContain("\u001b[");
    const c = await avecApi({ status: 201, body: resultat() }, [], { env: { ATTACKSCOUT_API_KEY: CLE, LANG: "en_US.UTF-8", TERM: "dumb" }, tty: true });
    expect(c.out).not.toContain("\u001b[");
    const d = await avecApi({ status: 201, body: resultat() }, [], { env: { ATTACKSCOUT_API_KEY: CLE }, platform: "win32" });
    expect(d.out).toContain("[KO]");
  });

  it("--fail-on et --min-grade : code 1 avec raisons sur la sortie d'erreur", async () => {
    const r = await avecApi({ status: 201, body: resultat() }, ["--fail-on", "email", "--min-grade", "A"]);
    expect(r.code).toBe(EXIT.problem);
    expect(r.err).toContain("Failed on --fail-on email.");
    expect(r.err).toContain("Grade B is below the A threshold.");
    const ok = await avecApi({ status: 201, body: resultat() }, ["--fail-on", "ssl", "--min-grade", "B"]);
    expect(ok.code).toBe(0);
  });

  it("--help, --version, sans argument", async () => {
    const h = await lancer(["--help", "--lang", "fr"]);
    expect(h.code).toBe(0);
    expect(h.out).toContain("Codes de sortie");
    expect(h.out).toContain(KEYS_URL);
    expect((await lancer(["--help"])).out).toContain("Exit codes");
    const v = await lancer(["--version"]);
    expect(v.out.trim()).toBe(VERSION);
    const rien = await lancer([]);
    expect(rien.code).toBe(EXIT.usage);
    expect(rien.err).toContain("Usage");
    expect(rien.out).toBe("");
  });
});

describe("run : usage (code 2), sans appel réseau", () => {
  it("option, commande, domaine, URL d'API, clé", async () => {
    const jamais = () => {
      throw new Error("réseau interdit");
    };
    const t = async (argv, env) => lancer(argv, { env, fetchImpl: jamais });
    const bad = await t(["check", "a.fr", "--zzz"], { ATTACKSCOUT_API_KEY: CLE });
    expect(bad.code).toBe(2);
    expect(bad.err).toContain("Unknown option: --zzz");
    expect((await t(["check", "127.0.0.1"], { ATTACKSCOUT_API_KEY: CLE })).err).toContain("An IP address");
    expect((await t(["check", "localhost"], { ATTACKSCOUT_API_KEY: CLE })).code).toBe(2);
    expect((await t(["check", "a.fr", "--api-url", "http://exemple.fr"], { ATTACKSCOUT_API_KEY: CLE })).err).toContain("--api-url");
    expect((await t(["check", "a.fr", "--api-url", "pas une url"], { ATTACKSCOUT_API_KEY: CLE })).code).toBe(2);
    const cle = await t(["check", "a.fr", "--lang", "fr"], {});
    expect(cle.code).toBe(2);
    expect(cle.err).toContain("Créer une clé gratuite");
    expect(cle.err).toContain(KEYS_URL);
    expect(cle.err).toContain("export ATTACKSCOUT_API_KEY=");
    expect((await t(["check", "a.fr"], { ATTACKSCOUT_API_KEY: "  " })).code).toBe(2);
    const mauvaise = await t(["check", "a.fr"], { ATTACKSCOUT_API_KEY: "as live\r\nX: y" });
    expect(mauvaise.code).toBe(2);
    expect(mauvaise.err).not.toContain("as live");
  });
});

describe("run : erreurs API", () => {
  it("429 : code 4 avec Retry-After, ou sans", async () => {
    const r = await avecApi({ status: 429, headers: { "Retry-After": "120" }, body: { error: { code: "scan_quota_exceeded", message: "x" } } });
    expect(r.code).toBe(EXIT.quota);
    expect(r.err).toContain("Retry in 120 s.");
    await serveur.arreter();
    const s = await avecApi({ status: 429, body: {} }, ["--lang", "fr"]);
    expect(s.code).toBe(4);
    expect(s.err).toContain("Réessayez plus tard.");
    await serveur.arreter();
    const t = await avecApi({ status: 429, headers: { "Retry-After": "Wed, 21 Oct" }, body: {} });
    expect(t.err).toContain("Retry later.");
  });

  it.each([401, 403])("%i : clé refusée, code 3, lien des clés", async (status) => {
    const r = await avecApi({ status, body: { error: { code: "invalid_api_key", message: "x" } } });
    expect(r.code).toBe(EXIT.api);
    expect(r.err).toContain(KEYS_URL);
    expect(r.err).not.toContain(CLE);
  });

  it("403 domain_excluded : pas de renvoi vers les clés", async () => {
    const r = await avecApi({ status: 403, body: { error: { code: "domain_excluded", message: "x" } } });
    expect(r.code).toBe(3);
    expect(r.err).toContain("excluded");
    expect(r.err).not.toContain("espace/cles");
  });

  it("422, 500, corps non JSON, 200 inattendu", async () => {
    expect((await avecApi({ status: 422, body: { error: { code: "domain_not_found" } } })).err).toContain("refused by the API");
    await serveur.arreter();
    const r = await avecApi({ status: 500, brut: "<html>", headers: { "Content-Type": "text/html" } });
    expect(r.code).toBe(3);
    expect(r.err).toContain("API error (500).");
    await serveur.arreter();
    const c = await avecApi({ status: 500, body: { error: { code: "scan_error" } } });
    expect(c.err).toContain("API error (500 scan_error).");
    await serveur.arreter();
    expect((await avecApi({ status: 200, body: { id: "x" } })).err).toContain("Unexpected API response.");
    await serveur.arreter();
    expect((await avecApi({ status: 200, brut: "null" })).code).toBe(3);
  });

  it("délai dépassé", async () => {
    const r = await avecApi({ pendre: true }, ["--timeout", "1"]);
    expect(r.code).toBe(3);
    expect(r.err).toContain("Timed out (1 s).");
  });

  it("réseau : connexion refusée et erreur sans cause", async () => {
    serveur = await demarrer({});
    const url = serveur.url;
    await serveur.arreter();
    serveur = undefined;
    const r = await lancer(["check", "a.fr", "--api-url", url]);
    expect(r.code).toBe(3);
    expect(r.err).toContain("API unreachable: ECONNREFUSED");
    const mk = (e) => async () => {
      throw e;
    };
    expect((await lancer(["check", "a.fr"], { fetchImpl: mk(Object.assign(new TypeError("fetch failed"), { cause: new Error("boum") })) })).err).toContain("boum");
    expect((await lancer(["check", "a.fr"], { fetchImpl: mk(new Error("direct")) })).err).toContain("direct");
    expect((await lancer(["check", "a.fr"], { fetchImpl: mk(undefined) })).err).toContain("API unreachable: error");
  });

  it("redirection refusée : la clé n'est jamais suivie ailleurs", async () => {
    const r = await avecApi({ status: 302, headers: { Location: "http://127.0.0.1:1/vol" } });
    expect(r.code).toBe(3);
    expect(r.err).toContain("API unreachable");
  });
});

describe("binaire", () => {
  it("bin/attackscout.js : version et clé absente", () => {
    const bin = new URL("../bin/attackscout.js", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    const v = spawnSync(process.execPath, [bin, "--version"], { encoding: "utf8" });
    expect(v.status).toBe(0);
    expect(v.stdout.trim()).toBe(VERSION);
    const env = { ...process.env };
    delete env.ATTACKSCOUT_API_KEY;
    const k = spawnSync(process.execPath, [bin, "check", "exemple.fr"], { encoding: "utf8", env });
    expect(k.status).toBe(2);
    expect(k.stderr).toContain(KEYS_URL);
  });
});
