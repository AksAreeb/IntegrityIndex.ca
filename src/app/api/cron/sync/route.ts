import { NextResponse } from "next/server";

/** Allow up to 5 minutes for sync (CIEC + LEGISinfo + roster). Prevents midnight timeout. */
export const maxDuration = 300;

const SYNC_URL = "https://integrityindex.ca/api/sync";

/**
 * GET /api/cron/sync — Vercel Cron endpoint for scheduled disclosure sync.
 * Secured by Vercel's native cron header: x-vercel-cron === '1'.
 * Invokes the institutional audit at /api/sync with Bearer CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const vercelCron = request.headers.get("x-vercel-cron");

  if (!secret) {
    console.error("[cron/sync] CRON_SECRET is not set");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 503 }
    );
  }

  // Verify request came from Vercel's scheduler (native cron header)
  if (vercelCron !== "1") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const syncRes = await fetch(SYNC_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
      cache: "no-store",
    });
    const data = await syncRes.json().catch(() => ({}));
    return NextResponse.json({
      ok: syncRes.ok,
      status: syncRes.status,
      audit: data.audit,
      results: data.results,
      error: data.error,
    }, { status: syncRes.ok ? 200 : syncRes.status });
  } catch (e) {
    console.error("[cron/sync] Invocation failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync invocation failed" },
      { status: 500 }
    );
  }
}
