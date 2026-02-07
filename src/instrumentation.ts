/**
 * Next.js Instrumentation — Runs once when the Node.js server starts.
 * 1. Seed check: throws if Sector or Committee tables are empty.
 * 2. Slug backfill: generates slugs for members missing them.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (!process.env.DATABASE_URL) return; // Skip during build or when DB not configured

  const { ensureSeedData } = await import("@/lib/seed-check");
  await ensureSeedData();

  try {
    const { backfillSlugsForMembers } = await import("@/lib/db-utils");
    const { updated } = await backfillSlugsForMembers();
    if (updated > 0) {
      console.log(`[instrumentation] Backfilled ${updated} member slug(s)`);
    }
  } catch (e) {
    console.warn("[instrumentation] Slug backfill failed (non-fatal):", e);
  }
}
