import { NextResponse } from "next/server";
import { dryRunCIEC } from "@/lib/scrapers/ciecScraper";
import { runScraperSync } from "@/lib/sync-engine";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * GET /api/sync — Institutional Audit (manual sync or dry run).
 * Auth: Bearer CRON_SECRET.
 * ?dryRun=ciec — Only run CIEC dry run. Otherwise runs full sync via runScraperSync().
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Engine Authentication Failed" },
      { status: 401 }
    );
  }
  console.log("Engine Authenticated Successfully");

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("dryRun") === "ciec") {
      const dryRun = await dryRunCIEC();
      return NextResponse.json({
        ok: dryRun.ok,
        dryRun: "ciec",
        ciec: dryRun,
      });
    }

    const data = await runScraperSync();
    return NextResponse.json(data, { status: data.ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
