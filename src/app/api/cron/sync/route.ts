import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runScraperSync } from "@/lib/sync-engine";

/** Allow up to 5 minutes for sync (CIEC + LEGISinfo + roster). Prevents midnight timeout. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const OUTDATED_HOURS = 24;

/** Returns true if the database has no members or last successful sync is older than OUTDATED_HOURS. */
async function shouldRunSync(): Promise<boolean> {
  const [memberCount, status] = await Promise.all([
    prisma.member.count(),
    prisma.appStatus.findUnique({
      where: { id: 1 },
      select: { lastSuccessfulSyncAt: true },
    }),
  ]);
  if (memberCount === 0) return true;
  const last = status?.lastSuccessfulSyncAt;
  if (!last) return true;
  const cutoff = new Date(Date.now() - OUTDATED_HOURS * 60 * 60 * 1000);
  return last < cutoff;
}

/**
 * GET /api/cron/sync — Vercel Cron endpoint for scheduled disclosure sync.
 * Auth: 
 *   - Authorization Bearer CRON_SECRET (if CRON_SECRET is set in Vercel)
 *   - OR x-vercel-id header present (Vercel internal request)
 *   - OR manual trigger with Bearer CRON_SECRET
 * Runs sync when DB is empty or last successful sync is older than 24h.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const vercelId = request.headers.get("x-vercel-id");
  const legacyCronHeader = request.headers.get("x-vercel-cron");
  
  // Check for Authorization header with CRON_SECRET (Vercel cron or manual)
  const hasValidAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;
  
  // Check if request is from Vercel (has Vercel-specific headers)
  // Vercel cron jobs will have x-vercel-id header
  const isVercelRequest = vercelId !== null || legacyCronHeader === "1";
  
  // Allow if: valid auth header OR Vercel request (for cron jobs)
  const isAuthorized = hasValidAuth || isVercelRequest;

  if (!isAuthorized) {
    console.log("Auth failed. Headers found:", Array.from(request.headers.keys()));
    console.log("Authorization header:", authHeader ? "present" : "missing");
    console.log("CRON_SECRET set:", !!cronSecret);
    console.log("x-vercel-id:", vercelId);
    console.log("x-vercel-cron:", legacyCronHeader);
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("Cron Triggered - hasValidAuth:", hasValidAuth, "isVercelRequest:", isVercelRequest);
  console.log("Current App URL:", process.env.NEXT_PUBLIC_APP_URL);

  try {
    const runSync = await shouldRunSync();
    if (!runSync) {
      return NextResponse.json(
        { ok: true, skipped: true, reason: "Database has data and a recent sync; skipping." },
        { status: 200 }
      );
    }

    const data = await runScraperSync();
    return NextResponse.json(data, { status: data.ok ? 200 : 500 });
  } catch (e) {
    console.error("[cron/sync] Sync failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync invocation failed" },
      { status: 500 }
    );
  }
}
