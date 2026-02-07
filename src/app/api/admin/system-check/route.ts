/**
 * Super Sync — Hidden admin route for High-Trust isolated environment.
 * Runs sync and/or verification. Use ?task= to run one province or one data type
 * at a time so execution stays under Vercel's 60s limit and avoids connection timeouts.
 *
 * Examples:
 *   GET /api/admin/system-check?task=legislation  — LEGISinfo bills only
 *   GET /api/admin/system-check?task=federal       — Federal roster only
 *   GET /api/admin/system-check?task=provincial   — Ontario roster only
 *   GET /api/admin/system-check?task=verification — Verification only (no sync)
 *   GET /api/admin/system-check                   — Full sync + verify (may timeout)
 *
 * Security: Authorization header must match process.env.CRON_SECRET (Bearer token).
 */
import { NextResponse } from "next/server";
import type { SyncTask } from "@/lib/sync-engine";
import { runScraperSync } from "@/lib/sync-engine";
import { runVerifySync } from "@/lib/verify-sync";

export const maxDuration = 60; // Vercel Hobby plan maximum (seconds)
export const dynamic = "force-dynamic";

const VALID_TASKS: SyncTask[] = [
  "legislation",
  "federal",
  "provincial",
  "ciec",
  "finnhub",
  "committees",
  "integrity",
  "full",
];

/** Compare Authorization header to CRON_SECRET; return 401 if missing or mismatch. */
function requireCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

type TaskParam = SyncTask | "verification" | null;
type TaskParamResult = { task: TaskParam; invalid?: boolean };

function getTask(request: Request): TaskParamResult {
  const url = new URL(request.url);
  const t = url.searchParams.get("task")?.toLowerCase().trim();
  if (!t) return { task: null };
  if (t === "verification") return { task: "verification" };
  if (VALID_TASKS.includes(t as SyncTask)) return { task: t as SyncTask };
  return { task: null, invalid: true };
}

async function runSuperSync(request: Request) {
  const startAt = new Date().toISOString();
  const { task, invalid } = getTask(request);

  if (invalid) {
    return NextResponse.json(
      {
        error: "Invalid task",
        allowed: ["legislation", "federal", "provincial", "ciec", "finnhub", "committees", "integrity", "verification", "full"],
      },
      { status: 400 }
    );
  }

  // Verification only — no sync (fast, stays under 60s)
  if (task === "verification") {
    try {
      const verifyReport = await runVerifySync();
      const report = {
        ok: verifyReport.ok,
        startAt,
        completedAt: new Date().toISOString(),
        task: "verification",
        sync: null,
        verification: verifyReport,
        summary: verifyReport.ok
          ? "Verification completed; all integrity checks passed."
          : `Verification failed: ${verifyReport.summary}`,
      };
      return NextResponse.json(report, { status: report.ok ? 200 : 207 });
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          startAt,
          completedAt: new Date().toISOString(),
          task: "verification",
          error: e instanceof Error ? e.message : "Verification failed",
          summary: "Verification failed.",
        },
        { status: 500 }
      );
    }
  }

  // Single-task or full sync
  try {
    const syncOptions =
      task && task !== "full"
        ? { noTimeLimit: true, task }
        : { noTimeLimit: true };
    const syncResult = await runScraperSync(syncOptions);
    const verifyReport = await runVerifySync();
    const report = {
      ok: syncResult.ok && verifyReport.ok,
      startAt,
      completedAt: new Date().toISOString(),
      ...(task && task !== "full" && { task }),
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
        ...(task && task !== "full" && { task }),
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
  return runSuperSync(request);
}

export async function POST(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;
  return runSuperSync(request);
}
