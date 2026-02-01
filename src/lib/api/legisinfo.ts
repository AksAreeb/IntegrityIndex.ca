import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/db";

const LEGISINFO_OVERVIEW_XML =
  "https://www.parl.ca/legisinfo/en/overview/xml";

export interface LegisinfoBill {
  number: string;
  status: string;
  title?: string;
  /** Bills with high corporate interest / key votes for integrity tracking */
  isKeyVote?: boolean;
}

/** Bill numbers we track as "Key Votes" (high corporate interest). */
const KEY_VOTE_BILL_NUMBERS = new Set([
  "C-11",
  "C-18",
  "C-27",
  "C-21",
  "S-5",
  "Bill 23",
  "Bill 97",
  "Bill 124",
]);

export function getKeyVoteBillNumbers(): string[] {
  return Array.from(KEY_VOTE_BILL_NUMBERS);
}

export function isKeyVoteBill(billNumber: string): boolean {
  const normalized = billNumber.trim();
  return KEY_VOTE_BILL_NUMBERS.has(normalized);
}

/**
 * Fetches LEGISinfo overview XML and parses recent bill numbers (e.g. C-11, C-27)
 * and their current status.
 */
export async function fetchLegisinfoOverview(): Promise<LegisinfoBill[]> {
  const { data: xml } = await axios.get<string>(LEGISINFO_OVERVIEW_XML, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; IntegrityIndex/1.0; +https://integrityindex.ca)",
      Accept: "application/xml, text/xml",
    },
    maxRedirects: 3,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: true });
  const bills: LegisinfoBill[] = [];

  // Common LEGISinfo XML patterns: bill number in <Number> or attribute, status in <Status> or similar
  $("Bill, BillVersion, Item").each((_, el) => {
    const $el = $(el);
    const number =
      $el.find("Number").first().text().trim() ||
      $el.attr("number") ||
      $el.find("BillNumber").first().text().trim() ||
      "";
    const status =
      $el.find("Status").first().text().trim() ||
      $el.attr("status") ||
      $el.find("CurrentStatus").first().text().trim() ||
      "";
    const title =
      $el.find("Title").first().text().trim() ||
      $el.find("ShortTitle").first().text().trim() ||
      undefined;

    if (number) {
      const num = number.trim();
      bills.push({
        number: num,
        status: status.trim(),
        title,
        isKeyVote: isKeyVoteBill(num),
      });
    }
  });

  // If no structured elements, try regex on raw XML for bill-like identifiers (C-11, S-5, etc.)
  if (bills.length === 0 && xml.includes("C-")) {
    const billNumberMatches = xml.matchAll(
      /(?:BillNumber|Number|bill)[^>]*>?\s*([CS]-\d+)/gi
    );
    const seen = new Set<string>();
    for (const m of billNumberMatches) {
      const num = m[1].toUpperCase();
      if (!seen.has(num)) {
        seen.add(num);
        bills.push({
          number: num,
          status: "",
          isKeyVote: isKeyVoteBill(num),
        });
      }
    }
  }

  return bills;
}

/**
 * Fetches the official XML from https://www.parl.ca/legisinfo/en/overview/xml,
 * parses recent bills (Status, Number, Title), and upserts the Bill model in the database.
 */
export async function syncBillsToDatabase(): Promise<{ count: number }> {
  const bills = await fetchLegisinfoOverview();
  for (const b of bills) {
    await prisma.bill.upsert({
      where: { number: b.number },
      create: {
        number: b.number,
        status: b.status ?? "",
        title: b.title ?? null,
        keyVote: b.isKeyVote ?? isKeyVoteBill(b.number),
      },
      update: {
        status: b.status ?? "",
        title: b.title ?? null,
        keyVote: b.isKeyVote ?? isKeyVoteBill(b.number),
      },
    });
  }
  return { count: bills.length };
}
