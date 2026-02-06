import { NextResponse } from "next/server";

/** Allow up to 5 minutes for sync (CIEC + LEGISinfo + roster). Prevents midnight timeout. */
export const maxDuration = 300;

const FALLBACK_APP_URL = "https://integrityindex.ca";

/**
 * GET /api/cron/sync — Vercel Cron endpoint for scheduled disclosure sync.
 * Secured by CRON_SECRET: Vercel sends Authorization: Bearer <CRON_SECRET>.
 * Invokes the institutional audit at /api/sync internally, forwarding the same secret.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const expectedAuth = secret ? `Bearer ${secret}` : null;

  if (!secret) {
    console.error("[cron/sync] CRON_SECRET is not set");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 503 }
    );
  }

  // Verify root secret: Authorization must exactly match Bearer <CRON_SECRET>
  if (authHeader !== expectedAuth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (typeof process.env.VERCEL_URL === "string" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : FALLBACK_APP_URL);

  try {
    const syncRes = await fetch(`${baseUrl}/api/sync`, {
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
