// Seuils de sortie : --fail-on (ssl | email | any) et --min-grade (A..F).

const FAMILY_OF = { ssl: "tls", email: "email" };

/** Constats en échec, hors constats remplacés. */
export const failures = (result) => result.findings.filter((f) => f.status === "fail" && !f.superseded);

/** Retourne la liste des raisons d'échec (vide : code 0), sous forme de fonctions des textes. */
export function evaluate(result, { failOn, minGrade }) {
  const reasons = [];
  const failed = failures(result);
  if (failOn === "any" ? failed.length > 0 : failOn !== "none" && failed.some((f) => f.family === FAMILY_OF[failOn])) {
    reasons.push((m) => m.thresholdFail(failOn));
  }
  if (minGrade !== "") {
    const grade = result.grade;
    // Note vide (partielle) : on ne peut pas affirmer que le seuil est tenu.
    if (grade === "" || grade > minGrade) reasons.push((m) => m.thresholdGrade(grade, minGrade));
  }
  return reasons;
}
