// Validation et normalisation du domaine : refuse adresses IP, localhost et noms sans point.

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

/** Retourne { domain } normalisé (minuscules, punycode, sans schéma ni chemin) ou { error }. */
export function normalizeDomain(input) {
  let s = input.trim();
  if (s === "") return { error: "empty" };
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0];
  if (s.includes("@")) return { error: "invalid" };
  let host;
  try {
    host = new URL(`http://${s}`).hostname;
  } catch {
    return { error: "invalid" };
  }
  host = host.replace(/\.$/, "").toLowerCase();
  if (host.startsWith("[") || /^[0-9.]+$/.test(host)) return { error: "ip" };
  if (host === "localhost" || host.endsWith(".localhost")) return { error: "local" };
  const labels = host.split(".");
  if (labels.length < 2 || host.length > 253 || !labels.every((l) => LABEL.test(l))) return { error: "invalid" };
  return { domain: host };
}
