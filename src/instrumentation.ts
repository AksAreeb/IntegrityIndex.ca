/**
 * Runs once when the Next.js server starts. Triggers a small initial sync
 * so the first request doesn't hit an empty roster. Wrapped in try/catch so
 * a busy database during deployment doesn't crash the build.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const base =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const secret = process.env.CRON_SECRET;
    const url = `${base}/api/admin/sync?limit=5`;
    const res = await fetch(url, {
      method: "GET",
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) {
      console.warn("[instrumentation] Initial sync returned", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    console.warn("[instrumentation] Initial sync skipped (database busy or unavailable):", e instanceof Error ? e.message : e);
  }
}
