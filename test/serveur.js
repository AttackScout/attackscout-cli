import { createServer } from "node:http";

// Faux serveur AttackScout : enregistre les requêtes et répond selon `reponse`.
export async function demarrer(reponse) {
  const requetes = [];
  const serveur = createServer((req, res) => {
    let corps = "";
    req.on("data", (c) => (corps += c));
    req.on("end", () => {
      requetes.push({ method: req.method, url: req.url, headers: req.headers, body: corps });
      const r = typeof reponse === "function" ? reponse(req, corps) : reponse;
      if (r.pendre) return; // ne répond jamais (test du délai)
      res.writeHead(r.status ?? 200, { "Content-Type": "application/json", ...(r.headers ?? {}) });
      res.end(r.brut ?? JSON.stringify(r.body ?? {}));
    });
  });
  await new Promise((ok) => serveur.listen(0, "127.0.0.1", ok));
  const { port } = serveur.address();
  return {
    url: `http://127.0.0.1:${port}`,
    requetes,
    arreter: () => {
      serveur.closeAllConnections();
      return new Promise((ok) => serveur.close(ok));
    },
  };
}

export const resultat = (surcharge = {}) => ({
  id: "abc",
  domain: "exemple.fr",
  siteHost: "www.exemple.fr",
  createdAt: "2026-11-19T10:00:00Z",
  durationMs: 1200,
  grade: "B",
  gradingVersion: "1",
  unverifiable: 1,
  coverage: { verified: 10, total: 11 },
  fixesToA: ["Publier un DMARC en p=reject"],
  findings: [
    { id: "A1", family: "tls", status: "pass", code: "tls_ok" },
    { id: "A2", family: "dns", status: "pass", code: "dns_ok" },
    { id: "A5", family: "email", status: "fail", severity: "high", code: "dmarc_missing", details: { policy: "none" } },
    { id: "A6", family: "email", status: "fail", severity: "low", code: "spf_soft" },
    { id: "A7", family: "email", status: "fail", severity: "critical", code: "old", superseded: true },
    { id: "A9", family: "web", status: "unverifiable", code: "web_unknown" },
  ],
  deadlines: [
    { date: "2026-12-01T00:00:00Z", control: "A18", code: "cert_expires", urgency: "now" },
    { date: "2027-02-01T00:00:00Z", control: "A71", code: "domain_expires", urgency: "plan" },
    { date: "2027-06-01T00:00:00Z", control: "A72", code: "fine", urgency: "ok" },
  ],
  ...surcharge,
});
