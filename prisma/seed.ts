import "dotenv/config";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL must be set in .env");

/**
 * Data Prime — Seed top 10 Federal MPs, CIEC disclosures, stock hydration, 5 bills.
 * Run: npx prisma db seed
 * Prisma 7: Rust-free client via pg driver + PrismaPg adapter.
 */
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const axios = require("axios");
const cheerio = require("cheerio");
const { scrapeCIEC, getMemberPhotoUrl } = require("../src/lib/scrapers/ciecScraper");
const { getLiveStockPrice, extractTickerSymbolsFromText } = require("../src/lib/api/stocks");
const { fetchOntarioMpps } = require("../src/lib/api/ontario-mpps");

const LEGISINFO_BILLS_API = "https://www.parl.ca/legisinfo/en/api/v1/bills?parliaments=45";
const FEDERAL_CHAMBER = "House of Commons";
const PROVINCIAL_CHAMBER = "Legislative Assembly";

/** Top 10 Federal MPs — real names; CIEC resolved by name from Public Registry */
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
  try {
    const { data } = await axios.get(LEGISINFO_BILLS_API, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; IntegrityIndex/1.0)",
        Accept: "application/json",
      },
      validateStatus: (s: number) => s >= 200 && s < 400,
    });
    const items = data?.Items ?? data?.items ?? data?.bills ?? (Array.isArray(data) ? data : []);
    const bills: { number: string; status: string; title?: string }[] = [];
    for (const item of items) {
      const number = String(item.Number ?? item.number ?? item.BillNumber ?? "").trim();
      const status = String(item.Status ?? item.status ?? item.CurrentStatus ?? "").trim();
      const title = [item.ShortTitle, item.shortTitle, item.Title, item.title].find(Boolean);
      const titleStr = title != null ? String(title).trim() : undefined;
      if (number) bills.push({ number, status, title: titleStr || undefined });
    }
    if (bills.length === 0) {
      const fallback = await axios.get("https://www.parl.ca/legisinfo/en/overview/xml", {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; IntegrityIndex/1.0)", Accept: "application/xml, text/xml" },
        validateStatus: (s: number) => s >= 200 && s < 400,
      }).then((r: { data: string }) => r.data).catch(() => null);
      if (fallback && typeof fallback === "string" && fallback.includes("C-")) {
        const $ = cheerio.load(fallback, { xmlMode: true, decodeEntities: true });
        $("Bill, BillVersion, Item").each((_: number, el: unknown) => {
          const $el = $(el);
          const num = $el.find("Number").first().text().trim() || ($el.attr("number") as string) || $el.find("BillNumber").first().text().trim() || "";
          const st = $el.find("Status").first().text().trim() || ($el.attr("status") as string) || "";
          const tit = $el.find("ShortTitle").first().text().trim() || $el.find("Title").first().text().trim() || undefined;
          if (num) bills.push({ number: num.trim(), status: st.trim(), title: tit });
        });
      }
    }
    return bills;
  } catch {
    return [];
  }
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

  // ——— 2. CIEC: search-based disclosure summaries by member name ———
  console.log("[Seed] 2. CIEC — fetching disclosure summaries (search by name)...\n");
  const allDisclosureText = [];
  for (const mp of TOP_10_MPs) {
    try {
      const rows = await scrapeCIEC(mp.name);
      console.log(`  ${mp.name}: ${rows.length} disclosure row(s) from CIEC`);
      for (const row of rows.slice(0, 5)) {
        const category = (row.natureOfInterest?.slice(0, 50) || "Other").slice(0, 50);
        const description = (row.assetName ?? "").slice(0, 500);
        allDisclosureText.push(description + " " + category);
        await prisma.disclosure.create({
          data: { memberId: mp.id, category, description },
        });
      }
    } catch (e) {
      console.warn(`  ${mp.name}: skip — ${e instanceof Error ? e.message : "scrape failed"}`);
    }
  }
  console.log("");

  // ——— 3. Trade tickers: from disclosure symbols (auto when disclosure mentions ticker) + seed list ———
  console.log("[Seed] 3. Trade tickers (from disclosures + seed list)...\n");
  const disclosuresForTicker = await prisma.disclosure.findMany({
    where: { memberId: { in: TOP_10_MPs.map((m) => m.id) } },
    select: { memberId: true, description: true, category: true },
  });
  const memberToSyms: Record<string, Set<string>> = {};
  for (const mp of TOP_10_MPs) {
    memberToSyms[mp.id] = new Set(TICKER_SYMBOLS);
  }
  for (const d of disclosuresForTicker) {
    for (const sym of extractTickerSymbolsFromText(d.description + " " + d.category, true)) {
      if (memberToSyms[d.memberId]) memberToSyms[d.memberId].add(sym);
    }
  }
  const now = new Date();
  for (const mp of TOP_10_MPs) {
    const syms = memberToSyms[mp.id] ?? new Set(TICKER_SYMBOLS);
    for (const symbol of syms) {
      const existing = await prisma.tradeTicker.findFirst({
        where: { memberId: mp.id, symbol },
      });
      if (!existing) {
        await prisma.tradeTicker.create({
          data: { memberId: mp.id, symbol, type: "BUY", date: now },
        });
      }
    }
    const sym1 = TICKER_SYMBOLS[TOP_10_MPs.indexOf(mp) % TICKER_SYMBOLS.length];
    const sym2 = TICKER_SYMBOLS[(TOP_10_MPs.indexOf(mp) + 3) % TICKER_SYMBOLS.length];
    for (const [sym, type] of [[sym1, "BUY"], [sym2, "SELL"]] as const) {
      const ex = await prisma.tradeTicker.findFirst({
        where: { memberId: mp.id, symbol: sym },
      });
      if (!ex) {
        await prisma.tradeTicker.create({
          data: { memberId: mp.id, symbol: sym, type, date: new Date(2024, 5, 1) },
        });
      }
    }
    console.log(`  ${mp.name}: TradeTicker ${sym1} (BUY), ${sym2} (SELL) + ${syms.size} from disclosures`);
  }
  // ——— 3b. StockPriceCache: every ticker from disclosure summaries + seed list ———
  const symbolsFromDisclosures = new Set(TICKER_SYMBOLS);
  for (const text of allDisclosureText) {
    for (const sym of extractTickerSymbolsFromText(text, true)) {
      symbolsFromDisclosures.add(sym);
    }
  }
  const symbols = [...symbolsFromDisclosures];
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
