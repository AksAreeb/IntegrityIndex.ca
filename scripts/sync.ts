/**
 * Sync CLI — Fetches disclosures (CIEC) and bills (LEGISinfo) for 10 test MPs,
 * saves to Prisma. Run: npm run sync
 */
try {
  require("dotenv").config();
} catch {
  // dotenv optional if env vars set
}
import { PrismaClient } from "@prisma/client";
import { scrapeCIEC } from "../src/lib/scrapers/ciecScraper";
import {
  fetchLegisinfoOverview,
  syncBillsToDatabase,
} from "../src/lib/api/legisinfo";

const prisma = new PrismaClient();

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

  for (const mp of testMPs) {
    console.log(`[CIEC] Fetching disclosures for: ${mp.name} (${mp.riding}) [${mp.id}]...`);

    try {
      const rows = await scrapeCIEC(mp.id);
      console.log(`[CIEC]   → Received ${rows.length} row(s) from CIEC`);

      let saved = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const category = (row.natureOfInterest?.slice(0, 50) || "Other").slice(
          0,
          50
        );
        const description = (row.assetName ?? "").slice(0, 500);
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

      console.log(
        `[CIEC] Done: ${mp.name} — ${saved} new disclosure(s) saved, ${rows.length} total scraped\n`
      );
    } catch (e) {
      console.warn(
        `[CIEC] Skip ${mp.name}: ${e instanceof Error ? e.message : "scrape failed"}\n`
      );
    }
  }

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
