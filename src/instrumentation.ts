/**
 * Runs once when the Next.js server starts. Triggers a non-blocking initial sync
 * so data populates immediately upon deployment. Does not await so a busy DB
 * during deployment doesn't block or crash the build.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const secret = process.env.CRON_SECRET;
  const url = `${base}/api/admin/sync?limit=10`;

  // Non-blocking: fire-and-forget so deployment doesn't hang or crash if DB is busy
  fetch(url, {
    method: "GET",
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    signal: AbortSignal.timeout(55_000),
  }).catch((e) => {
    console.warn("[instrumentation] Initial sync skipped:", e instanceof Error ? e.message : e);
  });
}
