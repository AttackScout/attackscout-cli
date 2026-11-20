import { readFileSync } from "node:fs";
import { parseArgs } from "./args.js";
import { runScan } from "./api.js";
import { normalizeDomain } from "./domain.js";
import { evaluate } from "./evaluate.js";
import { KEYS_URL, messages } from "./i18n.js";
import { render } from "./render.js";

export const VERSION = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

export const EXIT = { ok: 0, problem: 1, usage: 2, api: 3, quota: 4 };

const isLoopback = (host) => host === "localhost" || host === "127.0.0.1" || host === "[::1]";

function checkApiUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol === "https:" || (url.protocol === "http:" && isLoopback(url.hostname))) {
    return url.origin + url.pathname.replace(/\/+$/, "");
  }
  return null;
}

/** UTF-8 déclaré par l'environnement, ou terminal Windows moderne. */
function supportsUnicode(env, platform) {
  const locale = env.LC_ALL || env.LC_CTYPE || env.LANG || "";
  if (/utf-?8/i.test(locale)) return true;
  return platform === "win32" && Boolean(env.WT_SESSION || env.TERM_PROGRAM);
}

/**
 * Exécute la commande. Retourne le code de sortie. La clé d'API n'est lue que dans
 * env.ATTACKSCOUT_API_KEY, n'est jamais affichée et rien n'est écrit sur le disque.
 */
export async function run(argv, { env, stdout, stderr, platform = "linux", fetchImpl }) {
  const out = (t) => stdout.write(`${t}\n`);
  const err = (t) => stderr.write(`${t}\n`);
  const parsed = parseArgs(argv);

  if (parsed.version) {
    out(VERSION);
    return EXIT.ok;
  }
  const m = messages(parsed.lang ?? parsed.opts?.lang);
  if (parsed.help) {
    (parsed.usageError ? stderr : stdout).write(m.help);
    return parsed.usageError ? EXIT.usage : EXIT.ok;
  }
  if (parsed.error) {
    err(parsed.error(m.usage));
    err(m.usageTitle);
    return EXIT.usage;
  }

  const { domainInput, opts } = parsed;
  const norm = normalizeDomain(domainInput);
  if (norm.error) {
    err(m.usage.domain[norm.error]);
    return EXIT.usage;
  }
  const apiUrl = checkApiUrl(opts.apiUrl);
  if (apiUrl === null) {
    err(m.usage.badApiUrl);
    return EXIT.usage;
  }

  const apiKey = (env.ATTACKSCOUT_API_KEY ?? "").trim();
  if (apiKey === "") {
    err(m.missingKey);
    err(`${m.createKey} : ${KEYS_URL}`);
    err(m.exportHint);
    err("  export ATTACKSCOUT_API_KEY=...");
    return EXIT.usage;
  }
  if (!/^[\x21-\x7e]+$/.test(apiKey)) {
    err(m.usage.badKey);
    return EXIT.usage;
  }

  const res = await runScan({
    apiUrl,
    apiKey,
    domain: norm.domain,
    timeoutSeconds: opts.timeout,
    version: VERSION,
    lang: opts.lang,
    fetchImpl,
  });
  if (!res.ok) return reportFailure(res, m, opts, err);

  const reasons = evaluate(res.result, opts);
  if (opts.json) {
    out(JSON.stringify(res.result, null, 2));
  } else {
    const color = opts.color && !env.NO_COLOR && Boolean(stdout.isTTY) && env.TERM !== "dumb";
    const unicode = !env.NO_COLOR && supportsUnicode(env, platform);
    stdout.write(render(res.result, { m, lang: opts.lang, color, unicode }));
  }
  for (const reason of reasons) err(reason(m));
  return reasons.length > 0 ? EXIT.problem : EXIT.ok;
}

function reportFailure(res, m, opts, err) {
  switch (res.kind) {
    case "quota":
      err(m.quota);
      err(res.retryAfter === null ? m.retryUnknown : m.retryAfter(res.retryAfter));
      return EXIT.quota;
    case "key":
      err(m.keyInvalid);
      err(`${m.keyInvalidHint}${KEYS_URL}`);
      return EXIT.api;
    case "excluded":
      err(m.excluded);
      return EXIT.api;
    case "domain":
      err(m.invalidDomainApi);
      return EXIT.api;
    case "timeout":
      err(m.timeout(opts.timeout));
      return EXIT.api;
    case "network":
      err(m.network(res.message));
      return EXIT.api;
    case "bad_response":
      err(m.badResponse);
      return EXIT.api;
    default:
      err(m.apiError(res.status, res.code));
      return EXIT.api;
  }
}
