import { prisma } from "@/lib/db";
import {
  scrapeCIEC,
  getMemberPhotoUrl as getFederalPhotoUrl,
  looksLikeTickerSymbol,
} from "@/lib/scrapers/ciecScraper";
import { getLiveStockPrice } from "@/lib/api/stocks";
import { syncBillsToDatabase } from "@/lib/api/legisinfo";
import { setLastSuccessfulSync } from "@/lib/admin-health";
import { fetchFederalMembers } from "@/lib/sync";
import { fetchOntarioMpps } from "@/lib/scrapers/ontario";

const FEDERAL_TARGET = 343;
const ONTARIO_MPP_TARGET = 124;
const OLA_MPP_PHOTO_BASE =
  "https://www.ola.org/sites/default/files/styles/mpp_profile/public/mpp-photos";
const BATCH_SIZE = 10;
const TIME_LIMIT_MS = 50_000;

/** Ensure value is never "(not available)" or empty so Prisma does not receive invalid data. */
function normalizeMemberField(value: string | null | undefined, defaultVal: string): string {
  const s = (value ?? "").trim();
  if (!s || s === "(not available)" || s.toLowerCase() === "(not available)") return defaultVal;
  return s;
}

export type SyncResultStep = { step: string; ok: boolean; detail?: string };

export type RunScraperSyncResult = {
  ok: boolean;
  audit: string;
  results: SyncResultStep[];
};

/**
 * Runs the full institutional audit sync:
 * A) CIEC scraper -> Disclosure + TradeTicker
 * B) Finnhub latest prices
 * C&D) LEGISinfo bills
 * E) Roster audit (Federal MPs + Ontario MPPs)
 */
export async function runScraperSync(): Promise<RunScraperSyncResult> {
  const startTime = Date.now();
  const results: SyncResultStep[] = [];

  // Step A: CIEC scraper — disclosures + Material Change -> TradeTicker (date_disclosed)
  try {
    const sampleMembers = await prisma.member.findMany({
      take: 5,
      select: { id: true },
    });
    let tradeTickersCreated = 0;
    for (const m of sampleMembers) {
      if (Date.now() - startTime > TIME_LIMIT_MS) {
        console.log("Time limit approaching, saving partial progress");
        break;
      }
      const rows = await scrapeCIEC(m.id);
      for (const row of rows.slice(0, 3)) {
        const category = normalizeMemberField(row.natureOfInterest, "Other").slice(0, 50);
        const description = normalizeMemberField(row.assetName, "").slice(0, 500) || "—";
        await prisma.disclosure
          .create({
            data: {
              memberId: m.id,
              category,
              description,
            },
          })
          .catch(() => {});

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

  // Step E: Roster audit — ensure 343 Federal MPs and 124 Ontario MPPs; fetch and upsert in batches
  try {
    const [federalCount, provincialCount] = await Promise.all([
      prisma.member.count({ where: { jurisdiction: "FEDERAL" } }),
      prisma.member.count({ where: { jurisdiction: "PROVINCIAL" } }),
    ]);
    if (federalCount < FEDERAL_TARGET) {
      const federal = await fetchFederalMembers();
      let federalUpserted = 0;
      for (let i = 0; i < federal.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > TIME_LIMIT_MS) {
          console.log("Time limit approaching, saving partial progress");
          break;
        }
        const batch = federal.slice(i, i + BATCH_SIZE);
        for (const mp of batch) {
          const name = normalizeMemberField(mp.name, "Unknown");
          const riding = normalizeMemberField(mp.riding, "Unknown");
          const party = normalizeMemberField(mp.party, "Independent");
          await prisma.member
            .upsert({
              where: { id: mp.id },
              create: {
                id: mp.id,
                name,
                riding,
                party,
                jurisdiction: "FEDERAL",
                chamber: "House of Commons",
                photoUrl: getFederalPhotoUrl(mp.id),
              },
              update: { name, riding, party, photoUrl: getFederalPhotoUrl(mp.id) },
            })
            .then(() => { federalUpserted += 1; })
            .catch((err) => console.warn("[sync-engine] Federal member upsert failed:", mp.id, err));
        }
      }
      results.push({
        step: "E_Roster_Federal",
        ok: true,
        detail: federalUpserted < federal.length
          ? `${federalUpserted} federal MPs upserted (time limit; target ${FEDERAL_TARGET})`
          : `${federalUpserted} federal MPs (target ${FEDERAL_TARGET})`,
      });
    } else {
      results.push({ step: "E_Roster_Federal", ok: true, detail: `already ${federalCount} federal` });
    }
    if (provincialCount < ONTARIO_MPP_TARGET) {
      let ontario: Awaited<ReturnType<typeof fetchOntarioMpps>> = [];
      try {
        ontario = await fetchOntarioMpps();
      } catch (ontarioErr) {
        console.warn("[sync-engine] Ontario MPP fetch failed (continuing without Ontario):", ontarioErr);
      }
      let ontarioUpserted = 0;
      for (let i = 0; i < ontario.length; i += BATCH_SIZE) {
        if (Date.now() - startTime > TIME_LIMIT_MS) {
          console.log("Time limit approaching, saving partial progress");
          break;
        }
        const batch = ontario.slice(i, i + BATCH_SIZE);
        for (const mpp of batch) {
          const name = normalizeMemberField(mpp.name, "Unknown");
          const riding = normalizeMemberField(mpp.riding, "Unknown");
          const party = normalizeMemberField(mpp.party, "Independent");
          const slug = mpp.id.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          const photoUrl =
            (mpp as { imageUrl?: string }).imageUrl?.trim() ||
            `${OLA_MPP_PHOTO_BASE}/${encodeURIComponent(slug)}.jpg`;
          await prisma.member
            .upsert({
              where: { id: mpp.id },
              create: {
                id: mpp.id,
                name,
                riding,
                party,
                jurisdiction: "PROVINCIAL",
                chamber: "Legislative Assembly",
                photoUrl,
              },
              update: { name, riding, party, photoUrl },
            })
            .then(() => { ontarioUpserted += 1; })
            .catch((err) => console.warn("[sync-engine] Ontario MPP upsert failed:", mpp.id, err));
        }
      }
      results.push({
        step: "E_Roster_Ontario",
        ok: true,
        detail: ontarioUpserted < ontario.length
          ? `${ontarioUpserted} Ontario MPPs upserted (time limit; target ${ONTARIO_MPP_TARGET})`
          : `${ontarioUpserted} Ontario MPPs (target ${ONTARIO_MPP_TARGET})`,
      });
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

  return {
    ok: results.every((r) => r.ok),
    audit: "Institutional Audit",
    results,
  };
}
