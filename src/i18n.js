// Textes du terminal. fr et en ; es, de, it, pt retombent sur en (le lien d'abonnement,
// lui, suit la langue demandée : /es/precios, /de/preise…).

export const LANGS = ["fr", "en", "es", "de", "it", "pt"];

const PRICING_SLUG = { fr: "tarifs", en: "pricing", es: "precios", de: "preise", it: "prezzi", pt: "precos" };

export const KEYS_URL = "https://attackscout.com/espace/cles?utm_source=cli&utm_medium=terminal&utm_campaign=cli-cle";

export function pricingUrl(lang) {
  return `https://attackscout.com/${lang}/${PRICING_SLUG[lang]}?utm_source=cli&utm_medium=terminal&utm_campaign=cli-check`;
}

const fr = {
  grade: "Note",
  partial: "partielle (moins de 70 % des contrôles vérifiés)",
  families: { tls: "SSL / TLS", dns: "DNS", email: "E-mail (SPF, DKIM, DMARC)" },
  summary: (ok, ko, unk) => `${ok} conformes, ${ko} à corriger, ${unk} non vérifiables`,
  toFix: "Points à corriger",
  toReachA: "Pour atteindre la note A",
  deadlines: "Échéances",
  cached: "Résultat en cache (audit de moins de 24 h)",
  subscribe: "Surveillance continue, alertes et rapports : ",
  missingKey: "Clé d'API absente.",
  createKey: "Créer une clé gratuite",
  exportHint: "Puis, dans votre terminal :",
  keyInvalid: "Clé refusée par AttackScout.",
  keyInvalidHint: "Vérifiez ATTACKSCOUT_API_KEY ou créez une clé avec la portée scans:write : ",
  quota: "Quota d'audits atteint.",
  retryAfter: (s) => `Réessayez dans ${s} s.`,
  retryUnknown: "Réessayez plus tard.",
  excluded: "Ce domaine est exclu : son titulaire a demandé à ne pas être audité.",
  invalidDomainApi: "Domaine refusé par l'API (invalide ou introuvable).",
  network: (m) => `API injoignable : ${m}`,
  timeout: (s) => `Délai dépassé (${s} s).`,
  apiError: (status, code) => `Erreur de l'API (${status}${code ? ` ${code}` : ""}).`,
  badResponse: "Réponse inattendue de l'API.",
  usageTitle: "Usage : attackscout check <domaine> [options] (attackscout --help)",
  usage: {
    unknownCommand: (c) => `Commande inconnue : ${c}`,
    unknownOption: (o) => `Option inconnue : ${o}`,
    needsValue: (o) => `L'option ${o} attend une valeur.`,
    needsDomain: "Indiquez un domaine : attackscout check exemple.fr",
    oneDomain: "Un seul domaine à la fois.",
    badFailOn: "--fail-on attend none, ssl, email ou any.",
    badGrade: "--min-grade attend une lettre de A à F.",
    badLang: "--lang attend fr, en, es, de, it ou pt.",
    badTimeout: "--timeout attend un nombre de secondes entre 1 et 600.",
    badApiUrl: "--api-url attend une adresse https:// (http:// seulement en local).",
    badKey: "ATTACKSCOUT_API_KEY contient des caractères interdits.",
    domain: {
      empty: "Domaine vide.",
      ip: "Une adresse IP n'est pas un domaine.",
      local: "localhost n'est pas auditable.",
      invalid: "Nom de domaine invalide.",
    },
  },
  thresholdGrade: (g, min) => `Note ${g || "partielle"} sous le seuil ${min}.`,
  thresholdFail: (m) => `Échec sur --fail-on ${m}.`,
  help: `attackscout : audit public d'un domaine (note A-F, SSL, DNS, e-mail, échéances)

Usage
  attackscout check <domaine> [options]
  attackscout --help | --version

Options
  --json               Résultat brut de l'API sur la sortie standard
  --fail-on <niveau>   none (défaut), ssl, email ou any : code 1 si un contrôle de ce groupe échoue
  --min-grade <A..F>   Code 1 si la note est pire que ce seuil (note partielle comprise)
  --lang <langue>      fr, en, es, de, it ou pt (textes fr ou en ; lien d'abonnement dans la langue)
  --api-url <adresse>  Adresse de l'API (défaut https://attackscout.com)
  --timeout <s>        Délai maximal en secondes (défaut 60)
  --no-color           Pas de couleurs
  -h, --help           Cette aide
  -v, --version        Version

Clé d'API gratuite : variable d'environnement ATTACKSCOUT_API_KEY (jamais en argument).
Créer une clé : ${KEYS_URL}

Codes de sortie : 0 ok, 1 problème (--fail-on / --min-grade), 2 usage, 3 erreur API ou réseau, 4 quota atteint.
`,
};

const en = {
  grade: "Grade",
  partial: "partial (fewer than 70% of checks verified)",
  families: { tls: "SSL / TLS", dns: "DNS", email: "Email (SPF, DKIM, DMARC)" },
  summary: (ok, ko, unk) => `${ok} passed, ${ko} to fix, ${unk} unverifiable`,
  toFix: "Issues to fix",
  toReachA: "To reach grade A",
  deadlines: "Deadlines",
  cached: "Cached result (audit less than 24 h old)",
  subscribe: "Continuous monitoring, alerts and reports: ",
  missingKey: "API key missing.",
  createKey: "Create a free key",
  exportHint: "Then, in your terminal:",
  keyInvalid: "Key refused by AttackScout.",
  keyInvalidHint: "Check ATTACKSCOUT_API_KEY or create a key with the scans:write scope: ",
  quota: "Audit quota reached.",
  retryAfter: (s) => `Retry in ${s} s.`,
  retryUnknown: "Retry later.",
  excluded: "This domain is excluded: its owner asked not to be audited.",
  invalidDomainApi: "Domain refused by the API (invalid or not found).",
  network: (m) => `API unreachable: ${m}`,
  timeout: (s) => `Timed out (${s} s).`,
  apiError: (status, code) => `API error (${status}${code ? ` ${code}` : ""}).`,
  badResponse: "Unexpected API response.",
  usageTitle: "Usage: attackscout check <domain> [options] (attackscout --help)",
  usage: {
    unknownCommand: (c) => `Unknown command: ${c}`,
    unknownOption: (o) => `Unknown option: ${o}`,
    needsValue: (o) => `Option ${o} needs a value.`,
    needsDomain: "Give a domain: attackscout check example.com",
    oneDomain: "One domain at a time.",
    badFailOn: "--fail-on expects none, ssl, email or any.",
    badGrade: "--min-grade expects a letter from A to F.",
    badLang: "--lang expects fr, en, es, de, it or pt.",
    badTimeout: "--timeout expects a number of seconds between 1 and 600.",
    badApiUrl: "--api-url expects an https:// address (http:// only on loopback).",
    badKey: "ATTACKSCOUT_API_KEY contains forbidden characters.",
    domain: {
      empty: "Empty domain.",
      ip: "An IP address is not a domain.",
      local: "localhost cannot be audited.",
      invalid: "Invalid domain name.",
    },
  },
  thresholdGrade: (g, min) => `Grade ${g || "partial"} is below the ${min} threshold.`,
  thresholdFail: (m) => `Failed on --fail-on ${m}.`,
  help: `attackscout: public domain audit (grade A-F, SSL, DNS, email, deadlines)

Usage
  attackscout check <domain> [options]
  attackscout --help | --version

Options
  --json               Raw API result on standard output
  --fail-on <level>    none (default), ssl, email or any: exit 1 if a check of that group fails
  --min-grade <A..F>   Exit 1 if the grade is worse than this threshold (partial grade included)
  --lang <language>    fr, en, es, de, it or pt (fr or en texts; subscription link in that language)
  --api-url <address>  API address (default https://attackscout.com)
  --timeout <s>        Maximum delay in seconds (default 60)
  --no-color           No colors
  -h, --help           This help
  -v, --version        Version

Free API key: environment variable ATTACKSCOUT_API_KEY (never as an argument).
Create a key: ${KEYS_URL}

Exit codes: 0 ok, 1 problem (--fail-on / --min-grade), 2 usage, 3 API or network error, 4 quota reached.
`,
};

export const messages = (lang) => (lang === "fr" ? fr : en);
