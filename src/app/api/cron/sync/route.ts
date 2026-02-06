import { NextResponse } from "next/server";
import { runScraperSync } from "@/lib/sync-engine";

/** Allow up to 5 minutes for sync (CIEC + LEGISinfo + roster). Prevents midnight timeout. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/sync — Vercel Cron endpoint for scheduled disclosure sync.
 * Auth: x-vercel-cron === '1' (Vercel) OR Bearer CRON_SECRET (manual).
 * Runs the sync engine directly (no internal fetch).
 */
export async function GET(request: Request) {
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const isManual = request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !isManual) {
    console.log("Auth failed. Headers found:", Array.from(request.headers.keys()));
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("Cron Triggered - isVercelCron:", isVercelCron);
  console.log("Current App URL:", process.env.NEXT_PUBLIC_APP_URL);

  try {
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
