import "dotenv/config";

console.log("Checking DATABASE_URL:", process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined in .env");

/**
 * Data Prime — Seed top 10 Federal MPs, CIEC disclosures, stock hydration, 5 bills.
 * Run: npx prisma db seed
 */
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const cheerio = require("cheerio");
const { scrapeCIEC } = require("../src/lib/scrapers/ciecScraper");
const { getLiveStockPrice } = require("../src/lib/api/stocks");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const LEGISINFO_XML = "https://www.parl.ca/legisinfo/en/overview/xml";

/** Top 10 Federal MPs — real names, House of Commons–style IDs for CIEC/registry lookups */
const TOP_10_MPs = [
  { id: "100001", name: "Pierre Poilievre", riding: "Carleton", party: "Conservative" },
  { id: "100002", name: "Justin Trudeau", riding: "Papineau", party: "Liberal" },
  { id: "100003", name: "Jagmeet Singh", riding: "Burnaby South", party: "NDP" },
  { id: "100004", name: "Chrystia Freeland", riding: "University—Rosedale", party: "Liberal" },
  { id: "100005", name: "Yves-François Blanchet", riding: "Beloeil—Chambly", party: "Bloc Québécois" },
  { id: "100006", name: "Elizabeth May", riding: "Saanich—Gulf Islands", party: "Green" },
  { id: "100007", name: "Mark Holland", riding: "Ajax", party: "Liberal" },
  { id: "100008", name: "Melissa Lantsman", riding: "Thornhill", party: "Conservative" },
  { id: "100009", name: "Peter Julian", riding: "New Westminster—Burnaby", party: "NDP" },
  { id: "100010", name: "Alain Therrien", riding: "La Prairie", party: "Bloc Québécois" },
];

const TICKER_SYMBOLS = ["TD", "SHOP", "RY", "ENB", "CNR", "SU", "BNS", "CP"];

async function fetchBillsFromLegisinfo(): Promise<{ number: string; status: string; title?: string }[]> {
  const { data: xml } = await axios.get<string>(LEGISINFO_XML, {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; IntegrityIndex/1.0)",
      Accept: "application/xml, text/xml",
    },
    validateStatus: (s: number) => s >= 200 && s < 400,
  });
  const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: true });
  const bills: { number: string; status: string; title?: string }[] = [];
  $("Bill, BillVersion, Item").each((_: number, el: unknown) => {
    const $el = $(el);
    const number =
      $el.find("Number").first().text().trim() ||
      ($el.attr("number") as string) ||
      $el.find("BillNumber").first().text().trim() ||
      "";
    const status =
      $el.find("Status").first().text().trim() ||
      ($el.attr("status") as string) ||
      $el.find("CurrentStatus").first().text().trim() ||
      "";
    const title =
      $el.find("Title").first().text().trim() ||
      $el.find("ShortTitle").first().text().trim() ||
      undefined;
    if (number) bills.push({ number: number.trim(), status: status.trim(), title });
  });
  if (bills.length === 0 && xml.includes("C-")) {
    const matches = xml.matchAll(/(?:BillNumber|Number|bill)[^>]*>?\s*([CS]-\d+)/gi);
    const seen = new Set<string>();
    for (const m of matches) {
      const num = (m[1] as string).toUpperCase();
      if (!seen.has(num)) {
        seen.add(num);
        bills.push({ number: num, status: "" });
      }
    }
  }
  return bills;
}

async function main() {
  console.log("\n========== Data Prime: Seed + CIEC + Stock + Bills ==========\n");

  await prisma.stockPriceCache.deleteMany({});
  await prisma.tradeTicker.deleteMany({});
  await prisma.disclosure.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.member.deleteMany({});

  // ——— 1. Seed 10 Federal MPs ———
  console.log("[Seed] 1. Seeding top 10 Federal MPs...\n");
  for (const mp of TOP_10_MPs) {
    await prisma.member.create({
      data: {
        id: mp.id,
        name: mp.name,
        riding: mp.riding,
        party: mp.party,
        jurisdiction: "FEDERAL",
      },
    });
    console.log(`  Created: ${mp.name} (${mp.riding}) — id: ${mp.id}`);
  }
  console.log("");

  // ——— 2. CIEC: fetch disclosure summaries for 10 members ———
  console.log("[Seed] 2. CIEC — fetching disclosure summaries for 10 members...\n");
  for (const mp of TOP_10_MPs) {
    try {
      const rows = await scrapeCIEC(mp.id);
      console.log(`  ${mp.name}: ${rows.length} disclosure row(s) from CIEC`);
      for (const row of rows.slice(0, 5)) {
        const category = (row.natureOfInterest?.slice(0, 50) || "Other").slice(0, 50);
        const description = (row.assetName ?? "").slice(0, 500);
        await prisma.disclosure.create({
          data: { memberId: mp.id, category, description },
        });
      }
    } catch (e) {
      console.warn(`  ${mp.name}: skip — ${e instanceof Error ? e.message : "scrape failed"}`);
    }
  }
  console.log("");

  // ——— 3. Trade tickers + stock hydration ———
  console.log("[Seed] 3. Trade tickers + stock hydration (Finnhub)...\n");
  for (let i = 0; i < TOP_10_MPs.length; i++) {
    const mp = TOP_10_MPs[i];
    const sym1 = TICKER_SYMBOLS[i % TICKER_SYMBOLS.length];
    const sym2 = TICKER_SYMBOLS[(i + 3) % TICKER_SYMBOLS.length];
    await prisma.tradeTicker.createMany({
      data: [
        { memberId: mp.id, symbol: sym1, type: "BUY", date: new Date(2024, 5, 1 + i) },
        { memberId: mp.id, symbol: sym2, type: "SELL", date: new Date(2024, 6, 10 + i) },
      ],
    });
    console.log(`  ${mp.name}: TradeTicker ${sym1} (BUY), ${sym2} (SELL)`);
  }
  const symbols = [...new Set(TICKER_SYMBOLS)];
  for (const symbol of symbols) {
    try {
      const q = await getLiveStockPrice(symbol);
      if (q) {
        await prisma.stockPriceCache.upsert({
          where: { symbol },
          create: {
            symbol,
            price: q.currentPrice,
            dailyChange: q.dailyChange,
          },
          update: {
            price: q.currentPrice,
            dailyChange: q.dailyChange,
          },
        });
        console.log(`  Stock ${symbol}: $${q.currentPrice.toFixed(2)} (${q.dailyChange >= 0 ? "+" : ""}${q.dailyChange.toFixed(2)}) → saved`);
      }
    } catch (e) {
      console.warn(`  Stock ${symbol}: skip — ${e instanceof Error ? e.message : "fetch failed"}`);
    }
  }
  console.log("");

  // ——— 4. LEGISinfo: 5 most recent government bills ———
  console.log("[Seed] 4. LEGISinfo — fetching 5 most recent government bills...\n");
  const bills = await fetchBillsFromLegisinfo();
  const five = bills.slice(0, 5);
  for (const b of five) {
    await prisma.bill.upsert({
      where: { number: b.number },
      create: { number: b.number, status: b.status, title: b.title ?? null, keyVote: false },
      update: { status: b.status, title: b.title ?? null },
    });
    console.log(`  Bill: ${b.number} | ${b.status}${b.title ? ` | ${b.title.slice(0, 40)}...` : ""}`);
  }
  console.log("");

  await prisma.appStatus.upsert({
    where: { id: 1 },
    create: { id: 1, lastSuccessfulSyncAt: new Date() },
    update: { lastSuccessfulSyncAt: new Date() },
  });

  console.log("[Seed] Data Prime finished. 10 MPs, disclosures, trades, stock cache, 5 bills.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
