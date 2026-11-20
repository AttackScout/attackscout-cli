// POST /api/v1/public/scans (200 cache, 201 nouvel audit). Retourne { ok: true, result }
// ou { ok: false, kind, status?, code?, retryAfter?, message? }.

export async function runScan({ apiUrl, apiKey, domain, timeoutSeconds, version, lang, fetchImpl = fetch }) {
  let res;
  try {
    res = await fetchImpl(`${apiUrl.replace(/\/+$/, "")}/api/v1/public/scans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Language": lang,
        "User-Agent": `AttackScout-CLI/${version}`,
      },
      body: JSON.stringify({ domain }),
      redirect: "error",
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });
  } catch (e) {
    if (e?.name === "TimeoutError") return { ok: false, kind: "timeout" };
    return { ok: false, kind: "network", message: e?.cause?.code ?? e?.cause?.message ?? e?.message ?? "error" };
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    // Corps absent ou non JSON : traité plus bas.
  }

  if (res.status === 200 || res.status === 201) {
    if (body && typeof body === "object" && Array.isArray(body.findings)) return { ok: true, result: body };
    return { ok: false, kind: "bad_response" };
  }
  const code = typeof body?.error?.code === "string" ? body.error.code : "";
  const err = { ok: false, status: res.status, code };
  if (res.status === 429) {
    const ra = res.headers.get("Retry-After");
    return { ...err, kind: "quota", retryAfter: ra && /^\d+$/.test(ra.trim()) ? Number(ra) : null };
  }
  if (code === "domain_excluded") return { ...err, kind: "excluded" };
  if (res.status === 401 || res.status === 403) return { ...err, kind: "key" };
  if (res.status === 422) return { ...err, kind: "domain" };
  return { ...err, kind: "api" };
}
