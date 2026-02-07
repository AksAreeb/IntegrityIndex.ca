/**
 * Super Sync — Hidden admin route for High-Trust isolated environment.
 * Runs ALL scrapers (Federal MP, Provincial MPP, Bills, Stock Tickers, The Pulse)
 * in a linear await chain. Does not return until every promise is resolved.
 * After sync, runs verify-sync and returns a detailed Sync Report.
 *
 * Security: Authorization header must match process.env.CRON_SECRET (Bearer token).
 * Scrapers only run when triggered by Vercel cron or an authorized admin.
 */
import { NextResponse } from "next/server";
import { runScraperSync } from "@/lib/sync-engine";
import { runVerifySync } from "@/lib/verify-sync";

export const maxDuration = 600; // 10 min for full Super Sync
export const dynamic = "force-dynamic";

/** Compare Authorization header to CRON_SECRET; return 401 if missing or mismatch. */
function requireCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function runSuperSync() {
  const startAt = new Date().toISOString();
  try {
    const syncResult = await runScraperSync({ noTimeLimit: true });
    const verifyReport = await runVerifySync();
    const report = {
      ok: syncResult.ok && verifyReport.ok,
      startAt,
      completedAt: new Date().toISOString(),
      sync: {
        ok: syncResult.ok,
        audit: syncResult.audit,
        steps: syncResult.results,
      },
      verification: verifyReport,
      summary: verifyReport.ok
        ? "Super Sync completed; all integrity checks passed."
        : `Super Sync completed; verification failed: ${verifyReport.summary}`,
    };
    return NextResponse.json(report, { status: report.ok ? 200 : 207 });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        startAt,
        completedAt: new Date().toISOString(),
        error: e instanceof Error ? e.message : "Super Sync failed",
        summary: "Super Sync failed before verification.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;
  return runSuperSync();
}

export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;
  return runSuperSync();
}
