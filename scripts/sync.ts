/**
 * Sync CLI — Fetches disclosures (CIEC) and bills (LEGISinfo) for test MPs,
 * updates StockPriceCache for tickers in disclosures, creates TradeTicker when disclosures change.
 * Run: npm run sync
 * Prisma 7: uses adapter-pg (same as seed).
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { scrapeCIEC } from "../src/lib/scrapers/ciecScraper";
import {
  fetchLegisinfoOverview,
  syncBillsToDatabase,
} from "../src/lib/api/legisinfo";
import { getLiveStockPrice, extractTickerSymbolsFromText } from "../src/lib/api/stocks";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL must be set");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** 10 test MP IDs — use first 10 members from DB, or fallback to IDs 1–10 */
const TEST_MP_LIMIT = 10;

async function main() {
  console.log("\n========== SYNC: CIEC + LEGISinfo → Prisma ==========\n");

  // ——— Load 10 test MPs from database ———
  const testMPs = await prisma.member.findMany({
    take: TEST_MP_LIMIT,
    orderBy: { id: "asc" },
    select: { id: true, name: true, riding: true },
  });

  if (testMPs.length === 0) {
    console.log("[Sync] No members in database. Run prisma db seed first.");
    return;
  }

  console.log(`[Sync] Loaded ${testMPs.length} test MPs from database:\n`);
  testMPs.forEach((mp, i) => {
    console.log(`  ${i + 1}. ${mp.name} (${mp.riding}) — id: ${mp.id}`);
  });
  console.log("");

  // ——— Step 1: CIEC — fetch disclosures for each test MP and save ———
  console.log("---------- Step 1: CIEC Scraper (disclosures) ----------\n");

  const tickerSymbolsFromSync = new Set<string>();

  for (const mp of testMPs) {
    console.log(`[CIEC] Fetching disclosures for: ${mp.name} (${mp.riding}) [${mp.id}]...`);

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
