/**
 * Sync CLI — Master Controller for 2026 disclosure sync.
 * Phase 1: Discover 45th Parliament members (OurCommons) → fill Member table.
 * Phase 2: CIEC disclosure sync for all federal members → disclosures + ticker.
 * Run: npm run sync:once (triggered by npm run dev)
 */
import "dotenv/config";
import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { discoverMembers } from "../src/lib/scrapers/memberScraper";
import { scrapeCIEC } from "../src/lib/scrapers/ciecScraper";
import { getMemberPhotoUrl } from "../src/lib/scrapers/ciecScraper";
import { parseFederalMembersFromJson } from "../src/lib/sync";
import {
  fetchLegisinfoOverview,
  syncBillsToDatabase,
} from "../src/lib/api/legisinfo";
import { getLiveStockPrice, extractTickerSymbolsFromText } from "../src/lib/api/stocks";

const FEDERAL_CHAMBER = "House of Commons";
const JURISDICTION_FEDERAL = "FEDERAL";
const SAFE_ROSTER_PATH = path.join(process.cwd(), "public", "members_safe_roster.json");

/**
 * Fallback: load members from public/members_safe_roster.json and upsert into Member table
 * so Phase 2 can continue when OurCommons API is unreachable.
 */
async function discoverMembersFromRosterFile(): Promise<number> {
  try {
    const buf = readFileSync(SAFE_ROSTER_PATH, "utf-8");
    const json = JSON.parse(buf) as unknown;
    const records = parseFederalMembersFromJson(json);
    if (records.length === 0) return 0;
    for (const mp of records) {
      const id = mp.id.trim() || `${mp.name}-${mp.riding}`.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      await prisma.member.upsert({
        where: { id },
        create: {
          id,
          name: mp.name,
          riding: mp.riding,
          party: mp.party,
          jurisdiction: JURISDICTION_FEDERAL,
          chamber: FEDERAL_CHAMBER,
          photoUrl: getMemberPhotoUrl(id),
        },
        update: {
          name: mp.name,
          riding: mp.riding,
          party: mp.party,
          photoUrl: getMemberPhotoUrl(id),
        },
      });
    }
    console.log(`[Sync] Fallback: upserted ${records.length} federal MP(s) from ${SAFE_ROSTER_PATH}\n`);
    return records.length;
  } catch (e) {
    console.warn("[Sync] Fallback roster read failed:", e instanceof Error ? e.message : e);
    return 0;
  }
}

async function main() {
  console.log("\n🚀 Starting 2026 Disclosure Sync...\n");

  // ——— Phase 1: Member Discovery (OurCommons 45th Parliament) ———
  console.log("========== Phase 1: Member Discovery (OurCommons) ==========\n");
  let memberCount = 0;
  try {
    memberCount = await discoverMembers();
    console.log(`[Sync] Discovered and upserted ${memberCount} federal MP(s).\n`);
  } catch (e) {
    console.warn(
      "⚠️ Member Discovery API unreachable. Falling back to local roster.\n",
      e instanceof Error ? e.message : e
    );
    memberCount = await discoverMembersFromRosterFile();
  }

  if (memberCount === 0) {
    console.warn(
      "⚠️ Member Discovery API unreachable. Falling back to local roster.\n[Sync] No federal members from API; trying public/members_safe_roster.json..."
    );
    memberCount = await discoverMembersFromRosterFile();
    if (memberCount === 0) {
      console.log("[Sync] No federal members found. Check OurCommons export or add public/members_safe_roster.json.");
      return;
    }
  }

  // ——— Phase 2: CIEC — loop through Member table we just filled ———
  const federalMembers = await prisma.member.findMany({
    where: { jurisdiction: "FEDERAL" },
    orderBy: { id: "asc" },
    select: { id: true, name: true, riding: true },
  });

  console.log("========== Phase 2: CIEC Disclosure Sync ==========\n");
  console.log(`[Sync] Running CIEC scraper for ${federalMembers.length} federal member(s).\n`);

  const tickerSymbolsFromSync = new Set<string>();

  const delayMs = 150;
  for (let idx = 0; idx < federalMembers.length; idx++) {
    const mp = federalMembers[idx];
    if (idx > 0) await new Promise((r) => setTimeout(r, delayMs));
    console.log(`[CIEC] [${idx + 1}/${federalMembers.length}] ${mp.name} (${mp.riding}) [${mp.id}]...`);

    try {
      const rows = await scrapeCIEC(mp.name);
      console.log(`[CIEC]   → Received ${rows.length} row(s) from CIEC`);

      const beforeCount = await prisma.disclosure.count({ where: { memberId: mp.id } });
      let saved = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const category = (row.natureOfInterest?.slice(0, 50) || "Other").slice(0, 50);
        const description = (row.assetName ?? "").slice(0, 500);
        for (const sym of extractTickerSymbolsFromText(description + " " + category, true)) {
          tickerSymbolsFromSync.add(sym);
        }
        console.log(
          `[CIEC]   Row ${i + 1}: "${row.assetName?.slice(0, 40) ?? ""}..." | ${row.natureOfInterest?.slice(0, 30) ?? ""}`
        );

        const existing = await prisma.disclosure.findFirst({
          where: { memberId: mp.id, description },
        });
        if (!existing) {
          await prisma.disclosure.create({
            data: { memberId: mp.id, category, description },
          });
          saved++;
          console.log(`[CIEC]   → Saved to DB (disclosure #${saved} for this MP)`);
        } else {
          console.log(`[CIEC]   → Already in DB (skipped)`);
        }
      }

      const afterCount = await prisma.disclosure.count({ where: { memberId: mp.id } });
      if (afterCount !== beforeCount && rows.length > 0) {
        const text = rows.map((r) => r.assetName + " " + r.natureOfInterest).join(" ");
        for (const symbol of extractTickerSymbolsFromText(text, true)) {
          const existing = await prisma.tradeTicker.findFirst({
            where: { memberId: mp.id, symbol },
          });
          if (!existing) {
            await prisma.tradeTicker.create({
              data: { memberId: mp.id, symbol, type: "BUY", date: new Date() },
            });
            console.log(`[CIEC]   → TradeTicker created: ${mp.name} / ${symbol} (disclosure change)`);
          }
        }
      }

      console.log(
        `[CIEC] Done: ${mp.name} — ${saved} new disclosure(s) saved, ${rows.length} total scraped\n`
      );
    } catch (e) {
      console.warn(
        `[CIEC] Skip ${mp.name}: ${e instanceof Error ? e.message : "scrape failed"}\n`
      );
    }
  }

  // ——— StockPriceCache: update for every ticker found in disclosures ———
  console.log("[Sync] Updating StockPriceCache for disclosure tickers...\n");
  for (const symbol of tickerSymbolsFromSync) {
    try {
      const q = await getLiveStockPrice(symbol);
      if (q) {
        await prisma.stockPriceCache.upsert({
          where: { symbol },
          create: { symbol, price: q.currentPrice, dailyChange: q.dailyChange },
          update: { price: q.currentPrice, dailyChange: q.dailyChange },
        });
      }
    } catch {
      // ignore
    }
  }
  console.log(`[Sync] StockPriceCache updated for ${tickerSymbolsFromSync.size} symbol(s).\n`);

  console.log("---------- Step 2: LEGISinfo API (bills) ----------\n");

  try {
    console.log("[LEGISinfo] Fetching bills from overview XML...");
    const bills = await fetchLegisinfoOverview();
    console.log(`[LEGISinfo]   → Parsed ${bills.length} bill(s)\n`);

    for (let i = 0; i < bills.length; i++) {
      const b = bills[i];
      console.log(
        `[LEGISinfo]   Bill ${i + 1}: ${b.number} | ${b.status}${b.title ? ` | ${b.title.slice(0, 50)}...` : ""}`
      );
    }
    console.log("");

    console.log("[LEGISinfo] Saving bills to Prisma...");
    const { count } = await syncBillsToDatabase();
    console.log(`[LEGISinfo]   → Upserted ${count} bill(s) into database\n`);
  } catch (e) {
    console.error(
      `[LEGISinfo] Failed: ${e instanceof Error ? e.message : "LEGISinfo error"}\n`
    );
  }

  // ——— Update last successful sync ———
  await prisma.appStatus.upsert({
    where: { id: 1 },
    create: { id: 1, lastSuccessfulSyncAt: new Date() },
    update: { lastSuccessfulSyncAt: new Date() },
  });
  console.log("[Sync] Last successful sync time updated in database.");
  console.log("\n✅ Sync Complete.");
  console.log("\n========== SYNC finished ==========\n");
}

main()
  .catch((e) => {
    console.error("[Sync] Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
