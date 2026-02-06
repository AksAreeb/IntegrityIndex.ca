/**
 * Post-build script: trigger /api/cron/sync so the first request after deploy
 * runs sync when DB is empty or outdated. Runs at end of Vercel build; may hit
 * the new deployment if it is already live. Non-fatal so build never fails.
 */
const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
const secret = process.env.CRON_SECRET;

if (!baseUrl || !secret) {
  console.log("[trigger-sync] Skip: NEXT_PUBLIC_APP_URL/VERCEL_URL and CRON_SECRET must be set");
  process.exit(0);
  return;
}

const url = `${baseUrl.replace(/\/$/, "")}/api/cron/sync`;
console.log("[trigger-sync] Calling", url.replace(secret, "[REDACTED]"));

fetch(url, {
  method: "GET",
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(10_000),
})
  .then((r) => {
    console.log("[trigger-sync] Status:", r.status);
    return r.text();
  })
  .then((body) => console.log("[trigger-sync] Body:", body.slice(0, 200)))
  .catch((e) => console.warn("[trigger-sync] Request failed (non-fatal):", e.message))
  .finally(() => process.exit(0));
