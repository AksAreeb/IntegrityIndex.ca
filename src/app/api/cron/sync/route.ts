import { NextResponse } from "next/server";

/** Allow up to 5 minutes for sync (CIEC + LEGISinfo + roster). Prevents midnight timeout. */
export const maxDuration = 300;

/**
 * GET /api/cron/sync — Vercel Cron endpoint for scheduled disclosure sync.
 * Secured by CRON_SECRET: Vercel sends Authorization: Bearer <CRON_SECRET>.
 * Invokes the institutional audit at /api/sync internally.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret) {
    console.error("[cron/sync] CRON_SECRET is not set");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 503 }
    );
  }

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader ?? "";
  if (token !== secret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const origin = new URL(request.url).origin;
    const syncRes = await fetch(`${origin}/api/sync`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
