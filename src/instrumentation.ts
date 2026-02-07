const INSTRUMENTATION_DB_TIMEOUT_MS = 15_000;

/**
 * Next.js Instrumentation — Runs once when the Node.js server starts.
 * 1. Seed check: if Sector or Committee tables are empty, ensure seed data (guarded by try/catch + timeout).
 * 2. Slug backfill: generates slugs for members missing them.
 * DB operations are wrapped in try/catch with a timeout so an unavailable DB during build/boot does not crash the deployment.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return; // Skip during build or when DB not configured

  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Database operation timed out after ${ms}ms`)), ms)
      ),
    ]);

  try {
    const { ensureSeedData } = await import("@/lib/seed-check");
    await withTimeout(ensureSeedData(), INSTRUMENTATION_DB_TIMEOUT_MS);
  } catch (e) {
    console.warn("[instrumentation] Seed check failed (DB may be unavailable during build/boot):", e instanceof Error ? e.message : e);
    return; // Do not block deployment; skip slug backfill if seed check failed
  }

  try {
    const { backfillSlugsForMembers } = await import("@/lib/db-utils");
    const { updated } = await withTimeout(backfillSlugsForMembers(), INSTRUMENTATION_DB_TIMEOUT_MS);
    if (updated > 0) {
      console.log(`[instrumentation] Backfilled ${updated} member slug(s)`);
    }
  } catch (e) {
    console.warn("[instrumentation] Slug backfill failed (non-fatal):", e instanceof Error ? e.message : e);
  }
}
