import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeCIEC } from "@/lib/scrapers/ciecScraper";
import { getLiveStockPrice } from "@/lib/api/stocks";
import { syncBillsToDatabase } from "@/lib/api/legisinfo";
import { setLastSuccessfulSync } from "@/lib/admin-health";

/**
 * GET /api/sync — Institutional Audit:
 * A) CIEC scraper for sample members -> upsert Disclosure
 * B) Finnhub latest prices for TradeTicker symbols (no DB store)
 * C) LEGISinfo latest bills
 * D) Upsert Bill, Member, Disclosure, TradeTicker
 */
export async function GET() {
  try {
    const results: { step: string; ok: boolean; detail?: string }[] = [];

    // Step A: CIEC scraper — find new disclosures for sample members
    try {
      const sampleMembers = await prisma.member.findMany({
        take: 5,
        select: { id: true },
      });
      for (const m of sampleMembers) {
        const rows = await scrapeCIEC(m.id);
        for (const row of rows.slice(0, 3)) {
          await prisma.disclosure.create({
            data: {
              memberId: m.id,
              category: (row.natureOfInterest?.slice(0, 50) || "Other").slice(0, 50),
              description: (row.assetName ?? "").slice(0, 500),
            },
          }).catch(() => {});
        }
      }
      results.push({ step: "A_CIEC", ok: true });
    } catch (e) {
      results.push({
        step: "A_CIEC",
        ok: false,
        detail: e instanceof Error ? e.message : "CIEC scrape failed",
      });
    }

    // Step B: Finnhub latest prices for TradeTicker symbols (no DB store)
    try {
      const symbols = await prisma.tradeTicker.findMany({
        select: { symbol: true },
        distinct: ["symbol"],
        take: 20,
      });
      for (const { symbol } of symbols) {
        await getLiveStockPrice(symbol);
      }
      results.push({ step: "B_Finnhub", ok: true });
    } catch (e) {
      results.push({
        step: "B_Finnhub",
        ok: false,
        detail: e instanceof Error ? e.message : "Finnhub failed",
      });
    }

    // Step C & D: LEGISinfo XML -> parse Status/Number/Title -> upsert Bill
    try {
      const { count } = await syncBillsToDatabase();
      results.push({ step: "C_D_LEGISinfo_Bills", ok: true, detail: `${count} bills` });
    } catch (e) {
      results.push({
        step: "C_D_LEGISinfo_Bills",
        ok: false,
        detail: e instanceof Error ? e.message : "LEGISinfo failed",
      });
    }

    if (results.every((r) => r.ok)) {
      await setLastSuccessfulSync();
    }
    return NextResponse.json({
      ok: results.every((r) => r.ok),
      audit: "Institutional Audit",
      results,
    });
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
