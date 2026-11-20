import { LANGS } from "./i18n.js";

const VALUE_OPTIONS = new Set(["--fail-on", "--min-grade", "--lang", "--api-url", "--timeout"]);
const FLAGS = new Set(["--json", "--no-color", "--help", "--version", "-h", "-v"]);

/**
 * Analyse de la ligne de commande. Retourne { help, version } ou { error: (usage) => texte, lang }
 * ou { domainInput, opts }. Aucune lecture d'environnement ici.
 */
export function parseArgs(argv) {
  const opts = { json: false, color: true, failOn: "none", minGrade: "", lang: "en", apiUrl: "https://attackscout.com", timeout: 60 };
  const positional = [];
  let help = false;
  let version = false;
  let error = null;
  const fail = (fn) => {
    error ??= fn;
  };

  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    let value;
    const eq = arg.startsWith("--") ? arg.indexOf("=") : -1;
    if (eq > 0) {
      value = arg.slice(eq + 1);
      arg = arg.slice(0, eq);
    }
    if (VALUE_OPTIONS.has(arg)) {
      if (value === undefined) {
        if (i + 1 >= argv.length) {
          fail((u) => u.needsValue(arg));
          continue;
        }
        value = argv[++i];
      }
      if (arg === "--fail-on") {
        if (["none", "ssl", "email", "any"].includes(value)) opts.failOn = value;
        else fail((u) => u.badFailOn);
      } else if (arg === "--min-grade") {
        if (/^[A-Fa-f]$/.test(value)) opts.minGrade = value.toUpperCase();
        else fail((u) => u.badGrade);
      } else if (arg === "--lang") {
        if (LANGS.includes(value)) opts.lang = value;
        else fail((u) => u.badLang);
      } else if (arg === "--timeout") {
        const n = Number(value);
        if (/^\d+(\.\d+)?$/.test(value) && n >= 1 && n <= 600) opts.timeout = n;
        else fail((u) => u.badTimeout);
      } else {
        opts.apiUrl = value;
      }
    } else if (FLAGS.has(arg) && value === undefined) {
      if (arg === "--json") opts.json = true;
      else if (arg === "--no-color") opts.color = false;
      else if (arg === "--help" || arg === "-h") help = true;
      else version = true;
    } else if (arg.startsWith("-") && arg !== "-") {
      fail((u) => u.unknownOption(arg));
    } else {
      positional.push(arg);
    }
  }

  if (help) return { help: true, lang: opts.lang };
  if (version) return { version: true };
  if (error) return { error, lang: opts.lang };
  const [command, ...rest] = positional;
  if (command === undefined) return { help: true, lang: opts.lang, usageError: true };
  if (command !== "check") return { error: (u) => u.unknownCommand(command), lang: opts.lang };
  if (rest.length === 0) return { error: (u) => u.needsDomain, lang: opts.lang };
  if (rest.length > 1) return { error: (u) => u.oneDomain, lang: opts.lang };
  return { domainInput: rest[0], opts };
}
