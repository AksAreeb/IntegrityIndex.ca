import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  scrapeCIEC,
  getMemberPhotoUrl as getFederalPhotoUrl,
  dryRunCIEC,
  looksLikeTickerSymbol,
} from "@/lib/scrapers/ciecScraper";
import { getLiveStockPrice } from "@/lib/api/stocks";
import { syncBillsToDatabase } from "@/lib/api/legisinfo";
import { setLastSuccessfulSync } from "@/lib/admin-health";
import { fetchFederalMembers } from "@/lib/sync";
import { fetchOntarioMpps } from "@/lib/api/ontario-mpps";

const FEDERAL_TARGET = 343;
const ONTARIO_MPP_TARGET = 124;
const OLA_MPP_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/styles/mpp_profile/public/mpp-photos";

/**
 * GET /api/sync — Institutional Audit:
 * ?dryRun=ciec — Only run CIEC dry run (verify connectivity to prciec-rpccie.parl.gc.ca).
 * Otherwise:
 * A) CIEC scraper for sample members -> upsert Disclosure
 * B) Finnhub latest prices for TradeTicker symbols (no DB store)
 * C) LEGISinfo latest bills
 * D) Upsert Bill, Member, Disclosure, TradeTicker
 */
export async function GET(request: Request) {
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

    const results: { step: string; ok: boolean; detail?: string }[] = [];

    // Step A: CIEC scraper — disclosures + Material Change -> TradeTicker (date_disclosed)
    try {
      const sampleMembers = await prisma.member.findMany({
        take: 5,
        select: { id: true },
      });
      let tradeTickersCreated = 0;
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

          if (row.isMaterialChange && row.date_disclosed && looksLikeTickerSymbol(row.assetName ?? "")) {
            const symbol = (row.assetName ?? "").trim().toUpperCase();
            const disclosureDate = new Date(row.date_disclosed + "T12:00:00Z");
            if (!Number.isNaN(disclosureDate.getTime())) {
              await prisma.tradeTicker.create({
                data: {
                  memberId: m.id,
                  symbol,
                  type: "BUY",
                  date: disclosureDate,
                },
              }).then(() => { tradeTickersCreated += 1; }).catch(() => {});
            }
          }
        }
      }
      results.push({ step: "A_CIEC", ok: true, detail: tradeTickersCreated ? `${tradeTickersCreated} trade(s) from material changes` : undefined });
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

    // Step E: Roster audit — ensure 343 Federal MPs and 124 Ontario MPPs; fetch and upsert if short
    try {
      const [federalCount, provincialCount] = await Promise.all([
        prisma.member.count({ where: { jurisdiction: "FEDERAL" } }),
        prisma.member.count({ where: { jurisdiction: "PROVINCIAL" } }),
      ]);
      if (federalCount < FEDERAL_TARGET) {
        const federal = await fetchFederalMembers();
        for (const mp of federal) {
          await prisma.member.upsert({
            where: { id: mp.id },
            create: {
              id: mp.id,
              name: mp.name,
              riding: mp.riding,
              party: mp.party,
              jurisdiction: "FEDERAL",
              chamber: "House of Commons",
              photoUrl: getFederalPhotoUrl(mp.id),
            },
            update: { name: mp.name, riding: mp.riding, party: mp.party, photoUrl: getFederalPhotoUrl(mp.id) },
          });
        }
        results.push({ step: "E_Roster_Federal", ok: true, detail: `${federal.length} federal MPs (target ${FEDERAL_TARGET})` });
      } else {
        results.push({ step: "E_Roster_Federal", ok: true, detail: `already ${federalCount} federal` });
      }
      if (provincialCount < ONTARIO_MPP_TARGET) {
        const ontario = await fetchOntarioMpps();
        for (const mpp of ontario) {
          const slug = mpp.id.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          const photoUrl = `${OLA_MPP_PHOTO_BASE}/${encodeURIComponent(slug)}.jpg`;
          await prisma.member.upsert({
            where: { id: mpp.id },
            create: {
              id: mpp.id,
              name: mpp.name,
              riding: mpp.riding,
              party: mpp.party,
              jurisdiction: "PROVINCIAL",
              chamber: "Legislative Assembly",
              photoUrl,
            },
            update: { name: mpp.name, riding: mpp.riding, party: mpp.party, photoUrl },
          });
        }
        results.push({ step: "E_Roster_Ontario", ok: true, detail: `${ontario.length} Ontario MPPs (target ${ONTARIO_MPP_TARGET})` });
      } else {
        results.push({ step: "E_Roster_Ontario", ok: true, detail: `already ${provincialCount} provincial` });
      }
    } catch (e) {
      results.push({
        step: "E_Roster",
        ok: false,
        detail: e instanceof Error ? e.message : "Roster fetch failed",
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
