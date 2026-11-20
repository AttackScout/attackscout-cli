import { failures } from "./evaluate.js";
import { pricingUrl } from "./i18n.js";

const SEVERITY_ORDER = ["blocking", "critical", "high", "medium", "low", "info"];
const rank = (f) => {
  const i = SEVERITY_ORDER.indexOf(f.severity);
  return i === -1 ? SEVERITY_ORDER.length : i;
};

/** Styles ANSI ; sans couleur, le texte est rendu tel quel. */
export function makeStyle(color) {
  const wrap = (code) => (s) => (color ? `\u001b[${code}m${s}\u001b[0m` : s);
  return { bold: wrap("1"), dim: wrap("2"), green: wrap("32"), red: wrap("31"), yellow: wrap("33") };
}

const detailsText = (details) => {
  const text = Object.entries(details ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  return text.length > 100 ? `${text.slice(0, 97)}...` : text;
};

const day = (iso) => String(iso).slice(0, 10);

/** Rapport lisible. opts : { m (textes), lang, color, unicode }. */
export function render(result, { m, lang, color, unicode }) {
  const s = makeStyle(color);
  const sym = unicode ? { ok: "✔", ko: "✘", unk: "?" } : { ok: "[OK]", ko: "[KO]", unk: "[?]" };
  const arrow = unicode ? "→" : "->";
  const lines = [];

  const grade = result.grade || "?";
  const gradeStyle = result.grade === "A" || result.grade === "B" ? s.green : result.grade === "C" ? s.yellow : s.red;
  lines.push(`${s.bold(result.domain)}  ${m.grade} ${s.bold(gradeStyle(grade))}${result.grade ? "" : ` (${m.partial})`}`);
  if (result.cached) lines.push(s.dim(m.cached));
  lines.push("");

  for (const family of ["tls", "dns", "email"]) {
    const own = result.findings.filter((f) => f.family === family && !f.superseded);
    const ko = own.filter((f) => f.status === "fail").length;
    const ok = own.filter((f) => f.status === "pass").length;
    const [mark, paint] = ko > 0 ? [sym.ko, s.red] : ok > 0 ? [sym.ok, s.green] : [sym.unk, s.yellow];
    lines.push(`${paint(mark)} ${m.families[family]}`);
  }
  const count = (status) => result.findings.filter((f) => f.status === status && !f.superseded).length;
  const failed = failures(result);
  lines.push("", m.summary(count("pass"), failed.length, count("unverifiable")));

  if (failed.length > 0) {
    lines.push("", s.bold(m.toFix));
    for (const f of [...failed].sort((a, b) => rank(a) - rank(b))) {
      const d = detailsText(f.details);
      lines.push(`  ${s.red(sym.ko)} ${f.id} ${f.code}${f.severity ? ` [${f.severity}]` : ""}${d ? ` ${s.dim(`(${d})`)}` : ""}`);
    }
  }
  const fixes = result.fixesToA ?? [];
  if (fixes.length > 0) {
    lines.push("", s.bold(m.toReachA));
    for (const fix of fixes) lines.push(`  ${arrow} ${fix}`);
  }
  const deadlines = result.deadlines ?? [];
  if (deadlines.length > 0) {
    lines.push("", s.bold(m.deadlines));
    for (const d of deadlines) {
      const mark = d.urgency === "now" ? s.red(sym.ko) : d.urgency === "ok" ? s.green(sym.ok) : s.yellow(sym.unk);
      lines.push(`  ${mark} ${day(d.date)}  ${d.control} ${d.code}`);
    }
  }
  lines.push("", `${m.subscribe}${pricingUrl(lang)}`, "");
  return lines.join("\n");
}
