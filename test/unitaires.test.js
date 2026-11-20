import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/args.js";
import { normalizeDomain } from "../src/domain.js";
import { evaluate } from "../src/evaluate.js";
import { messages, pricingUrl, LANGS } from "../src/i18n.js";
import { makeStyle, render } from "../src/render.js";
import { resultat } from "./serveur.js";

describe("normalizeDomain", () => {
  it.each([
    ["Exemple.FR", "exemple.fr"],
    ["https://www.exemple.fr/chemin?x=1#y", "www.exemple.fr"],
    ["exemple.fr.", "exemple.fr"],
    ["exemple.fr:8443/a", "exemple.fr"],
    ["bücher.example", "xn--bcher-kva.example"],
  ])("accepte %s", (entree, attendu) => {
    expect(normalizeDomain(entree)).toEqual({ domain: attendu });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["user@exemple.fr", "invalid"],
    ["exemple", "invalid"],
    ["a b.fr", "invalid"],
    ["-a.fr", "invalid"],
    ["a_b.fr", "invalid"],
    [`${"a".repeat(64)}.fr`, "invalid"],
    ["http://", "invalid"],
    ["127.0.0.1", "ip"],
    ["10.0.0", "ip"],
    ["[::1]", "ip"],
    ["exemple.123", "invalid"],
    ["localhost", "local"],
    ["api.localhost", "local"],
  ])("refuse %s", (entree, erreur) => {
    expect(normalizeDomain(entree)).toEqual({ error: erreur });
  });

  it("refuse un nom trop long", () => {
    const long = Array.from({ length: 6 }, () => "a".repeat(50)).join(".") + ".fr";
    expect(normalizeDomain(long)).toEqual({ error: "invalid" });
  });
});

describe("parseArgs", () => {
  const u = messages("en").usage;
  const erreur = (argv) => parseArgs(argv).error(u);

  it("lit les options séparées et collées", () => {
    const r = parseArgs(["check", "exemple.fr", "--json", "--no-color", "--fail-on", "ssl", "--min-grade=b", "--lang", "fr", "--timeout=5.5", "--api-url", "http://127.0.0.1:1"]);
    expect(r).toEqual({
      domainInput: "exemple.fr",
      opts: { json: true, color: false, failOn: "ssl", minGrade: "B", lang: "fr", apiUrl: "http://127.0.0.1:1", timeout: 5.5 },
    });
  });

  it("aide, version et absence de commande", () => {
    expect(parseArgs(["--help"])).toEqual({ help: true, lang: "en" });
    expect(parseArgs(["-h", "--lang", "fr"])).toEqual({ help: true, lang: "fr" });
    expect(parseArgs(["check", "-v"])).toEqual({ version: true });
    expect(parseArgs(["--version"])).toEqual({ version: true });
    expect(parseArgs([])).toEqual({ help: true, lang: "en", usageError: true });
  });

  it("signale les erreurs d'usage", () => {
    expect(erreur(["nimporte", "a.fr"])).toBe("Unknown command: nimporte");
    expect(erreur(["check"])).toBe(u.needsDomain);
    expect(erreur(["check", "a.fr", "b.fr"])).toBe(u.oneDomain);
    expect(erreur(["check", "a.fr", "--zzz"])).toBe("Unknown option: --zzz");
    expect(erreur(["check", "a.fr", "--json=1"])).toBe("Unknown option: --json");
    expect(erreur(["check", "a.fr", "--fail-on"])).toBe("Option --fail-on needs a value.");
    expect(erreur(["check", "a.fr", "--fail-on", "x"])).toBe(u.badFailOn);
    expect(erreur(["check", "a.fr", "--min-grade", "G"])).toBe(u.badGrade);
    expect(erreur(["check", "a.fr", "--lang", "ja"])).toBe(u.badLang);
    expect(erreur(["check", "a.fr", "--timeout", "0"])).toBe(u.badTimeout);
    expect(erreur(["check", "a.fr", "--timeout", "abc"])).toBe(u.badTimeout);
    expect(erreur(["check", "a.fr", "--timeout", "601"])).toBe(u.badTimeout);
  });

  it("garde la première erreur", () => {
    expect(erreur(["check", "a.fr", "--lang", "ja", "--fail-on", "x"])).toBe(u.badLang);
  });

  it("accepte un tiret seul comme argument", () => {
    expect(parseArgs(["check", "-"]).domainInput).toBe("-");
  });
});

describe("evaluate", () => {
  const r = resultat();
  const texte = (reasons) => reasons.map((f) => f(messages("en")));

  it("none et seuil tenu", () => {
    expect(evaluate(r, { failOn: "none", minGrade: "" })).toEqual([]);
    expect(evaluate(r, { failOn: "none", minGrade: "B" })).toEqual([]);
    expect(evaluate(r, { failOn: "ssl", minGrade: "" })).toEqual([]);
  });

  it("email et any échouent, constats remplacés ignorés", () => {
    expect(texte(evaluate(r, { failOn: "email", minGrade: "" }))).toEqual(["Failed on --fail-on email."]);
    expect(texte(evaluate(r, { failOn: "any", minGrade: "" }))).toEqual(["Failed on --fail-on any."]);
    const propre = resultat({ findings: [{ id: "A7", family: "email", status: "fail", code: "x", superseded: true }] });
    expect(evaluate(propre, { failOn: "any", minGrade: "" })).toEqual([]);
  });

  it("note sous le seuil, ou partielle", () => {
    expect(texte(evaluate(r, { failOn: "none", minGrade: "A" }))).toEqual(["Grade B is below the A threshold."]);
    expect(texte(evaluate(resultat({ grade: "" }), { failOn: "none", minGrade: "F" }))).toEqual(["Grade partial is below the F threshold."]);
    expect(texte(evaluate(resultat({ grade: "" }), { failOn: "none", minGrade: "F" }))).toHaveLength(1);
  });

  it("cumule les deux raisons", () => {
    expect(evaluate(r, { failOn: "any", minGrade: "A" })).toHaveLength(2);
  });
});

describe("render", () => {
  const m = messages("fr");
  const base = { m, lang: "fr", color: false, unicode: true };

  it("rapport complet en français, Unicode", () => {
    const t = render(resultat({ cached: true }), base);
    expect(t).toContain("exemple.fr  Note B");
    expect(t).toContain("Résultat en cache");
    expect(t).toContain("✔ SSL / TLS");
    expect(t).toContain("✔ DNS");
    expect(t).toContain("✘ E-mail (SPF, DKIM, DMARC)");
    expect(t).toContain("1 conformes, 2 à corriger, 1 non vérifiables".replace("1 conformes", "2 conformes"));
    expect(t).toContain("✘ A5 dmarc_missing [high] (policy=none)");
    expect(t.indexOf("A5")).toBeLessThan(t.indexOf("A6"));
    expect(t).not.toContain("A7 old");
    expect(t).toContain("→ Publier un DMARC en p=reject");
    expect(t).toContain("✘ 2026-12-01  A18 cert_expires");
    expect(t).toContain("? 2027-02-01  A71 domain_expires");
    expect(t).toContain("✔ 2027-06-01  A72 fine");
    expect(t).toContain("https://attackscout.com/fr/tarifs?utm_source=cli&utm_medium=terminal&utm_campaign=cli-check");
  });

  it("repli ASCII, note partielle, sans échéance ni correction", () => {
    const t = render(
      resultat({ grade: "", fixesToA: undefined, deadlines: undefined, findings: [{ id: "A9", family: "web", status: "unverifiable", code: "x" }] }),
      { ...base, m: messages("en"), lang: "es", unicode: false },
    );
    expect(t).toContain("Grade ? (partial");
    expect(t).toContain("[?] SSL / TLS");
    expect(t).not.toContain("Issues to fix");
    expect(t).not.toContain("To reach grade A");
    expect(t).not.toContain("Deadlines");
    expect(t).toContain("/es/precios?");
    const ko = render(resultat(), { ...base, unicode: false });
    expect(ko).toContain("[KO] A5");
    expect(ko).toContain("-> Publier");
  });

  it("couleurs ANSI, notes C et F, gravité inconnue, détails longs", () => {
    const longs = { findings: [
      { id: "B1", family: "web", status: "fail", severity: "weird", code: "w", details: { a: "x".repeat(200) } },
      { id: "B2", family: "web", status: "fail", severity: "blocking", code: "w2" },
      { id: "B3", family: "web", status: "fail", code: "w3" },
    ] };
    const c = render(resultat({ grade: "C", ...longs }), { ...base, color: true });
    expect(c).toContain("\u001b[33m");
    expect(c).toContain("...");
    expect(c.indexOf("B2")).toBeLessThan(c.indexOf("B1"));
    expect(render(resultat({ grade: "F" }), { ...base, color: true })).toContain("\u001b[31m");
    expect(render(resultat({ grade: "A" }), { ...base, color: true })).toContain("\u001b[32m");
  });

  it("makeStyle sans couleur ne change rien", () => {
    expect(makeStyle(false).bold("x")).toBe("x");
  });
});

describe("i18n", () => {
  it("liens d'abonnement des six langues", () => {
    expect(LANGS.map(pricingUrl).map((u) => u.split("?")[0])).toEqual([
      "https://attackscout.com/fr/tarifs",
      "https://attackscout.com/en/pricing",
      "https://attackscout.com/es/precios",
      "https://attackscout.com/de/preise",
      "https://attackscout.com/it/prezzi",
      "https://attackscout.com/pt/precos",
    ]);
  });

  it("fr et en : mêmes messages paramétrés", () => {
    for (const l of ["fr", "en"]) {
      const m = messages(l);
      expect(m.apiError(500, "")).not.toContain("  ");
      expect(m.apiError(500, "scan_error")).toContain("scan_error");
      expect(m.retryAfter(7)).toContain("7");
      expect(m.timeout(3)).toContain("3");
      expect(m.network("X")).toContain("X");
      expect(m.thresholdGrade("", "A")).toBeTruthy();
      expect(m.usage.unknownCommand("c")).toContain("c");
      expect(m.usage.needsValue("--x")).toContain("--x");
      expect(m.usage.unknownOption("--x")).toContain("--x");
      expect(m.thresholdFail("any")).toContain("any");
    }
    expect(messages("de")).toBe(messages("en"));
  });
});
